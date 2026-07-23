// ========================================
// 智绘衣橱 (SmartStyle) — 小程序入口
// ========================================

App({
  globalData: {
    user: null,
    token: null,
    isAuthenticated: false,
    userStats: null,
    wardrobe: [],
    currentOutfit: {
      topColor: '#FFFFFF',
      bottomColor: '#3B82F6'
    }
  },

  onLaunch() {
    console.log('[App] onLaunch');
    try {
      const token = wx.getStorageSync('smartstyle_token');
      if (token) {
        this.globalData.token = token;
        this.checkAuth();
      }
    } catch (err) {
      console.error('[App] onLaunch error:', err);
    }
  },

  checkAuth() {
    try {
      const api = require('./utils/api');
      api.authAPI.me()
        .then(res => {
          this.globalData.user = res.user;
          this.globalData.isAuthenticated = true;
          this.triggerAuthChange(true);
        })
        .catch(() => {
          this.clearAuth();
        });
    } catch (err) {
      console.error('[App] checkAuth error:', err);
    }
  },

  setAuth(token, user) {
    this.globalData.token = token;
    this.globalData.user = user;
    this.globalData.isAuthenticated = true;
    try {
      wx.setStorageSync('smartstyle_token', token);
    } catch (e) {}
    this.triggerAuthChange(true);
  },

  clearAuth() {
    this.globalData.token = null;
    this.globalData.user = null;
    this.globalData.isAuthenticated = false;
    try {
      wx.removeStorageSync('smartstyle_token');
    } catch (e) {}
    this.triggerAuthChange(false);
  },

  triggerAuthChange(isAuthenticated) {
    const pages = getCurrentPages();
    pages.forEach(page => {
      if (page.onAuthChange) {
        page.onAuthChange(isAuthenticated);
      }
    });
  }
});
