# 📋 index.html 修改指引
# 让 Cline 按照以下步骤修改 index.html
# 每一步都是精确的 str_replace，可以直接执行

================================================================
## STEP 1：在 <head> 中引入 graph.js
================================================================

在 index.html 的 </head> 标签之前，添加：

```html
<script src="src/graph.js"></script>
```

================================================================
## STEP 2：添加图谱 Tab 按钮
================================================================

找到现有的视图切换按钮区域（通常是包含"列表"或"网格"视图的 tab bar）。
如果没有，则找到 "我的收藏 📚" 这个 h2 标题，在其下方添加：

```html
<!-- 视图切换 Tab Bar -->
<div id="view-tabs" style="
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: var(--bg-secondary, #1e293b);
  padding: 4px;
  border-radius: 10px;
  width: fit-content;
">
  <button id="tab-list" onclick="switchView('list')" style="
    padding: 7px 18px;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: var(--accent, #4f86f7);
    color: #fff;
    transition: all 0.2s;
  ">🔗 列表</button>
  <button id="tab-graph" onclick="switchView('graph')" style="
    padding: 7px 18px;
    border-radius: 7px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: transparent;
    color: var(--text-secondary, #94a3b8);
    transition: all 0.2s;
  ">🗺️ 图谱</button>
</div>
```

================================================================
## STEP 3：添加图谱容器
================================================================

在链接列表容器（id 通常是 links-container 或 linksList）的同级，紧跟其后添加：

```html
<!-- 知识图谱容器 -->
<div id="graph-container" style="
  display: none;
  width: 100%;
  height: 600px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #1e293b;
"></div>
```

================================================================
## STEP 4：在 <script> 底部添加视图切换逻辑
================================================================

在 index.html 最后一个 </script> 之前，添加：

```javascript
// ==========================================
// 知识图谱 - 视图切换逻辑
// ==========================================
let currentView = 'list';

function switchView(view) {
  currentView = view;

  // 获取列表容器（自动适配常见 id 命名）
  const listEl  = document.getElementById('links-container')
                || document.getElementById('linksList')
                || document.getElementById('linksContainer')
                || document.querySelector('.links-list');

  const graphEl = document.getElementById('graph-container');
  const tabList  = document.getElementById('tab-list');
  const tabGraph = document.getElementById('tab-graph');

  const activeStyle   = 'background:var(--accent,#4f86f7);color:#fff;';
  const inactiveStyle = 'background:transparent;color:var(--text-secondary,#94a3b8);';

  if (view === 'graph') {
    if (listEl)  listEl.style.display  = 'none';
    graphEl.style.display = 'block';
    tabList.style.cssText  += inactiveStyle;
    tabGraph.style.cssText += activeStyle;

    // 读取数据并渲染
    const links = getLinks(); // 调用项目已有的获取链接方法
    GraphModule.render('graph-container', links);

  } else {
    if (listEl)  listEl.style.display  = '';
    graphEl.style.display = 'none';
    tabList.style.cssText  += activeStyle;
    tabGraph.style.cssText += inactiveStyle;
  }
}

// 兼容：如果项目用不同的函数名获取链接数据，修改下面这个函数
function getLinks() {
  // 尝试常见的全局变量/函数名
  if (typeof links !== 'undefined' && Array.isArray(links)) return links;
  if (typeof allLinks !== 'undefined') return allLinks;
  if (typeof getLinkData === 'function') return getLinkData();
  if (typeof loadLinks === 'function') return loadLinks();
  // 兜底：直接从 localStorage 读取
  try {
    const raw = localStorage.getItem('superBrainLinks')
             || localStorage.getItem('links')
             || localStorage.getItem('myLinks')
             || '[]';
    return JSON.parse(raw);
  } catch(e) {
    console.warn('[Graph] 无法读取链接数据', e);
    return [];
  }
}
```

================================================================
## ⚠️ Cline 执行注意事项
================================================================

1. STEP 2 中，如果项目已有 Tab 切换组件，直接在其中追加"图谱"按钮即可，
   不需要重新创建整个 Tab Bar。

2. STEP 4 中，`getLinks()` 里的 localStorage key 需要与项目实际使用的 key 一致。
   请先在 index.html 中搜索 `localStorage.setItem` 找到实际存储的 key 名称，
   然后更新 getLinks() 的兜底逻辑。

3. 如果链接数据对象的字段名与 graph.js 中使用的字段名不同，
   需要在 getLinks() 返回前做映射，例如：
   ```
   return rawLinks.map(l => ({
     id:    l.id || l._id,
     title: l.title || l.name,
     url:   l.url  || l.link,
     tag:   l.tag  || l.category || '其他',
     note:  l.note || l.desc || '',
     date:  l.date || l.createdAt,
   }));
   ```
