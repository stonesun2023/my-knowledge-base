/**
 * OpenAI Provider
 * 
 * 支持 GPT-4o 等模型
 */
import { BaseProvider } from './BaseProvider.js';

export class OpenAIProvider extends BaseProvider {
    static NAME = 'OpenAI';
    static ID = 'openai';
    static BASE_URL = 'https://api.openai.com/v1/chat/completions';

    constructor(apiKey, model = 'gpt-4o') {
        super(apiKey, model);
    }

    getModels() {
        return [
            { id: 'gpt-4o', name: 'GPT-4o', description: '最新旗舰模型，多模态支持' },
            { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量版，性价比高' }
        ];
    }

    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('OpenAI API Key 未配置');
        }

        const body = {
            model: this.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        };

        const response = await fetch(OpenAIProvider.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `OpenAI API 错误: ${response.status}`);
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