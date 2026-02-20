/**
 * SavedQueries - 保存的搜索条件管理
 * 
 * 数据存储在 localStorage，与 AppState 风格保持一致
 */

const STORAGE_KEY = 'superbrain_saved_queries';

/**
 * SavedQueries 类
 */
class SavedQueries {
    constructor() {
        this._cache = null;
    }

    /**
     * 获取所有已保存的查询条件
     * @returns {Array} 查询条件数组
     */
    getAll() {
        if (this._cache !== null) {
            return this._cache;
        }
        
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            this._cache = data ? JSON.parse(data) : [];
            return this._cache;
        } catch (e) {
            console.error('[SavedQueries] 读取失败:', e);
            return [];
        }
    }

    /**
     * 保存查询条件
     * @param {string} name - 条件名称
     * @param {Array} conditions - 条件数组
     * @param {string} logic - 逻辑组合 (AND/OR)
     * @returns {Object} 保存的查询对象
     */
    save(name, conditions, logic = 'AND') {
        if (!name || !name.trim()) {
            console.warn('[SavedQueries] 名称不能为空');
            return null;
        }
        
        if (!Array.isArray(conditions) || conditions.length === 0) {
            console.warn('[SavedQueries] 条件不能为空');
            return null;
        }
        
        const queries = this.getAll();
        
        const newQuery = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            name: name.trim(),
            conditions: conditions,
            logic: logic,
            createdAt: new Date().toLocaleString('zh-CN'),
            useCount: 0
        };
        
        queries.unshift(newQuery);
        this._persist(queries);
        
        console.log('[SavedQueries] 已保存:', newQuery.name);
        return newQuery;
    }

    /**
     * 加载指定查询条件
     * @param {string} id - 查询 ID
     * @returns {Object|null} 查询对象
     */
    load(id) {
        const queries = this.getAll();
        const query = queries.find(q => q.id === id);
        
        if (query) {
            // 更新使用次数
            query.useCount = (query.useCount || 0) + 1;
            this._persist(queries);
            console.log('[SavedQueries] 已加载:', query.name);
            return {
                conditions: query.conditions,
                logic: query.logic,
                name: query.name
            };
        }
        
        console.warn('[SavedQueries] 未找到:', id);
        return null;
    }

    /**
     * 删除指定查询条件
     * @param {string} id - 查询 ID
     * @returns {boolean} 是否删除成功
     */
    delete(id) {
        const queries = this.getAll();
        const index = queries.findIndex(q => q.id === id);
        
        if (index !== -1) {
            const removed = queries.splice(index, 1)[0];
            this._persist(queries);
            console.log('[SavedQueries] 已删除:', removed.name);
            return true;
        }
        
        return false;
    }

    /**
     * 清空所有保存的查询条件
     */
    clear() {
        this._persist([]);
        console.log('[SavedQueries] 已清空所有条件');
    }

    /**
     * 持久化到 localStorage
     */
    _persist(queries) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queries));
            this._cache = queries;
        } catch (e) {
            console.error('[SavedQueries] 保存失败:', e);
        }
    }

    /**
     * 渲染已保存条件列表 HTML
     * @param {Function} onLoad - 加载回调 (query) => void
     * @param {Function} onDelete - 删除回调 (id) => void
     * @returns {string} HTML 字符串
     */
    renderList(onLoad, onDelete) {
        const queries = this.getAll();
        
        if (queries.length === 0) {
            return `
                <div class="saved-queries-empty">
                    <span class="empty-icon">📭</span>
                    <span class="empty-text">暂无保存的搜索条件</span>
                </div>
            `;
        }
        
        return `
            <div class="saved-queries-list">
                ${queries.map(query => this._renderItem(query)).join('')}
            </div>
        `;
    }

    /**
     * 渲染单个条件项
     */
    _renderItem(query) {
        const conditionCount = query.conditions?.length || 0;
        const logicLabel = query.logic === 'OR' ? '或' : '且';
        
        return `
            <div class="saved-query-item" data-id="${query.id}">
                <div class="saved-query-info">
                    <span class="saved-query-name">${this._escapeHtml(query.name)}</span>
                    <span class="saved-query-meta">
                        ${conditionCount} 个条件 · ${logicLabel}
                        ${query.useCount ? ` · 使用 ${query.useCount} 次` : ''}
                    </span>
                </div>
                <div class="saved-query-actions">
                    <button class="sq-btn sq-btn-load" data-action="load" data-id="${query.id}" title="加载此条件">
                        📥
                    </button>
                    <button class="sq-btn sq-btn-delete" data-action="delete" data-id="${query.id}" title="删除">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * 渲染样式
     */
    static getStyles() {
        return `
            .saved-queries-section {
                margin-bottom: 16px;
            }
            
            .saved-queries-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }
            
            .saved-queries-title {
                font-size: 14px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .saved-queries-count {
                font-size: 12px;
                color: var(--text-tertiary);
            }
            
            .saved-queries-list {
                display: flex;
                flex-direction: column;
                gap: 6px;
                max-height: 200px;
                overflow-y: auto;
            }
            
            .saved-query-item {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 8px 10px;
                background: var(--bg-card);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .saved-query-item:hover {
                border-color: var(--accent-color);
                background: var(--bg-card-hover);
            }
            
            .saved-query-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
                min-width: 0;
                flex: 1;
            }
            
            .saved-query-name {
                font-size: 13px;
                font-weight: 500;
                color: var(--text-primary);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .saved-query-meta {
                font-size: 11px;
                color: var(--text-tertiary);
            }
            
            .saved-query-actions {
                display: flex;
                gap: 4px;
                margin-left: 8px;
            }
            
            .sq-btn {
                width: 26px;
                height: 26px;
                border: none;
                border-radius: 6px;
                background: transparent;
                color: var(--text-secondary);
                font-size: 12px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }
            
            .sq-btn-load:hover {
                background: rgba(0, 113, 227, 0.1);
                color: var(--accent-color);
            }
            
            .sq-btn-delete:hover {
                background: rgba(255, 59, 48, 0.1);
                color: #ff3b30;
            }
            
            .saved-queries-empty {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 16px;
                color: var(--text-tertiary);
                font-size: 13px;
            }
            
            .saved-queries-empty .empty-icon {
                font-size: 18px;
            }
            
            /* 保存区域 */
            .save-query-section {
                display: flex;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid var(--border-color);
                margin-top: 12px;
            }
            
            .save-query-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 13px;
            }
            
            .save-query-input:focus {
                outline: none;
                border-color: var(--accent-color);
            }
            
            .save-query-input::placeholder {
                color: var(--text-tertiary);
            }
            
            .save-query-btn {
                padding: 8px 14px;
                border: none;
                border-radius: 6px;
                background: var(--accent-color);
                color: white;
                font-size: 13px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            
            .save-query-btn:hover {
                background: var(--accent-hover);
            }
            
            .save-query-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `;
    }

    /**
     * HTML 转义
     */
    _escapeHtml(str) {
        if (!str) return '';
        const escapeMap = {
            '&': '\x26amp;',
            '<': '\x26lt;',
            '>': '\x26gt;',
            '"': '\x26quot;'
        };
        return String(str).replace(/[&<>"]/g, char => escapeMap[char]);
    }
}

// 导出单例
const savedQueries = new SavedQueries();
export { SavedQueries, savedQueries };