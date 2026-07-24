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
    editingId: null,
    pendingImageUrl: '',
    pendingDisplayUrl: '',
    // 多件选择弹窗
    detectVisible: false,
    detectItems: [],
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

  // 上传图片 → 整图抠衣物 → 检测出框 → 裁出每件（已是干净单件）
  // 单件直接进确认框；多件弹选择框，用户挑一件
  uploadAndRecognize(filePath) {
    wx.showLoading({ title: '上传中...', mask: true });
    api.uploadAPI.upload(filePath)
      .then(uploadRes => {
        wx.showLoading({ title: '抠图检测中...', mask: true });
        return api.aiAPI.detect(uploadRes.url);
      })
      .then(d => {
        wx.hideLoading();
        const items = (d && d.items) || [];
        if (!items.length) {
          wx.showToast({ title: '未识别到衣物', icon: 'none' });
          return;
        }
        // 1 件：直接进确认框（带名称）
        if (items.length === 1) {
          this.showRecognize(items[0].cropUrl, items[0].type);
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
    this.setData({ detectVisible: false, detectItems: [] });
    if (picked.cropUrl) this.showRecognize(picked.cropUrl, picked.type);
  },

  // 取消多件选择
  cancelDetect() {
    this.setData({ detectVisible: false, detectItems: [] });
  },

  // 展示确认框（cutoutUrl 已是抠图+裁剪后的干净单件）
  // name 为视觉模型识别的衣物名称（如"牛仔短裤"），带入标签栏，保存时作为标签带出
  showRecognize(cutoutUrl, name) {
    const garmentName = (name || '').trim();
    const item = {
      category: this.guessCategory(garmentName),
      color: '白色',
      brand: '',
      season: '四季',
      tags: []
    };
    // 把名称预填到标签栏，用户可编辑/增删
    const tagsText = garmentName ? garmentName : '';
    wx.showLoading({ title: '加载中...', mask: true });
    this.setData({
      recognizeVisible: true,
      editingId: null,
      pendingImageUrl: cutoutUrl,
      pendingDisplayUrl: cutoutUrl,
      pendingItem: item,
      pendingTagsText: tagsText
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
  },

  // 点击已保存的单品 → 进入编辑（复用确认弹窗，回填数据）
  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.items.find(it => it.id === id);
    if (!item) return;
    const tags = Array.isArray(item.tags) ? item.tags : [];
    this.setData({
      recognizeVisible: true,
      editingId: id,
      pendingImageUrl: item.imageUrl,
      pendingDisplayUrl: item.imageUrl,
      pendingItem: {
        category: item.category || '上装',
        color: item.color || '白色',
        brand: item.brand || '',
        season: item.season || '四季',
        tags
      },
      pendingTagsText: tags.join('、')
    });
  },

  // 根据衣物名称关键词猜测分类，识别不到默认上装
  guessCategory(name) {
    if (!name) return '上装';
    if (/(裤|裙裤|短裤|长裤|牛仔裤)/.test(name)) return '下装';
    if (/(连衣裙|半身裙|长裙|短裙)/.test(name)) return '连衣裙';
    if (/(外套|夹克|风衣|大衣|羽绒服|棉服|西装)/.test(name)) return '外套';
    if (/(鞋|靴|凉鞋|运动鞋|帆布鞋)/.test(name)) return '鞋履';
    if (/(帽|围巾|包| belt|腰带|领带|袜子|手套)/.test(name)) return '配饰';
    return '上装';
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
    this.setData({ recognizeVisible: false, editingId: null, pendingImageUrl: '', pendingDisplayUrl: '', pendingTagsText: '' });
  },

  // 确认保存（editingId 有值走更新，否则新建）
  confirmRecognize() {
    const { pendingImageUrl, pendingItem, pendingTagsText, editingId } = this.data;
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

    const payload = {
      imageUrl: pendingImageUrl,
      category: pendingItem.category,
      tags,
      color: pendingItem.color || '白色',
      brand: pendingItem.brand || null,
      season: pendingItem.season || '四季'
    };
    if (!editingId) payload.status = ItemStatus.OWNED;

    wx.showLoading({ title: '保存中...', mask: true });
    const savePromise = editingId
      ? api.wardrobeAPI.update(editingId, payload)
      : api.wardrobeAPI.create(payload);
    savePromise
      .then(() => {
        wx.hideLoading();
        this.setData({ recognizeVisible: false, editingId: null, pendingImageUrl: '', pendingDisplayUrl: '', pendingTagsText: '' });
        wx.showToast({ title: editingId ? '已更新' : '已保存', icon: 'success' });
        this.loadWardrobe();
      })
      .catch(err => {
        wx.hideLoading();
        console.error('[Wardrobe] 保存失败:', err);
        wx.showToast({ title: err.message || '保存失败', icon: 'none' });
      });
  }
});
