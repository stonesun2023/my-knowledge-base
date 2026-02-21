const KNOWLEDGE_BASE_URL = 'https://stonesun2023.github.io/my-knowledge-base/';
const AI_API_URL = 'https://api.anthropic.com/v1/messages';

let selectedTag = '';

// 初始化：获取当前页面信息
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  document.getElementById('titleInput').value = tab.title || '';
  document.getElementById('urlInput').value = tab.url || '';
  
  // 自动 AI 推荐标签
  autoTagWithAI(tab.title, tab.url);
});

// 标签点击选择
document.getElementById('tagList').addEventListener('click', (e) => {
  const tag = e.target.closest('.tag');
  if (!tag) return;
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('selected'));
  tag.classList.add('selected');
  selectedTag = tag.dataset.tag;
});

// AI 自动推荐标签
async function autoTagWithAI(title, url) {
  // 从知识库页面读取 AI 配置
  const config = JSON.parse(localStorage.getItem('superbrain_ai_config') || '{}');
  const activeProvider = config.activeProvider;
  const providerConfig = config.providers?.[activeProvider];
  
  if (!providerConfig?.apiKey || activeProvider !== 'claude') return;

  const hint = document.getElementById('aiHint');
  hint.textContent = '🤖 AI 分析中...';

  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': providerConfig.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: providerConfig.model || 'claude-3-5-sonnet-20241022',
        max_tokens: 20,
        messages: [{
          role: 'user',
          content: `根据以下网页信息，从这些标签中选择最合适的一个：编程、设计、AI、学习、工作、工具、其他。只回复标签名，不要其他内容。\n标题：${title}\nURL：${url}`
        }]
      })
    });
    const data = await res.json();
    const suggestedTag = data.content?.[0]?.text?.trim();
    const VALID_TAGS = ['编程', '设计', 'AI', '学习', '工作', '工具', '其他'];
    
    if (suggestedTag && VALID_TAGS.includes(suggestedTag)) {
      // 高亮推荐标签
      document.querySelectorAll('.tag').forEach(t => {
        if (t.dataset.tag === suggestedTag) {
          t.classList.add('selected', 'ai-tag');
          selectedTag = suggestedTag;
        }
      });
      hint.textContent = `✨ AI 推荐：${suggestedTag}`;
    } else {
      hint.textContent = '';
    }
  } catch {
    hint.textContent = '';
  }
}

// 保存按钮
document.getElementById('btnSave').addEventListener('click', async () => {
  const title = document.getElementById('titleInput').value.trim();
  const url = document.getElementById('urlInput').value.trim();
  const status = document.getElementById('status');
  const btn = document.getElementById('btnSave');

  if (!title || !url) {
    showStatus('请填写标题和网址', 'error');
    return;
  }

  btn.disabled = true;
  showStatus('保存中...', '');

  const link = {
    id: Date.now().toString(),
    title,
    url,
    tag: selectedTag || '其他',
    createdAt: new Date().toISOString()
  };

  try {
    // 查找或打开知识库 tab
    const tabs = await chrome.tabs.query({ url: KNOWLEDGE_BASE_URL + '*' });
    
    if (tabs.length > 0) {
      // 已有知识库 tab，直接注入
      await chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: injectLink,
        args: [link]
      });
    } else {
      // 打开知识库页面，等待加载后注入
      const newTab = await chrome.tabs.create({ url: KNOWLEDGE_BASE_URL, active: false });
      await waitForTabLoad(newTab.id);
      await chrome.scripting.executeScript({
        target: { tabId: newTab.id },
        func: injectLink,
        args: [link]
      });
    }

    showStatus('✅ 已保存到知识库！', 'success');
    setTimeout(() => window.close(), 1200);
  } catch (err) {
    showStatus('❌ 保存失败：' + err.message, 'error');
    btn.disabled = false;
  }
});

// 注入到知识库页面的函数（在页面上下文中运行）
function injectLink(link) {
  const STORAGE_KEY = 'linksData';
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = raw ? JSON.parse(raw) : { links: [] };
  data.links = data.links || [];
  data.links.unshift(link);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  
  // 触发页面刷新数据
  window.dispatchEvent(new CustomEvent('superbrain:linkAdded', { detail: link }));
}

// 等待 tab 加载完成
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.onUpdated.addListener(function listener(id, info) {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(resolve, 500); // 等待 JS 初始化
      }
    });
  });
}

function showStatus(msg, type) {
  const el = document.getElementById('status');
  el.textContent = msg;
  el.className = 'status ' + type;
}