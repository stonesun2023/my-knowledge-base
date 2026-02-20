/**
 * AIProviderSwitcher - AI 服务商快捷切换组件
 * 
 * 顶部工具栏下拉按钮，支持快速切换 AI 服务商
 */
import { aiService } from './AIService.js';

class AIProviderSwitcher {
    constructor() {
        this.isOpen = false;
        this.currentInfo = aiService.getCurrentProviderInfo();
        this.providerStatus = aiService.getProviderStatus();
        this._eventsBound = false; // 防止重复绑定
    }

    /**
     * 渲染组件 HTML
     */
    render() {
        const info = this.currentInfo;
        const statusDot = info.configured 
            ? '<span class="ai-status-dot configured"></span>' 
            : '<span class="ai-status-dot unconfigured"></span>';

        return `
            <div class="ai-provider-switcher" id="aiProviderSwitcher">
                <button class="ai-switcher-btn" id="aiSwitcherBtn" title="切换 AI 服务商">
                    ${statusDot}
                    <span class="ai-switcher-name">${info.name}</span>
                    <span class="ai-switcher-icon">▼</span>
                </button>
                <div class="ai-switcher-dropdown" id="aiSwitcherDropdown">
                    <div class="ai-dropdown-list" id="aiDropdownList">
                        ${this._renderProviderList()}
                    </div>
                    <div class="ai-dropdown-divider"></div>
                    <button class="ai-dropdown-item ai-settings-btn" id="aiSettingsBtn">
                        ⚙️ 管理 API Keys
                    </button>
                </div>
            </div>
            
            <style>${this._renderStyles()}</style>
        `;
    }

    /**
     * 渲染服务商列表
     */
    _renderProviderList() {
        return this.providerStatus.map(provider => {
            const activeClass = provider.active ? 'active' : '';
            const statusDot = provider.configured 
                ? '<span class="ai-status-dot configured"></span>' 
                : '<span class="ai-status-dot unconfigured"></span>';
            const unconfiguredLabel = provider.configured 
                ? '' 
                : '<span class="ai-unconfigured-label">(未配置)</span>';

            return `
                <button class="ai-dropdown-item ${activeClass}" 
                        data-provider-id="${provider.id}"
                        data-configured="${provider.configured}">
                    ${statusDot}
                    <span class="ai-provider-name">${provider.name}</span>
                    ${unconfiguredLabel}
                    ${provider.active ? '<span class="ai-active-check">✓</span>' : ''}
                </button>
            `;
        }).join('');
    }

    /**
     * 渲染样式
     */
    _renderStyles() {
        return `
            .ai-provider-switcher {
                position: relative;
                display: inline-block;
            }

            .ai-switcher-btn {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 8px 12px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-primary);
                transition: all 0.2s ease;
            }

            .ai-switcher-btn:hover {
                border-color: var(--accent-color);
                background: var(--bg-card);
            }

            .ai-switcher-btn.active {
                border-color: var(--accent-color);
                box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.15);
            }

            .ai-status-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                flex-shrink: 0;
            }

            .ai-status-dot.configured {
                background: #34c759;
            }

            .ai-status-dot.unconfigured {
                background: #8e8e93;
            }

            .ai-switcher-name {
                font-weight: 500;
            }

            .ai-switcher-icon {
                font-size: 10px;
                color: var(--text-secondary);
                transition: transform 0.2s ease;
            }

            .ai-switcher-btn.active .ai-switcher-icon {
                transform: rotate(180deg);
            }

            .ai-switcher-dropdown {
                position: absolute;
                top: calc(100% + 8px);
                left: 0;
                min-width: 180px;
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                box-shadow: 0 8px 32px var(--shadow-medium);
                opacity: 0;
                visibility: hidden;
                transform: translateY(-8px);
                transition: all 0.2s ease;
                z-index: 1000;
                overflow: hidden;
            }

            .ai-switcher-dropdown.open {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }

            .ai-dropdown-list {
                padding: 6px;
            }

            .ai-dropdown-item {
                display: flex;
                align-items: center;
                gap: 8px;
                width: 100%;
                padding: 10px 12px;
                background: transparent;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                color: var(--text-primary);
                text-align: left;
                transition: all 0.15s ease;
            }

            .ai-dropdown-item:hover {
                background: var(--bg-card);
            }

            .ai-dropdown-item.active {
                background: rgba(0, 113, 227, 0.1);
                color: var(--accent-color);
            }

            .ai-dropdown-item[data-configed="false"] {
                color: var(--text-tertiary);
            }

            .ai-provider-name {
                flex: 1;
            }

            .ai-unconfigured-label {
                font-size: 12px;
                color: var(--text-tertiary);
            }

            .ai-active-check {
                color: var(--accent-color);
                font-weight: bold;
            }

            .ai-dropdown-divider {
                height: 1px;
                background: var(--border-color);
                margin: 4px 0;
            }

            .ai-settings-btn {
                color: var(--text-secondary);
            }

            .ai-settings-btn:hover {
                color: var(--accent-color);
            }

            /* 深色模式适配 */
            body.dark-mode .ai-status-dot.configured {
                background: #30d158;
            }

            body.dark-mode .ai-dropdown-item.active {
                background: rgba(10, 132, 255, 0.15);
            }
        `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 防止重复绑定
        if (this._eventsBound) return;
        this._eventsBound = true;

        const btn = document.getElementById('aiSwitcherBtn');
        const dropdown = document.getElementById('aiSwitcherDropdown');
        const list = document.getElementById('aiDropdownList');
        const settingsBtn = document.getElementById('aiSettingsBtn');

        if (!btn || !dropdown) return;

        // 切换下拉菜单
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // 点击外部关闭
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.ai-provider-switcher')) {
                this.close();
            }
        });

        // 服务商列表点击
        list?.addEventListener('click', (e) => {
            const item = e.target.closest('.ai-dropdown-item');
            if (!item) return;

            const providerId = item.dataset.providerId;
            const configured = item.dataset.configured === 'true';

            if (configured) {
                // 已配置：切换服务商
                this._switchTo(providerId);
            } else {
                // 未配置：跳转设置
                this._openSettings(providerId);
            }
        });

        // 设置按钮
        settingsBtn?.addEventListener('click', () => {
            this._openSettings();
        });

        // 监听配置变更事件（来自 AISettings）
        document.addEventListener('ai-config-changed', (e) => {
            console.log('[AIProviderSwitcher] 收到配置变更通知:', e.detail);
            this.refresh();
        });

        // 监听打开设置事件（只处理一次，不再触发新事件）
        document.addEventListener('ai-open-settings', (e) => {
            const providerId = e.detail?.providerId;
            // 直接调用 aiSettings，不再触发新事件
            if (window.aiSettings) {
                if (providerId) {
                    window.aiSettings.switchToProvider(providerId);
                }
                window.aiSettings.show();
            }
        });
    }

    /**
     * 切换下拉菜单
     */
    toggle() {
        this.isOpen = !this.isOpen;
        const btn = document.getElementById('aiSwitcherBtn');
        const dropdown = document.getElementById('aiSwitcherDropdown');

        btn?.classList.toggle('active', this.isOpen);
        dropdown?.classList.toggle('open', this.isOpen);
    }

    /**
     * 关闭下拉菜单
     */
    close() {
        this.isOpen = false;
        document.getElementById('aiSwitcherBtn')?.classList.remove('active');
        document.getElementById('aiSwitcherDropdown')?.classList.remove('open');
    }

    /**
     * 切换服务商
     */
    _switchTo(providerId) {
        aiService.switchProvider(providerId);
        
        // 更新状态
        this.currentInfo = aiService.getCurrentProviderInfo();
        this.providerStatus = aiService.getProviderStatus();

        // 更新 UI
        this._updateButtonUI();
        this._updateListUI();

        // 触发自定义事件
        const event = new CustomEvent('ai-provider-changed', {
            detail: { providerId, info: this.currentInfo }
        });
        document.dispatchEvent(event);

        // 关闭下拉菜单
        this.close();

        console.log(`[AIProviderSwitcher] 已切换到: ${this.currentInfo.name}`);
    }

    /**
     * 打开设置页面
     */
    _openSettings(providerId = null) {
        // 触发设置事件
        const event = new CustomEvent('ai-open-settings', {
            detail: { providerId }
        });
        document.dispatchEvent(event);

        // 关闭下拉菜单
        this.close();
    }

    /**
     * 更新按钮 UI
     */
    _updateButtonUI() {
        const btn = document.getElementById('aiSwitcherBtn');
        if (!btn) return;

        const info = this.currentInfo;
        const statusDot = info.configured 
            ? '<span class="ai-status-dot configured"></span>' 
            : '<span class="ai-status-dot unconfigured"></span>';

        btn.innerHTML = `
            ${statusDot}
            <span class="ai-switcher-name">${info.name}</span>
            <span class="ai-switcher-icon">▼</span>
        `;
    }

    /**
     * 更新列表 UI
     */
    _updateListUI() {
        const list = document.getElementById('aiDropdownList');
        if (list) {
            list.innerHTML = this._renderProviderList();
        }
    }

    /**
     * 刷新组件状态
     */
    refresh() {
        this.currentInfo = aiService.getCurrentProviderInfo();
        this.providerStatus = aiService.getProviderStatus();
        this._updateButtonUI();
        this._updateListUI();
    }
}

export { AIProviderSwitcher };