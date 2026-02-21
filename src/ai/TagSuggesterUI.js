/**
 * TagSuggesterUI - 智能标签推荐 UI 组件
 * 
 * 在链接卡片上集成标签推荐功能
 */
import { tagSuggester } from './TagSuggester.js';
import { aiService } from './AIService.js';

class TagSuggesterUI {
    constructor() {
        this.activeRequests = new Map(); // linkId -> AbortController
        this.suggestionsCache = new Map(); // linkId -> { tags, confidence }
    }

    /**
     * 渲染「智能推荐标签」按钮
     * @param {number|string} linkId - 链接 ID
     * @param {string} currentTag - 当前标签（用于判断是否已配置）
     * @returns {string} HTML 字符串
     */
    renderButton(linkId, currentTag = '') {
        // 未配置 AI 时不显示按钮
        if (!aiService.isConfigured()) {
            return '';
        }

        return `
            <button class="ai-tag-suggest-btn" 
                    data-link-id="${linkId}" 
                    data-current-tag="${currentTag || ''}"
                    title="AI 智能推荐标签">
                ✨ 智能推荐
            </button>
        `;
    }

    /**
     * 显示推荐结果
     * @param {number|string} linkId - 链接 ID
     * @param {Object} link - 链接对象
     * @param {HTMLElement} buttonEl - 按钮元素
     * @returns {Promise<void>}
     */
    async showSuggestions(linkId, link, buttonEl) {
        // 检查缓存
        if (this.suggestionsCache.has(linkId)) {
            this._renderSuggestionsUI(linkId, this.suggestionsCache.get(linkId), link, buttonEl);
            return;
        }

        // 设置 loading 状态
        buttonEl.classList.add('loading');
        buttonEl.disabled = true;
        buttonEl.innerHTML = '🔄 推荐中...';

        // 创建取消控制器
        const controller = new AbortController();
        this.activeRequests.set(linkId, controller);

        try {
            const result = await tagSuggester.suggest(link);
            
            // 缓存结果
            this.suggestionsCache.set(linkId, result);
            
            // 渲染推荐 UI
            this._renderSuggestionsUI(linkId, result, link, buttonEl);

        } catch (error) {
            this._renderError(linkId, error.message, buttonEl);
        } finally {
            this.activeRequests.delete(linkId);
            buttonEl.classList.remove('loading');
            buttonEl.disabled = false;
        }
    }

    /**
     * 渲染推荐标签 UI
     * @param {number|string} linkId 
     * @param {Object} result - { tags, confidence }
     * @param {Object} link 
     * @param {HTMLElement} buttonEl 
     */
    _renderSuggestionsUI(linkId, result, link, buttonEl) {
        const { tags, confidence } = result;
        const currentTag = link.tag || '';

        // 恢复按钮状态
        buttonEl.innerHTML = '✨ 智能推荐';
        buttonEl.disabled = false;

        // 查找或创建推荐容器
        let container = buttonEl.parentElement.querySelector('.ai-tag-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-tag-suggestions';
            buttonEl.parentElement.appendChild(container);
        }

        if (tags.length === 0) {
            container.innerHTML = `
                <div class="ai-tag-empty">
                    😅 未找到合适的标签
                </div>
            `;
            return;
        }

        // 渲染标签列表
        const tagsHTML = tags.map((tag, index) => {
            const isCurrent = tag === currentTag;
            const conf = confidence[index] || 0.5;
            
            if (isCurrent) {
                // 已有标签：绿色 + ✓
                return `
                    <span class="ai-tag-chip existing" title="当前标签">
                        ✓ ${tag}
                    </span>
                `;
            } else {
                // 新标签：蓝色，可点击
                return `
                    <span class="ai-tag-chip" 
                          data-link-id="${linkId}" 
                          data-tag="${tag}"
                          data-confidence="${conf}"
                          title="点击添加此标签">
                        ${tag}
                    </span>
                `;
            }
        }).join('');

        container.innerHTML = `
            <div class="ai-tag-list">${tagsHTML}</div>
        `;

        // 绑定标签点击事件
        container.querySelectorAll('.ai-tag-chip:not(.existing)').forEach(chip => {
            chip.addEventListener('click', () => {
                this._handleTagClick(chip, linkId);
            });
        });
    }

    /**
     * 渲染错误状态
     * @param {number|string} linkId 
     * @param {string} message 
     * @param {HTMLElement} buttonEl 
     */
    _renderError(linkId, message, buttonEl) {
        buttonEl.innerHTML = '✨ 智能推荐';
        buttonEl.disabled = false;

        let container = buttonEl.parentElement.querySelector('.ai-tag-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-tag-suggestions';
            buttonEl.parentElement.appendChild(container);
        }

        container.innerHTML = `
            <div class="ai-tag-error">
                ❌ ${message}
                <button class="ai-tag-retry" data-link-id="${linkId}">重试</button>
            </div>
        `;

        // 绑定重试按钮
        container.querySelector('.ai-tag-retry')?.addEventListener('click', () => {
            // 清除缓存后重试
            this.suggestionsCache.delete(linkId);
            const link = this._getLinkById(linkId);
            if (link) {
                this.showSuggestions(linkId, link, buttonEl);
            }
        });
    }

    /**
     * 处理标签点击
     * @param {HTMLElement} chip 
     * @param {number|string} linkId 
     */
    _handleTagClick(chip, linkId) {
        const tag = chip.dataset.tag;
        
        // 触发自定义事件，让外部处理标签更新
        const event = new CustomEvent('ai-tag-selected', {
            detail: { linkId, tag },
            bubbles: true
        });
        chip.dispatchEvent(event);

        // 更新 UI：标记为已添加
        chip.classList.add('added');
        chip.innerHTML = `✓ ${tag}`;
        chip.title = '已添加';
        chip.style.pointerEvents = 'none';
    }

    /**
     * 绑定所有按钮事件
     * @param {HTMLElement} container - 包含按钮的容器
     */
    bindEvents(container) {
        const buttons = container.querySelectorAll('.ai-tag-suggest-btn');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                const linkId = btn.dataset.linkId;
                const link = this._getLinkById(linkId);
                
                if (link) {
                    await this.showSuggestions(linkId, link, btn);
                }
            });
        });
    }

    /**
     * 根据 ID 获取链接数据
     * @param {number|string} linkId 
     * @returns {Object|null}
     */
    _getLinkById(linkId) {
        if (window.AppState) {
            const links = AppState.get('data.links');
            // 先尝试按 id 查找，再尝试按索引查找
            let link = links.find(l => l.id == linkId);
            if (!link) {
                // linkId 可能是 realIndex
                link = links[parseInt(linkId)];
            }
            return link || null;
        }
        return null;
    }

    /**
     * 清除缓存
     * @param {number|string} linkId - 可选，不传则清除全部
     */
    clearCache(linkId = null) {
        if (linkId) {
            this.suggestionsCache.delete(linkId);
        } else {
            this.suggestionsCache.clear();
        }
    }

    /**
     * 取消进行中的请求
     * @param {number|string} linkId 
     */
    cancelRequest(linkId) {
        const controller = this.activeRequests.get(linkId);
        if (controller) {
            controller.abort();
            this.activeRequests.delete(linkId);
        }
    }

    /**
     * 获取样式（注入到页面）
     * @returns {string} CSS 字符串
     */
    static getStyles() {
        return `
            /* AI 功能按钮行 - 需要相对定位让推荐标签向上弹出 */
            .ai-actions-row {
                position: relative;
            }

            /* 智能推荐按钮 */
            .ai-tag-suggest-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                margin-top: 8px;
                background: linear-gradient(135deg, var(--accent-color), #5856d6);
                color: white;
                border: none;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
            }

            .ai-tag-suggest-btn:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
            }

            .ai-tag-suggest-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .ai-tag-suggest-btn.loading {
                background: var(--bg-card);
                color: var(--text-secondary);
            }

            /* 推荐容器 - 向上弹出 */
            .ai-tag-suggestions {
                position: absolute;
                bottom: 100%;
                left: 0;
                right: 0;
                margin-bottom: 8px;
                padding: 10px 12px;
                background: var(--bg-card);
                border-radius: 10px;
                border: 1px solid var(--border-color);
                box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.1);
                animation: slideUp 0.2s ease;
                z-index: 100;
            }

            @keyframes slideUp {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .ai-tag-label {
                font-size: 12px;
                color: var(--text-secondary);
                margin-bottom: 8px;
            }

            .ai-tag-list {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
            }

            /* 标签 chip */
            .ai-tag-chip {
                display: inline-flex;
                align-items: center;
                padding: 4px 10px;
                background: var(--accent-color);
                color: white;
                border-radius: 12px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .ai-tag-chip:hover:not(.existing):not(.added) {
                background: var(--accent-hover);
                transform: scale(1.05);
            }

            .ai-tag-chip.existing {
                background: #34c759;
                cursor: default;
            }

            .ai-tag-chip.added {
                background: #34c759;
                cursor: default;
            }

            /* 空状态 */
            .ai-tag-empty {
                font-size: 13px;
                color: var(--text-tertiary);
                text-align: center;
                padding: 8px 0;
            }

            /* 错误状态 */
            .ai-tag-error {
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 13px;
                color: #ff3b30;
            }

            .ai-tag-retry {
                padding: 2px 8px;
                background: transparent;
                border: 1px solid #ff3b30;
                border-radius: 4px;
                color: #ff3b30;
                font-size: 11px;
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .ai-tag-retry:hover {
                background: #ff3b30;
                color: white;
            }

            /* 深色模式适配 */
            body.dark-mode .ai-tag-suggest-btn.loading {
                background: var(--bg-card);
            }

            body.dark-mode .ai-tag-suggestions {
                background: rgba(0, 0, 0, 0.2);
            }
        `;
    }
}

// 导出单例
const tagSuggesterUI = new TagSuggesterUI();
export { TagSuggesterUI, tagSuggesterUI };