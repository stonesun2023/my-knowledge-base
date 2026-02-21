const CACHE_NAME = 'superbrain-v1';
const ASSETS = [
  '/my-knowledge-base/',
  '/my-knowledge-base/index.html',
  '/my-knowledge-base/link-preview.js',
  '/my-knowledge-base/assets/icon.png',
  '/my-knowledge-base/src/ai/AIService.js',
  '/my-knowledge-base/src/ai/KnowledgeInsights.js',
  '/my-knowledge-base/src/ai/providers/ClaudeProvider.js',
  '/my-knowledge-base/src/ai/providers/DeepSeekProvider.js',
  '/my-knowledge-base/src/ai/providers/BaseProvider.js',
  '/my-knowledge-base/src/ai/providers/OpenAIProvider.js',
  '/my-knowledge-base/src/ai/providers/GLMProvider.js',
  '/my-knowledge-base/src/ai/providers/KimiProvider.js',
  '/my-knowledge-base/src/ai/providers/DoubaoProvider.js',
  '/my-knowledge-base/src/settings/AISettings.js'
];

// 安装：缓存所有静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// 激活：清除旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：网络优先，失败降级缓存
self.addEventListener('fetch', event => {
  // 只处理同源请求，AI API 请求直接放行
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});