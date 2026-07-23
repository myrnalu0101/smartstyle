// ========================================
// 智绘衣橱 (SmartStyle) — 认证管理
// 对应原 React 项目 src/contexts/AuthContext.tsx
// ========================================

const api = require('./api');

/**
 * 检查本地 token 是否有效
 * @returns {Promise<boolean>}
 */
function checkAuth() {
  const token = api.getToken();
  if (!token) return Promise.resolve(false);

  return api.authAPI.me()
    .then(res => {
      const app = getApp();
      app.globalData.user = res.user;
      app.globalData.token = token;
      app.globalData.isAuthenticated = true;
      return true;
    })
    .catch(() => {
      api.clearToken();
      return false;
    });
}

/**
 * 登录
 * @param {string} email
 * @param {string} password
 */
function login(email, password) {
  return api.authAPI.login(email, password).then(res => {
    const app = getApp();
    api.setToken(res.token);
    app.setAuth(res.token, res.user);
    return res;
  });
}

/**
 * 注册
 * @param {string} username
 * @param {string} email
 * @param {string} password
 */
function register(username, email, password) {
  return api.authAPI.register(username, email, password).then(res => {
    const app = getApp();
    api.setToken(res.token);
    app.setAuth(res.token, res.user);
    return res;
  });
}

/**
 * 退出登录
 */
function logout() {
  const app = getApp();
  app.clearAuth();
}

/**
 * 获取当前认证状态
 */
function getAuthState() {
  const app = getApp();
  return {
    user: app.globalData.user,
    isAuthenticated: app.globalData.isAuthenticated,
    token: app.globalData.token
  };
}

module.exports = {
  checkAuth,
  login,
  register,
  logout,
  getAuthState
};
