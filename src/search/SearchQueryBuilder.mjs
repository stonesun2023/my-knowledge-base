/**
 * SearchQueryBuilder - 高级搜索查询引擎
 * 
 * 导出 buildFilter(conditions, logic) 函数
 * 用于构建复杂的链接过滤条件
 */

// ==========================================
// 字段映射：将查询字段名映射到实际 link 对象属性
// ==========================================
const FIELD_MAP = {
    title: 'title',
    url: 'url',
    tags: 'tag',        // link.tag 是单个字符串
    description: 'note', // link.note 是描述字段
    createdAt: 'time'    // link.time 是创建时间字符串
};

// ==========================================
// 文本类 operator 处理函数
// ==========================================

/**
 * contains - 包含指定文本（不区分大小写）
 */
function textContains(fieldValue, searchValue) {
    if (fieldValue == null || searchValue == null) return false;
    return String(fieldValue).toLowerCase().includes(String(searchValue).toLowerCase());
}

/**
 * not_contains - 不包含指定文本
 */
function textNotContains(fieldValue, searchValue) {
    if (fieldValue == null) return true;
    if (searchValue == null) return true;
    return !String(fieldValue).toLowerCase().includes(String(searchValue).toLowerCase());
}

/**
 * equals - 完全相等（不区分大小写）
 */
function textEquals(fieldValue, searchValue) {
    if (fieldValue == null || searchValue == null) return false;
    return String(fieldValue).toLowerCase() === String(searchValue).toLowerCase();
}

/**
 * starts_with - 以指定文本开头
 */
function textStartsWith(fieldValue, searchValue) {
    if (fieldValue == null || searchValue == null) return false;
    return String(fieldValue).toLowerCase().startsWith(String(searchValue).toLowerCase());
}

// ==========================================
// 标签类 operator 处理函数
// ==========================================

/**
 * includes_any - 包含任意一个指定标签
 * @param {string} linkTag - 链接的标签（单个字符串）
 * @param {string|string[]} searchTags - 要搜索的标签（单个或数组）
 */
function tagsIncludesAny(linkTag, searchTags) {
    if (linkTag == null) return false;
    if (searchTags == null) return false;
    
    const linkTagLower = String(linkTag).toLowerCase();
    
    if (Array.isArray(searchTags)) {
        return searchTags.some(tag => 
            String(tag).toLowerCase() === linkTagLower
        );
    }
    return linkTagLower === String(searchTags).toLowerCase();
}

/**
 * includes_all - 包含所有指定标签
 * 注意：由于 link.tag 是单个字符串，此操作符实际上等同于 equals
 * 但保留此函数以便未来扩展支持多标签
 */
function tagsIncludesAll(linkTag, searchTags) {
    if (linkTag == null) return false;
    if (searchTags == null) return false;
    
    const linkTagLower = String(linkTag).toLowerCase();
    
    if (Array.isArray(searchTags)) {
        // 单标签情况下，需要所有搜索标签都匹配（实际只有1个时才有意义）
        return searchTags.every(tag => 
            String(tag).toLowerCase() === linkTagLower
        );
    }
    return linkTagLower === String(searchTags).toLowerCase();
}

/**
 * excludes - 不包含指定标签
 */
function tagsExcludes(linkTag, searchTags) {
    if (linkTag == null) return true;
    if (searchTags == null) return true;
    
    const linkTagLower = String(linkTag).toLowerCase();
    
    if (Array.isArray(searchTags)) {
        return !searchTags.some(tag => 
            String(tag).toLowerCase() === linkTagLower
        );
    }
    return linkTagLower !== String(searchTags).toLowerCase();
}

// ==========================================
// 日期类 operator 处理函数
// ==========================================

/**
 * 解析 link.time 字符串为 Date 对象
 * 支持格式：'2026/2/20 上午8:22:33' 或 '2026-2-20 08:22:33'
 */
function parseLinkTime(timeStr) {
    if (!timeStr) return null;
    
    // 尝试直接解析
    let date = new Date(timeStr);
    if (!isNaN(date.getTime())) return date;
    
    // 替换 / 为 - 后再试
    date = new Date(timeStr.replace(/\//g, '-'));
    if (!isNaN(date.getTime())) return date;
    
    // 处理中文时间格式 '2026/2/20 上午8:22:33'
    // 提取日期部分
    const match = timeStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (match) {
        const [, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    return null;
}

/**
 * before - 在指定日期之前
 * @param {string} linkTime - 链接创建时间字符串
 * @param {string|Date} targetDate - 目标日期
 */
function dateBefore(linkTime, targetDate) {
    const linkDate = parseLinkTime(linkTime);
    if (!linkDate) return false;
    
    const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
    if (isNaN(target.getTime())) return false;
    
    // 比较日期（忽略时间部分）
    const linkDateOnly = new Date(linkDate.getFullYear(), linkDate.getMonth(), linkDate.getDate());
    const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    
    return linkDateOnly < targetDateOnly;
}

/**
 * after - 在指定日期之后
 */
function dateAfter(linkTime, targetDate) {
    const linkDate = parseLinkTime(linkTime);
    if (!linkDate) return false;
    
    const target = targetDate instanceof Date ? targetDate : new Date(targetDate);
    if (isNaN(target.getTime())) return false;
    
    const linkDateOnly = new Date(linkDate.getFullYear(), linkDate.getMonth(), linkDate.getDate());
    const targetDateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    
    return linkDateOnly > targetDateOnly;
}

/**
 * between - 在指定日期范围内
 * @param {string} linkTime - 链接创建时间字符串
 * @param {Object} range - { start, end } 日期范围
 */
function dateBetween(linkTime, range) {
    if (!range || !range.start || !range.end) return false;
    
    const linkDate = parseLinkTime(linkTime);
    if (!linkDate) return false;
    
    const startDate = range.start instanceof Date ? range.start : new Date(range.start);
    const endDate = range.end instanceof Date ? range.end : new Date(range.end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
    
    const linkDateOnly = new Date(linkDate.getFullYear(), linkDate.getMonth(), linkDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return linkDateOnly >= startDateOnly && linkDateOnly <= endDateOnly;
}

/**
 * last_n_days - 最近 N 天内
 * @param {string} linkTime - 链接创建时间字符串
 * @param {number} n - 天数
 */
function dateLastNDays(linkTime, n) {
    if (n == null || n < 0) return false;
    
    const linkDate = parseLinkTime(linkTime);
    if (!linkDate) return false;
    
    const now = new Date();
    const nDaysAgo = new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
    
    const linkDateOnly = new Date(linkDate.getFullYear(), linkDate.getMonth(), linkDate.getDate());
    const nDaysAgoOnly = new Date(nDaysAgo.getFullYear(), nDaysAgo.getMonth(), nDaysAgo.getDate());
    const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return linkDateOnly >= nDaysAgoOnly && linkDateOnly <= nowOnly;
}

// ==========================================
// Operator 映射表
// ==========================================
const OPERATORS = {
    // 文本类
    contains: { handler: textContains, fields: ['title', 'url', 'description'] },
    not_contains: { handler: textNotContains, fields: ['title', 'url', 'description'] },
    equals: { handler: textEquals, fields: ['title', 'url', 'description'] },
    starts_with: { handler: textStartsWith, fields: ['title', 'url', 'description'] },
    
    // 标签类
    includes_any: { handler: tagsIncludesAny, fields: ['tags'] },
    includes_all: { handler: tagsIncludesAll, fields: ['tags'] },
    excludes: { handler: tagsExcludes, fields: ['tags'] },
    
    // 日期类
    before: { handler: dateBefore, fields: ['createdAt'] },
    after: { handler: dateAfter, fields: ['createdAt'] },
    between: { handler: dateBetween, fields: ['createdAt'] },
    last_n_days: { handler: dateLastNDays, fields: ['createdAt'] }
};

// ==========================================
// 单个条件求值
// ==========================================
function evaluateCondition(link, condition) {
    const { field, operator, value } = condition;
    
    // 验证字段
    if (!FIELD_MAP[field]) {
        console.warn(`[SearchQueryBuilder] 未知字段: ${field}`);
        return false;
    }
    
    // 验证操作符
    const opConfig = OPERATORS[operator];
    if (!opConfig) {
        console.warn(`[SearchQueryBuilder] 未知操作符: ${operator}`);
        return false;
    }
    
    // 验证字段与操作符兼容性
    if (!opConfig.fields.includes(field)) {
        console.warn(`[SearchQueryBuilder] 操作符 "${operator}" 不支持字段 "${field}"`);
        return false;
    }
    
    // 获取 link 中对应的字段值
    const linkField = FIELD_MAP[field];
    const fieldValue = link[linkField];
    
    // 调用对应的处理函数
    return opConfig.handler(fieldValue, value);
}

// ==========================================
// 主函数：buildFilter
// ==========================================

/**
 * 构建过滤函数
 * @param {Array} conditions - 条件数组，每项格式：{ field, operator, value }
 * @param {string} logic - 逻辑组合方式：'AND' 或 'OR'
 * @returns {Function} 过滤函数 (link) => boolean
 * 
 * @example
 * // 查找标题包含 "AI" 且标签为 "学习" 的链接
 * const filter = buildFilter([
 *   { field: 'title', operator: 'contains', value: 'AI' },
 *   { field: 'tags', operator: 'includes_any', value: '学习' }
 * ], 'AND');
 * const results = links.filter(filter);
 */
function buildFilter(conditions, logic = 'AND') {
    // 参数校验
    if (!Array.isArray(conditions)) {
        console.warn('[SearchQueryBuilder] conditions 必须是数组');
        return () => true;
    }
    
    if (conditions.length === 0) {
        return () => true;
    }
    
    const normalizedLogic = String(logic).toUpperCase();
    if (normalizedLogic !== 'AND' && normalizedLogic !== 'OR') {
        console.warn('[SearchQueryBuilder] logic 必须是 "AND" 或 "OR"，默认使用 AND');
    }
    
    const useAnd = normalizedLogic !== 'OR';
    
    // 返回过滤函数
    return function(link) {
        if (!link || typeof link !== 'object') return false;
        
        if (useAnd) {
            // AND 逻辑：所有条件都必须满足
            return conditions.every(condition => evaluateCondition(link, condition));
        } else {
            // OR 逻辑：任意一个条件满足即可
            return conditions.some(condition => evaluateCondition(link, condition));
        }
    };
}

// ==========================================
// 导出
// ==========================================
export { buildFilter };

// 也导出各个 operator 处理函数，便于单独使用和测试
export {
    // 文本类
    textContains,
    textNotContains,
    textEquals,
    textStartsWith,
    
    // 标签类
    tagsIncludesAny,
    tagsIncludesAll,
    tagsExcludes,
    
    // 日期类
    dateBefore,
    dateAfter,
    dateBetween,
    dateLastNDays,
    parseLinkTime
};

// 导出配置（便于外部扩展）
export { FIELD_MAP, OPERATORS };