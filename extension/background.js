// 后台 Service Worker
// 目前保持简单，后续可扩展快捷键等功能
chrome.action.onClicked.addListener((tab) => {
  // 点击图标时 popup 会自动弹出，这里作为备用
  console.log('[SuperBrain] 插件激活，当前页:', tab.url);
});