/**
 * DeepSeek Provider
 * 
 * 支持 DeepSeek Chat 等模型
 */
import { BaseProvider } from './BaseProvider.js';

export class DeepSeekProvider extends BaseProvider {
    static NAME = 'DeepSeek';
    static ID = 'deepseek';
    static BASE_URL = 'https://api.deepseek.com/chat/completions';

    constructor(apiKey, model = 'deepseek-chat') {
        super(apiKey, model);
    }

    getModels() {
        return [
            { id: 'deepseek-chat', name: 'DeepSeek Chat', description: '通用对话模型' },
            { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: '推理增强模型' }
        ];
    }

    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('DeepSeek API Key 未配置');
        }

        const body = {
            model: this.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096
        };

        const response = await fetch(DeepSeekProvider.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `DeepSeek API 错误: ${response.status}`);
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