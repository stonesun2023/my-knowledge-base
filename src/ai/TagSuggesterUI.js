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
            <span class="ai-tag-btn-wrapper">
                <button class="ai-tag-suggest-btn" 
                        data-link-id="${linkId}" 
                        data-current-tag="${currentTag || ''}"
                        title="AI 智能推荐标签">
                    ✨ 智能推荐
                </button>
            </span>
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
     * 渲染推荐标签 UI（多选模式）
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

        // 查找或创建推荐容器（append 到 buttonEl.parentElement 即 .ai-tag-btn-wrapper）
        const wrapper = buttonEl.parentElement;
        let container = wrapper.querySelector('.ai-tag-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.className = 'ai-tag-suggestions';
            wrapper.appendChild(container);
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
                // 新标签：可多选
                return `
                    <span class="ai-tag-chip" 
                          data-link-id="${linkId}" 
                          data-tag="${tag}"
                          data-confidence="${conf}"
                          title="点击选中/取消">
                        ${tag}
                    </span>
                `;
            }
        }).join('');

        container.innerHTML = `
            <div class="ai-tag-list">${tagsHTML}</div>
            <div class="ai-tag-confirm-row">
                <button class="ai-tag-confirm-btn" data-link-id="${linkId}">✓ 确认</button>
                <button class="ai-tag-cancel-btn">取消</button>
            </div>
        `;

        // 绑定标签点击事件：切换选中状态
        container.querySelectorAll('.ai-tag-chip:not(.existing)').forEach(chip => {
            chip.addEventListener('click', () => {
                chip.classList.toggle('selected');
            });
        });

        // 绑定确认按钮：收集所有 selected 的 chip，一次性触发事件（传递标签数组）
        container.querySelector('.ai-tag-confirm-btn')?.addEventListener('click', () => {
            const selectedChips = container.querySelectorAll('.ai-tag-chip.selected');
            const selectedTags = Array.from(selectedChips).map(chip => chip.dataset.tag);
            
            if (selectedTags.length > 0) {
                // 触发自定义事件，传递标签数组
                const event = new CustomEvent('ai-tags-selected', {
                    detail: { linkId, tags: selectedTags },
                    bubbles: true
                });
                container.dispatchEvent(event);
            }
            // 关闭气泡
            container.remove();
        });

        // 绑定取消按钮：直接移除气泡
        container.querySelector('.ai-tag-cancel-btn')?.addEventListener('click', () => {
            container.remove();
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
     * P2 联动入口：从表单数据直接触发 AI 标签建议
     * 在添加链接表单区展示标签建议（而非卡片上）
     * @param {string} url
     * @param {string} title
     * @param {string} description
     */
    async triggerFromFormData(url, title, description) {
        // 检查 AI 是否已配置
        if (!aiService.isConfigured()) {
            console.log('[TagSuggesterUI] AI 未配置，跳过表单标签建议');
            return;
        }

        // 找到表单区的标签建议容器，没有则创建
        let suggestionArea = document.getElementById('formTagSuggestion');
        if (!suggestionArea) {
            suggestionArea = document.createElement('div');
            suggestionArea.id = 'formTagSuggestion';
            suggestionArea.style.cssText = 'margin-top:8px;padding:10px 12px;background:var(--bg-secondary);border-radius:8px;border:1px solid var(--border-color);display:none;';
            
            // 插入到标签选择区上方
            const tagSection = document.querySelector('.tag-selector');
            if (tagSection) {
                tagSection.parentNode.insertBefore(suggestionArea, tagSection);
            }
        }

        suggestionArea.style.display = 'block';
        suggestionArea.innerHTML = '<span style="font-size:13px;color:var(--text-secondary);">🤖 AI 正在推荐标签...</span>';

        try {
            // 构造 link 对象传给 TagSuggester
            const linkData = { url, title, note: description };
            const result = await tagSuggester.suggest(linkData);
            const tags = result.tags;

            if (!tags || tags.length === 0) {
                suggestionArea.style.display = 'none';
                return;
            }

            // 渲染可点击的标签建议（点击即选中该标签）
            suggestionArea.innerHTML = `
                <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">🤖 AI 推荐标签（点击选中）：</div>
                <div style="display:flex;flex-wrap:wrap;gap:6px;">
                    ${tags.map(tag => `
                        <button class="form-tag-suggestion-btn" 
                            data-tag="${tag}"
                            style="padding:4px 12px;border-radius:12px;border:1px solid var(--accent-color);
                                   background:transparent;color:var(--accent-color);cursor:pointer;font-size:13px;
                                   transition:all 0.15s ease;">
                            ${tag}
                        </button>
                    `).join('')}
                </div>
            `;

            // 绑定点击事件：点击标签后，选中对应的标签按钮
            suggestionArea.querySelectorAll('.form-tag-suggestion-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tag = btn.dataset.tag;
                    const matched = this._selectFormTag(tag);
                    
                    if (matched) {
                        // 匹配成功：更新按钮样式为已选中
                        suggestionArea.querySelectorAll('.form-tag-suggestion-btn').forEach(b => {
                            b.style.background = 'transparent';
                            b.style.color = 'var(--accent-color)';
                            b.style.borderColor = 'var(--accent-color)';
                            b.title = '';
                        });
                        btn.style.background = 'var(--accent-color)';
                        btn.style.color = '#fff';
                    } else {
                        // 标签不在预设列表，用样式提示用户
                        btn.title = '该标签不在预设列表中，请手动选择';
                        btn.style.borderColor = 'var(--text-secondary)';
                        btn.style.color = 'var(--text-secondary)';
                    }
                });
            });

        } catch (e) {
            console.warn('[TagSuggesterUI] 表单标签建议失败:', e);
            suggestionArea.innerHTML = `<span style="font-size:12px;color:var(--text-tertiary);">⚠️ AI 标签建议失败</span>`;
            setTimeout(() => {
                suggestionArea.style.display = 'none';
            }, 2000);
        }
    }

    /**
     * 选中表单区的标签按钮
     * @param {string} tag
     * @returns {boolean} 是否匹配成功
     */
    _selectFormTag(tag) {
        // 找到对应标签的按钮并触发点击
        const tagButtons = document.querySelectorAll('#addTagButtons .tag-btn');
        let matched = false;
        tagButtons.forEach(btn => {
            const btnTag = btn.dataset.tag;
            if (btnTag === tag && !btn.classList.contains('selected')) {
                btn.click();
                matched = true;
            }
        });
        return matched;
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
                overflow: visible;
                display: flex;
                gap: 8px;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid var(--border-color);
                flex-wrap: wrap;
            }

            /* 按钮包装器 - 相对定位，让气泡相对于按钮本身定位 */
            .ai-tag-btn-wrapper {
                position: relative;
                display: inline-flex;
            }

            /* 智能推荐按钮 - 轻量风格，与编辑/删除按钮一致 */
            .ai-tag-suggest-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 14px;
                border-radius: 4px;
                font-size: 13px;
                cursor: pointer;
                border: 1px solid var(--border-color);
                background: transparent;
                color: var(--text-secondary);
                font-family: inherit;
                transition: all 0.15s ease;
            }

            .ai-tag-suggest-btn:hover:not(:disabled) {
                background: var(--tag-bg);
                color: var(--text-primary);
                border-color: #d0d0ce;
            }

            .ai-tag-suggest-btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
            }

            .ai-tag-suggest-btn.loading {
                color: var(--text-tertiary);
            }

            /* 气泡改为相对按钮向右上方弹出 */
            .ai-tag-suggestions {
                position: absolute;
                bottom: calc(100% + 6px);
                left: 0;
                min-width: 200px;
                max-width: 280px;
                padding: 12px;
                background: var(--bg-secondary);
                border-radius: 10px;
                border: 1px solid var(--border-color);
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                animation: slideUp 0.2s ease;
                z-index: 300;
            }

            @keyframes slideUp {
                from { opacity: 0; transform: translateY(4px); }
                to   { opacity: 1; transform: translateY(0); }
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

            /* chip 选中状态 */
            .ai-tag-chip.selected {
                background: var(--accent-color);
                color: white;
                box-shadow: 0 0 0 2px var(--accent-color);
            }

            .ai-tag-chip:not(.existing) {
                background: var(--tag-bg);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }

            .ai-tag-chip.selected:not(.existing) {
                background: var(--accent-color);
                color: white;
                border-color: var(--accent-color);
            }

            /* 确认/取消行 */
            .ai-tag-confirm-row {
                display: flex;
                gap: 6px;
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px solid var(--border-color);
            }

            .ai-tag-confirm-btn {
                flex: 1;
                padding: 5px 10px;
                background: var(--accent-color);
                color: white;
                border: none;
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                font-family: inherit;
            }

            .ai-tag-confirm-btn:hover {
                opacity: 0.9;
            }

            .ai-tag-cancel-btn {
                padding: 5px 10px;
                background: transparent;
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-size: 12px;
                cursor: pointer;
                font-family: inherit;
            }

            .ai-tag-cancel-btn:hover {
                background: var(--bg-card);
                color: var(--text-primary);
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
                background: var(--bg-secondary);
            }
        `;
    }
}

// 导出单例
const tagSuggesterUI = new TagSuggesterUI();
export { TagSuggesterUI, tagSuggesterUI };