/**
 * RecommenderUI.js - 相关推荐 UI 组件
 * 
 * 侧边抽屉模式展示相关推荐
 */

import { recommender } from './Recommender.js';
import { aiService } from './AIService.js';

/**
 * RecommenderUI 类
 */
export class RecommenderUI {
    constructor() {
        this.drawer = null;
        this.isOpen = false;
        this.currentLink = null;
    }

    /**
     * 获取样式
     */
    static getStyles() {
        return `
            /* 推荐抽屉 */
            .ai-recommend-drawer {
                position: fixed;
                top: 0;
                right: -400px;
                width: 400px;
                max-width: 90vw;
                height: 100vh;
                background: var(--bg-secondary);
                border-left: 1px solid var(--border-color);
                box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
                z-index: 10000;
                transition: right 0.3s ease;
                display: flex;
                flex-direction: column;
            }

            .ai-recommend-drawer.open {
                right: 0;
            }

            body.dark-mode .ai-recommend-drawer {
                box-shadow: -4px 0 24px rgba(0, 0, 0, 0.5);
            }

            /* 遮罩 */
            .ai-recommend-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.3);
                z-index: 9999;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .ai-recommend-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }

            body.dark-mode .ai-recommend-overlay {
                background: rgba(0, 0, 0, 0.5);
            }

            /* 抽屉头部 */
            .ai-recommend-header {
                padding: 20px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 12px;
            }

            .ai-recommend-title {
                font-size: 18px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 4px 0;
            }

            .ai-recommend-subtitle {
                font-size: 13px;
                color: var(--text-secondary);
                margin: 0;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 300px;
            }

            .ai-recommend-close {
                width: 32px;
                height: 32px;
                border-radius: 8px;
                border: 1px solid var(--border-color);
                background: var(--bg-card);
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                flex-shrink: 0;
                transition: all 0.2s ease;
            }

            .ai-recommend-close:hover {
                background: var(--bg-card-hover);
                color: var(--text-primary);
                border-color: var(--accent-color);
            }

            /* 抽屉内容 */
            .ai-recommend-content {
                flex: 1;
                overflow-y: auto;
                padding: 16px;
            }

            /* 骨架屏 */
            .ai-recommend-skeleton {
                padding: 16px;
                border-radius: 12px;
                background: var(--bg-card);
                margin-bottom: 12px;
            }

            .ai-skeleton-line {
                height: 14px;
                background: linear-gradient(90deg, var(--border-color) 25%, var(--bg-card-hover) 50%, var(--border-color) 75%);
                background-size: 200% 100%;
                animation: ai-skeleton-shimmer 1.5s infinite;
                border-radius: 4px;
                margin-bottom: 8px;
            }

            .ai-skeleton-line:last-child {
                margin-bottom: 0;
            }

            .ai-skeleton-line.short { width: 60%; }
            .ai-skeleton-line.medium { width: 80%; }
            .ai-skeleton-line.long { width: 100%; }

            @keyframes ai-skeleton-shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }

            /* 推荐卡片 */
            .ai-recommend-card {
                padding: 16px;
                border-radius: 12px;
                background: var(--bg-card);
                border: 1px solid transparent;
                margin-bottom: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ai-recommend-card:hover {
                background: var(--bg-card-hover);
                border-color: var(--accent-color);
                transform: translateX(-4px);
                box-shadow: 4px 4px 12px var(--shadow-light);
            }

            .ai-recommend-card-title {
                font-size: 15px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0 0 6px 0;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .ai-recommend-card-reason {
                font-size: 12px;
                color: var(--accent-color);
                margin: 0 0 8px 0;
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .ai-recommend-card-tag {
                display: inline-block;
                padding: 2px 8px;
                background: var(--tag-bg);
                color: var(--tag-color);
                border-radius: 4px;
                font-size: 11px;
                margin-right: 6px;
            }

            .ai-recommend-card-footer {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid var(--border-color);
            }

            .ai-recommend-card-time {
                font-size: 11px;
                color: var(--text-tertiary);
            }

            .ai-recommend-card-btn {
                padding: 4px 12px;
                border-radius: 6px;
                border: 1px solid var(--accent-color);
                background: transparent;
                color: var(--accent-color);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ai-recommend-card-btn:hover {
                background: var(--accent-color);
                color: white;
            }

            /* 空状态 */
            .ai-recommend-empty {
                text-align: center;
                padding: 40px 20px;
                color: var(--text-secondary);
            }

            .ai-recommend-empty-icon {
                font-size: 48px;
                margin-bottom: 12px;
            }

            .ai-recommend-empty-title {
                font-size: 16px;
                color: var(--text-primary);
                margin-bottom: 4px;
            }

            /* 底部信息 */
            .ai-recommend-footer {
                padding: 12px 16px;
                border-top: 1px solid var(--border-color);
                font-size: 11px;
                color: var(--text-tertiary);
                text-align: center;
            }

            .ai-recommend-footer .ai-provider-name {
                color: var(--accent-color);
                font-weight: 500;
            }

            /* 触发按钮 */
            .ai-recommend-trigger {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 6px 12px;
                border-radius: 8px;
                border: 1px solid var(--border-color);
                background: var(--bg-card);
                color: var(--text-secondary);
                font-size: 13px;
                cursor: pointer;
                transition: all 0.2s ease;
                margin-top: 8px;
            }

            .ai-recommend-trigger:hover {
                border-color: var(--accent-color);
                color: var(--accent-color);
                background: var(--bg-card-hover);
            }

            /* 移动端适配 */
            @media (max-width: 480px) {
                .ai-recommend-drawer {
                    width: 100%;
                    right: -100%;
                }
            }
        `;
    }

    /**
     * 渲染抽屉 HTML
     */
    renderDrawer() {
        return `
            <div class="ai-recommend-overlay" id="aiRecommendOverlay"></div>
            <div class="ai-recommend-drawer" id="aiRecommendDrawer">
                <div class="ai-recommend-header">
                    <div>
                        <h3 class="ai-recommend-title">🔗 相关推荐</h3>
                        <p class="ai-recommend-subtitle" id="aiRecommendSubtitle">基于当前链接</p>
                    </div>
                    <button class="ai-recommend-close" id="aiRecommendClose" title="关闭">✕</button>
                </div>
                <div class="ai-recommend-content" id="aiRecommendContent">
                    <!-- 内容动态填充 -->
                </div>
                <div class="ai-recommend-footer" id="aiRecommendFooter">
                    <!-- 底部信息动态填充 -->
                </div>
            </div>
        `;
    }

    /**
     * 渲染触发按钮
     */
    renderTriggerButton(linkId) {
        return `<button class="ai-recommend-trigger" data-recommend-link="${linkId}">
            🔗 相关推荐
        </button>`;
    }

    /**
     * 初始化抽屉（挂载到 body）
     */
    init() {
        // 检查是否已初始化
        if (document.getElementById('aiRecommendDrawer')) {
            this.drawer = document.getElementById('aiRecommendDrawer');
            return;
        }

        // 注入样式
        const styleEl = document.createElement('style');
        styleEl.textContent = RecommenderUI.getStyles();
        document.head.appendChild(styleEl);

        // 挂载抽屉 DOM
        const container = document.createElement('div');
        container.innerHTML = this.renderDrawer();
        document.body.appendChild(container);

        this.drawer = document.getElementById('aiRecommendDrawer');
        const overlay = document.getElementById('aiRecommendOverlay');
        const closeBtn = document.getElementById('aiRecommendClose');

        // 绑定关闭事件
        closeBtn?.addEventListener('click', () => this.hide());
        overlay?.addEventListener('click', () => this.hide());

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.hide();
            }
        });

        console.log('[RecommenderUI] 初始化完成');
    }

    /**
     * 显示推荐结果
     */
    async showRecommendations(currentLink, allLinks) {
        if (!this.drawer) this.init();

        this.currentLink = currentLink;
        const contentEl = document.getElementById('aiRecommendContent');
        const subtitleEl = document.getElementById('aiRecommendSubtitle');
        const footerEl = document.getElementById('aiRecommendFooter');

        // 更新标题
        if (subtitleEl) {
            subtitleEl.textContent = `基于「${this._truncate(currentLink.title, 20)}」`;
        }

        // 显示骨架屏
        contentEl.innerHTML = this._renderSkeletons(3);

        // 打开抽屉
        this.show();

        // 获取推荐
        try {
            const { recommendations } = await recommender.recommend(currentLink, allLinks, 5);
            
            if (recommendations.length === 0) {
                contentEl.innerHTML = this._renderEmpty();
            } else {
                contentEl.innerHTML = recommendations.map(item => 
                    this._renderCard(item.link, item.reason)
                ).join('');
                
                // 绑定卡片点击事件
                this._bindCardEvents(contentEl);
            }

            // 更新底部信息
            const providerName = aiService.isConfigured() 
                ? aiService.getCurrentProvider()?.displayName || 'AI'
                : null;
            
            if (footerEl) {
                if (providerName) {
                    footerEl.innerHTML = `由 <span class="ai-provider-name">${providerName}</span> 提供智能推荐`;
                } else {
                    footerEl.innerHTML = `本地算法推荐 <span style="color: var(--accent-color);">（配置 AI 获得更精准结果）</span>`;
                }
            }

        } catch (error) {
            console.error('[RecommenderUI] 获取推荐失败:', error);
            contentEl.innerHTML = `
                <div class="ai-recommend-empty">
                    <div class="ai-recommend-empty-icon">😅</div>
                    <div class="ai-recommend-empty-title">获取推荐失败</div>
                    <div>${error.message || '请稍后重试'}</div>
                </div>`;
        }
    }

    /**
     * 显示抽屉
     */
    show() {
        if (!this.drawer) this.init();
        
        this.drawer.classList.add('open');
        document.getElementById('aiRecommendOverlay')?.classList.add('visible');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    }

    /**
     * 隐藏抽屉
     */
    hide() {
        if (!this.drawer) return;
        
        this.drawer.classList.remove('open');
        document.getElementById('aiRecommendOverlay')?.classList.remove('visible');
        this.isOpen = false;
        document.body.style.overflow = '';
    }

    /**
     * 渲染骨架屏
     * @private
     */
    _renderSkeletons(count) {
        let html = '';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="ai-recommend-skeleton">
                    <div class="ai-skeleton-line long"></div>
                    <div class="ai-skeleton-line medium"></div>
                    <div class="ai-skeleton-line short"></div>
                </div>`;
        }
        return html;
    }

    /**
     * 渲染推荐卡片
     * @private
     */
    _renderCard(link, reason) {
        const tagHtml = link.tag 
            ? `<span class="ai-recommend-card-tag">🏷️ ${link.tag}</span>` 
            : '';
        
        const linkId = link.id || link.url;
        
        return `
            <div class="ai-recommend-card" data-link-id="${linkId}">
                <h4 class="ai-recommend-card-title">📎 ${this._escapeHTML(link.title)}</h4>
                <p class="ai-recommend-card-reason">💡 ${this._escapeHTML(reason)}</p>
                <div>
                    ${tagHtml}
                </div>
                <div class="ai-recommend-card-footer">
                    <span class="ai-recommend-card-time">🕒 ${link.time || ''}</span>
                    <button class="ai-recommend-card-btn" data-link-url="${this._escapeHTML(link.url)}">
                        + 查看
                    </button>
                </div>
            </div>`;
    }

    /**
     * 渲染空状态
     * @private
     */
    _renderEmpty() {
        return `
            <div class="ai-recommend-empty">
                <div class="ai-recommend-empty-icon">🔍</div>
                <div class="ai-recommend-empty-title">暂无相关推荐</div>
                <div>知识库中暂未找到相关链接</div>
            </div>`;
    }

    /**
     * 绑定卡片事件
     * @private
     */
    _bindCardEvents(container) {
        // 卡片点击：滚动到对应链接并高亮
        container.querySelectorAll('.ai-recommend-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // 如果点击的是按钮，不处理卡片点击
                if (e.target.closest('.ai-recommend-card-btn')) return;
                
                const linkId = card.dataset.linkId;
                this._scrollToLink(linkId);
            });
        });

        // 查看按钮：打开链接
        container.querySelectorAll('.ai-recommend-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const url = btn.dataset.linkUrl;
                if (url) {
                    window.open(url, '_blank');
                }
            });
        });
    }

    /**
     * 滚动到指定链接并高亮
     * @private
     */
    _scrollToLink(linkId) {
        // 查找对应的链接卡片
        const cards = document.querySelectorAll('.link-card');
        for (const card of cards) {
            const realIndex = parseInt(card.dataset.realIndex);
            const links = window.AppState?.get('data.links') || [];
            const link = links[realIndex];
            
            if (link && (link.id == linkId || link.url == linkId)) {
                // 滚动到可视区域
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // 高亮效果
                card.style.transition = 'box-shadow 0.3s ease, background-color 0.3s ease';
                card.style.boxShadow = '0 0 0 3px var(--accent-color), 0 4px 16px var(--shadow-medium)';
                card.style.backgroundColor = 'var(--bg-card-hover)';
                
                // 3秒后恢复
                setTimeout(() => {
                    card.style.boxShadow = '';
                    card.style.backgroundColor = '';
                }, 3000);
                
                // 关闭抽屉
                this.hide();
                
                break;
            }
        }
    }

    /**
     * 截断文本
     * @private
     */
    _truncate(text, maxLen) {
        if (!text) return '';
        return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
    }

    /**
     * HTML 转义
     * @private
     */
    _escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/\u0026/g, '\u0026amp;')   // &
            .replace(/\u003C/g, '\u0026lt;')    // <
            .replace(/\u003E/g, '\u0026gt;')    // >
            .replace(/\u0022/g, '\u0026quot;'); // "
    }
}

// 创建全局实例
const recommenderUI = new RecommenderUI();
export { recommenderUI };