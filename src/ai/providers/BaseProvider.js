/**
 * BaseProvider - AI 服务商基类
 * 
 * 所有 AI 服务商 Provider 必须继承此类并实现抽象方法
 */
export class BaseProvider {
    /**
     * @param {string} apiKey - API 密钥
     * @param {string} model - 模型 ID
     */
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    /**
     * 发送聊天请求
     * @param {Array} messages - 消息数组 [{ role: 'user'|'assistant'|'system', content: string }]
     * @param {Object} options - 可选参数 { temperature, maxTokens, stream }
     * @returns {Promise<{ content: string, usage: { promptTokens: number, completionTokens: number, totalTokens: number } }>}
     */
    async chat(messages, options = {}) {
        throw new Error('must implement chat()');
    }

    /**
     * 测试连接是否正常
     * @returns {Promise<{ ok: boolean, message: string }>}
     */
    async testConnection() {
        throw new Error('must implement testConnection()');
    }

    /**
     * 获取该服务商支持的模型列表
     * @returns {Array<{ id: string, name: string, description: string }>}
     */
    getModels() {
        throw new Error('must implement getModels()');
    }

    /**
     * 检查是否已配置 API Key
     * @returns {boolean}
     */
    isConfigured() {
        return !!this.apiKey;
    }

    /**
     * 更新配置
     * @param {string} apiKey 
     * @param {string} model 
     */
    updateConfig(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }
}