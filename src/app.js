/**
 * app.js - 应用主模块
 * 
 * 负责协调高级搜索、AI 服务等模块
 */

import { AdvancedSearch } from './search/AdvancedSearch.js';
import { buildFilter } from './search/SearchQueryBuilder.mjs';
import { savedQueries } from './search/SavedQueries.js';
import { AIProviderSwitcher } from './ai/AIProviderSwitcher.js';
import { tagSuggesterUI, TagSuggesterUI } from './ai/TagSuggesterUI.js';
import { summarizerUI, SummarizerUI } from './ai/SummarizerUI.js';
import { recommenderUI, RecommenderUI } from './ai/RecommenderUI.js';
import { aiService } from './ai/AIService.js';
import { aiSettings, AISettings } from './settings/AISettings.js';

// 暴露 aiSettings 到全局，供 AIProviderSwitcher 使用
window.aiSettings = aiSettings;

/**
 * 高级搜索管理器
 */
class AdvancedSearchManager {
    constructor() {
        this.advancedSearch = null;
        this.isExpanded = false;
        this.isActive = false; // 是否处于高级搜索模式
        this.matchedCount = 0;
        
        // DOM 引用（初始化时设置）
        this.panel = null;
        this.toggleBtn = null;
        this.searchInput = null;
        this.resultHint = null;
    }

    /**
     * 初始化高级搜索
     */
    init() {
        // 创建高级搜索实例
        this.advancedSearch = new AdvancedSearch({
            containerId: 'advancedSearchPanel',
            availableTags: this._getAvailableTags(),
            onSearch: (query) => this._handleAdvancedSearch(query)
        });

        // 获取 DOM 引用
        this.panel = document.getElementById('advanced-search-panel');
        this.toggleBtn = document.getElementById('advancedSearchToggle');
        this.searchInput = document.getElementById('searchInput');

        // 创建结果提示元素
        this._createResultHint();

        // 渲染高级搜索面板
        if (this.panel) {
            this.panel.innerHTML = this.advancedSearch.render();
            this.advancedSearch.bindEvents();
        }

        // 绑定切换按钮
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => this.toggle());
        }

        // 监听普通搜索框输入
        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this._handleNormalSearch());
        }

        console.log('[AdvancedSearchManager] 初始化完成');
    }

    /**
     * 获取可用标签列表
     */
    _getAvailableTags() {
        // 从 AppState 获取已使用的标签
        if (window.AppState) {
            const links = AppState.get('data.links');
            const tags = new Set();
            links.forEach(link => {
                if (link.tag) tags.add(link.tag);
            });
            return Array.from(tags);
        }
        return ['编程', '设计', 'AI', '学习', '工作', '工具', '其他'];
    }

    /**
     * 创建结果提示元素
     */
    _createResultHint() {
        // 在搜索框旁边创建提示
        const searchContainer = this.searchInput?.parentElement;
        if (!searchContainer) return;

        this.resultHint = document.createElement('div');
        this.resultHint.className = 'advanced-search-result-hint';
        this.resultHint.style.cssText = `
            display: none;
            margin-top: 8px;
            padding: 8px 12px;
            background: var(--bg-card);
            border: 1px solid var(--accent-color);
            border-radius: 8px;
            font-size: 14px;
            color: var(--accent-color);
            font-weight: 500;
        `;
        searchContainer.appendChild(this.resultHint);
    }

    /**
     * 切换面板展开/收起
     */
    toggle() {
        this.isExpanded = !this.isExpanded;
        
        if (this.panel) {
            if (this.isExpanded) {
                this.panel.style.maxHeight = '800px';
                this.panel.style.opacity = '1';
                this.toggleBtn?.classList.add('active');
            } else {
                this.panel.style.maxHeight = '0';
                this.panel.style.opacity = '0';
                this.toggleBtn?.classList.remove('active');
            }
        }
    }

    /**
     * 展开面板
     */
    expand() {
        if (!this.isExpanded) {
            this.toggle();
        }
    }

    /**
     * 收起面板
     */
    collapse() {
        if (this.isExpanded) {
            this.toggle();
        }
    }

    /**
     * 处理高级搜索
     */
    _handleAdvancedSearch(query) {
        console.log('[AdvancedSearchManager] 执行高级搜索:', query);

        // 清空普通搜索框
        if (this.searchInput) {
            this.searchInput.value = '';
            if (window.AppState) {
                AppState.set('filters.searchKeyword', '', { persist: false });
            }
        }

        // 如果没有有效条件，退出高级搜索模式
        if (query.conditions.length === 0) {
            this._exitAdvancedMode();
            return;
        }

        // 进入高级搜索模式
        this.isActive = true;
        this.searchInput?.classList.add('advanced-mode');

        // 构建过滤函数
        const filter = buildFilter(query.conditions, query.logic);

        // 获取数据并过滤
        if (window.AppState) {
            const links = AppState.get('data.links');
            const matchedLinks = links.filter(filter);
            this.matchedCount = matchedLinks.length;

            // 更新 AppState 中的高级搜索结果
            AppState.set('filters.advancedFilter', { filter, matchedIds: matchedLinks.map(l => l.id) }, { persist: false });

            // 重新渲染列表
            this._renderAdvancedResults(matchedLinks);
        }

        // 显示结果提示
        this._showResultHint();

        // 收起面板
        this.collapse();
    }

    /**
     * 渲染高级搜索结果
     */
    _renderAdvancedResults(matchedLinks) {
        const linkList = document.getElementById('linkList');
        if (!linkList) return;

        if (matchedLinks.length === 0) {
            linkList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <p class="empty-title">没有找到匹配的链接</p>
                    <p class="empty-desc">试试调整搜索条件～</p>
                </div>`;
            return;
        }

        // 使用现有的渲染逻辑
        const links = AppState.get('data.links');
        let html = '';
        
        matchedLinks.forEach(function(link) {
            const realIndex = links.indexOf(link);
            const isSelected = window.Selection && Selection.selected.has(realIndex);
            const tagHTML = link.tag ? `<span class="card-tag">🏷️ ${link.tag}</span>` : '';
            const title = escapeHTML(link.title);
            const url = escapeHTML(link.url);
            const note = escapeHTML(link.note);

            html += `
                <div class="link-card${isSelected ? ' selected' : ''}" data-real-index="${realIndex}">
                    <div class="card-checkbox${isSelected ? ' checked' : ''}"
                         onclick="handleCheckboxClick(event, ${realIndex}, this.closest('.link-card'))">
                        ${isSelected ? '✓' : ''}
                    </div>
                    <div class="card-content">
                        <h3>📎 ${title}</h3>
                        <p class="link-url">🔗 <a href="${url}" target="_blank">${url}</a></p>
                        <p class="link-note">📝 ${note || '（无笔记）'}</p>
                        ${tagHTML}
                        <p class="link-time">🕒 ${link.time}</p>
                        <div class="card-actions">
                            <button class="edit-btn" onclick="editLink(${realIndex})">✏️ 编辑</button>
                            <button class="delete-btn" onclick="deleteLink(${realIndex})">🗑️ 删除</button>
                        </div>
                        <div class="ai-actions-row">
                            ${window.appModule ? window.appModule.renderAISummaryButton(link, realIndex) : ''}
                            <span class="ai-action-divider">·</span>
                            ${window.appModule ? window.appModule.renderRecommendButton(link, realIndex) : ''}
                            <span class="ai-action-divider">·</span>
                            ${window.appModule ? window.appModule.renderAITagButton(link, realIndex) : ''}
                        </div>
                    </div>
                </div>`;
        });
        
        linkList.innerHTML = html;

        // 绑定 AI 功能按钮事件
        if (window.appModule) {
            window.appModule.bindAISummaryButtons(linkList);
            window.appModule.bindAITagButtons(linkList);
        }

        // 重新绑定链接预览
        if (window.LinkPreview) {
            window.LinkPreview.rebindPreloader();
        }
    }

    /**
     * 显示结果提示
     */
    _showResultHint() {
        if (this.resultHint) {
            this.resultHint.innerHTML = `🔍 高级搜索：找到 <strong>${this.matchedCount}</strong> 条结果 
                <button onclick="window.advancedSearchManager.exitAdvancedMode()" 
                    style="margin-left: 10px; padding: 2px 8px; border: none; border-radius: 4px; 
                    background: var(--accent-color); color: white; cursor: pointer; font-size: 12px;">
                    清空
                </button>`;
            this.resultHint.style.display = 'block';
        }

        // 更新计数标签
        const countLabel = document.getElementById('countLabel');
        if (countLabel) {
            const links = AppState.get('data.links');
            countLabel.textContent = `（共 ${links.length} 个，高级搜索 ${this.matchedCount} 个）`;
        }
    }

    /**
     * 隐藏结果提示
     */
    _hideResultHint() {
        if (this.resultHint) {
            this.resultHint.style.display = 'none';
        }
    }

    /**
     * 处理普通搜索输入
     */
    _handleNormalSearch() {
        // 如果正在高级搜索模式，退出
        if (this.isActive) {
            this._exitAdvancedMode(false);
        }
    }

    /**
     * 退出高级搜索模式
     */
    _exitAdvancedMode(restoreList = true) {
        this.isActive = false;
        this.matchedCount = 0;
        this.searchInput?.classList.remove('advanced-mode');
        this._hideResultHint();

        // 重置高级搜索面板
        if (this.advancedSearch) {
            this.advancedSearch.reset();
        }

        // 清除 AppState 中的高级搜索状态
        if (window.AppState) {
            AppState.set('filters.advancedFilter', null, { persist: false });
        }

        // 恢复列表显示
        if (restoreList && window.renderLinkList) {
            renderLinkList();
        }

        // 恢复计数标签
        if (restoreList) {
            const countLabel = document.getElementById('countLabel');
            const links = AppState.get('data.links');
            if (countLabel && links) {
                countLabel.textContent = `（共 ${links.length} 个）`;
            }
        }

        console.log('[AdvancedSearchManager] 已退出高级搜索模式');
    }

    /**
     * 公开方法：退出高级搜索模式
     */
    exitAdvancedMode() {
        this._exitAdvancedMode();
    }

    /**
     * 更新可用标签
     */
    updateAvailableTags() {
        if (this.advancedSearch) {
            this.advancedSearch.setAvailableTags(this._getAvailableTags());
        }
    }
}

// 工具函数：HTML 转义
function escapeHTML(str) {
    if (!str) return '';
    return String(str)
        .replace(/\u0026/g, '\u0026amp;')   // &
        .replace(/\u003C/g, '\u0026lt;')    // <
        .replace(/\u003E/g, '\u0026gt;')    // >
        .replace(/\u0022/g, '\u0026quot;'); // "
}

// 创建全局实例
const advancedSearchManager = new AdvancedSearchManager();
window.advancedSearchManager = advancedSearchManager;

// AI 服务商切换器实例
let aiProviderSwitcher = null;

/**
 * 初始化 AI 服务商切换器
 */
function initAIProviderSwitcher() {
    const container = document.getElementById('ai-provider-switcher');
    if (!container) {
        console.warn('[AIProviderSwitcher] 容器元素未找到');
        return;
    }

    aiProviderSwitcher = new AIProviderSwitcher();
    container.innerHTML = aiProviderSwitcher.render();
    aiProviderSwitcher.bindEvents();

    // 注入 AISettings 样式
    const styleEl = document.createElement('style');
    styleEl.textContent = AISettings.getStyles();
    document.head.appendChild(styleEl);

    // 监听服务商切换事件
    document.addEventListener('ai-provider-changed', (e) => {
        console.log('[App] AI 服务商已切换:', e.detail);
        // 可以在这里触发其他模块的更新
    });

    // 监听打开设置事件
    document.addEventListener('ai-open-settings', (e) => {
        console.log('[App] 打开 AI 设置:', e.detail);
        const providerId = e.detail?.providerId;
        if (providerId) {
            aiSettings.switchToProvider(providerId);
        }
        aiSettings.show();
    });

    console.log('[AIProviderSwitcher] 初始化完成');
}

/**
 * 初始化智能标签推荐功能
 */
function initTagSuggester() {
    // 注入样式
    const styleEl = document.createElement('style');
    styleEl.textContent = TagSuggesterUI.getStyles();
    document.head.appendChild(styleEl);

    // 监听 AI 标签选择事件
    document.addEventListener('ai-tag-selected', (e) => {
        const { linkId, tag } = e.detail;
        console.log('[App] AI 标签已选择:', { linkId, tag });
        
        // 更新链接标签
        if (window.AppState) {
            const links = AppState.get('data.links');
            const newLinks = links.map((link, i) => {
                // 尝试按 id 或索引匹配
                if (link.id == linkId || i == linkId) {
                    return { ...link, tag };
                }
                return link;
            });
            AppState.setLinks(newLinks, 'ai-tag-update');
            
            // 刷新列表
            if (window.renderAll) {
                renderAll();
            }
            
            // 显示提示
            if (window.Selection && Selection.toast) {
                Selection.toast(`✅ 已添加标签「${tag}」`);
            }
        }
    });

    console.log('[TagSuggester] 初始化完成');
}

/**
 * 渲染智能推荐按钮（供外部调用）
 * @param {Object} link - 链接对象
 * @param {number} realIndex - 链接索引
 * @returns {string} HTML 字符串
 */
function renderAITagButton(link, realIndex) {
    if (!aiService.isConfigured()) {
        return '';
    }
    return tagSuggesterUI.renderButton(link.id || realIndex, link.tag);
}

/**
 * 绑定智能推荐按钮事件
 * @param {HTMLElement} container
 */
function bindAITagButtons(container) {
    if (!aiService.isConfigured()) {
        return;
    }
    tagSuggesterUI.bindEvents(container);
}

/**
 * 初始化摘要功能
 */
function initSummarizer() {
    // 注入样式
    const styleEl = document.createElement('style');
    styleEl.textContent = SummarizerUI.getStyles();
    document.head.appendChild(styleEl);

    // 挂载 openSummaryModal 到 window，供 onclick 调用
    window.openSummaryModal = (linkId, linkData) => {
        summarizerUI.openSummaryModal(linkId, linkData);
    };

    // 挂载 closeSummaryModal 到 window
    window.closeSummaryModal = () => {
        summarizerUI._closeModal();
    };

    // 绑定批量生成按钮事件
    document.addEventListener('click', (e) => {
        if (e.target.id === 'batchSummaryBtn') {
            handleBatchSummary();
        }
    });

    console.log('[Summarizer] 初始化完成');
}

/**
 * 渲染摘要按钮（供外部调用）
 * @param {Object} link - 链接对象
 * @param {number} realIndex - 链接索引
 * @returns {string} HTML 字符串
 */
function renderAISummaryButton(link, realIndex) {
    if (!aiService.isConfigured()) {
        return '';
    }
    return summarizerUI.renderInlineButton(link.id || realIndex);
}

/**
 * 绑定摘要按钮事件
 * @param {HTMLElement} container
 */
function bindAISummaryButtons(container) {
    if (!aiService.isConfigured()) {
        return;
    }
    summarizerUI.bindEvents(container);
}

/**
 * 渲染批量摘要按钮（供外部调用）
 * @returns {string} HTML 字符串
 */
function renderBatchSummaryButton() {
    return summarizerUI.renderBatchButton();
}

/**
 * 初始化相关推荐功能
 */
function initRecommender() {
    // 初始化 UI（挂载抽屉到 body）
    recommenderUI.init();

    // 监听推荐按钮点击
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('.ai-recommend-trigger');
        if (trigger) {
            const linkId = trigger.dataset.recommendLink;
            if (linkId && window.AppState) {
                const links = AppState.get('data.links');
                // 查找对应的链接
                const currentLink = links.find((l, i) => 
                    (l.id && l.id.toString() === linkId) || 
                    i.toString() === linkId ||
                    l.url === linkId
                );
                
                if (currentLink) {
                    recommenderUI.showRecommendations(currentLink, links);
                }
            }
        }
    });

    console.log('[Recommender] 初始化完成');
}

/**
 * 渲染相关推荐按钮（供外部调用）
 * @param {Object} link - 链接对象
 * @param {number} realIndex - 链接索引
 * @returns {string} HTML 字符串
 */
function renderRecommendButton(link, realIndex) {
    // 相关推荐即使未配置 AI 也可用（本地降级）
    return recommenderUI.renderTriggerButton(link.id || realIndex);
}

/**
 * 处理批量生成摘要
 */
async function handleBatchSummary() {
    if (!window.AppState) return;
    
    const links = AppState.get('data.links');
    if (links.length === 0) {
        if (window.Selection && Selection.toast) {
            Selection.toast('没有链接可以生成摘要');
        }
        return;
    }

    // 创建进度条
    const progressEl = document.createElement('div');
    progressEl.className = 'ai-batch-progress';
    progressEl.innerHTML = `
        <div class="ai-batch-progress-title">💡 批量生成摘要</div>
        <div class="ai-batch-progress-bar">
            <div class="ai-batch-progress-fill" style="width: 0%"></div>
        </div>
        <div class="ai-batch-progress-text">准备中...</div>
    `;
    document.body.appendChild(progressEl);

    const fillEl = progressEl.querySelector('.ai-batch-progress-fill');
    const textEl = progressEl.querySelector('.ai-batch-progress-text');

    try {
        const results = await summarizerUI.runBatch(links, (current, total, result) => {
            const pct = Math.round((current / total) * 100);
            fillEl.style.width = `${pct}%`;
            textEl.textContent = `已完成 ${current}/${total}`;
        });

        // 完成
        const successCount = results.filter(r => !r.error).length;
        textEl.textContent = `✅ 完成！成功 ${successCount}/${links.length}`;

        // 3秒后关闭
        setTimeout(() => {
            progressEl.style.opacity = '0';
            setTimeout(() => progressEl.remove(), 300);
        }, 2000);

        // 刷新列表
        if (window.renderLinkList) {
            renderLinkList();
        }

    } catch (error) {
        textEl.textContent = `❌ 失败：${error.message}`;
        setTimeout(() => progressEl.remove(), 3000);
    }
}

// 别名：供 index.html 调用
const renderAIRecommendButton = renderRecommendButton;

// 导出
export { 
    AdvancedSearchManager, 
    advancedSearchManager, 
    initAIProviderSwitcher,
    initTagSuggester,
    initSummarizer,
    initRecommender,
    renderAITagButton,
    bindAITagButtons,
    renderAISummaryButton,
    bindAISummaryButtons,
    renderBatchSummaryButton,
    renderRecommendButton,
    renderAIRecommendButton
};
