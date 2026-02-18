/**
 * 链接预览模块 - 优化版
 * 功能：智能预加载、LRU缓存、请求队列、性能监控、调试面板
 */
(function () {
    'use strict';

    // =============================================
    // 常量配置
    // =============================================
    const CFG = {
        SHOW_DELAY: 300,          // 悬停触发延迟 ms
        HIDE_DELAY: 200,          // 离开隐藏延迟 ms
        API_TIMEOUT: 5000,        // API 超时 ms
        CACHE_TTL: 7 * 86400000,  // 缓存有效期 7天
        CACHE_MAX: 50,            // LRU 最大缓存条数
        CACHE_MAX_BYTES: 5 * 1024 * 1024, // 缓存上限 5MB
        CACHE_KEY_PREFIX: 'lp2_',
        CACHE_META_KEY: 'lp2_meta',
        PRELOAD_VIEWPORT: 5,      // 视口内预加载前 N 个
        MAX_CONCURRENT: 2,        // 最大并发请求数
        MAX_RETRY: 2,             // 最大重试次数
        SCROLL_THROTTLE: 200,     // scroll 节流 ms
        DEBUG_SHORTCUT: true,     // 是否启用 Ctrl+Shift+D 调试面板
    };

    // =============================================
    // 性能监控指标
    // =============================================
    const metrics = {
        totalRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
        totalLoadTime: 0,
        requestCount: 0,
        errors: 0,
        get avgLoadTime() {
            return this.requestCount ? Math.round(this.totalLoadTime / this.requestCount) : 0;
        },
        get hitRate() {
            const total = this.cacheHits + this.cacheMisses;
            return total ? ((this.cacheHits / total) * 100).toFixed(1) + '%' : '0%';
        }
    };

    // =============================================
    // LRU 缓存（内存 + localStorage 双层）
    // =============================================
    const LRUCache = {
        // 内存层：Map 保持插入顺序，用于 LRU
        _mem: new Map(),

        // 从 localStorage 恢复元数据（访问顺序）
        _meta: [],

        init() {
            try {
                const raw = localStorage.getItem(CFG.CACHE_META_KEY);
                this._meta = raw ? JSON.parse(raw) : [];
            } catch { this._meta = []; }
        },

        _saveMeta() {
            try {
                localStorage.setItem(CFG.CACHE_META_KEY, JSON.stringify(this._meta));
            } catch { /* ignore */ }
        },

        // Bug #3 修复：安全的缓存 key 生成，兼容中文域名/非ASCII URL
        _makeKey(url) {
            try {
                // encodeURIComponent 先转义非ASCII字符，btoa 只处理ASCII，安全
                return CFG.CACHE_KEY_PREFIX + btoa(encodeURIComponent(url)).slice(0, 40);
            } catch {
                // 极端情况降级：用简单哈希
                let hash = 0;
                for (let i = 0; i < url.length; i++) {
                    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
                }
                return CFG.CACHE_KEY_PREFIX + 'h' + Math.abs(hash).toString(36);
            }
        },

        get(url) {
            // 先查内存
            if (this._mem.has(url)) {
                const entry = this._mem.get(url);
                if (Date.now() - entry.ts < CFG.CACHE_TTL) {
                    // 更新 LRU 顺序
                    this._mem.delete(url);
                    this._mem.set(url, entry);
                    entry.hits = (entry.hits || 0) + 1;
                    metrics.cacheHits++;
                    return entry.data;
                }
                this._mem.delete(url);
            }
            // 查 localStorage
            try {
                const key = this._makeKey(url);
                const raw = localStorage.getItem(key);
                if (!raw) { metrics.cacheMisses++; return null; }
                const entry = JSON.parse(raw);
                if (Date.now() - entry.ts > CFG.CACHE_TTL) {
                    localStorage.removeItem(key);
                    metrics.cacheMisses++;
                    return null;
                }
                // 加载到内存
                this._mem.set(url, entry);
                metrics.cacheHits++;
                return entry.data;
            } catch { metrics.cacheMisses++; return null; }
        },

        set(url, data) {
            const key = this._makeKey(url);
            const entry = { data, ts: Date.now(), hits: 1 };

            // 内存 LRU：超出上限时删除最旧的
            if (this._mem.size >= CFG.CACHE_MAX) {
                const oldest = this._mem.keys().next().value;
                this._mem.delete(oldest);
            }
            this._mem.set(url, entry);

            // 持久化到 localStorage
            try {
                localStorage.setItem(key, JSON.stringify(entry));
                // 更新元数据
                this._meta = this._meta.filter(k => k !== key);
                this._meta.push(key);
                if (this._meta.length > CFG.CACHE_MAX) {
                    const removed = this._meta.shift();
                    localStorage.removeItem(removed);
                }
                this._saveMeta();
            } catch (e) {
                // localStorage 满了，清理最旧的
                this._evict();
            }
        },

        // 清理过期 + 超量缓存
        _evict() {
            const now = Date.now();
            // 清理过期
            this._meta = this._meta.filter(key => {
                try {
                    const raw = localStorage.getItem(key);
                    if (!raw) return false;
                    const { ts } = JSON.parse(raw);
                    if (now - ts > CFG.CACHE_TTL) {
                        localStorage.removeItem(key);
                        return false;
                    }
                    return true;
                } catch { localStorage.removeItem(key); return false; }
            });
            // 超量清理（删最旧的 10 条）
            while (this._meta.length > CFG.CACHE_MAX - 10) {
                const key = this._meta.shift();
                if (key) localStorage.removeItem(key);
            }
            this._saveMeta();
        },

        // 检查总大小
        checkSize() {
            let total = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CFG.CACHE_KEY_PREFIX)) {
                    total += (localStorage.getItem(key) || '').length * 2; // UTF-16
                }
            }
            if (total > CFG.CACHE_MAX_BYTES) {
                console.warn(`[LinkPreview] 缓存超过 5MB (${(total / 1024 / 1024).toFixed(1)}MB)，自动清理`);
                this._evict();
            }
        }
    };

    // =============================================
    // 视频平台缩略图直接提取（无需 API，精准匹配）
    // =============================================
    const VideoThumb = {
        /**
         * 尝试从 URL 直接提取视频缩略图
         * 支持：YouTube、B站、Vimeo
         * @returns {string|null} 缩略图 URL，或 null（非视频链接）
         */
        extract(url) {
            try {
                const u = new URL(url);
                const host = u.hostname.replace('www.', '');

                // ---- YouTube ----
                // https://youtube.com/watch?v=VIDEO_ID
                // https://youtu.be/VIDEO_ID
                // https://youtube.com/shorts/VIDEO_ID
                if (host === 'youtube.com' || host === 'youtu.be') {
                    let videoId = null;
                    if (host === 'youtu.be') {
                        videoId = u.pathname.slice(1).split('/')[0];
                    } else if (u.searchParams.get('v')) {
                        videoId = u.searchParams.get('v');
                    } else if (u.pathname.startsWith('/shorts/')) {
                        videoId = u.pathname.split('/shorts/')[1].split('/')[0];
                    } else if (u.pathname.startsWith('/embed/')) {
                        videoId = u.pathname.split('/embed/')[1].split('/')[0];
                    }
                    if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
                        // maxresdefault > hqdefault > mqdefault（质量从高到低）
                        return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
                    }
                    // 频道/播放列表页：无法提取视频缩略图，返回 null
                    return null;
                }

                // ---- B站 ----
                // https://www.bilibili.com/video/BVxxxxxxxx
                // https://www.bilibili.com/video/avxxxxxxxx
                if (host === 'bilibili.com') {
                    const match = u.pathname.match(/\/video\/(BV[a-zA-Z0-9]+|av\d+)/i);
                    if (match) {
                        // B站缩略图需要 API，这里返回 null 让 microlink 处理
                        // （B站视频页 og:image 是正确的视频封面）
                        return null;
                    }
                    return null;
                }

                // ---- Vimeo ----
                // https://vimeo.com/VIDEO_ID
                if (host === 'vimeo.com') {
                    const match = u.pathname.match(/^\/(\d+)/);
                    if (match) {
                        // Vimeo 缩略图需要 oEmbed API，返回 null 让 microlink 处理
                        return null;
                    }
                }

            } catch { /* ignore */ }
            return null;
        },

        /**
         * 判断是否是视频平台的"频道/主页"链接（非具体视频）
         * 这类链接的 og:image 是频道封面，不应显示为预览图
         */
        isChannelPage(url) {
            try {
                const u = new URL(url);
                const host = u.hostname.replace('www.', '');
                if (host === 'youtube.com' || host === 'youtu.be') {
                    // 频道页特征：/@xxx, /channel/xxx, /c/xxx, /user/xxx
                    // 且没有 ?v= 参数
                    const isChannel = /^\/((@|channel\/|c\/|user\/).*)/.test(u.pathname)
                        || (u.pathname === '/' || u.pathname === '');
                    const hasVideoId = !!u.searchParams.get('v')
                        || u.pathname.startsWith('/shorts/')
                        || u.pathname.startsWith('/embed/')
                        || (host === 'youtu.be' && u.pathname.length > 1);
                    return isChannel && !hasVideoId;
                }
            } catch { /* ignore */ }
            return false;
        }
    };

    // =============================================
    // 请求队列（控制并发 + 重试 + 真正的请求去重）
    // =============================================
    const RequestQueue = {
        _queue: [],       // 待处理队列 [{url, resolve, retries}]
        _active: 0,       // 当前并发数
        // Bug #1 修复：用 Map<url, Promise> 替代 Set，相同 URL 直接复用同一个 Promise
        _inFlight: new Map(), // url → Promise

        enqueue(url) {
            // 如果该 URL 已在飞行中，直接返回同一个 Promise（真正去重）
            if (this._inFlight.has(url)) {
                return this._inFlight.get(url);
            }

            const promise = new Promise((resolve) => {
                this._queue.push({ url, resolve, retries: 0 });
            });

            // 注册到飞行中 Map
            this._inFlight.set(url, promise);
            this._drain();
            return promise;
        },

        _drain() {
            while (this._active < CFG.MAX_CONCURRENT && this._queue.length > 0) {
                const task = this._queue.shift();
                if (!task) break;
                this._active++;
                this._execute(task);
            }
        },

        async _execute(task) {
            const start = performance.now();
            metrics.totalRequests++;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CFG.API_TIMEOUT);

            try {
                const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(task.url)}`;
                const res = await fetch(apiUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                const json = await res.json();
                const elapsed = Math.round(performance.now() - start);
                metrics.totalLoadTime += elapsed;
                metrics.requestCount++;

                console.log(`[LinkPreview] ✅ ${task.url} | ${elapsed}ms | 缓存命中率: ${metrics.hitRate}`);

                if (json.status === 'success' && json.data) {
                    // 优先用 VideoThumb 直接提取精准缩略图（YouTube 视频等）
                    const directThumb = VideoThumb.extract(task.url);
                    // 频道页的 og:image 是频道封面，不应作为预览图
                    const isChannel = VideoThumb.isChannelPage(task.url);
                    const apiImage = json.data.image ? json.data.image.url : '';

                    // 调试日志：帮助诊断缩略图来源
                    console.log(`[LinkPreview] 🖼️ 缩略图诊断:`, {
                        url: task.url,
                        directThumb,
                        isChannel,
                        apiImage,
                        finalImage: directThumb || (isChannel ? '' : apiImage),
                    });

                    const data = {
                        title: json.data.title || '',
                        description: json.data.description || '',
                        // 优先级：直接提取的视频缩略图 > API返回图片（非频道页）> 无图
                        image: directThumb || (isChannel ? '' : apiImage),
                        favicon: json.data.logo ? json.data.logo.url
                            : `https://www.google.com/s2/favicons?domain=${new URL(task.url).hostname}&sz=32`,
                        domain: new URL(task.url).hostname,
                        isChannel,
                    };
                    LRUCache.set(task.url, data);
                    task.resolve(data);
                } else {
                    task.resolve(null);
                }
            } catch (err) {
                clearTimeout(timeoutId);
                const elapsed = Math.round(performance.now() - start);
                console.warn(`[LinkPreview] ❌ ${task.url} | ${elapsed}ms | ${err.message}`);

                // 重试逻辑
                if (task.retries < CFG.MAX_RETRY && err.name !== 'AbortError') {
                    task.retries++;
                    console.log(`[LinkPreview] 🔄 重试 ${task.retries}/${CFG.MAX_RETRY}: ${task.url}`);
                    this._queue.unshift(task); // 放回队列头部
                } else {
                    metrics.errors++;
                    task.resolve(null); // 失败时 resolve(null) 触发降级
                }
            } finally {
                this._active--;
                this._inFlight.delete(task.url);
                this._drain(); // 继续处理队列
            }
        }
    };

    // =============================================
    // 预加载管理器
    // =============================================
    const Preloader = {
        _observer: null,
        _preloaded: new Set(),
        _preloadCount: 0,

        init() {
            // Intersection Observer 监听卡片进入视口
            this._observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    const card = entry.target;
                    const anchor = card.querySelector('.link-url a');
                    if (!anchor) return;
                    const url = anchor.href;
                    if (this._preloaded.has(url)) return;
                    if (LRUCache.get(url)) return; // 已有缓存

                    // 限制预加载数量
                    if (this._preloadCount >= CFG.PRELOAD_VIEWPORT) return;

                    this._preloaded.add(url);
                    this._preloadCount++;
                    // 低优先级：延迟 500ms 后预加载
                    setTimeout(() => {
                        if (!LRUCache.get(url)) {
                            console.log(`[LinkPreview] 🔮 预加载: ${url}`);
                            RequestQueue.enqueue(url).catch(() => {});
                        }
                    }, 500);
                });
            }, { threshold: 0.1, rootMargin: '100px' });
        },

        observe(cardEl) {
            if (this._observer) this._observer.observe(cardEl);
        },

        // 重置计数（每次 renderLinkList 后调用）
        reset() {
            this._preloadCount = 0;
            this._preloaded.clear();
            if (this._observer) this._observer.disconnect();
        }
    };

    // =============================================
    // 预览 UI 控制器
    // =============================================
    const PreviewUI = {
        el: null,
        overlay: null,
        _showTimer: null,
        _hideTimer: null,
        _currentUrl: null,
        _isVisible: false,
        _isMobile: false,

        init() {
            this.el = document.getElementById('linkPreview');
            this.overlay = document.getElementById('lpOverlay');
            this._isMobile = window.innerWidth <= 768;
            window.addEventListener('resize', () => {
                this._isMobile = window.innerWidth <= 768;
            });

            // 鼠标进入预览框：取消隐藏
            this.el.addEventListener('mouseenter', () => clearTimeout(this._hideTimer));
            // 鼠标离开预览框：延迟隐藏
            this.el.addEventListener('mouseleave', () => {
                this._hideTimer = setTimeout(() => this.hide(), CFG.HIDE_DELAY);
            });
            // 点击遮罩关闭（移动端）
            this.overlay.addEventListener('click', () => this.hide());
        },

        // 定位预览框（使用 transform 实现 GPU 加速）
        // Bug #2 修复：移动端重置 transform，避免与 CSS left/bottom 冲突
        _position(cardEl) {
            if (this._isMobile) {
                // 移动端：CSS 已用 left/bottom 固定在底部，清除 JS 设置的 transform
                this.el.style.left = '';
                this.el.style.top = '';
                this.el.style.transform = 'none';
                return;
            }

            const rect = cardEl.getBoundingClientRect();
            const previewH = 350;
            const previewW = 320;
            const margin = 10;
            const vw = window.innerWidth;
            const vh = window.innerHeight;

            // 水平：居中对齐卡片，但不超出视口
            let left = rect.left + (rect.width - previewW) / 2;
            left = Math.max(10, Math.min(left, vw - previewW - 10));

            // 垂直：优先上方，上方不足则下方；同时确保不超出视口底部
            let top;
            if (rect.top >= previewH + margin) {
                top = rect.top - previewH - margin;
            } else {
                top = rect.bottom + margin;
                // 如果下方也放不下，则贴近视口底部
                if (top + previewH > vh - 10) {
                    top = Math.max(10, vh - previewH - 10);
                }
            }

            // 使用 transform 代替 top/left（GPU 加速，避免强制同步布局）
            this.el.style.left = '0';
            this.el.style.top = '0';
            this.el.style.transform = `translate(${left}px, ${top}px)`;
        },

        show(cardEl, url, title) {
            clearTimeout(this._hideTimer);
            this._isVisible = true;
            this._currentUrl = url;

            if (this._isMobile) this.overlay.classList.add('visible');

            this._position(cardEl);
            this._setState('loading');

            // 移除 hiding，触发显示动画
            this.el.classList.remove('hiding');
            this.el.style.display = 'block';
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this.el.classList.add('visible');
            }));

            // ★ 关键修复：对于能直接提取缩略图的视频链接（如 YouTube），
            //   先立即显示本地提取的缩略图，再异步补充标题/描述
            const directThumb = VideoThumb.extract(url);
            if (directThumb) {
                // 先查缓存（可能有完整数据）
                const cached = LRUCache.get(url);
                if (cached) {
                    // 强制用直接提取的缩略图覆盖缓存中可能错误的图片
                    const corrected = Object.assign({}, cached, { image: directThumb });
                    this._setState('content', corrected);
                    // 同时更新缓存中的图片
                    if (cached.image !== directThumb) {
                        LRUCache.set(url, corrected);
                        console.log(`[LinkPreview] 🔧 修正缓存缩略图: ${url}`);
                    }
                    return;
                }
                // 无缓存：立即显示占位预览（有缩略图但无标题），同时异步获取完整数据
                this._setState('content', {
                    title: title || '',
                    description: '',
                    image: directThumb,
                    favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32`,
                    domain: new URL(url).hostname,
                });
                // 异步补充标题和描述
                RequestQueue.enqueue(url).then(data => {
                    if (!this._isVisible || this._currentUrl !== url) return;
                    if (data) {
                        // 始终用直接提取的缩略图
                        this._setState('content', Object.assign({}, data, { image: directThumb }));
                    }
                });
                return;
            }

            // 5s 超时降级
            const fallbackTimer = setTimeout(() => {
                if (this._isVisible && this._currentUrl === url) {
                    this._setState('fallback', { url, title });
                }
            }, CFG.API_TIMEOUT);

            // 先查缓存（同步，< 1ms）
            const cached = LRUCache.get(url);
            if (cached) {
                clearTimeout(fallbackTimer);
                this._setState('content', cached);
                return;
            }

            // 走请求队列
            RequestQueue.enqueue(url).then(data => {
                clearTimeout(fallbackTimer);
                if (!this._isVisible || this._currentUrl !== url) return;
                if (data) {
                    this._setState('content', data);
                } else {
                    this._setState('fallback', { url, title });
                }
            });
        },

        hide() {
            this._isVisible = false;
            this._currentUrl = null;
            this.el.classList.remove('visible');
            this.el.classList.add('hiding');
            this.overlay.classList.remove('visible');
            setTimeout(() => {
                if (!this._isVisible) {
                    this.el.classList.remove('hiding');
                    this.el.style.display = 'none';
                }
            }, 200);
        },

        _setState(state, data) {
            const loading = document.getElementById('lpLoading');
            const content = document.getElementById('lpContent');
            const fallback = document.getElementById('lpFallback');

            loading.style.display = state === 'loading' ? 'flex' : 'none';
            content.style.display = state === 'content' ? 'block' : 'none';
            fallback.style.display = state === 'fallback' ? 'block' : 'none';

            if (state === 'content' && data) {
                // 图片
                const imgWrap = document.getElementById('lpImageWrap');
                const img = document.getElementById('lpImage');
                if (data.image) {
                    img.src = data.image;
                    imgWrap.style.display = 'block';
                } else {
                    imgWrap.style.display = 'none';
                }
                // Favicon
                const fav = document.getElementById('lpFavicon');
                const favFb = document.getElementById('lpFaviconFallback');
                if (data.favicon) {
                    fav.src = data.favicon;
                    fav.style.display = 'block';
                    favFb.style.display = 'none';
                } else {
                    fav.style.display = 'none';
                    favFb.textContent = (data.domain || '?')[0].toUpperCase();
                    favFb.style.display = 'flex';
                }
                document.getElementById('lpDomain').textContent = data.domain || '';
                document.getElementById('lpTitle').textContent = data.title || '（无标题）';
                document.getElementById('lpDesc').textContent = data.description || '';
            }

            if (state === 'fallback' && data) {
                document.getElementById('lpFallbackTitle').textContent = data.title || data.url || '';
                try {
                    document.getElementById('lpFallbackDomain').textContent = new URL(data.url).hostname;
                } catch { document.getElementById('lpFallbackDomain').textContent = ''; }
            }
        }
    };

    // =============================================
    // 事件委托（scroll 节流）
    // =============================================
    const EventHandler = {
        _showTimer: null,
        _hideTimer: null,
        _lastScroll: 0,

        init() {
            const listEl = document.getElementById('linkList');

            // mouseenter（捕获阶段）
            listEl.addEventListener('mouseenter', (e) => {
                const card = e.target.closest('.link-card');
                if (!card || PreviewUI._isMobile) return;
                const anchor = card.querySelector('.link-url a');
                if (!anchor) return;

                clearTimeout(this._hideTimer);
                clearTimeout(this._showTimer);
                this._showTimer = setTimeout(() => {
                    PreviewUI.show(card, anchor.href,
                        (card.querySelector('h3') || {}).textContent?.replace('📎 ', '') || '');
                }, CFG.SHOW_DELAY);
            }, true);

            // mouseleave（捕获阶段）
            listEl.addEventListener('mouseleave', (e) => {
                const card = e.target.closest('.link-card');
                if (!card || PreviewUI._isMobile) return;
                clearTimeout(this._showTimer);
                this._hideTimer = setTimeout(() => PreviewUI.hide(), CFG.HIDE_DELAY);
            }, true);

            // scroll 节流
            window.addEventListener('scroll', () => {
                const now = Date.now();
                if (now - this._lastScroll < CFG.SCROLL_THROTTLE) return;
                this._lastScroll = now;
                if (PreviewUI._isVisible) PreviewUI.hide();
            }, { passive: true });

            // ESC 关闭
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && PreviewUI._isVisible) PreviewUI.hide();
            });
        }
    };

    // =============================================
    // 调试面板（Ctrl+Shift+D）
    // =============================================
    const DebugPanel = {
        _el: null,
        _visible: false,

        init() {
            if (!CFG.DEBUG_SHORTCUT) return;

            // 创建调试面板 DOM
            this._el = document.createElement('div');
            this._el.id = 'lpDebugPanel';
            this._el.style.cssText = `
                position: fixed; bottom: 56px; left: 16px; z-index: 9998;
                background: rgba(0,0,0,0.88); color: #0f0; font-family: monospace;
                font-size: 12px; padding: 14px 18px; border-radius: 10px;
                min-width: 260px; display: none; line-height: 1.8;
                border: 1px solid #0f04; backdrop-filter: blur(8px);
            `;
            document.body.appendChild(this._el);

            // Ctrl+Shift+D 切换
            document.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                    e.preventDefault();
                    this.toggle();
                }
            });
        },

        toggle() {
            this._visible = !this._visible;
            this._el.style.display = this._visible ? 'block' : 'none';
            if (this._visible) this.update();
        },

        update() {
            if (!this._visible) return;
            const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith(CFG.CACHE_KEY_PREFIX) && k !== CFG.CACHE_META_KEY);
            let cacheSize = 0;
            cacheKeys.forEach(k => { cacheSize += (localStorage.getItem(k) || '').length * 2; });

            this._el.innerHTML = `
                <div style="color:#fff;font-weight:bold;margin-bottom:6px">🔍 LinkPreview Debug</div>
                <div>总请求数：<span style="color:#0ff">${metrics.totalRequests}</span></div>
                <div>缓存命中：<span style="color:#0f0">${metrics.cacheHits}</span></div>
                <div>缓存未命中：<span style="color:#f80">${metrics.cacheMisses}</span></div>
                <div>命中率：<span style="color:#0ff">${metrics.hitRate}</span></div>
                <div>平均加载：<span style="color:#0ff">${metrics.avgLoadTime}ms</span></div>
                <div>错误次数：<span style="color:#f44">${metrics.errors}</span></div>
                <div>内存缓存：<span style="color:#0f0">${LRUCache._mem.size} 条</span></div>
                <div>本地缓存：<span style="color:#0f0">${cacheKeys.length} 条 / ${(cacheSize / 1024).toFixed(1)}KB</span></div>
                <div>并发请求：<span style="color:#0ff">${RequestQueue._active}/${CFG.MAX_CONCURRENT}</span></div>
                <div>队列长度：<span style="color:#f80">${RequestQueue._queue.length}</span></div>
                <div style="color:#666;margin-top:6px;font-size:11px">Ctrl+Shift+D 关闭</div>
            `;
            if (this._visible) setTimeout(() => this.update(), 1000);
        }
    };

    // =============================================
    // 全局 lpHide（供 HTML onclick 调用）
    // =============================================
    window.lpHide = () => PreviewUI.hide();

    // =============================================
    // 初始化
    // =============================================
    function init() {
        LRUCache.init();
        LRUCache.checkSize();
        PreviewUI.init();
        Preloader.init();
        EventHandler.init();
        DebugPanel.init();

        // 页面卸载前保存缓存元数据
        window.addEventListener('beforeunload', () => LRUCache._saveMeta());

        console.log('[LinkPreview] ✅ 初始化完成 | Ctrl+Shift+D 打开调试面板');
    }

    // =============================================
    // 暴露给主页面的接口（renderLinkList 后调用）
    // =============================================
    window.LinkPreview = {
        // 重新绑定预加载观察器（每次列表重渲染后调用）
        rebindPreloader() {
            Preloader.reset();
            document.querySelectorAll('.link-card').forEach(card => {
                Preloader.observe(card);
            });
        },
        metrics,
        LRUCache,
    };

    // DOM 就绪后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
