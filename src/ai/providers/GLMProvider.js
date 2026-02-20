/**
 * 智谱 GLM Provider
 * 
 * 支持 GLM-4 等模型
 */
import { BaseProvider } from './BaseProvider.js';

export class GLMProvider extends BaseProvider {
    static NAME = '智谱 GLM';
    static ID = 'glm';
    static BASE_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    constructor(apiKey, model = 'glm-4-flash') {
        super(apiKey, model);
    }

    getModels() {
        return [
            { id: 'glm-4-plus',   name: 'GLM-4-Plus',   description: '旗舰版，能力最强' },
            { id: 'glm-4-0520',   name: 'GLM-4-0520',   description: '高性能版本' },
            { id: 'glm-4-flash',  name: 'GLM-4-Flash',  description: '免费，速度最快' },
            { id: 'glm-4-flashx', name: 'GLM-4-FlashX', description: '免费，Flash增强版' },
            { id: 'glm-4-air',    name: 'GLM-4-Air',    description: '高性价比' },
            { id: 'glm-4-airx',   name: 'GLM-4-AirX',   description: '极速推理' },
            { id: 'glm-z1-flash', name: 'GLM-Z1-Flash', description: '免费，推理模型' },
            { id: 'glm-z1-airx',  name: 'GLM-Z1-AirX',  description: '轻量推理' }
        ];
    }

    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('智谱 API Key 未配置');
        }

        const body = {
            model: this.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        };

        const response = await fetch(GLMProvider.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `智谱 API 错误: ${response.status}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];

        return {
            content: choice?.message?.content || '',
            usage: {
                promptTokens: data.usage?.prompt_tokens || 0,
                completionTokens: data.usage?.completion_tokens || 0,
                totalTokens: data.usage?.total_tokens || 0
            }
        };
    }

    async testConnection() {
        try {
            await this.chat([{ role: 'user', content: 'hi' }], { maxTokens: 10 });
            return { ok: true, message: '连接成功' };
        } catch (error) {
            return { ok: false, message: error.message };
        }
    }
}