/**
 * 超级大脑 - GitHub Gist 云同步模块
 * 功能：将链接数据双向同步到 GitHub Gist
 * 存储 key：superBrain_gistToken / superBrain_gistId
 */

const GIST_FILENAME = 'superbrain-links.json';
const TOKEN_KEY     = 'superBrain_gistToken';
const GIST_ID_KEY   = 'superBrain_gistId';
const LINKS_KEY     = 'superBrain_links';

// ============================================================
// 核心 API 操作
// ============================================================

async function apiRequest(method, path, body, token) {
    const res = await fetch(`https://api.github.com${path}`, {
        method,
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `GitHub API 错误 ${res.status}`);
    }
    return res.json();
}

/** 验证 Token 是否有效 */
async function validateToken(token) {
    await apiRequest('GET', '/user', null, token);
}

/** 创建新 Gist */
async function createGist(token, links) {
    const data = await apiRequest('POST', '/gists', {
        description: '超级大脑 - 知识库同步数据',
        public: false,
        files: {
            [GIST_FILENAME]: {
                content: JSON.stringify({ version: 1, links, updatedAt: new Date().toISOString() }, null, 2)
            }
        }
    }, token);
    return data.id;
}

/** 更新已有 Gist */
async function updateGist(token, gistId, links) {
    await apiRequest('PATCH', `/gists/${gistId}`, {
        files: {
            [GIST_FILENAME]: {
                content: JSON.stringify({ version: 1, links, updatedAt: new Date().toISOString() }, null, 2)
            }
        }
    }, token);
}

/** 从 Gist 拉取数据 */
async function fetchGist(token, gistId) {
    const data = await apiRequest('GET', `/gists/${gistId}`, null, token);
    const file = data.files[GIST_FILENAME];
    if (!file) throw new Error('Gist 中找不到超级大脑数据文件');
    const content = JSON.parse(file.content);
    return content.links || [];
}

// ============================================================
// 合并策略：以 id 为主键，取 updatedAt 最新的版本
// ============================================================
function mergeLinks(local, remote) {
    const map = new Map();
    [...remote, ...local].forEach(link => {
        const existing = map.get(link.id);
        if (!existing) {
            map.set(link.id, link);
        } else {
            // 比较时间，保留更新的
            const existTime = new Date(existing.time || existing.updatedAt || 0).getTime();
            const newTime   = new Date(link.time    || link.updatedAt    || 0).getTime();
            if (newTime > existTime) map.set(link.id, link);
        }
    });
    return Array.from(map.values());
}

// ============================================================
// UI 渲染
// ============================================================
function getToken()  { return localStorage.getItem(TOKEN_KEY)  || ''; }
function getGistId() { return localStorage.getItem(GIST_ID_KEY) || ''; }
function saveToken(t)  { localStorage.setItem(TOKEN_KEY, t); }
function saveGistId(id) { localStorage.setItem(GIST_ID_KEY, id); }

function showToast(msg, isError = false) {
    let toast = document.getElementById('gist-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'gist-toast';
        toast.style.cssText = `
            position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(16px);
            background:rgba(30,30,30,0.92);color:#fff;padding:11px 22px;
            border-radius:24px;font-size:14px;z-index:9999;opacity:0;
            transition:opacity 0.22s,transform 0.22s;pointer-events:none;
            white-space:nowrap;backdrop-filter:blur(8px);
            box-shadow:0 4px 16px rgba(0,0,0,0.25);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = isError ? 'rgba(220,50,50,0.92)' : 'rgba(30,30,30,0.92)';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(16px)';
    }, 3000);
}

function updateSyncStatus(status, detail = '') {
    const el = document.getElementById('gist-sync-status');
    if (!el) return;
    const map = {
        idle:     { icon: '☁️',  text: '云同步就绪',   color: '#22c55e' },
        syncing:  { icon: '🔄',  text: '同步中...',    color: '#f59e0b' },
        success:  { icon: '✅',  text: '同步成功',     color: '#22c55e' },
        error:    { icon: '⚠️',  text: '同步失败',     color: '#ef4444' },
        notset:   { icon: '🔑',  text: '未配置',       color: '#94a3b8' },
    };
    const s = map[status] || map.idle;
    el.innerHTML = `<span style="color:${s.color}">${s.icon} ${s.text}</span>${detail ? `<span style="color:#94a3b8;font-size:11px;margin-left:6px;">${detail}</span>` : ''}`;
}

// ============================================================
// 核心同步操作
// ============================================================
async function syncToCloud() {
    const token  = getToken();
    const gistId = getGistId();
    if (!token) { showToast('请先配置 GitHub Token', true); openSyncModal(); return; }

    updateSyncStatus('syncing');
    try {
        const links = JSON.parse(localStorage.getItem(LINKS_KEY) || '[]');

        if (!gistId) {
            // 首次：创建 Gist
            const newId = await createGist(token, links);
            saveGistId(newId);
            updateSyncStatus('success', new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}));
            showToast('✅ 已创建云备份并上传');
        } else {
            // 先拉取，合并，再上传
            const remote = await fetchGist(token, gistId);
            const merged = mergeLinks(links, remote);
            await updateGist(token, gistId, merged);
            // 如果合并后有新数据，更新本地
            if (merged.length !== links.length) {
                localStorage.setItem(LINKS_KEY, JSON.stringify(merged));
                if (window.AppState) {
                    AppState.set('data.links', merged, { persist: true, history: false, action: '云同步合并' });
                    if (window.renderAll) renderAll();
                }
            }
            updateSyncStatus('success', new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}));
            showToast(`✅ 同步完成，共 ${merged.length} 条链接`);
        }
    } catch (e) {
        updateSyncStatus('error');
        showToast('❌ 同步失败：' + e.message, true);
        console.error('[GistSync]', e);
    }
}

async function pullFromCloud() {
    const token  = getToken();
    const gistId = getGistId();
    if (!token || !gistId) { showToast('请先配置并完成一次上传', true); return; }

    updateSyncStatus('syncing');
    try {
        const remote = await fetchGist(token, gistId);
        const local  = JSON.parse(localStorage.getItem(LINKS_KEY) || '[]');
        const merged = mergeLinks(local, remote);
        localStorage.setItem(LINKS_KEY, JSON.stringify(merged));
        if (window.AppState) {
            AppState.set('data.links', merged, { persist: true, history: false, action: '从云端拉取' });
            if (window.renderAll) renderAll();
        }
        updateSyncStatus('success', new Date().toLocaleTimeString('zh-CN', {hour:'2-digit',minute:'2-digit'}));
        showToast(`✅ 已从云端拉取 ${merged.length} 条链接`);
    } catch (e) {
        updateSyncStatus('error');
        showToast('❌ 拉取失败：' + e.message, true);
    }
}

// ============================================================
// 配置弹窗
// ============================================================
function openSyncModal() {
    let modal = document.getElementById('gist-modal');
    if (modal) { modal.style.display = 'flex'; return; }

    modal = document.createElement('div');
    modal.id = 'gist-modal';
    modal.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.5);
        display:flex;align-items:center;justify-content:center;z-index:10000;
        backdrop-filter:blur(4px);
    `;
    modal.innerHTML = `
        <div style="
            background:var(--bg-secondary,#fff);border-radius:16px;
            padding:32px;width:90%;max-width:480px;
            box-shadow:0 20px 60px rgba(0,0,0,0.3);
            border:1px solid var(--border-color,#e9e9e7);
        ">
            <h3 style="margin:0 0 6px;color:var(--text-primary);font-size:20px;">☁️ GitHub Gist 云同步</h3>
            <p style="margin:0 0 24px;color:var(--text-secondary);font-size:13px;">
                数据将加密存储在你的 GitHub 私有 Gist 中，仅你可见
            </p>

            <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:6px;">
                GitHub Personal Access Token
                <a href="https://github.com/settings/tokens/new?scopes=gist&description=超级大脑" 
                   target="_blank" 
                   style="color:var(--accent-color);margin-left:6px;font-size:12px;">
                    点此生成 →
                </a>
            </label>
            <input id="gist-token-input" type="password" placeholder="ghp_xxxxxxxxxxxx"
                value="${getToken()}"
                style="
                    width:100%;padding:12px;border:1px solid var(--border-color,#e9e9e7);
                    border-radius:8px;font-size:14px;background:var(--bg-primary);
                    color:var(--text-primary);box-sizing:border-box;margin-bottom:16px;
                    font-family:monospace;
                ">

            <label style="display:block;font-size:13px;color:var(--text-secondary);margin-bottom:6px;">
                Gist ID（首次留空，自动创建）
            </label>
            <input id="gist-id-input" type="text" placeholder="留空则自动创建新 Gist"
                value="${getGistId()}"
                style="
                    width:100%;padding:12px;border:1px solid var(--border-color,#e9e9e7);
                    border-radius:8px;font-size:14px;background:var(--bg-primary);
                    color:var(--text-primary);box-sizing:border-box;margin-bottom:24px;
                    font-family:monospace;
                ">

            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button id="gist-save-btn" style="
                    flex:1;padding:12px;background:var(--accent-color,#1a1a1a);
                    color:#fff;border:none;border-radius:8px;font-size:14px;
                    cursor:pointer;font-weight:500;
                ">保存配置</button>
                <button id="gist-test-btn" style="
                    flex:1;padding:12px;background:transparent;
                    color:var(--text-primary);border:1px solid var(--border-color);
                    border-radius:8px;font-size:14px;cursor:pointer;
                ">验证 Token</button>
                <button id="gist-close-btn" style="
                    padding:12px 16px;background:transparent;
                    color:var(--text-secondary);border:1px solid var(--border-color);
                    border-radius:8px;font-size:14px;cursor:pointer;
                ">取消</button>
            </div>
            <div id="gist-modal-msg" style="margin-top:14px;font-size:13px;min-height:20px;"></div>
        </div>
    `;
    document.body.appendChild(modal);

    // 关闭
    document.getElementById('gist-close-btn').onclick = () => { modal.style.display = 'none'; };
    modal.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };

    // 保存
    document.getElementById('gist-save-btn').onclick = () => {
        const t  = document.getElementById('gist-token-input').value.trim();
        const id = document.getElementById('gist-id-input').value.trim();
        if (!t) { document.getElementById('gist-modal-msg').textContent = '⚠️ Token 不能为空'; return; }
        saveToken(t);
        if (id) saveGistId(id);
        modal.style.display = 'none';
        updateSyncStatus('idle');
        showToast('✅ 配置已保存');
    };

    // 验证
    document.getElementById('gist-test-btn').onclick = async () => {
        const t = document.getElementById('gist-token-input').value.trim();
        const msgEl = document.getElementById('gist-modal-msg');
        if (!t) { msgEl.textContent = '⚠️ 请先填写 Token'; return; }
        msgEl.textContent = '🔄 验证中...';
        try {
            await validateToken(t);
            msgEl.style.color = '#22c55e';
            msgEl.textContent = '✅ Token 有效，可以使用！';
        } catch(e) {
            msgEl.style.color = '#ef4444';
            msgEl.textContent = '❌ Token 无效：' + e.message;
        }
    };
}

// ============================================================
// 注入同步工具栏到页面
// ============================================================
function injectSyncBar() {
    // 找到工具栏区域（导出/导入按钮所在的 div），在其前面插入同步栏
    const toolbarDiv = document.getElementById('exportBtn')?.parentElement;
    if (!toolbarDiv) { console.warn('[GistSync] 找不到工具栏'); return; }

    const bar = document.createElement('div');
    bar.id = 'gist-sync-bar';
    bar.style.cssText = `
        display:flex;align-items:center;gap:10px;
        margin-bottom:12px;padding:12px 16px;
        background:var(--bg-secondary,#fff);
        border-radius:8px;
        border:1px solid var(--border-color,#e9e9e7);
        flex-wrap:wrap;
    `;
    bar.innerHTML = `
        <span id="gist-sync-status" style="flex:1;font-size:13px;min-width:120px;">
            <span style="color:#94a3b8">☁️ 未配置</span>
        </span>
        <button id="gist-upload-btn" title="上传到云端" style="
            padding:7px 14px;border-radius:6px;border:1px solid var(--border-color,#e9e9e7);
            background:var(--bg-card,#fff);color:var(--text-primary);
            font-size:13px;cursor:pointer;display:flex;align-items:center;gap:5px;
            font-family:inherit;transition:all 0.2s;
        ">⬆️ 上传</button>
        <button id="gist-download-btn" title="从云端拉取" style="
            padding:7px 14px;border-radius:6px;border:1px solid var(--border-color,#e9e9e7);
            background:var(--bg-card,#fff);color:var(--text-primary);
            font-size:13px;cursor:pointer;display:flex;align-items:center;gap:5px;
            font-family:inherit;transition:all 0.2s;
        ">⬇️ 拉取</button>
        <button id="gist-settings-btn" title="云同步设置" style="
            padding:7px 12px;border-radius:6px;border:1px solid var(--border-color,#e9e9e7);
            background:var(--bg-card,#fff);color:var(--text-secondary);
            font-size:13px;cursor:pointer;font-family:inherit;transition:all 0.2s;
        ">⚙️ 配置</button>
    `;

    toolbarDiv.parentElement.insertBefore(bar, toolbarDiv);

    document.getElementById('gist-upload-btn').onclick   = syncToCloud;
    document.getElementById('gist-download-btn').onclick = pullFromCloud;
    document.getElementById('gist-settings-btn').onclick = openSyncModal;

    // 初始状态
    if (getToken()) {
        updateSyncStatus('idle');
    }
}

// ============================================================
// 自动同步：数据变化后 10 秒自动上传（有 token 才触发）
// ============================================================
let _autoSyncTimer = null;
function scheduleAutoSync() {
    if (!getToken()) return;
    clearTimeout(_autoSyncTimer);
    _autoSyncTimer = setTimeout(() => {
        syncToCloud();
    }, 10000); // 10秒防抖
}

// ============================================================
// 初始化入口
// ============================================================
export function initGistSync() {
    injectSyncBar();

    // 监听 AppState 数据变化，触发自动同步
    if (window.AppState) {
        AppState.subscribe((path) => {
            if (path === 'data.links') {
                scheduleAutoSync();
            }
        });
    }

    console.log('✅ GitHub Gist 云同步模块已初始化');
}