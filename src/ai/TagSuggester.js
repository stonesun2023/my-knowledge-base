/**
 * TagSuggester - 智能标签推荐
 * 
 * 基于 AI 分析链接信息，推荐合适的标签
 */
import { aiService } from './AIService.js';

class TagSuggester {
    constructor() {
        // 系统提示词
        this.systemPrompt = `你是一个链接分类专家。根据用户提供的链接信息，推荐3-5个简短的中文标签。

要求：
1. 标签必须是简短的中文词语（2-4个字）
2. 标签要准确反映链接的主题、类型或领域
3. 优先使用常见分类如：编程、设计、AI、学习、工作、工具、阅读、娱乐、生活、其他
4. 如果链接内容不明确，可以推荐更通用的标签
5. 只返回 JSON 格式，不要有任何其他文字

返回格式示例：
{"tags": ["编程", "教程", "前端"]}`;
    }

    /**
     * 为单个链接推荐标签
     * @param {Object} link - 链接对象 { title, url, note? }
     * @returns {Promise<{ tags: string[], confidence: number[] }>}
     */
    async suggest(link) {
        if (!aiService.isConfigured()) {
            throw new Error('AI 服务未配置');
        }

        const prompt = this.getPrompt(link);
        
        try {
            const response = await aiService.chat([
                { role: 'system', content: this.systemPrompt },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.3,  // 低温度，更稳定的输出
                maxTokens: 200
            });

            const content = response.content.trim();
            const tags = this._parseTags(content);

            // 为每个标签生成置信度（简化版：基于顺序递减）
            const confidence = tags.map((_, i) => Math.max(0.5, 1 - i * 0.1));

            return { tags, confidence };
        } catch (error) {
            console.error('[TagSuggester] 推荐失败:', error);
            throw error;
        }
    }

    /**
     * 批量推荐标签（带限流）
     * @param {Object[]} links - 链接数组
     * @param {Function} onProgress - 进度回调 (index, total, result)
     * @returns {Promise<Array<{ tags: string[], confidence: number[] }>>}
     */
    async suggestBatch(links, onProgress = null) {
        const results = [];
        const total = links.length;

        for (let i = 0; i < links.length; i++) {
            try {
                const result = await this.suggest(links[i]);
                results.push(result);
                
                if (onProgress) {
                    onProgress(i, total, result);
                }
            } catch (error) {
                results.push({ tags: [], confidence: [], error: error.message });
            }

            // 间隔 500ms 避免限流（最后一个不需要等待）
            if (i < links.length - 1) {
                await this._sleep(500);
            }
        }

        return results;
    }

    /**
     * 构建用户提示词
     * @param {Object} link - 链接对象
     * @returns {string}
     */
    getPrompt(link) {
        const parts = [];
        
        if (link.title) {
            parts.push(`标题：${link.title}`);
        }
        
        if (link.url) {
            parts.push(`链接：${link.url}`);
        }
        
        if (link.note) {
            parts.push(`备注：${link.note}`);
        }

        if (parts.length === 0) {
            parts.push('（无链接信息）');
        }

        return parts.join('\n');
    }

    /**
     * 解析 AI 返回的标签
     * @param {string} content - AI 返回的内容
     * @returns {string[]}
     */
    _parseTags(content) {
        try {
            // 尝试直接解析 JSON
            let jsonStr = content;
            
            // 去掉 markdown 代码块
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }
            
            // 去掉可能的前后文字
            const jsonStart = jsonStr.indexOf('{');
            const jsonEnd = jsonStr.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
            }

            const parsed = JSON.parse(jsonStr);
            
            if (Array.isArray(parsed.tags)) {
                return parsed.tags.filter(t => typeof t === 'string' && t.trim());
            }
            
            // 兼容直接返回数组的情况
            if (Array.isArray(parsed)) {
                return parsed.filter(t => typeof t === 'string' && t.trim());
            }

            return [];
        } catch (e) {
            console.warn('[TagSuggester] JSON 解析失败，尝试正则提取:', e.message);
            
            // 降级：尝试正则提取中文标签
            const tagMatches = content.match(/["']([^"']+?)["']/g);
            if (tagMatches) {
                return tagMatches
                    .map(m => m.replace(/["']/g, '').trim())
                    .filter(t => t.length >= 2 && t.length <= 8);
            }
            
            return [];
        }
    }

    /**
     * 延迟函数
     * @param {number} ms - 毫秒
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出单例
const tagSuggester = new TagSuggester();
export { TagSuggester, tagSuggester };