/**
 * SummarizerUI - AI 摘要 UI 组件
 * 
 * 在链接卡片上集成摘要功能
 */
import { summarizer } from './Summarizer.js';
import { aiService } from './AIService.js';

class SummarizerUI {
    constructor() {
        this.activeRequests = new Map(); // linkId -> AbortController
    }

    /**
     * 渲染「生成摘要」按钮（卡片内联）
     * @param {number|string} linkId - 链接 ID
     * @returns {string} HTML 字符串
     */
    renderInlineButton(linkId) {
        if (!aiService.isConfigured()) {
            return '';
        }

        // 检查是否有缓存
        const cached = summarizer.getCachedSummary(linkId, 'short');
        
        if (cached) {
            // 已有缓存，直接显示摘要
            return `
                <div class="ai-summary-inline" data-link-id="${linkId}">
                    <span class="ai-summary-text">💡 ${cached}</span>
                    <button class="ai-summary-close" onclick="this.parentElement.remove()">✕</button>
                </div>
            `;
        }

        return `
            <button class="ai-summary-btn" 
                    data-link-id="${linkId}"
                    title="AI 生成一句话摘要">
                💡 生成摘要
            </button>
        `;
    }

    /**
     * 显示内联摘要
     * @param {number|string} linkId
     * @param {Object} link
     * @param {HTMLElement} buttonEl
     */
    async showInlineSummary(linkId, link, buttonEl) {
        // 设置 loading 状态
        buttonEl.classList.add('loading');
        buttonEl.disabled = true;
        buttonEl.innerHTML = '🔄 生成中...';

        try {
            const result = await summarizer.summarize(link, 'short');
            
            // 替换按钮为摘要显示
            const container = document.createElement('div');
            container.className = 'ai-summary-inline';
            container.dataset.linkId = linkId;
            container.innerHTML = `
                <span class="ai-summary-text">💡 ${result.summary}</span>
                <button class="ai-summary-close" onclick="this.parentElement.remove()">✕</button>
            `;
            
            buttonEl.replaceWith(container);

        } catch (error) {
            buttonEl.classList.remove('loading');
            buttonEl.disabled = false;
            buttonEl.innerHTML = '💡 生成摘要';
            
            // 显示错误提示
            const errorEl = document.createElement('div');
            errorEl.className = 'ai-summary-error';
            errorEl.innerHTML = `❌ ${error.message}`;
            buttonEl.parentElement.appendChild(errorEl);
            
            setTimeout(() => errorEl.remove(), 3000);
        }
    }

    /**
     * 显示详细摘要
     * @param {number|string} linkId
     * @param {Object} link
     * @param {HTMLElement} container - 渲染容器
     */
    async showDetailSummary(linkId, link, container) {
        container.innerHTML = `
            <div class="ai-summary-detail loading">
                <div class="ai-summary-loading">
                    <div class="lp-spinner"></div>
                    <span>AI 正在分析...</span>
                </div>
            </div>
        `;

        try {
            const result = await summarizer.summarize(link, 'detail');
            
            const timeAgo = this._formatTimeAgo(result.updatedAt || Date.now());
            
            container.innerHTML = `
                <div class="ai-summary-detail">
                    <div class="ai-summary-header">
                        <span class="ai-summary-icon">💡</span>
                        <span class="ai-summary-label">AI 摘要</span>
                        <span class="ai-summary-time">${result.cached ? '缓存' : '生成'}于 ${timeAgo}</span>
                    </div>
                    <div class="ai-summary-content">${result.summary}</div>
                    <div class="ai-summary-actions">
                        <button class="ai-summary-refresh" data-link-id="${linkId}">
                            🔄 重新生成
                        </button>
                    </div>
                </div>
            `;

            // 绑定重新生成按钮
            container.querySelector('.ai-summary-refresh')?.addEventListener('click', async () => {
                summarizer.clearCache(linkId);
                await this.showDetailSummary(linkId, link, container);
            });

        } catch (error) {
            container.innerHTML = `
                <div class="ai-summary-detail error">
                    <span>❌ 生成失败：${error.message}</span>
                    <button class="ai-summary-retry" data-link-id="${linkId}">重试</button>
                </div>
            `;
            
            container.querySelector('.ai-summary-retry')?.addEventListener('click', async () => {
                await this.showDetailSummary(linkId, link, container);
            });
        }
    }

    /**
     * 渲染批量生成按钮
     * @returns {string} HTML 字符串
     */
    renderBatchButton() {
        if (!aiService.isConfigured()) {
            return '';
        }

        return `
            <button class="save-btn ai-batch-summary-btn" id="batchSummaryBtn" style="
                background: linear-gradient(135deg, #5856d6, #af52de);
                margin: 0;
                padding: 12px 20px;
                font-size: 15px;
            ">
                💡 批量生成摘要
            </button>
        `;
    }

    /**
     * 执行批量生成
     * @param {Object[]} links - 链接数组
     * @param {Function} onProgress - 进度回调
     */
    async runBatch(links, onProgress) {
        return await summarizer.summarizeBatch(links, 'short', onProgress);
    }

    /**
     * 绑定按钮事件
     * @param {HTMLElement} container
     */
    bindEvents(container) {
        // 绑定单个摘要按钮
        container.querySelectorAll('.ai-summary-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                
                const linkId = btn.dataset.linkId;
                const link = this._getLinkById(linkId);
                
                if (link) {
                    await this.showInlineSummary(linkId, link, btn);
                }
            });
        });
    }

    /**
     * 根据 ID 获取链接数据
     */
    _getLinkById(linkId) {
        if (window.AppState) {
            const links = AppState.get('data.links');
            let link = links.find(l => l.id == linkId);
            if (!link) {
                link = links[parseInt(linkId)];
            }
            return link || null;
        }
        return null;
    }

    /**
     * 格式化时间差
     */
    _formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return `${Math.floor(diff / 86400000)} 天前`;
    }

    /**
     * 获取样式
     */
    static getStyles() {
        return `
            /* 摘要按钮 */
            .ai-summary-btn {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 6px 12px;
                margin-top: 8px;
                background: linear-gradient(135deg, #5856d6, #af52de);
                color: white;
                border: none;
                border-radius: 16px;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                font-family: inherit;
            }

            .ai-summary-btn:hover:not(:disabled) {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(88, 86, 214, 0.3);
            }

            .ai-summary-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .ai-summary-btn.loading {
                background: var(--bg-card);
                color: var(--text-secondary);
            }

            /* 内联摘要显示 */
            .ai-summary-inline {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-top: 8px;
                padding: 8px 12px;
                background: rgba(88, 86, 214, 0.08);
                border-radius: 8px;
                border-left: 3px solid #5856d6;
            }

            body.dark-mode .ai-summary-inline {
                background: rgba(88, 86, 214, 0.15);
            }

            .ai-summary-text {
                flex: 1;
                font-size: 13px;
                color: var(--text-secondary);
                font-style: italic;
                line-height: 1.4;
            }

            .ai-summary-close {
                width: 20px;
                height: 20px;
                border: none;
                background: transparent;
                color: var(--text-tertiary);
                cursor: pointer;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                transition: all 0.15s ease;
            }

            .ai-summary-close:hover {
                background: var(--bg-card);
                color: var(--text-primary);
            }

            /* 详细摘要 */
            .ai-summary-detail {
                padding: 16px;
                background: var(--bg-card);
                border-radius: 12px;
                border: 1px solid var(--border-color);
            }

            .ai-summary-detail.loading {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100px;
            }

            .ai-summary-loading {
                display: flex;
                align-items: center;
                gap: 10px;
                color: var(--text-secondary);
            }

            .ai-summary-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
            }

            .ai-summary-icon {
                font-size: 18px;
            }

            .ai-summary-label {
                font-weight: 600;
                color: var(--text-primary);
            }

            .ai-summary-time {
                font-size: 12px;
                color: var(--text-tertiary);
                margin-left: auto;
            }

            .ai-summary-content {
                font-size: 14px;
                line-height: 1.7;
                color: var(--text-primary);
            }

            .ai-summary-actions {
                margin-top: 12px;
                display: flex;
                justify-content: flex-end;
            }

            .ai-summary-refresh,
            .ai-summary-retry {
                padding: 6px 12px;
                background: transparent;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                font-size: 12px;
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.15s ease;
            }

            .ai-summary-refresh:hover,
            .ai-summary-retry:hover {
                border-color: var(--accent-color);
                color: var(--accent-color);
            }

            /* 错误状态 */
            .ai-summary-error {
                margin-top: 8px;
                padding: 8px 12px;
                background: rgba(255, 59, 48, 0.1);
                border-radius: 8px;
                font-size: 13px;
                color: #ff3b30;
            }

            .ai-summary-detail.error {
                display: flex;
                align-items: center;
                gap: 12px;
                color: #ff3b30;
            }

            /* 批量生成按钮 */
            .ai-batch-summary-btn {
                flex: 1;
                min-width: 140px;
            }

            .ai-batch-summary-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(88, 86, 214, 0.3);
            }

            /* 批量进度条 */
            .ai-batch-progress {
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 16px 24px;
                box-shadow: 0 8px 32px var(--shadow-medium);
                z-index: 9000;
                min-width: 300px;
            }

            .ai-batch-progress-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 12px;
            }

            .ai-batch-progress-bar {
                height: 8px;
                background: var(--bg-card);
                border-radius: 4px;
                overflow: hidden;
            }

            .ai-batch-progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #5856d6, #af52de);
                border-radius: 4px;
                transition: width 0.3s ease;
            }

            .ai-batch-progress-text {
                font-size: 12px;
                color: var(--text-secondary);
                margin-top: 8px;
                text-align: center;
            }
        `;
    }
}

// 导出单例
const summarizerUI = new SummarizerUI();
export { SummarizerUI, summarizerUI };