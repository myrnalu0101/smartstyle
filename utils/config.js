// ========================================
// 智绘衣橱 (SmartStyle) — 后端地址配置（集中管理）
// ========================================
// 上云后只需改这一处。
//
// 部署到 Render/Railway 后，把 SERVER_ORIGIN 改成你的后端 HTTPS 域名，
// 例如：
//   const SERVER_ORIGIN = 'https://smartstyle-api.onrender.com';
//
// 本地调试想连本机后端时，可临时改回：
//   const SERVER_ORIGIN = 'http://localhost:3002';
// （注意小程序需连后端实际端口，server/.env 默认是 3002）
const SERVER_ORIGIN = 'https://smartstyle-api.onrender.com'; // ← 部署后替换为真实域名

const API_BASE = SERVER_ORIGIN + '/api';

module.exports = {
  SERVER_ORIGIN,
  API_BASE,
};
