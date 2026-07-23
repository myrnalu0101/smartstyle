// ========================================
// 认证页面 — 对应原 AuthScreen.tsx + AuthContext
// ========================================

const auth = require('../../utils/auth');

Page({
  data: {
    tab: 'login',
    username: '',
    email: '',
    password: '',
    error: '',
    submitting: false
  },

  onLoad() {
    console.log('[Auth] onLoad');
    const app = getApp();
    if (app.globalData.isAuthenticated) {
      wx.switchTab({ url: '/pages/home/home' });
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ tab, error: '' });
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  handleSubmit() {
    const { tab, username, email, password } = this.data;

    if (!email || !password) {
      this.setData({ error: '请填写所有必填字段' });
      return;
    }

    if (tab === 'register' && (!username || username.length < 2)) {
      this.setData({ error: '用户名至少 2 个字符' });
      return;
    }

    if (password.length < 6) {
      this.setData({ error: '密码至少 6 个字符' });
      return;
    }

    this.setData({ error: '', submitting: true });

    const action = tab === 'login'
      ? auth.login(email, password)
      : auth.register(username, email, password);

    action
      .then(() => {
        wx.switchTab({ url: '/pages/home/home' });
      })
      .catch(err => {
        this.setData({ error: err.message || '操作失败，请稍后重试' });
      })
      .finally(() => {
        this.setData({ submitting: false });
      });
  }
});
