/**
 * AdvancedSearch - 高级搜索 UI 组件
 * 
 * 提供可视化的条件构建界面，配合 SearchQueryBuilder 使用
 */

import { savedQueries } from './SavedQueries.js';

/**
 * 字段配置
 */
const FIELD_CONFIG = {
    title: {
        label: '标题',
        operators: ['contains', 'not_contains', 'equals', 'starts_with']
    },
    url: {
        label: '链接',
        operators: ['contains', 'not_contains', 'equals', 'starts_with']
    },
    description: {
        label: '描述',
        operators: ['contains', 'not_contains', 'equals', 'starts_with']
    },
    tags: {
        label: '标签',
        operators: ['includes_any', 'includes_all', 'excludes']
    },
    createdAt: {
        label: '创建时间',
        operators: ['before', 'after', 'between', 'last_n_days']
    }
};

/**
 * 操作符配置
 */
const OPERATOR_CONFIG = {
    // 文本类
    contains: { label: '包含', valueType: 'text' },
    not_contains: { label: '不包含', valueType: 'text' },
    equals: { label: '等于', valueType: 'text' },
    starts_with: { label: '开头为', valueType: 'text' },
    
    // 标签类
    includes_any: { label: '包含任意', valueType: 'tags' },
    includes_all: { label: '包含全部', valueType: 'tags' },
    excludes: { label: '不包含', valueType: 'tags' },
    
    // 日期类
    before: { label: '早于', valueType: 'date' },
    after: { label: '晚于', valueType: 'date' },
    between: { label: '介于', valueType: 'dateRange' },
    last_n_days: { label: '最近N天', valueType: 'number' }
};

/**
 * 默认条件模板
 */
const DEFAULT_CONDITION = {
    field: 'title',
    operator: 'contains',
    value: ''
};

/**
 * AdvancedSearch 类
 */
class AdvancedSearch {
    /**
     * @param {Object} options - 配置选项
     * @param {string} options.containerId - 容器元素 ID
     * @param {Function} options.onSearch - 搜索回调函数 (query) => void
     * @param {string[]} options.availableTags - 可用标签列表（用于标签选择）
     */
    constructor(options = {}) {
        this.containerId = options.containerId || 'advancedSearchPanel';
        this.onSearch = options.onSearch || (() => {});
        this.availableTags = options.availableTags || [];
        
        // 内部状态
        this.conditions = [{ ...DEFAULT_CONDITION }];
        this.logic = 'AND';
        this.conditionId = 0;
        
        // 为每个条件生成唯一 ID
        this.conditions.forEach((c, i) => c._id = i);
        this.conditionId = this.conditions.length;
    }

    /**
     * 渲染高级搜索面板 HTML
     * @returns {string} HTML 字符串
     */
    render() {
        return `
            <div class="advanced-search" id="${this.containerId}">
                <div class="advanced-search-header">
                    <span class="advanced-search-title">🔍 高级搜索</span>
                    <div class="logic-toggle">
                        <button class="logic-btn ${this.logic === 'AND' ? 'active' : ''}" data-logic="AND">AND</button>
                        <button class="logic-btn ${this.logic === 'OR' ? 'active' : ''}" data-logic="OR">OR</button>
                    </div>
                </div>
                
                <!-- 已保存的条件列表 -->
                <div class="saved-queries-section" id="savedQueriesSection">
                    <div class="saved-queries-header">
                        <span class="saved-queries-title">📌 已保存的条件</span>
                        <span class="saved-queries-count" id="savedQueriesCount"></span>
                    </div>
                    <div id="savedQueriesList">
                        ${savedQueries.renderList()}
                    </div>
                </div>
                
                <!-- 条件编辑区 -->
                <div class="conditions-list" id="conditionsList">
                    ${this.conditions.map((condition, index) => this._renderCondition(condition, index)).join('')}
                </div>
                
                <div class="advanced-search-actions">
                    <button class="as-btn as-btn-add" id="addConditionBtn">➕ 添加条件</button>
                    <button class="as-btn as-btn-search" id="executeSearchBtn">🔍 执行搜索</button>
                    <button class="as-btn as-btn-clear" id="clearAllBtn">🗑️ 清空</button>
                </div>
                
                <!-- 保存当前条件 -->
                <div class="save-query-section">
                    <input type="text" class="save-query-input" id="saveQueryName" 
                        placeholder="输入条件名称..." maxlength="50">
                    <button class="save-query-btn" id="saveQueryBtn">💾 保存条件</button>
                </div>
            </div>
            
            <style>${this._renderStyles()}</style>
        `;
    }

    /**
     * 渲染单个条件行
     */
    _renderCondition(condition, index) {
        const fieldOptions = Object.entries(FIELD_CONFIG).map(([key, config]) => 
            `<option value="${key}" ${condition.field === key ? 'selected' : ''}>${config.label}</option>`
        ).join('');
        
        const operators = FIELD_CONFIG[condition.field]?.operators || [];
        const operatorOptions = operators.map(op => 
            `<option value="${op}" ${condition.operator === op ? 'selected' : ''}>${OPERATOR_CONFIG[op]?.label || op}</option>`
        ).join('');
        
        const valueInput = this._renderValueInput(condition);
        
        return `
            <div class="condition-row" data-id="${condition._id}">
                <select class="condition-field condition-select" data-type="field">
                    ${fieldOptions}
                </select>
                <select class="condition-operator condition-select" data-type="operator">
                    ${operatorOptions}
                </select>
                <div class="condition-value-wrap">
                    ${valueInput}
                </div>
                <button class="condition-delete" data-type="delete" title="删除条件">✕</button>
            </div>
        `;
    }

    /**
     * 渲染值输入框（根据操作符类型动态变化）
     */
    _renderValueInput(condition) {
        const operatorConfig = OPERATOR_CONFIG[condition.operator] || { valueType: 'text' };
        
        switch (operatorConfig.valueType) {
            case 'text':
                return `<input type="text" class="condition-value" data-type="value" 
                    placeholder="输入关键词..." value="${this._escapeHtml(condition.value || '')}">`;
            
            case 'number':
                return `<input type="number" class="condition-value" data-type="value" 
                    placeholder="天数" min="1" value="${condition.value || ''}">`;
            
            case 'date':
                return `<input type="date" class="condition-value" data-type="value" 
                    value="${condition.value || ''}">`;
            
            case 'dateRange':
                const start = condition.value?.start || '';
                const end = condition.value?.end || '';
                return `
                    <input type="date" class="condition-value condition-value-start" data-type="valueStart" 
                        value="${start}" placeholder="开始日期">
                    <span class="date-separator">至</span>
                    <input type="date" class="condition-value condition-value-end" data-type="valueEnd" 
                        value="${end}" placeholder="结束日期">
                `;
            
            case 'tags':
                // 如果有可用标签，显示下拉选择；否则显示文本输入
                if (this.availableTags.length > 0) {
                    const tagOptions = this.availableTags.map(tag => 
                        `<option value="${tag}">${tag}</option>`
                    ).join('');
                    return `<select class="condition-value condition-select" data-type="value">
                        <option value="">选择标签...</option>
                        ${tagOptions}
                    </select>`;
                }
                return `<input type="text" class="condition-value" data-type="value" 
                    placeholder="输入标签..." value="${this._escapeHtml(condition.value || '')}">`;
            
            default:
                return `<input type="text" class="condition-value" data-type="value" 
                    value="${this._escapeHtml(condition.value || '')}">`;
        }
    }

    /**
     * 渲染样式（兼容深色模式）
     */
    _renderStyles() {
        return `
            .advanced-search {
                background: var(--bg-secondary);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 16px;
                box-shadow: 0 2px 8px var(--shadow-light);
            }
            
            .advanced-search-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .advanced-search-title {
                font-size: 16px;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            .logic-toggle {
                display: flex;
                gap: 4px;
                background: var(--bg-card);
                border-radius: 8px;
                padding: 3px;
            }
            
            .logic-btn {
                padding: 6px 14px;
                border: none;
                border-radius: 6px;
                background: transparent;
                color: var(--text-secondary);
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }
            
            .logic-btn:hover {
                color: var(--text-primary);
            }
            
            .logic-btn.active {
                background: var(--accent-color);
                color: white;
            }
            
            .conditions-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
                margin-bottom: 16px;
            }
            
            .condition-row {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 10px;
                background: var(--bg-card);
                border-radius: 8px;
                border: 1px solid var(--border-color);
                transition: border-color 0.2s ease;
            }
            
            .condition-row:hover {
                border-color: var(--accent-color);
            }
            
            .condition-select {
                padding: 8px 12px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                cursor: pointer;
                transition: border-color 0.2s ease;
            }
            
            .condition-select:focus {
                outline: none;
                border-color: var(--accent-color);
            }
            
            .condition-field {
                min-width: 100px;
            }
            
            .condition-operator {
                min-width: 100px;
            }
            
            .condition-value-wrap {
                flex: 1;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .condition-value {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid var(--border-color);
                border-radius: 6px;
                background: var(--bg-secondary);
                color: var(--text-primary);
                font-size: 14px;
                min-width: 0;
            }
            
            .condition-value:focus {
                outline: none;
                border-color: var(--accent-color);
            }
            
            .condition-value-start,
            .condition-value-end {
                flex: 1;
            }
            
            .date-separator {
                color: var(--text-secondary);
                font-size: 13px;
                white-space: nowrap;
            }
            
            .condition-delete {
                width: 28px;
                height: 28px;
                border: none;
                border-radius: 50%;
                background: transparent;
                color: var(--text-tertiary);
                font-size: 14px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            
            .condition-delete:hover {
                background: rgba(255, 59, 48, 0.1);
                color: #ff3b30;
            }
            
            .advanced-search-actions {
                display: flex;
                gap: 10px;
                flex-wrap: wrap;
            }
            
            .as-btn {
                padding: 10px 18px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            
            .as-btn-add {
                background: var(--bg-card);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
            }
            
            .as-btn-add:hover {
                border-color: var(--accent-color);
                color: var(--accent-color);
            }
            
            .as-btn-search {
                background: var(--accent-color);
                color: white;
            }
            
            .as-btn-search:hover {
                background: var(--accent-hover);
                transform: translateY(-1px);
                box-shadow: 0 4px 12px var(--shadow-heavy);
            }
            
            .as-btn-clear {
                background: transparent;
                color: var(--text-secondary);
                border: 1px solid var(--border-color);
            }
            
            .as-btn-clear:hover {
                color: #ff3b30;
                border-color: #ff3b30;
            }
            
            /* 已保存条件列表 */
            .saved-queries-section {
                margin-bottom: 16px;
                padding-bottom: 16px;
                border-bottom: 1px solid var(--border-color);
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
            
            /* 响应式 */
            @media (max-width: 600px) {
                .condition-row {
                    flex-wrap: wrap;
                }
                
                .condition-field,
                .condition-operator {
                    flex: 1;
                    min-width: 0;
                }
                
                .condition-value-wrap {
                    width: 100%;
                    order: 3;
                }
                
                .condition-delete {
                    order: 4;
                }
                
                .advanced-search-actions {
                    flex-direction: column;
                }
                
                .as-btn {
                    justify-content: center;
                }
                
                .save-query-section {
                    flex-direction: column;
                }
            }
        `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn('[AdvancedSearch] 容器元素未找到:', this.containerId);
            return;
        }
        
        // 事件委托
        container.addEventListener('click', this._handleClick.bind(this));
        container.addEventListener('change', this._handleChange.bind(this));
        container.addEventListener('input', this._handleInput.bind(this));
    }

    /**
     * 处理点击事件
     */
    _handleClick(e) {
        const target = e.target;
        
        // 切换逻辑
        if (target.classList.contains('logic-btn')) {
            this.logic = target.dataset.logic;
            this._updateLogicButtons();
            return;
        }
        
        // 删除条件
        if (target.dataset.type === 'delete') {
            const row = target.closest('.condition-row');
            const id = parseInt(row.dataset.id);
            this._removeCondition(id);
            return;
        }
        
        // 添加条件
        if (target.id === 'addConditionBtn') {
            this._addCondition();
            return;
        }
        
        // 执行搜索
        if (target.id === 'executeSearchBtn') {
            this._executeSearch();
            return;
        }
        
        // 清空
        if (target.id === 'clearAllBtn') {
            this._clearAll();
            return;
        }
        
        // 保存当前条件
        if (target.id === 'saveQueryBtn') {
            this._saveCurrentQuery();
            return;
        }
        
        // 加载已保存的条件
        if (target.dataset.action === 'load') {
            const id = target.dataset.id;
            this._loadSavedQuery(id);
            return;
        }
        
        // 删除已保存的条件
        if (target.dataset.action === 'delete') {
            const id = target.dataset.id;
            this._deleteSavedQuery(id);
            return;
        }
    }

    /**
     * 处理变更事件
     */
    _handleChange(e) {
        const target = e.target;
        const row = target.closest('.condition-row');
        if (!row) return;
        
        const id = parseInt(row.dataset.id);
        const condition = this.conditions.find(c => c._id === id);
        if (!condition) return;
        
        // 字段变更
        if (target.dataset.type === 'field') {
            condition.field = target.value;
            // 重置为该字段的第一个操作符
            const operators = FIELD_CONFIG[condition.field]?.operators || [];
            condition.operator = operators[0] || 'contains';
            condition.value = '';
            this._rerenderCondition(id);
            return;
        }
        
        // 操作符变更
        if (target.dataset.type === 'operator') {
            condition.operator = target.value;
            // 重置值
            condition.value = '';
            this._rerenderCondition(id);
            return;
        }
        
        // 值变更（select 类型）
        if (target.dataset.type === 'value') {
            condition.value = target.value;
            return;
        }
        
        // 日期范围 - 开始
        if (target.dataset.type === 'valueStart') {
            condition.value = condition.value || {};
            condition.value.start = target.value;
            return;
        }
        
        // 日期范围 - 结束
        if (target.dataset.type === 'valueEnd') {
            condition.value = condition.value || {};
            condition.value.end = target.value;
            return;
        }
    }

    /**
     * 处理输入事件
     */
    _handleInput(e) {
        const target = e.target;
        const row = target.closest('.condition-row');
        if (!row) return;
        
        const id = parseInt(row.dataset.id);
        const condition = this.conditions.find(c => c._id === id);
        if (!condition) return;
        
        // 值输入
        if (target.dataset.type === 'value') {
            condition.value = target.value;
            return;
        }
    }

    /**
     * 更新逻辑按钮状态
     */
    _updateLogicButtons() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        container.querySelectorAll('.logic-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.logic === this.logic);
        });
    }

    /**
     * 添加条件
     */
    _addCondition() {
        const newCondition = { ...DEFAULT_CONDITION, _id: this.conditionId++ };
        this.conditions.push(newCondition);
        this._rerenderConditions();
    }

    /**
     * 删除条件
     */
    _removeCondition(id) {
        if (this.conditions.length <= 1) {
            // 至少保留一个条件
            this.conditions = [{ ...DEFAULT_CONDITION, _id: this.conditionId++ }];
        } else {
            this.conditions = this.conditions.filter(c => c._id !== id);
        }
        this._rerenderConditions();
    }

    /**
     * 重新渲染单个条件
     */
    _rerenderCondition(id) {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const index = this.conditions.findIndex(c => c._id === id);
        if (index === -1) return;
        
        const row = container.querySelector(`.condition-row[data-id="${id}"]`);
        if (row) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this._renderCondition(this.conditions[index], index);
            row.replaceWith(tempDiv.firstElementChild);
        }
    }

    /**
     * 重新渲染所有条件
     */
    _rerenderConditions() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const listEl = container.querySelector('#conditionsList');
        if (listEl) {
            listEl.innerHTML = this.conditions.map((c, i) => this._renderCondition(c, i)).join('');
        }
    }

    /**
     * 执行搜索
     */
    _executeSearch() {
        const query = this.getQuery();
        console.log('[AdvancedSearch] 执行搜索:', query);
        this.onSearch(query);
    }

    /**
     * 清空所有条件
     */
    _clearAll() {
        this.conditions = [{ ...DEFAULT_CONDITION, _id: this.conditionId++ }];
        this.logic = 'AND';
        this._rerenderConditions();
        this._updateLogicButtons();
    }

    /**
     * 重置高级搜索面板（供外部调用）
     * - 清空所有条件，只保留一个空条件
     * - 重置 AND/OR 为默认 AND
     * - 清空值输入框
     */
    reset() {
        this.conditions = [{ ...DEFAULT_CONDITION, _id: this.conditionId++ }];
        this.logic = 'AND';
        this._rerenderConditions();
        this._updateLogicButtons();
        this._rerenderSavedQueries();
    }

    /**
     * 获取当前查询条件
     * @returns {Object} { conditions, logic }
     */
    getQuery() {
        // 过滤掉无效条件并清理内部属性
        const validConditions = this.conditions
            .filter(c => {
                // 检查值是否有效
                if (c.operator === 'between') {
                    return c.value?.start && c.value?.end;
                }
                return c.value !== '' && c.value != null;
            })
            .map(c => {
                const { _id, ...rest } = c;
                return rest;
            });
        
        return {
            conditions: validConditions,
            logic: this.logic
        };
    }

    /**
     * 设置可用标签列表
     * @param {string[]} tags 
     */
    setAvailableTags(tags) {
        this.availableTags = tags || [];
    }

    /**
     * 保存当前查询条件
     */
    _saveCurrentQuery() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const nameInput = container.querySelector('#saveQueryName');
        const name = nameInput?.value?.trim();
        
        if (!name) {
            alert('请输入条件名称');
            nameInput?.focus();
            return;
        }
        
        const query = this.getQuery();
        if (query.conditions.length === 0) {
            alert('请至少添加一个有效条件');
            return;
        }
        
        const saved = savedQueries.save(name, query.conditions, query.logic);
        if (saved) {
            nameInput.value = '';
            this._rerenderSavedQueries();
            console.log('[AdvancedSearch] 条件已保存:', saved.name);
        }
    }

    /**
     * 加载已保存的查询条件
     */
    _loadSavedQuery(id) {
        const query = savedQueries.load(id);
        if (!query) {
            console.warn('[AdvancedSearch] 加载失败:', id);
            return;
        }
        
        // 重置条件列表
        this.conditions = query.conditions.map((c, i) => ({
            ...c,
            _id: this.conditionId++
        }));
        this.logic = query.logic;
        
        // 重新渲染
        this._rerenderConditions();
        this._updateLogicButtons();
        this._rerenderSavedQueries();
        
        console.log('[AdvancedSearch] 已加载条件:', query.name);
    }

    /**
     * 删除已保存的查询条件
     */
    _deleteSavedQuery(id) {
        if (confirm('确定要删除这个保存的条件吗？')) {
            savedQueries.delete(id);
            this._rerenderSavedQueries();
            console.log('[AdvancedSearch] 已删除条件:', id);
        }
    }

    /**
     * 重新渲染已保存条件列表
     */
    _rerenderSavedQueries() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        
        const listEl = container.querySelector('#savedQueriesList');
        if (listEl) {
            listEl.innerHTML = savedQueries.renderList();
        }
        
        // 更新计数
        const countEl = container.querySelector('#savedQueriesCount');
        if (countEl) {
            const queries = savedQueries.getAll();
            countEl.textContent = queries.length > 0 ? `共 ${queries.length} 个` : '';
        }
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

// 导出
export { AdvancedSearch, FIELD_CONFIG, OPERATOR_CONFIG };