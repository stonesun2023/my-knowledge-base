/**
 * Claude Provider (Anthropic)
 * 
 * 支持 Claude 3.5 Sonnet 等模型
 * 注意：API 格式与其他服务商不同
 */
import { BaseProvider } from './BaseProvider.js';

export class ClaudeProvider extends BaseProvider {
    static NAME = 'Claude';
    static ID = 'claude';
    static BASE_URL = 'https://api.anthropic.com/v1/messages';

    constructor(apiKey, model = 'claude-3-5-sonnet-20241022') {
        super(apiKey, model);
    }

    getModels() {
        return [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '最新旗舰，推理能力强' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: '快速响应，性价比高' }
        ];
    }

    async chat(messages, options = {}) {
        if (!this.apiKey) {
            throw new Error('Claude API Key 未配置');
        }

        // Claude API 需要分离 system 消息
        let systemPrompt = '';
        const chatMessages = [];
        
        for (const msg of messages) {
            if (msg.role === 'system') {
                systemPrompt = msg.content;
            } else {
                chatMessages.push({
                    role: msg.role,
                    content: msg.content
                });
            }
        }

        const body = {
            model: this.model,
            max_tokens: options.maxTokens ?? 4096,
            messages: chatMessages
        };

        if (systemPrompt) {
            body.system = systemPrompt;
        }

        const response = await fetch(ClaudeProvider.BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error?.message || `Claude API 错误: ${response.status}`);
        }

        const data = await response.json();
        
        // Claude 响应格式不同
        const content = data.content?.[0]?.text || '';

        return {
            content: content,
            usage: {
                promptTokens: data.usage?.input_tokens || 0,
                completionTokens: data.usage?.output_tokens || 0,
                totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
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