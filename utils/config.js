// ========================================
// 智绘衣橱 (SmartStyle) — 后端地址配置（集中管理）
// ========================================
// 上云后只需改这一处 SERVER_ORIGIN。
//
// 本地调试：指向本机后端（server/.env 中 PORT=3002）
// 部署到 Render/Railway 后，改成你的 HTTPS 域名，例如：
//   const SERVER_ORIGIN = 'https://smartstyle-api.onrender.com';
const SERVER_ORIGIN = 'https://smartstyle-api.onrender.com';

const API_BASE = SERVER_ORIGIN + '/api';

module.exports = {
  SERVER_ORIGIN,
  API_BASE,
};
