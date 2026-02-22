// src/utils/LinkFetcher.js
// 通过 api.microlink.io 公共代理抓取网页元数据，解决 CORS 问题

export class LinkFetcher {
  static BASE_URL = 'https://api.microlink.io';

  /**
   * 抓取 URL 的标题、描述、图标
   * @param {string} url
   * @returns {Promise<{title:string, description:string, favicon:string}|null>}
   */
  static async fetch(url) {
    try {
      const api = `${this.BASE_URL}?url=${encodeURIComponent(url)}&palette=false&audio=false&video=false&iframe=false`;
      const res = await fetch(api, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      const json = await res.json();
      if (json.status !== 'success') return null;
      const { title, description, logo } = json.data;
      return {
        title: title || '',
        description: description || '',
        favicon: logo?.url || ''
      };
    } catch (e) {
      console.warn('[LinkFetcher] 抓取失败:', e);
      return null;
    }
  }

  /** 简单判断字符串是否为合法 URL */
  static isValidUrl(str) {
    try {
      const u = new URL(str);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }
}