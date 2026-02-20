/**
 * Recommender.js - 相关推荐核心逻辑
 * 
 * 基于当前链接，从知识库中找出最相关的其他链接
 * 支持两阶段推荐：本地预筛选 + AI 精排
 */

import { aiService } from './AIService.js';

/**
 * 缓存管理
 */
const CACHE_KEY = 'superbrain_recommendations';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24小时

function getCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        return {};
    }
}

function setCache(linkId, items) {
    const cache = getCache();
    cache[linkId] = {
        items,
        updatedAt: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

function getCachedRecommendations(linkId) {
    const cache = getCache();
    const entry = cache[linkId];
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.updatedAt > CACHE_DURATION) {
        return null;
    }
    
    return entry.items;
}

/**
 * Recommender 类
 */
export class Recommender {
    constructor(aiServiceInstance) {
        this.aiService = aiServiceInstance || aiService;
    }

    /**
     * 主推荐方法
     * @param {Object} currentLink - 当前链接对象
     * @param {Array} allLinks - 所有链接数组
     * @param {number} topN - 返回数量
     * @returns {Promise<{recommendations: Array}>}
     */
    async recommend(currentLink, allLinks, topN = 5) {
        if (!currentLink || !allLinks || allLinks.length === 0) {
            return { recommendations: [] };
        }

        // 检查缓存
        const linkId = currentLink.id || currentLink.url;
        const cached = getCachedRecommendations(linkId);
        if (cached) {
            console.log('[Recommender] 使用缓存结果');
            return { recommendations: cached };
        }

        // 阶段一：本地预筛选
        const candidates = this._preFilter(currentLink, allLinks, 20);
        
        if (candidates.length === 0) {
            return { recommendations: [] };
        }

        // 如果候选数量不足或 AI 未配置，使用本地推荐
        if (!this.aiService.isConfigured() || candidates.length <= topN) {
            const localResults = this.localRecommend(currentLink, allLinks, topN);
            setCache(linkId, localResults.recommendations);
            return localResults;
        }

        // 阶段二：AI 精排
        try {
            const aiResults = await this._aiRank(currentLink, candidates, topN);
            
            // 从 allLinks 中找回完整链接对象
            const recommendations = aiResults.map(item => {
                const link = allLinks.find(l => 
                    (l.id && l.id.toString() === item.id) || 
                    l.url === item.id ||
                    l.title === item.id
                );
                if (link) {
                    return {
                        link,
                        reason: item.reason || '内容相关',
                        score: item.score || 0.5
                    };
                }
                return null;
            }).filter(Boolean);

            // 如果 AI 返回不足，用本地结果补充
            if (recommendations.length < topN) {
                const localResults = this.localRecommend(currentLink, allLinks, topN);
                const existingIds = new Set(recommendations.map(r => r.link.id || r.link.url));
                
                for (const item of localResults.recommendations) {
                    if (recommendations.length >= topN) break;
                    const itemId = item.link.id || item.link.url;
                    if (!existingIds.has(itemId)) {
                        recommendations.push(item);
                    }
                }
            }

            setCache(linkId, recommendations);
            return { recommendations };

        } catch (error) {
            console.error('[Recommender] AI 精排失败，降级到本地推荐:', error);
            const localResults = this.localRecommend(currentLink, allLinks, topN);
            setCache(linkId, localResults.recommendations);
            return localResults;
        }
    }

    /**
     * 本地预筛选
     * @private
     */
    _preFilter(currentLink, allLinks, maxCandidates) {
        const currentId = currentLink.id || currentLink.url;
        const currentTag = currentLink.tag;

        // 计算每个链接的相关性分数
        const scored = allLinks
            .filter(link => (link.id || link.url) !== currentId) // 排除自身
            .map(link => {
                let score = 0;
                
                // 标签重叠
                if (currentTag && link.tag === currentTag) {
                    score += 10;
                }
                
                // 标题关键词重叠（简单分词）
                const currentWords = this._extractKeywords(currentLink.title);
                const linkWords = this._extractKeywords(link.title);
                const overlap = currentWords.filter(w => linkWords.includes(w)).length;
                score += overlap * 2;
                
                // 时间相近度（越近分数越高）
                const daysDiff = this._daysDifference(currentLink.time, link.time);
                if (daysDiff <= 7) score += 3;
                else if (daysDiff <= 30) score += 1;
                
                return { link, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, maxCandidates);

        return scored.map(s => s.link);
    }

    /**
     * AI 精排
     * @private
     */
    async _aiRank(currentLink, candidates, topN) {
        const candidateInfo = candidates.map((link, i) => ({
            id: link.id || link.url || `candidate_${i}`,
            title: link.title,
            tag: link.tag || '未分类',
            note: link.note || ''
        }));

        const prompt = `你是一个知识管理助手。用户正在查看一篇链接，请从候选列表中选出最相关的 ${topN} 条链接。

当前链接：
- 标题：${currentLink.title}
- 标签：${currentLink.tag || '未分类'}
- 笔记：${currentLink.note || '无'}

候选链接列表：
${candidateInfo.map((c, i) => `${i + 1}. [ID: ${c.id}] "${c.title}" (标签: ${c.tag})`).join('\n')}

请返回 JSON 格式（不要包含 markdown 代码块标记）：
{
  "recommendations": [
    { "id": "链接的id值", "reason": "一句话说明为什么相关（15字以内）" }
  ]
}

要求：
1. 最多返回 ${topN} 条
2. 按相关性从高到低排序
3. reason 必须简洁，15字以内
4. 只返回 JSON，不要其他内容`;

        const response = await this.aiService.chat(prompt);
        
        // 解析 JSON
        let result;
        try {
            // 尝试提取 JSON
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                result = JSON.parse(jsonMatch[0]);
            } else {
                result = JSON.parse(response);
            }
        } catch (e) {
            console.error('[Recommender] JSON 解析失败:', response);
            throw new Error('AI 返回格式错误');
        }

        return result.recommendations || [];
    }

    /**
     * 本地推荐（降级方案）
     * @param {Object} currentLink - 当前链接
     * @param {Array} allLinks - 所有链接
     * @param {number} topN - 返回数量
     * @returns {{recommendations: Array}}
     */
    localRecommend(currentLink, allLinks, topN = 5) {
        const currentId = currentLink.id || currentLink.url;
        const currentTag = currentLink.tag;
        const currentWords = this._extractKeywords(currentLink.title);

        const scored = allLinks
            .filter(link => (link.id || link.url) !== currentId)
            .map(link => {
                let score = 0;
                const reasons = [];
                
                // 标签重叠（权重最高）
                if (currentTag && link.tag === currentTag) {
                    score += 50;
                    reasons.push('标签相同');
                }
                
                // 标题关键词重叠
                const linkWords = this._extractKeywords(link.title);
                const wordOverlap = currentWords.filter(w => linkWords.includes(w)).length;
                if (wordOverlap > 0) {
                    score += wordOverlap * 15;
                    reasons.push(`关键词匹配(${wordOverlap})`);
                }
                
                // 时间相近度
                const daysDiff = this._daysDifference(currentLink.time, link.time);
                if (daysDiff <= 7) {
                    score += 10;
                    reasons.push('时间相近');
                }
                
                // 笔记相似度（简单检查）
                if (currentLink.note && link.note) {
                    const noteWords = this._extractKeywords(currentLink.note);
                    const linkNoteWords = this._extractKeywords(link.note);
                    const noteOverlap = noteWords.filter(w => linkNoteWords.includes(w)).length;
                    if (noteOverlap > 0) {
                        score += noteOverlap * 5;
                    }
                }
                
                return {
                    link,
                    score: score / 100, // 归一化到 0-1
                    reason: reasons.length > 0 ? reasons.join('、') : '内容相关'
                };
            })
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, topN);

        return { recommendations: scored };
    }

    /**
     * 提取关键词（简单分词）
     * @private
     */
    _extractKeywords(text) {
        if (!text) return [];
        
        // 移除标点符号，转小写
        const cleaned = text.toLowerCase()
            .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
            .trim();
        
        // 分词（简单按空格分割，中文按字符）
        const words = [];
        const parts = cleaned.split(/\s+/);
        
        for (const part of parts) {
            if (part.length === 0) continue;
            
            // 中文：每2-4个字符作为一个词
            if (/[\u4e00-\u9fa5]/.test(part)) {
                for (let len = 4; len >= 2; len--) {
                    for (let i = 0; i <= part.length - len; i++) {
                        words.push(part.slice(i, i + len));
                    }
                }
                // 单字也加入
                for (const char of part) {
                    if (/[\u4e00-\u9fa5]/.test(char)) {
                        words.push(char);
                    }
                }
            } else {
                // 英文/数字
                if (part.length >= 2) {
                    words.push(part);
                }
            }
        }
        
        return [...new Set(words)];
    }

    /**
     * 计算两个时间字符串的天数差
     * @private
     */
    _daysDifference(time1, time2) {
        if (!time1 || !time2) return Infinity;
        
        const parseTime = (t) => {
            let date = new Date(t);
            if (isNaN(date.getTime())) {
                date = new Date(t.replace(/\//g, '-'));
            }
            return date;
        };
        
        const d1 = parseTime(time1);
        const d2 = parseTime(time2);
        
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
            return Infinity;
        }
        
        return Math.abs((d1.getTime() - d2.getTime()) / (24 * 60 * 60 * 1000));
    }

    /**
     * 清除缓存
     */
    clearCache() {
        localStorage.removeItem(CACHE_KEY);
    }

    /**
     * 清除特定链接的缓存
     */
    clearCacheForLink(linkId) {
        const cache = getCache();
        delete cache[linkId];
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
}

// 创建默认实例
const recommender = new Recommender();
export { recommender };