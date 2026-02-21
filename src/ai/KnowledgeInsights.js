/**
 * KnowledgeInsights - AI 知识库洞察模块
 * 复用 AIService 统一接口，分析用户知识库并生成洞察报告
 */
import { aiService } from './AIService.js';

export class KnowledgeInsights {
    /**
     * 构建分析 Prompt
     */
    _buildPrompt(links) {
        const total = links.length;
        if (total === 0) return null;

        // 汇总标签分布
        const tagMap = {};
        links.forEach(link => {
            const tag = link.tag || link.category || '未分类';
            tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
        const tagSummary = Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1])
            .map(([tag, count]) => `${tag}(${count}条)`)
            .join('、');
    
        // 取最近20条链接标题作为样本
        const sample = links.slice(-20).map(l => l.title || l.url).join('\n');
    
        return `你是一个知识管理专家，请分析以下用户的链接收藏数据：

【概况】
- 总收藏数：${total} 条
- 标签分布：${tagSummary}

【最近收藏的内容样本】
${sample}

请用中文输出以下分析（格式要简洁，每项2-3句话）：

## 🎯 主要兴趣领域
（分析用户最关注的3个方向）

## 💪 知识结构亮点
（用户在哪些领域积累较深）

## 🔍 可探索的盲点
（根据现有内容，建议补充哪些相关领域）

## 💡 3条个性化建议
（具体可操作的学习或整理建议）`;
    }

    /**
     * 生成知识库洞察报告
     * @param {Array} links - 链接数组
     * @returns {Promise<string>} - AI 生成的分析报告
     */
    async analyze(links) {
        if (!aiService.isConfigured()) {
            throw new Error('请先在 AI 设置中配置 API Key');
        }
    
        const prompt = this._buildPrompt(links);
        if (!prompt) {
            throw new Error('知识库暂无数据，请先添加一些链接');
        }
    
        const result = await aiService.chat([
            { role: 'user', content: prompt }
        ], { maxTokens: 1000 });
    
        return result.content;
    }
}

export const knowledgeInsights = new KnowledgeInsights();