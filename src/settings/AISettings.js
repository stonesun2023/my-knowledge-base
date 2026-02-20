/**
 * AISettings.js - AI 服务配置面板
 * 
 * 提供可视化的 AI 服务商配置界面
 */

import { aiService } from '../ai/AIService.js';

/**
 * 服务商配置信息
 */
const PROVIDER_CONFIG = {
    openai: {
        name: 'OpenAI',
        icon: '🤖',
        apiKeyUrl: 'https://platform.openai.com/api-keys',
        color: '#10a37f'
    },
    claude: {
        name: 'Claude',
        icon: '🧠',
        apiKeyUrl: 'https://console.anthropic.com/',
        color: '#d97706'
    },
    glm: {
        name: '智谱GLM',
        icon: '🌟',
        apiKeyUrl: 'https://open.bigmodel.cn/',
        color: '#3b82f6'
    },
    kimi: {
        name: 'Kimi',
        icon: '🌙',
        apiKeyUrl: 'https://platform.moonshot.cn/',
        color: '#8b5cf6'
    },
    doubao: {
        name: '豆包',
        icon: '🫛',
        apiKeyUrl: 'https://console.volcengine.com/ark',
        color: '#ec4899'
    },
    deepseek: {
        name: 'DeepSeek',
        icon: '🔮',
        apiKeyUrl: 'https://platform.deepseek.com/',
        color: '#0ea5e9'
    }
};

/**
 * AISettings 类
 */
export class AISettings {
    constructor() {
        this.aiService = aiService;
        this.currentTab = 'deepseek'; // 默认显示 DeepSeek
        this.testStatus = {}; // 各服务商测试状态
        this.isTesting = false; // 防抖标记
    }

    /**
     * 获取样式
     */
    static getStyles() {
        return `
            /* 设置弹窗遮罩 */
            .ai-settings-overlay {
                position: fixed;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                z-index: 10001;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            .ai-settings-overlay.visible {
                opacity: 1;
                pointer-events: auto;
            }

            body.dark-mode .ai-settings-overlay {
                background: rgba(0, 0, 0, 0.7);
            }

            /* 设置弹窗 */
            .ai-settings-modal {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) scale(0.95);
                width: 560px;
                max-width: 90vw;
                max-height: 85vh;
                background: var(--bg-secondary);
                border-radius: 16px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                z-index: 10002;
                opacity: 0;
                pointer-events: none;
                transition: all 0.3s ease;
                display: flex;
                flex-direction: column;
                overflow: hidden;
            }

            .ai-settings-modal.visible {
                opacity: 1;
                pointer-events: auto;
                transform: translate(-50%, -50%) scale(1);
            }

            body.dark-mode .ai-settings-modal {
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            }

            /* 弹窗头部 */
            .ai-settings-header {
                padding: 20px 24px;
                border-bottom: 1px solid var(--border-color);
                display: flex;
                align-items: center;
                justify-content: space-between;
                flex-shrink: 0;
            }

            .ai-settings-title {
                font-size: 20px;
                font-weight: 600;
                color: var(--text-primary);
                margin: 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ai-settings-close {
                width: 36px;
                height: 36px;
                border-radius: 8px;
                border: 1px solid var(--border-color);
                background: var(--bg-card);
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 18px;
                transition: all 0.2s ease;
            }

            .ai-settings-close:hover {
                background: var(--bg-card-hover);
                color: var(--text-primary);
                border-color: var(--accent-color);
            }

            /* 当前状态 */
            .ai-settings-status {
                padding: 16px 24px;
                background: var(--bg-card);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                gap: 24px;
                flex-wrap: wrap;
                flex-shrink: 0;
            }

            .ai-status-item {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ai-status-label {
                font-size: 13px;
                color: var(--text-secondary);
            }

            .ai-status-value {
                font-size: 14px;
                font-weight: 500;
                color: var(--text-primary);
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .ai-status-value.configured {
                color: #22c55e;
            }

            .ai-status-value.not-configured {
                color: var(--text-tertiary);
            }

            /* Tab 导航 */
            .ai-settings-tabs {
                display: flex;
                padding: 0 24px;
                border-bottom: 1px solid var(--border-color);
                overflow-x: auto;
                flex-shrink: 0;
            }

            .ai-settings-tab {
                padding: 12px 16px;
                font-size: 14px;
                color: var(--text-secondary);
                background: none;
                border: none;
                border-bottom: 2px solid transparent;
                cursor: pointer;
                white-space: nowrap;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .ai-settings-tab:hover {
                color: var(--text-primary);
            }

            .ai-settings-tab.active {
                color: var(--accent-color);
                border-bottom-color: var(--accent-color);
            }

            .ai-settings-tab.configured::after {
                content: '●';
                font-size: 8px;
                color: #22c55e;
                margin-left: 2px;
            }

            /* 内容区域 */
            .ai-settings-content {
                flex: 1;
                overflow-y: auto;
                padding: 24px;
            }

            /* Tab 面板 */
            .ai-tab-panel {
                display: none;
            }

            .ai-tab-panel.active {
                display: block;
            }

            /* 配置项 */
            .ai-config-section {
                margin-bottom: 20px;
            }

            .ai-config-label {
                display: block;
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary);
                margin-bottom: 8px;
            }

            .ai-config-hint {
                font-size: 12px;
                color: var(--text-tertiary);
                margin-top: 4px;
            }

            /* API Key 输入框 */
            .ai-apikey-input-wrap {
                position: relative;
                display: flex;
                gap: 8px;
            }

            .ai-apikey-input {
                flex: 1;
                padding: 12px 44px 12px 14px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                font-size: 14px;
                background: var(--bg-card);
                color: var(--text-primary);
                transition: all 0.2s ease;
                font-family: monospace;
            }

            .ai-apikey-input:focus {
                outline: none;
                border-color: var(--accent-color);
                box-shadow: 0 0 0 3px rgba(0, 113, 227, 0.1);
            }

            .ai-apikey-input::placeholder {
                color: var(--text-tertiary);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            .ai-toggle-visibility {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                width: 28px;
                height: 28px;
                border: none;
                background: none;
                color: var(--text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                transition: color 0.2s ease;
            }

            .ai-toggle-visibility:hover {
                color: var(--text-primary);
            }

            /* 模型选择 */
            .ai-model-select {
                width: 100%;
                padding: 12px 14px;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                font-size: 14px;
                background: var(--bg-card);
                color: var(--text-primary);
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .ai-model-select:focus {
                outline: none;
                border-color: var(--accent-color);
            }

            /* 按钮组 */
            .ai-config-actions {
                display: flex;
                gap: 12px;
                margin-top: 20px;
                flex-wrap: wrap;
            }

            .ai-btn {
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                border: none;
            }

            .ai-btn-primary {
                background: var(--accent-color);
                color: white;
            }

            .ai-btn-primary:hover {
                background: var(--accent-hover);
                transform: translateY(-1px);
            }

            .ai-btn-primary:disabled {
                background: var(--border-color);
                color: var(--text-tertiary);
                cursor: not-allowed;
                transform: none;
            }

            .ai-btn-secondary {
                background: var(--bg-card);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }

            .ai-btn-secondary:hover {
                background: var(--bg-card-hover);
                border-color: var(--accent-color);
            }

            /* 连接状态 */
            .ai-connection-status {
                margin-top: 12px;
                padding: 12px 16px;
                border-radius: 8px;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .ai-connection-status.success {
                background: rgba(34, 197, 94, 0.1);
                color: #22c55e;
                border: 1px solid rgba(34, 197, 94, 0.2);
            }

            .ai-connection-status.error {
                background: rgba(239, 68, 68, 0.1);
                color: #ef4444;
                border: 1px solid rgba(239, 68, 68, 0.2);
            }

            .ai-connection-status.testing {
                background: rgba(107, 114, 128, 0.1);
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
            }

            /* API Key 申请链接 */
            .ai-apikey-link {
                margin-top: 12px;
                font-size: 13px;
            }

            .ai-apikey-link a {
                color: var(--accent-color);
                text-decoration: none;
            }

            .ai-apikey-link a:hover {
                text-decoration: underline;
            }

            /* 底部 */
            .ai-settings-footer {
                padding: 16px 24px;
                border-top: 1px solid var(--border-color);
                background: var(--bg-card);
                flex-shrink: 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .ai-settings-footer-hint {
                font-size: 12px;
                color: var(--text-tertiary);
            }

            /* 移动端适配 */
            @media (max-width: 600px) {
                .ai-settings-modal {
                    width: 100%;
                    max-width: 100%;
                    max-height: 100vh;
                    border-radius: 0;
                    top: 0;
                    left: 0;
                    transform: translateY(100%);
                }

                .ai-settings-modal.visible {
                    transform: translateY(0);
                }

                .ai-settings-status {
                    flex-direction: column;
                    gap: 12px;
                }

                .ai-config-actions {
                    flex-direction: column;
                }

                .ai-btn {
                    width: 100%;
                    justify-content: center;
                }
            }
        `;
    }

    /**
     * 渲染设置面板
     */
    render() {
        const providers = this.aiService.getAvailableProviders();
        const currentProvider = this.aiService.getCurrentProvider();
        const currentProviderId = currentProvider?.id || 'deepseek';

        // 生成 Tab 列表
        const tabsHTML = providers.map(p => {
            const config = PROVIDER_CONFIG[p.id];
            const isConfigured = this._isProviderConfigured(p.id);
            const isActive = p.id === this.currentTab;
            return `
                <button class="ai-settings-tab ${isActive ? 'active' : ''} ${isConfigured ? 'configured' : ''}"
                        data-provider="${p.id}">
                    ${config?.icon || '🤖'} ${config?.name || p.id}
                </button>
            `;
        }).join('');

        // 生成 Tab 面板
        const panelsHTML = providers.map(p => {
            const isActive = p.id === this.currentTab;
            return `
                <div class="ai-tab-panel ${isActive ? 'active' : ''}" data-panel="${p.id}">
                    ${this._renderProviderPanel(p)}
                </div>
            `;
        }).join('');

        return `
            <div class="ai-settings-overlay" id="aiSettingsOverlay"></div>
            <div class="ai-settings-modal" id="aiSettingsModal">
                <div class="ai-settings-header">
                    <h2 class="ai-settings-title">🤖 AI 服务配置</h2>
                    <button class="ai-settings-close" id="aiSettingsClose" title="关闭">✕</button>
                </div>
                
                <div class="ai-settings-status">
                    <div class="ai-status-item">
                        <span class="ai-status-label">当前服务商：</span>
                        <span class="ai-status-value ${currentProvider ? 'configured' : 'not-configured'}">
                            ${currentProvider ? `${PROVIDER_CONFIG[currentProvider.id]?.icon || ''} ${currentProvider.displayName}` : '未配置'}
                        </span>
                    </div>
                    <div class="ai-status-item">
                        <span class="ai-status-label">当前模型：</span>
                        <span class="ai-status-value">
                            ${currentProvider?.getCurrentModel?.() || '—'}
                        </span>
                    </div>
                </div>

                <div class="ai-settings-tabs" id="aiSettingsTabs">
                    ${tabsHTML}
                </div>

                <div class="ai-settings-content" id="aiSettingsContent">
                    ${panelsHTML}
                </div>

                <div class="ai-settings-footer">
                    <span class="ai-settings-footer-hint">
                        🔒 API Key 仅存储在本地浏览器，不会上传到任何服务器
                    </span>
                </div>
            </div>
        `;
    }

    /**
     * 渲染单个服务商配置面板
     */
    _renderProviderPanel(provider) {
        const config = PROVIDER_CONFIG[provider.id];
        const savedConfig = this._getProviderConfig(provider.id);
        const models = provider.getModels?.() || [];
        const currentModel = savedConfig.model || provider.defaultModel || models[0]?.id || '';

        // 获取测试状态
        const status = this.testStatus[provider.id] || { type: '', message: '' };

        return `
            <div class="ai-config-section">
                <label class="ai-config-label">API Key</label>
                <div class="ai-apikey-input-wrap">
                    <input type="password" 
                           class="ai-apikey-input" 
                           id="apiKey_${provider.id}"
                           placeholder="请输入 ${config?.name || provider.id} API Key"
                           value="${savedConfig.apiKey || ''}"
                           data-provider="${provider.id}">
                    <button class="ai-toggle-visibility" 
                            data-target="apiKey_${provider.id}"
                            title="显示/隐藏">
                        👁️
                    </button>
                </div>
                <div class="ai-config-hint">
                    API Key 格式通常以 "sk-" 或 "Bearer " 开头
                </div>
                ${config?.apiKeyUrl ? `
                    <div class="ai-apikey-link">
                        没有 API Key？<a href="${config.apiKeyUrl}" target="_blank">前往 ${config.name} 官网申请 →</a>
                    </div>
                ` : ''}
            </div>

            ${models.length > 0 ? `
                <div class="ai-config-section">
                    <label class="ai-config-label">模型选择</label>
                    <select class="ai-model-select" id="model_${provider.id}" data-provider="${provider.id}">
                        ${models.map(m => `
                            <option value="${m.id}" ${m.id === currentModel ? 'selected' : ''}>
                                ${m.name} ${m.description ? `— ${m.description}` : ''}
                            </option>
                        `).join('')}
                    </select>
                </div>
            ` : ''}

            <div class="ai-config-actions">
                <button class="ai-btn ai-btn-secondary" id="testBtn_${provider.id}" data-provider="${provider.id}">
                    🔌 测试连接
                </button>
                <button class="ai-btn ai-btn-primary" id="saveBtn_${provider.id}" data-provider="${provider.id}">
                    💾 保存配置
                </button>
            </div>

            ${status.type ? `
                <div class="ai-connection-status ${status.type}">
                    ${status.type === 'success' ? '✅' : status.type === 'error' ? '❌' : '⏳'}
                    ${status.message}
                </div>
            ` : ''}
        `;
    }

    /**
     * 检查服务商是否已配置
     */
    _isProviderConfigured(providerId) {
        const config = this._getProviderConfig(providerId);
        return !!(config.apiKey && config.apiKey.length > 10);
    }

    /**
     * 获取服务商配置
     */
    _getProviderConfig(providerId) {
        try {
            const raw = localStorage.getItem(`ai_provider_${providerId}`);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    /**
     * 保存服务商配置
     */
    _saveProviderConfig(providerId, config) {
        localStorage.setItem(`ai_provider_${providerId}`, JSON.stringify(config));
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const overlay = document.getElementById('aiSettingsOverlay');
        const modal = document.getElementById('aiSettingsModal');
        const closeBtn = document.getElementById('aiSettingsClose');
        const tabsContainer = document.getElementById('aiSettingsTabs');

        // 关闭弹窗
        const close = () => this.hide();
        closeBtn?.addEventListener('click', close);
        overlay?.addEventListener('click', close);

        // ESC 关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal?.classList.contains('visible')) {
                close();
            }
        });

        // Tab 切换
        tabsContainer?.addEventListener('click', (e) => {
            const tab = e.target.closest('.ai-settings-tab');
            if (tab) {
                const providerId = tab.dataset.provider;
                this._switchTab(providerId);
            }
        });

        // 密码显示切换
        document.querySelectorAll('.ai-toggle-visibility').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.dataset.target;
                const input = document.getElementById(targetId);
                if (input) {
                    const isPassword = input.type === 'password';
                    input.type = isPassword ? 'text' : 'password';
                    btn.textContent = isPassword ? '🙈' : '👁️';
                }
            });
        });

        // 测试连接按钮
        document.querySelectorAll('[id^="testBtn_"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const providerId = btn.dataset.provider;
                this._testConnection(providerId);
            });
        });

        // 保存配置按钮
        document.querySelectorAll('[id^="saveBtn_"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const providerId = btn.dataset.provider;
                this._saveConfig(providerId);
            });
        });

        // 模型选择变化
        document.querySelectorAll('.ai-model-select').forEach(select => {
            select.addEventListener('change', () => {
                const providerId = select.dataset.provider;
                const model = select.value;
                // 实时更新模型配置
                const config = this._getProviderConfig(providerId);
                config.model = model;
                this._saveProviderConfig(providerId, config);
            });
        });
    }

    /**
     * 切换 Tab
     */
    _switchTab(providerId) {
        this.currentTab = providerId;

        // 更新 Tab 状态
        document.querySelectorAll('.ai-settings-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.provider === providerId);
        });

        // 更新面板状态
        document.querySelectorAll('.ai-tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.dataset.panel === providerId);
        });
    }

    /**
     * 测试连接
     */
    async _testConnection(providerId) {
        if (this.isTesting) return;
        this.isTesting = true;

        const apiKeyInput = document.getElementById(`apiKey_${providerId}`);
        const modelSelect = document.getElementById(`model_${providerId}`);
        const apiKey = apiKeyInput?.value?.trim();
        const model = modelSelect?.value || '';

        // 验证 API Key
        if (!apiKey || apiKey.length < 10) {
            this._showStatus(providerId, 'error', '请输入有效的 API Key（长度至少 10 位）');
            this.isTesting = false;
            return;
        }

        // 显示测试中状态
        this._showStatus(providerId, 'testing', '正在测试连接...');

        try {
            // 获取服务商实例
            const provider = this.aiService.getAvailableProviders().find(p => p.id === providerId);
            
            if (!provider) {
                throw new Error('服务商不存在');
            }

            // 临时设置 API Key 进行测试
            provider.configure({ apiKey, model });

            // 调用测试方法
            const result = await provider.testConnection();

            if (result.ok || result.success) {
                this._showStatus(providerId, 'success', '✅ 连接正常！API Key 有效');
            } else {
                // 显示完整错误信息
                const errorMsg = result.message || result.error || '连接失败';
                this._showStatus(providerId, 'error', `❌ ${errorMsg}`);
            }

        } catch (error) {
            console.error(`[AISettings] 测试连接失败:`, error);
            // 显示完整错误信息
            this._showStatus(providerId, 'error', `❌ ${error.message}`);
        } finally {
            this.isTesting = false;
        }
    }

    /**
     * 保存配置
     */
    _saveConfig(providerId) {
        const apiKeyInput = document.getElementById(`apiKey_${providerId}`);
        const modelSelect = document.getElementById(`model_${providerId}`);
        const apiKey = apiKeyInput?.value?.trim();
        const model = modelSelect?.value || '';

        // 验证 API Key
        if (!apiKey) {
            this._showStatus(providerId, 'error', '请输入 API Key');
            return;
        }

        if (apiKey.length < 10) {
            this._showStatus(providerId, 'error', 'API Key 格式不正确（长度至少 10 位）');
            return;
        }

        // 保存配置
        const config = {
            apiKey,
            model,
            updatedAt: Date.now()
        };
        this._saveProviderConfig(providerId, config);

        // 更新 AIService
        this.aiService.configureProvider(providerId, config);

        // 触发配置变更事件
        document.dispatchEvent(new CustomEvent('ai-config-changed', {
            detail: { providerId, config }
        }));

        this._showStatus(providerId, 'success', '✅ 配置已保存');

        // 更新 Tab 状态（显示已配置标记）
        document.querySelectorAll('.ai-settings-tab').forEach(tab => {
            if (tab.dataset.provider === providerId) {
                tab.classList.add('configured');
            }
        });

        console.log(`[AISettings] 配置已保存: ${providerId}`);
    }

    /**
     * 显示状态
     */
    _showStatus(providerId, type, message) {
        this.testStatus[providerId] = { type, message };

        const panel = document.querySelector(`.ai-tab-panel[data-panel="${providerId}"]`);
        if (!panel) return;

        // 移除旧状态
        const oldStatus = panel.querySelector('.ai-connection-status');
        if (oldStatus) {
            oldStatus.remove();
        }

        // 添加新状态
        const actionsEl = panel.querySelector('.ai-config-actions');
        if (actionsEl) {
            const statusEl = document.createElement('div');
            statusEl.className = `ai-connection-status ${type}`;
            statusEl.innerHTML = `
                ${type === 'success' ? '✅' : type === 'error' ? '❌' : '⏳'}
                ${message}
            `;
            actionsEl.after(statusEl);
        }
    }

    /**
     * 加载现有配置
     */
    loadConfig() {
        // 遍历所有服务商，填充已保存的配置
        this.aiService.getAvailableProviders().forEach(provider => {
            const config = this._getProviderConfig(provider.id);
            
            const apiKeyInput = document.getElementById(`apiKey_${provider.id}`);
            const modelSelect = document.getElementById(`model_${provider.id}`);

            if (apiKeyInput && config.apiKey) {
                apiKeyInput.value = config.apiKey;
            }

            if (modelSelect && config.model) {
                modelSelect.value = config.model;
            }
        });
    }

    /**
     * 显示设置面板
     */
    show() {
        // 检查是否已挂载
        if (!document.getElementById('aiSettingsModal')) {
            // 挂载 DOM
            const container = document.createElement('div');
            container.innerHTML = this.render();
            document.body.appendChild(container);
            this.bindEvents();
        } else {
            // 刷新内容
            this._refreshContent();
        }

        // 显示
        const overlay = document.getElementById('aiSettingsOverlay');
        const modal = document.getElementById('aiSettingsModal');
        overlay?.classList.add('visible');
        modal?.classList.add('visible');

        // 加载配置
        this.loadConfig();

        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
    }

    /**
     * 隐藏设置面板
     */
    hide() {
        const overlay = document.getElementById('aiSettingsOverlay');
        const modal = document.getElementById('aiSettingsModal');
        overlay?.classList.remove('visible');
        modal?.classList.remove('visible');

        // 恢复背景滚动
        document.body.style.overflow = '';
    }

    /**
     * 刷新内容
     */
    _refreshContent() {
        const tabsContainer = document.getElementById('aiSettingsTabs');
        const contentContainer = document.getElementById('aiSettingsContent');

        if (tabsContainer && contentContainer) {
            const providers = this.aiService.getAvailableProviders();

            // 更新 Tab
            tabsContainer.innerHTML = providers.map(p => {
                const config = PROVIDER_CONFIG[p.id];
                const isConfigured = this._isProviderConfigured(p.id);
                const isActive = p.id === this.currentTab;
                return `
                    <button class="ai-settings-tab ${isActive ? 'active' : ''} ${isConfigured ? 'configured' : ''}"
                            data-provider="${p.id}">
                        ${config?.icon || '🤖'} ${config?.name || p.id}
                    </button>
                `;
            }).join('');

            // 更新面板
            contentContainer.innerHTML = providers.map(p => {
                const isActive = p.id === this.currentTab;
                return `
                    <div class="ai-tab-panel ${isActive ? 'active' : ''}" data-panel="${p.id}">
                        ${this._renderProviderPanel(p)}
                    </div>
                `;
            }).join('');

            // 重新绑定事件
            this.bindEvents();
        }
    }

    /**
     * 切换到指定服务商
     */
    switchToProvider(providerId) {
        this.currentTab = providerId;
        this._switchTab(providerId);
    }
}

// 创建全局实例
const aiSettings = new AISettings();
export { aiSettings };