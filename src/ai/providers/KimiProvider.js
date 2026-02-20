/**
 * Kimi Provider (Moonshot)
 * 
 * 支持 Moonshot V1 等模型
 */
import { BaseProvider } from './BaseProvider.js';

export class KimiProvider extends BaseProvider {
    static NAME = 'Kimi';
    static ID = 'kimi';
    static BASE_URL = 'https://api.moonshot.cn/v1/chat/completions';

    constructor(apiKey, model = 'moonshot-v1-8k') {
        super(apiKey, model);
    }

    getModels() {
        return [
            { id: 'moonshot-v1-8k', name: 'Moonshot V1 8K', description: '标准模型，8K 上下文' },
            { id: 'moonshot-v1-32k', name: 'Moonshot V1 32K', description: '长上下文，32K' }
        ];
    }

    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('Kimi API Key 未配置');
        }

        const body = {
            model: this.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        };

        const response = await fetch(KimiProvider.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Kimi API 错误: ${response.status}`);
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