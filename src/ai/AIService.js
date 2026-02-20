/**
 * AIService - AI 服务统一管理
 * 
 * 管理多个 AI 服务商配置，提供统一的调用接口
 */
import { OpenAIProvider } from './providers/OpenAIProvider.js';
import { ClaudeProvider } from './providers/ClaudeProvider.js';
import { GLMProvider } from './providers/GLMProvider.js';
import { KimiProvider } from './providers/KimiProvider.js';
import { DoubaoProvider } from './providers/DoubaoProvider.js';
import { DeepSeekProvider } from './providers/DeepSeekProvider.js';

// 存储键
const STORAGE_KEY = 'superbrain_ai_config';

// 默认配置
const DEFAULT_CONFIG = {
    activeProvider: 'deepseek',
    providers: {
        openai:   { apiKey: '', model: 'gpt-4o' },
        claude:   { apiKey: '', model: 'claude-3-5-sonnet-20241022' },
        glm:      { apiKey: '', model: 'glm-4-flash' },
        kimi:     { apiKey: '', model: 'moonshot-v1-8k' },
        doubao:   { apiKey: '', model: 'doubao-lite-4k' },
        deepseek: { apiKey: '', model: 'deepseek-chat' }
    }
};

// Provider 类映射
const PROVIDER_CLASSES = {
    openai: OpenAIProvider,
    claude: ClaudeProvider,
    glm: GLMProvider,
    kimi: KimiProvider,
    doubao: DoubaoProvider,
    deepseek: DeepSeekProvider
};

class AIService {
    constructor() {
        this.config = this._loadConfig();
        this._providerInstance = null;
    }

    /**
     * 从 localStorage 加载配置
     */
    _loadConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // 合并默认配置（处理新增服务商）
                return {
                    activeProvider: parsed.activeProvider || DEFAULT_CONFIG.activeProvider,
                    providers: { ...DEFAULT_CONFIG.providers, ...parsed.providers }
                };
            }
        } catch (e) {
            console.warn('[AIService] 加载配置失败:', e);
        }
        return { ...DEFAULT_CONFIG };
    }

    /**
     * 保存配置到 localStorage
     */
    _saveConfig() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
        } catch (e) {
            console.error('[AIService] 保存配置失败:', e);
        }
    }

    /**
     * 获取当前 Provider 实例
     */
    getProvider() {
        const providerId = this.config.activeProvider;
        const providerConfig = this.config.providers[providerId];
        
        if (!providerConfig) {
            throw new Error(`未知的 Provider: ${providerId}`);
        }

        // 懒加载：只在需要时创建实例
        const ProviderClass = PROVIDER_CLASSES[providerId];
        if (!ProviderClass) {
            throw new Error(`Provider 类未找到: ${providerId}`);
        }

        if (!this._providerInstance || 
            this._providerInstance.constructor.ID !== providerId ||
            this._providerInstance.apiKey !== providerConfig.apiKey ||
            this._providerInstance.model !== providerConfig.model) {
            this._providerInstance = new ProviderClass(
                providerConfig.apiKey,
                providerConfig.model
            );
        }

        return this._providerInstance;
    }

    /**
     * 发送聊天请求
     */
    async chat(messages, options = {}) {
        const provider = this.getProvider();
        return provider.chat(messages, options);
    }

    /**
     * 测试当前 Provider 连接
     */
    async testConnection() {
        const provider = this.getProvider();
        return provider.testConnection();
    }

    /**
     * 检查当前服务商是否已配置
     */
    isConfigured() {
        const providerConfig = this.config.providers[this.config.activeProvider];
        return !!(providerConfig && providerConfig.apiKey);
    }

    /**
     * 获取完整配置
     */
    getConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * 保存配置
     */
    saveConfig(config) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this._saveConfig();
        this._providerInstance = null; // 清除缓存
    }

    /**
     * 更新单个服务商配置
     */
    updateProviderConfig(providerId, apiKey, model) {
        if (!this.config.providers[providerId]) {
            throw new Error(`未知的 Provider: ${providerId}`);
        }
        this.config.providers[providerId] = { apiKey, model };
        this._saveConfig();
        
        // 如果更新的是当前服务商，清除缓存
        if (providerId === this.config.activeProvider) {
            this._providerInstance = null;
        }
    }

    /**
     * 获取所有服务商状态
     */
    getProviderStatus() {
        return Object.entries(PROVIDER_CLASSES).map(([id, ProviderClass]) => {
            const config = this.config.providers[id] || { apiKey: '', model: '' };
            return {
                id,
                name: ProviderClass.NAME,
                configured: !!config.apiKey,
                active: id === this.config.activeProvider,
                model: config.model
            };
        });
    }

    /**
     * 切换当前服务商
     */
    switchProvider(providerId) {
        if (!PROVIDER_CLASSES[providerId]) {
            throw new Error(`未知的 Provider: ${providerId}`);
        }
        this.config.activeProvider = providerId;
        this._saveConfig();
        this._providerInstance = null;
        
        console.log(`[AIService] 已切换到: ${PROVIDER_CLASSES[providerId].NAME}`);
    }

    /**
     * 获取当前服务商信息
     */
    getCurrentProviderInfo() {
        const providerId = this.config.activeProvider;
        const ProviderClass = PROVIDER_CLASSES[providerId];
        const config = this.config.providers[providerId];
        
        return {
            id: providerId,
            name: ProviderClass?.NAME || providerId,
            model: config?.model || '',
            configured: !!config?.apiKey
        };
    }

    /**
     * 获取当前服务商支持的模型列表
     */
    getCurrentModels() {
        const providerId = this.config.activeProvider;
        const ProviderClass = PROVIDER_CLASSES[providerId];
        
        if (!ProviderClass) return [];
        
        // 创建临时实例获取模型列表
        const tempInstance = new ProviderClass('', '');
        return tempInstance.getModels();
    }

    /**
     * 获取所有可用的 Provider 实例列表
     */
    getAvailableProviders() {
        return Object.entries(PROVIDER_CLASSES).map(([id, ProviderClass]) => {
            const config = this.config.providers[id] || { apiKey: '', model: '' };
            const instance = new ProviderClass(config.apiKey, config.model);
            return {
                id,
                name: ProviderClass.NAME,
                displayName: ProviderClass.NAME,
                configured: !!config.apiKey,
                active: id === this.config.activeProvider,
                model: config.model,
                defaultModel: instance.defaultModel,
                getModels: () => instance.getModels(),
                configure: (opts) => {
                    instance.apiKey = opts.apiKey;
                    instance.model = opts.model;
                },
                testConnection: () => instance.testConnection(),
                getCurrentModel: () => instance.model
            };
        });
    }

    /**
     * 获取当前 Provider 实例
     */
    getCurrentProvider() {
        if (!this.isConfigured()) return null;
        return this.getProvider();
    }

    /**
     * 配置指定服务商
     */
    configureProvider(providerId, config) {
        if (!this.config.providers[providerId]) {
            this.config.providers[providerId] = { apiKey: '', model: '' };
        }
        if (config.apiKey !== undefined) {
            this.config.providers[providerId].apiKey = config.apiKey;
        }
        if (config.model !== undefined) {
            this.config.providers[providerId].model = config.model;
        }
        this._saveConfig();
        
        // 清除缓存
        if (providerId === this.config.activeProvider) {
            this._providerInstance = null;
        }
    }
}

// 导出单例
export const aiService = new AIService();
export { AIService };
