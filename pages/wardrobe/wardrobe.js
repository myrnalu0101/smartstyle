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
    pendingDisplayUrl: '',
    // 多件选择弹窗
    detectVisible: false,
    detectItems: [],
    pendingOriginalUrl: '',
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

  // 上传图片 → 物体检测 → 单件直接抠图 / 多件弹选择框
  uploadAndRecognize(filePath) {
    wx.showLoading({ title: '上传中...', mask: true });
    api.uploadAPI.upload(filePath)
      .then(uploadRes => {
        const imageUrl = uploadRes.url;
        wx.showLoading({ title: '检测中...', mask: true });
        return api.aiAPI.detect(imageUrl).then(d => ({ imageUrl, items: (d && d.items) || [] }));
      })
      .then(({ imageUrl, items }) => {
        wx.hideLoading();
        // 记下原图，多件选择后回传给抠图
        this.setData({ pendingOriginalUrl: imageUrl });
        // 0 件：整图无 box 抠图
        if (!items.length) {
          this.proceedToSegment(imageUrl, null);
          return;
        }
        // 1 件：带该件 box 整图抠图后裁剪
        if (items.length === 1) {
          this.proceedToSegment(imageUrl, items[0].box || null);
          return;
        }
        // 多件：弹出选择框，让用户挑一件
        this.setData({ detectVisible: true, detectItems: items });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('[Wardrobe] 检测失败:', err);
        wx.showToast({ title: err.message || '处理失败', icon: 'none' });
      });
  },

  // 用户在多件选择框中点了一件
  pickDetectItem(e) {
    const idx = e.currentTarget.dataset.idx;
    const picked = this.data.detectItems[idx] || {};
    const box = picked.box || null;
    this.setData({ detectVisible: false, detectItems: [] });
    // 多件：把原始上传图 + 该件框 传给抠图（整图抠图后裁这一件）
    this.proceedToSegment(this.data.pendingOriginalUrl, box);
  },

  // 取消多件选择
  cancelDetect() {
    this.setData({ detectVisible: false, detectItems: [], pendingOriginalUrl: '' });
  },

  // 对选定的图片抠图，然后弹出确认框
  // imageUrl: 原始上传图；box: 选定件的归一化框（可选），传时整图抠图后裁该件
  proceedToSegment(imageUrl, box) {
    wx.showLoading({ title: '抠图中...', mask: true });
    api.aiAPI.segment(imageUrl, box)
      .then(seg => {
        // 抠图成功用 cutoutUrl，失败退回原图
        const cutoutUrl = (seg && seg.segmented && seg.cutoutUrl) ? seg.cutoutUrl : imageUrl;
        const item = {
          category: '上装',
          color: '白色',
          brand: '',
          season: '四季',
          tags: []
        };
        wx.showLoading({ title: '加载中...', mask: true });
        this.setData({
          recognizeVisible: true,
          pendingImageUrl: cutoutUrl,
          pendingDisplayUrl: cutoutUrl,
          pendingItem: item,
          pendingTagsText: ''
        });
        if (wx.getImageInfo) {
          wx.getImageInfo({
            src: cutoutUrl,
            success: () => wx.hideLoading(),
            fail: () => wx.hideLoading()
          });
        } else {
          wx.hideLoading();
        }
        if (!seg || !seg.segmented) {
          wx.showToast({ title: '抠图不可用，使用原图', icon: 'none' });
        }
      })
      .catch(err => {
        wx.hideLoading();
        console.error('[Wardrobe] 抠图失败:', err);
        wx.showToast({ title: err.message || '处理失败', icon: 'none' });
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
    this.setData({ recognizeVisible: false, pendingImageUrl: '', pendingDisplayUrl: '', pendingTagsText: '' });
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
        this.setData({ recognizeVisible: false, pendingImageUrl: '', pendingDisplayUrl: '', pendingTagsText: '' });
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
