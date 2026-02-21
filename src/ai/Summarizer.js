/**
 * Summarizer - AI 内容摘要生成器（增强版）
 * 支持内容类型自动识别，结构化输出
 */
import { aiService } from './AIService.js';

class Summarizer {
    constructor() {
        this.cacheKey = 'superbrain_summaries';
        this.cache = this._loadCache();
    }

    _loadCache() {
        try {
            const data = localStorage.getItem(this.cacheKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }
    
    _saveCache() {
        try {
            localStorage.setItem(this.cacheKey, JSON.stringify(this.cache));
        } catch (e) {
            console.warn('[Summarizer] 缓存保存失败:', e);
        }
    }
    
    /**
     * 自动识别内容类型
     */
    _detectContentType(link) {
        const url   = (link.url   || '').toLowerCase();
        const title = (link.title || '').toLowerCase();
        const note  = (link.note  || '').toLowerCase();
        const tag   = (link.tag   || '').toLowerCase();
        const all   = url + title + note + tag;
    
        if (/youtube\.com|youtu\.be|bilibili\.com|vimeo\.com|v\.qq\.com|douyin|tiktok/.test(url)) {
            return 'video';
        }
        if (/podcast|spotify\.com\/episode|apple\.co\/podcast|ximalaya|lizhi\.fm|声音|播客|音频/.test(all)) {
            return 'podcast';
        }
        if (/github\.com|docs\.|developer\.|api\.|stackoverflow|npm\.|pypi\.|readthedocs|技术|文档|教程|开发|代码|框架|library|sdk/.test(all)) {
            return 'tech';
        }
        if (/paper|arxiv|research|学术|论文|研究|journal|ieee|acm/.test(all)) {
            return 'paper';
        }
        return 'article';
    }
    
    /**
     * 获取系统提示词（按内容类型）
     */
    _getSystemPrompt(mode, contentType) {
        if (mode === 'short') {
            return `你是内容摘要专家。用一句话（25字以内）概括核心价值。直接返回文字，不加引号和格式符号。`;
        }
    
        const prompts = {
            tech: `你是技术内容分析专家。请对技术文档/教程进行结构化分析，严格按以下格式输出（使用 emoji 标题）：

🎯 **核心定位**
一句话说明这个技术/工具解决什么问题。

🔧 **关键技术点**
- 列出3-5个最重要的技术概念或功能

👥 **适合人群**
说明适合哪类开发者或技术水平。

⚡ **快速上手**
最关键的入门步骤或注意事项（1-3条）。

⚠️ **注意事项**
使用中需要特别注意的坑或限制。`,

            video: `你是视频内容分析专家。请对视频内容进行结构化分析，严格按以下格式输出：

🎬 **视频主题**
一句话概括视频核心内容。

📌 **主要观点**
- 列出3-5个核心观点或内容段落

👥 **适合观众**
说明适合哪类人群观看。

💡 **核心收获**
观看后最重要的3个收获或启发。

🔗 **相关延伸**
建议配合学习的相关内容方向（如有）。`,

            podcast: `你是播客内容分析专家。请对播客/音频内容进行结构化分析，严格按以下格式输出：

🎙️ **节目主题**
一句话概括本期主题。

🗣️ **主要讨论**
- 列出3-5个主要话题或讨论点

💎 **精华观点**
最值得记录的2-3个观点或金句。

👥 **适合听众**
说明适合哪类人群收听。

⏱️ **收听建议**
是否值得精听/泛听，适合什么场景收听。`,

            paper: `你是学术内容分析专家。请对论文/研究内容进行结构化分析，严格按以下格式输出：

📄 **研究问题**
这篇论文试图解决什么问题？

🔬 **核心方法**
采用了什么研究方法或技术路线？

📊 **主要结论**
- 列出2-4个最重要的研究结论

🌍 **实际意义**
研究成果有什么实际应用价值？

📚 **适合人群**
适合哪类研究者或从业者阅读？`,

            article: `你是内容分析专家。请对文章进行结构化分析，严格按以下格式输出：

📝 **文章主题**
一句话概括文章核心议题。

💡 **核心观点**
- 列出3-5个主要观点或论据

🎯 **目标读者**
适合哪类人群阅读。

✨ **最大价值**
读完这篇文章最重要的收获是什么？

🔖 **一句话推荐语**
如果推荐给朋友，你会怎么介绍这篇文章？`
        };

        return prompts[contentType] || prompts.article;
    }
    
    /**
     * 构建用户提示词
     */
    _buildPrompt(link, mode, contentType) {
        const parts = [];
    
        if (link.title) parts.push(`标题：${link.title}`);
        if (link.url)   parts.push(`链接：${link.url}`);
        if (link.note)  parts.push(`备注：${link.note}`);
        if (link.tag)   parts.push(`标签：${link.tag}`);
    
        if (parts.length === 0) parts.push('（无链接信息）');
    
        if (mode === 'detail') {
            const typeLabel = {
                tech: '技术文档/教程', video: '视频', podcast: '播客/音频',
                paper: '学术论文', article: '文章'
            }[contentType] || '文章';
            parts.push(`\n内容类型：${typeLabel}`);
            parts.push(`请严格按照系统提示的格式输出结构化分析。`);
        }
    
        return parts.join('\n');
    }
    
    /**
     * 清理摘要文本
     */
    _cleanSummary(summary, mode) {
        summary = summary.replace(/^```[\s\S]*?```\s*$/gm, '');
        if (mode === 'short') {
            summary = summary.replace(/^["'"'"「」『』]/, '').replace(/["'"'"「」『』]$/, '');
            summary = summary.trim();
            if (summary.length > 30) summary = summary.slice(0, 27) + '...';
        } else {
            summary = summary.trim();
        }
        return summary;
    }
    
    /**
     * 生成摘要（核心方法）
     */
    async summarize(link, mode = 'short') {
        if (!aiService.isConfigured()) {
            throw new Error('AI 服务未配置');
        }
    
        const linkId      = link.id || link.url;
        const contentType = this._detectContentType(link);
        const cacheKey    = mode === 'detail' ? `detail_${contentType}` : mode;
    
        // 检查缓存
        if (this.cache[linkId]?.[cacheKey]) {
            return {
                summary:     this.cache[linkId][cacheKey],
                mode,
                contentType,
                cached:      true,
                updatedAt:   this.cache[linkId].updatedAt
            };
        }
    
        const maxTokens = mode === 'short' ? 80 : {
            tech: 600, video: 600, podcast: 600, paper: 700, article: 500
        }[contentType] || 500;
    
        try {
            const response = await aiService.chat([
                { role: 'system', content: this._getSystemPrompt(mode, contentType) },
                { role: 'user',   content: this._buildPrompt(link, mode, contentType) }
            ], { temperature: 0.4, maxTokens });
    
            let summary = this._cleanSummary(response.content.trim(), mode);
    
            // 写缓存
            if (!this.cache[linkId]) this.cache[linkId] = {};
            this.cache[linkId][cacheKey]  = summary;
            this.cache[linkId].updatedAt  = Date.now();
            this.cache[linkId].contentType = contentType;
            this._saveCache();
    
            return { summary, mode, contentType, cached: false };
    
        } catch (error) {
            console.error('[Summarizer] 生成失败:', error);
            throw error;
        }
    }
    
    /**
     * 批量生成摘要
     */
    async summarizeBatch(links, mode = 'short', onProgress = null) {
        const results = [];
        for (let i = 0; i < links.length; i++) {
            try {
                const result = await this.summarize(links[i], mode);
                results.push({ linkId: links[i].id || links[i].url, ...result });
                if (onProgress) onProgress(i + 1, links.length, result);
            } catch (error) {
                results.push({ linkId: links[i].id || links[i].url, summary: '', mode, error: error.message });
            }
            if (i < links.length - 1) await this._sleep(500);
        }
        return results;
    }
    
    clearCache(linkId) {
        if (linkId) delete this.cache[linkId];
        else this.cache = {};
        this._saveCache();
    }
    
    getCachedSummary(linkId, mode = 'short') {
        return this.cache[linkId]?.[mode] || null;
    }
    
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

const summarizer = new Summarizer();
export { Summarizer, summarizer };