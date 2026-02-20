/**
 * 豆包 Provider (字节跳动)
 * 
 * 支持 Doubao Pro 等模型
 */
import { BaseProvider } from './BaseProvider.js';

export class DoubaoProvider extends BaseProvider {
    static NAME = '豆包';
    static ID = 'doubao';
    static BASE_URL = 'https://ark.volces.com/api/v3/chat/completions';

    constructor(apiKey, model = 'doubao-lite-4k') {
        super(apiKey, model);
    }

    getModels() {
        return [
            { id: 'doubao-pro-4k', name: 'Doubao Pro 4K', description: '专业版，能力强' },
            { id: 'doubao-lite-4k', name: 'Doubao Lite 4K', description: '轻量版，性价比高' }
        ];
    }

    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('豆包 API Key 未配置');
        }

        const body = {
            model: this.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        };

        const response = await fetch(DoubaoProvider.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `豆包 API 错误: ${response.status}`);
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