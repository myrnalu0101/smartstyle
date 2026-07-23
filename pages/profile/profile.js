// ========================================
// 个人页
// ========================================

const { COLOR_MAP } = require('../../utils/constants');
const auth = require('../../utils/auth');

Page({
  data: {
    stats: {
      totalItems: 0,
      topStyle: '极简风',
      mostWornColor: '白色',
      bodyShape: '梨形',
      height: 165,
      weight: 55,
      gender: 'FEMALE'
    },
    colorMap: COLOR_MAP
  },

  onShow() {
    console.log('[Profile] onShow');
    const app = getApp();
    if (!app.globalData.isAuthenticated) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    if (app.globalData.userStats) {
      this.setData({ stats: app.globalData.userStats });
    }
  },

  handleLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          auth.logout();
          wx.reLaunch({ url: '/pages/auth/auth' });
        }
      }
    });
  }
});
