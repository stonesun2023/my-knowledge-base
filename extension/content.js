// 注入到知识库页面，监听来自插件的事件
window.addEventListener('superbrain:linkAdded', (e) => {
  console.log('[SuperBrain] 收到新链接，触发页面刷新:', e.detail);
  // 触发知识库页面重新渲染
  if (typeof renderLinks === 'function') renderLinks();
  if (typeof renderStats === 'function') renderStats();
});