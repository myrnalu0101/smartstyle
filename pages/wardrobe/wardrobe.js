// ========================================
// 衣橱页
// ========================================

const { ItemStatus, Category } = require('../../utils/types');
const api = require('../../utils/api');

Page({
  data: {
    activeTab: 'OWNED',
    selectedCategory: 'ALL',
    searchText: '',
    items: [],
    filteredItems: [],
    categories: ['ALL', Category.TOP, Category.BOTTOM, Category.DRESS, Category.OUTERWEAR, Category.SHOES, Category.ACCESSORIES],
    // 识图确认弹窗
    recognizeVisible: false,
    recognizing: false,
    pendingImageUrl: '',
    pendingItem: {
      category: '上装',
      color: '白色',
      brand: '',
      season: '四季',
      tags: []
    },
    pendingTagsText: ''
  },

  onShow() {
    console.log('[Wardrobe] onShow');
    const app = getApp();
    if (!app.globalData.isAuthenticated) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    this.loadWardrobe();
  },

  // 从后端拉取衣橱列表
  loadWardrobe() {
    api.wardrobeAPI.list()
      .then(items => {
        const list = Array.isArray(items) ? items : [];
        this.setData({ items: list });
        const app = getApp();
        app.globalData.wardrobe = list;
        this.applyFilters();
      })
      .catch(err => {
        console.error('[Wardrobe] 加载失败:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  applyFilters() {
    const { activeTab, selectedCategory, searchText, items } = this.data;
    let filtered = items.filter(item => {
      const matchStatus = item.status === activeTab;
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchSearch = !searchText ||
        (item.tags && item.tags.some(t => t.includes(searchText))) ||
        (item.category && item.category.includes(searchText));
      return matchStatus && matchCategory && matchSearch;
    });
    this.setData({ filteredItems: filtered });
  },

  setTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab }, () => this.applyFilters());
  },

  setCategory(e) {
    this.setData({ selectedCategory: e.currentTarget.dataset.cat }, () => this.applyFilters());
  },

  onSearch(e) {
    this.setData({ searchText: e.detail.value }, () => this.applyFilters());
  },

  // 拍照录入：拍照 → 上传 → 识图 → 弹确认框 → 用户确认后保存
  captureAdd() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      camera: 'back',
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        this.uploadAndRecognize(tempPath);
      },
      fail: (err) => {
        // 用户取消不算错误
        if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
          console.error('[Wardrobe] 选图失败:', err);
          wx.showToast({ title: '无法获取照片', icon: 'none' });
        }
      }
    });
  },

  // 上传图片并调用 AI 识图，然后弹出确认框
  uploadAndRecognize(filePath) {
    wx.showLoading({ title: '上传中...', mask: true });
    api.uploadAPI.upload(filePath)
      .then(uploadRes => {
        const imageUrl = uploadRes.url;
        wx.showLoading({ title: '识图中...', mask: true });
        return api.aiAPI.recognize(imageUrl).then(rec => ({ imageUrl, rec }));
      })
      .then(({ imageUrl, rec }) => {
        wx.hideLoading();
        const item = {
          category: rec.category || '上装',
          color: rec.color || '白色',
          brand: rec.brand || '',
          season: rec.season || '四季',
          tags: Array.isArray(rec.tags) ? rec.tags : []
        };
        this.setData({
          recognizeVisible: true,
          pendingImageUrl: imageUrl,
          pendingItem: item,
          pendingTagsText: item.tags.join('、')
        });
        if (!rec.recognized) {
          wx.showToast({ title: '识图不可用，请手动填写', icon: 'none' });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('[Wardrobe] 识图失败:', err);
        wx.showToast({ title: err.message || '识图失败', icon: 'none' });
      });
  },

  // ---- 确认弹窗内的交互 ----
  onPendingInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`pendingItem.${field}`]: e.detail.value });
  },

  onPendingTagsInput(e) {
    const text = e.detail.value || '';
    this.setData({ pendingTagsText: text });
  },

  // 选择分类（picker）
  onPendingCategoryChange(e) {
    const idx = e.detail.value;
    const cats = [Category.TOP, Category.BOTTOM, Category.DRESS, Category.OUTERWEAR, Category.SHOES, Category.ACCESSORIES];
    this.setData({ 'pendingItem.category': cats[idx] });
  },

  // 取消录入：丢弃已上传的图（后端无删除接口，仅前端不保存记录）
  cancelRecognize() {
    this.setData({ recognizeVisible: false, pendingImageUrl: '', pendingTagsText: '' });
  },

  // 确认保存
  confirmRecognize() {
    const { pendingImageUrl, pendingItem, pendingTagsText } = this.data;
    if (!pendingImageUrl) {
      wx.showToast({ title: '图片丢失', icon: 'none' });
      return;
    }
    // 标签按顿号/逗号拆分
    const tags = (pendingTagsText || '')
      .split(/[、,，]/)
      .map(t => t.trim())
      .filter(Boolean)
      .slice(0, 5);

    wx.showLoading({ title: '保存中...', mask: true });
    api.wardrobeAPI.create({
      imageUrl: pendingImageUrl,
      category: pendingItem.category,
      tags,
      color: pendingItem.color || '白色',
      brand: pendingItem.brand || null,
      season: pendingItem.season || '四季',
      status: ItemStatus.OWNED
    })
      .then(() => {
        wx.hideLoading();
        this.setData({ recognizeVisible: false, pendingImageUrl: '', pendingTagsText: '' });
        wx.showToast({ title: '已保存', icon: 'success' });
        this.loadWardrobe();
      })
      .catch(err => {
        wx.hideLoading();
        console.error('[Wardrobe] 保存失败:', err);
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      });
  }
});
