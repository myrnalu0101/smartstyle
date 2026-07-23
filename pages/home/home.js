// ========================================
// 首页 — 对应原 Home.tsx
// ========================================

const { MOCK_WEATHER } = require('../../utils/constants');

Page({
  data: {
    weather: MOCK_WEATHER,
    userStats: {
      totalItems: 0,
      topStyle: '极简风',
      mostWornColor: '白色',
      bodyShape: '梨形',
      height: 165,
      weight: 55,
      gender: 'FEMALE'
    }
  },

  onShow() {
    console.log('[Home] onShow');
    const app = getApp();
    if (!app.globalData.isAuthenticated) {
      wx.redirectTo({ url: '/pages/auth/auth' });
      return;
    }
    if (app.globalData.userStats) {
      this.setData({ userStats: app.globalData.userStats });
    }
  },

  onTryOn() {
    wx.switchTab({ url: '/pages/tryon/tryon' });
  },

  onWardrobe() {
    wx.switchTab({ url: '/pages/wardrobe/wardrobe' });
  }
});
