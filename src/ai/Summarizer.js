/**
 * Summarizer - AI 内容摘要生成器
 * 
 * 为链接生成一句话摘要或详细摘要
 */
import { aiService } from './AIService.js';

class Summarizer {
    constructor() {
        this.cacheKey = 'superbrain_summaries';
        this.cache = this._loadCache();
    }

    /**
     * 从 localStorage 加载缓存
     */
    _loadCache() {
        try {
            const data = localStorage.getItem(this.cacheKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.warn('[Summarizer] 缓存加载失败:', e);
            return {};
        }
    }

    /**
     * 保存缓存到 localStorage
     */
    _saveCache() {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
        } catch (e) {
            console.warn('[Summarizer] 缓存保存失败:', e);
        }
    }

    /**
     * 生成摘要
     * @param {Object} link - 链接对象 { id, title, url, note? }
     * @param {string} mode - 'short' | 'detail'
     * @returns {Promise<{ summary: string, mode: string, cached: boolean }>}
     */
    async summarize(link, mode = 'short') {
        if (!aiService.isConfigured()) {
            throw new Error('AI 服务未配置');
        }

        const linkId = link.id || link.url;
        
        // 检查缓存
        if (this.cache[linkId]?.[mode]) {
            return {
                summary: this.cache[linkId][mode],
                mode,
                cached: true,
                updatedAt: this.cache[linkId].updatedAt
            };
        }

        const prompt = this._buildPrompt(link, mode);

        try {
            const response = await aiService.chat([
                { role: 'system', content: this._getSystemPrompt(mode) },
                { role: 'user', content: prompt }
            ], {
                temperature: 0.5,
                maxTokens: mode === 'short' ? 100 : 300
            });

            let summary = response.content.trim();
            
            // 清理可能的 markdown 格式
            summary = this._cleanSummary(summary, mode);

            // 更新缓存
            if (!this.cache[linkId]) {
                this.cache[linkId] = { updatedAt: Date.now() };
            }
            this.cache[linkId][mode] = summary;
            this.cache[linkId].updatedAt = Date.now();
            this._saveCache();

            return { summary, mode, cached: false };

        } catch (error) {
            console.error('[Summarizer] 生成失败:', error);
            throw error;
        }
    }

    /**
     * 批量生成摘要
     * @param {Object[]} links - 链接数组
     * @param {string} mode - 'short' | 'detail'
     * @param {Function} onProgress - 进度回调 (index, total, result)
     * @returns {Promise<Array>}
     */
    async summarizeBatch(links, mode = 'short', onProgress = null) {
        const results = [];
        const total = links.length;

        for (let i = 0; i < links.length; i++) {
            try {
                const result = await this.summarize(links[i], mode);
                results.push({ linkId: links[i].id || links[i].url, ...result });
                
                if (onProgress) {
                    onProgress(i + 1, total, result);
                }
            } catch (error) {
                results.push({
                    linkId: links[i].id || links[i].url,
                    summary: '',
                    mode,
                    error: error.message
                });
            }

            // 间隔 500ms 避免限流
            if (i < links.length - 1) {
                await this._sleep(500);
            }
        }

        return results;
    }

    /**
     * 清除指定链接的摘要缓存
     * @param {string|number} linkId
     */
    clearCache(linkId) {
        if (linkId) {
            delete this.cache[linkId];
        } else {
            this.cache = {};
        }
        this._saveCache();
    }

    /**
     * 获取缓存的摘要
     * @param {string|number} linkId
     * @param {string} mode
     * @returns {string|null}
     */
    getCachedSummary(linkId, mode = 'short') {
        return this.cache[linkId]?.[mode] || null;
    }

    /**
     * 获取系统提示词
     */
    _getSystemPrompt(mode) {
        if (mode === 'short') {
            return `你是一个内容摘要专家。请用一句话（20字以内）概括链接的核心价值。
要求：
1. 简洁明了，突出核心价值
2. 不要使用"这个链接"、"这篇文章"等开头
3. 直接返回摘要文字，不要加引号或其他格式`;
        } else {
            return `你是一个内容分析专家。请用3-5句话详细描述链接的内容。
要求：
1. 第一句：概述内容主题
2. 中间：核心亮点、适合人群
3. 最后：总结价值
4. 直接返回文字，不要加 markdown 格式`;
        }
    }

    /**
     * 构建用户提示词
     */
    _buildPrompt(link, mode) {
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
     * 清理摘要文本
     */
    _cleanSummary(summary, mode) {
        // 去掉 markdown 代码块
        summary = summary.replace(/^```[\s\S]*?```\s*$/gm, '$1');
        
        // 去掉引号包裹
        summary = summary.replace(/^["'"'"「」『』]/, '').replace(/["'"'"「」『』]$/, '');
        
        // 去掉前后空白
        summary = summary.trim();
        
        // short 模式：限制长度
        if (mode === 'short' && summary.length > 30) {
            summary = summary.slice(0, 27) + '...';
        }
        
        return summary;
    }

    /**
     * 延迟函数
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// 导出单例
const summarizer = new Summarizer();
export { Summarizer, summarizer };