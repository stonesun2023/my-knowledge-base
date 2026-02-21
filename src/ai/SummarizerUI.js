/**
 * SummarizerUI - AI 摘要 UI 组件
 * 
 * 在链接卡片上集成摘要功能，使用 Modal 弹出显示
 */
import { summarizer } from './Summarizer.js';
import { aiService } from './AIService.js';

class SummarizerUI {
    constructor() {
        this.activeRequests = new Map(); // linkId -> AbortController
        this.modalContainer = null;
    }

    /**
     * 渲染「💡 摘要」按钮（轻量化样式）
     * @param {number|string} linkId - 链接 ID
     * @returns {string} HTML 字符串
     */
    renderSummaryBtn(linkId) {
        if (!aiService.isConfigured()) {
            return '';
        }

        return `
            <button class="ai-action-btn" 
                    data-summary-link="${linkId}"
                    onclick="window.openSummaryModal('${linkId}')"
                    title="AI 生成摘要">
                💡 摘要
            </button>
        `;
    }

    /**
     * 兼容旧接口：renderInlineButton 改为调用新方法
     * @param {number|string} linkId - 链接 ID
     * @returns {string} HTML 字符串
     */
    renderInlineButton(linkId) {
        return this.renderSummaryBtn(linkId);
    }

    /**
     * 打开摘要 Modal
     * @param {number|string} linkId
     * @param {Object} linkData - 可选，链接数据
     */
    async openSummaryModal(linkId, linkData) {
        // 获取链接数据
        const link = linkData || this._getLinkById(linkId);
        if (!link) {
            console.error('[SummarizerUI] 找不到链接数据:', linkId);
            return;
        }

        // 创建 Modal
        this._createModal();

        // 显示 loading 状态
        this._showModalLoading(link);

        try {
            const result = await summarizer.summarize(link, 'detail');
            
            // 渲染摘要内容
            this._renderModalContent(linkId, link, result);

        } catch (error) {
            this._showModalError(linkId, link, error.message);
        }
    }

    /**
     * 创建 Modal 容器
     */
    _createModal() {
        // 移除已存在的 Modal
        this._closeModal();

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.id = 'ai-summary-modal-overlay';
        overlay.className = 'ai-summary-modal-overlay';
        overlay.innerHTML = `
            <div class="ai-summary-modal">
                <div class="ai-summary-modal-header">
                    <span class="ai-summary-modal-title">💡 AI 摘要</span>
                    <button class="ai-summary-modal-close" onclick="window.closeSummaryModal()">✕</button>
                </div>
                <div class="ai-summary-modal-body" id="ai-summary-modal-body">
                    <!-- 内容动态填充 -->
                </div>
            </div>
        `;

        // 点击遮罩关闭
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this._closeModal();
            }
        });

        // ESC 键关闭
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                this._closeModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        document.body.appendChild(overlay);
        this.modalContainer = overlay;

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
    }

    /**
     * 显示 Modal Loading 状态
     */
    _showModalLoading(link) {
        const body = document.getElementById('ai-summary-modal-body');
        if (!body) return;

        body.innerHTML = `
            <div class="ai-summary-loading-state">
                <div class="ai-summary-spinner"></div>
                <div class="ai-summary-loading-text">AI 正在分析...</div>
                <div class="ai-summary-loading-url">${this._escapeHTML(link.url || '')}</div>
            </div>
        `;
    }

    /**
     * 渲染 Modal 内容
     */
    _renderModalContent(linkId, link, result) {
        const body = document.getElementById('ai-summary-modal-body');
        if (!body) return;

        const timeAgo = this._formatTimeAgo(result.updatedAt || Date.now());
        
        // 将 Markdown 转换为 HTML
        const formattedSummary = result.summary
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^#{1,3}\s(.+)$/gm, '<strong>$1</strong>')
            .replace(/^•\s(.+)$/gm, '<li>$1</li>')
            .replace(/^-\s(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        // 内容类型标签
        const typeLabels = {
            tech: '🔧 技术文档', 
            video: '🎬 视频',
            podcast: '🎙️ 播客', 
            paper: '📄 论文', 
            article: '📝 文章'
        };
        const typeLabel = typeLabels[result.contentType] || '📝 文章';

        body.innerHTML = `
            <div class="ai-summary-result">
                <div class="ai-summary-meta">
                    <span class="ai-summary-type-tag">${typeLabel}</span>
                    <span class="ai-summary-time">${result.cached ? '缓存' : '生成'}于 ${timeAgo}</span>
                </div>
                <div class="ai-summary-link-info">
                    <div class="ai-summary-link-title">${this._escapeHTML(link.title || '无标题')}</div>
                    <div class="ai-summary-link-url">${this._escapeHTML(link.url || '')}</div>
                </div>
                <div class="ai-summary-content"><p>${formattedSummary}</p></div>
                <div class="ai-summary-actions">
                    <button class="ai-summary-refresh-btn" data-link-id="${linkId}">
                        🔄 重新生成
                    </button>
                </div>
            </div>
        `;

        // 绑定重新生成按钮
        body.querySelector('.ai-summary-refresh-btn')?.addEventListener('click', async () => {
            summarizer.clearCache(linkId);
            this._showModalLoading(link);
            try {
                const newResult = await summarizer.summarize(link, 'detail');
                this._renderModalContent(linkId, link, newResult);
            } catch (error) {
                this._showModalError(linkId, link, error.message);
            }
        });
    }

    /**
     * 显示 Modal 错误状态
     */
    _showModalError(linkId, link, errorMessage) {
        const body = document.getElementById('ai-summary-modal-body');
        if (!body) return;

        body.innerHTML = `
            <div class="ai-summary-error-state">
                <div class="ai-summary-error-icon">❌</div>
                <div class="ai-summary-error-text">生成失败</div>
                <div class="ai-summary-error-msg">${this._escapeHTML(errorMessage)}</div>
                <button class="ai-summary-retry-btn" data-link-id="${linkId}">
                    🔄 重试
                </button>
            </div>
        `;

        // 绑定重试按钮
        body.querySelector('.ai-summary-retry-btn')?.addEventListener('click', async () => {
            this._showModalLoading(link);
            try {
                const result = await summarizer.summarize(link, 'detail');
                this._renderModalContent(linkId, link, result);
            } catch (error) {
                this._showModalError(linkId, link, error.message);
            }
        });
    }

    /**
     * 关闭 Modal
     */
    _closeModal() {
        const overlay = document.getElementById('ai-summary-modal-overlay');
        if (overlay) {
            overlay.remove();
        }
        this.modalContainer = null;
        document.body.style.overflow = '';
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
     * 绑定按钮事件（兼容旧接口）
     * @param {HTMLElement} container
     */
    bindEvents(container) {
        // 新版本使用 onclick 直接调用 window.openSummaryModal
        // 这里保留兼容性，处理旧的 .ai-summary-btn
        container.querySelectorAll('.ai-summary-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const linkId = btn.dataset.linkId;
                const link = this._getLinkById(linkId);
                if (link) {
                    await this.openSummaryModal(linkId, link);
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
     * HTML 转义
     */
    _escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/\u0026/g, '\u0026amp;')
            .replace(/\u003C/g, '\u0026lt;')
            .replace(/\u003E/g, '\u0026gt;')
            .replace(/\u0022/g, '\u0026quot;');
    }

    /**
     * 获取样式
     */
    static getStyles() {
        return `
            /* AI 功能按钮行 */
            .ai-actions-row {
                display: flex;
                align-items: center;
                gap: 4px;
                margin-top: 8px;
                padding-top: 8px;
                border-top: 1px solid var(--border-color);
            }

            /* AI 按钮分隔符 */
            .ai-action-divider {
                color: var(--text-tertiary);
                font-size: 12px;
                margin: 0 2px;
            }

            /* 轻量化 AI 按钮 */
            .ai-action-btn {
                padding: 4px 10px;
                background: transparent;
                color: var(--text-secondary);
                border: none;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
                transition: all 0.15s ease;
                font-family: inherit;
            }

            .ai-action-btn:hover {
                background: var(--bg-card);
                color: var(--accent-color);
            }

            .ai-action-btn:active {
                transform: scale(0.96);
            }

            /* Modal 遮罩层 */
            .ai-summary-modal-overlay {
                position: fixed;
                inset: 0;
                z-index: 9999;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
                backdrop-filter: blur(4px);
                animation: fadeIn 0.2s ease;
            }

            body.dark-mode .ai-summary-modal-overlay {
                background: rgba(0, 0, 0, 0.7);
            }

            /* Modal 卡片 */
            .ai-summary-modal {
                background: var(--bg-secondary);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                max-width: 560px;
                width: 100%;
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                animation: slideUp 0.25s ease;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes slideUp {
                from { 
                    opacity: 0;
                    transform: translateY(20px) scale(0.96);
                }
                to { 
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            /* Modal 头部 */
            .ai-summary-modal-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 20px;
                border-bottom: 1px solid var(--border-color);
            }

            .ai-summary-modal-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }

            .ai-summary-modal-close {
                width: 32px;
                height: 32px;
                border: none;
                background: var(--bg-card);
                color: var(--text-secondary);
                border-radius: 8px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: all 0.15s ease;
            }

            .ai-summary-modal-close:hover {
                background: var(--border-color);
                color: var(--text-primary);
            }

            /* Modal 内容区 */
            .ai-summary-modal-body {
                padding: 20px;
                overflow-y: auto;
                flex: 1;
            }

            /* Loading 状态 */
            .ai-summary-loading-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px 20px;
            }

            .ai-summary-spinner {
                width: 40px;
                height: 40px;
                border: 3px solid var(--border-color);
                border-top-color: #5856d6;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            .ai-summary-loading-text {
                margin-top: 16px;
                font-size: 15px;
                color: var(--text-secondary);
            }

            .ai-summary-loading-url {
                margin-top: 8px;
                font-size: 12px;
                color: var(--text-tertiary);
                max-width: 100%;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            /* 结果内容 */
            .ai-summary-result {
                animation: fadeIn 0.2s ease;
            }

            .ai-summary-meta {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-bottom: 12px;
            }

            .ai-summary-type-tag {
                font-size: 12px;
                padding: 3px 10px;
                background: rgba(88, 86, 214, 0.1);
                color: #5856d6;
                border-radius: 999px;
                font-weight: 500;
            }

            body.dark-mode .ai-summary-type-tag {
                background: rgba(88, 86, 214, 0.2);
                color: #af52de;
            }

            .ai-summary-time {
                font-size: 12px;
                color: var(--text-tertiary);
            }

            .ai-summary-link-info {
                padding: 12px;
                background: var(--bg-card);
                border-radius: 8px;
                margin-bottom: 16px;
            }

            .ai-summary-link-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 4px;
            }

            .ai-summary-link-url {
                font-size: 12px;
                color: var(--text-tertiary);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            .ai-summary-content {
                font-size: 14px;
                line-height: 1.7;
                color: var(--text-primary);
            }

            .ai-summary-content p {
                margin: 0 0 10px 0;
            }

            .ai-summary-content ul {
                margin: 4px 0 10px 0;
                padding-left: 18px;
            }

            .ai-summary-content li {
                margin-bottom: 4px;
                line-height: 1.6;
            }

            .ai-summary-content strong {
                color: var(--text-primary);
                font-weight: 600;
            }

            .ai-summary-actions {
                margin-top: 16px;
                display: flex;
                justify-content: flex-end;
            }

            .ai-summary-refresh-btn,
            .ai-summary-retry-btn {
                padding: 8px 16px;
                background: transparent;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                font-size: 13px;
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.15s ease;
                font-family: inherit;
            }

            .ai-summary-refresh-btn:hover,
            .ai-summary-retry-btn:hover {
                border-color: var(--accent-color);
                color: var(--accent-color);
            }

            /* 错误状态 */
            .ai-summary-error-state {
                display: flex;
                flex-direction: column;
                align-items: center;
                padding: 40px 20px;
                text-align: center;
            }

            .ai-summary-error-icon {
                font-size: 40px;
                margin-bottom: 12px;
            }

            .ai-summary-error-text {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
                margin-bottom: 8px;
            }

            .ai-summary-error-msg {
                font-size: 13px;
                color: var(--text-tertiary);
                margin-bottom: 16px;
                max-width: 300px;
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

            /* 移动端适配 */
            @media (max-width: 768px) {
                .ai-summary-modal {
                    max-width: 100%;
                    max-height: 90vh;
                    border-radius: 16px 16px 0 0;
                    margin-top: auto;
                }

                .ai-summary-modal-overlay {
                    align-items: flex-end;
                    padding: 0;
                }
            }
        `;
    }
}

// 导出单例
const summarizerUI = new SummarizerUI();
export { SummarizerUI, summarizerUI };