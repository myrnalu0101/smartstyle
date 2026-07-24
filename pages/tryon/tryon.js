// ========================================
// 试衣间
// ========================================

const { OCCASIONS, MOCK_WEATHER, AI_LOADING_TEXTS, COLOR_MAP } = require('../../utils/constants');
const { ItemStatus, Category } = require('../../utils/types');
const doubao = require('../../utils/doubao');

Page({
  data: {
    mode: 'SCENARIO',
    step: 'CONFIG',
    selectedOccasion: OCCASIONS[0],
    selectedCustomIds: [],
    preBuySource: 'WISHLIST',
    selectedWishlistId: null,
    externalLink: '',
    externalImage: null,
    generatedOutfit: null,
    outfitPreview: null,
    loadingText: AI_LOADING_TEXTS[0],
    isApplied: false,
    weather: MOCK_WEATHER,
    occasions: OCCASIONS,
    wardrobe: [],
    ownedItems: [],
    wishlistItems: [],
    canGenerate: true
  },

  onShow() {
    console.log('[TryOn] onShow');
    const app = getApp();
    if (!app.globalData.isAuthenticated) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    this.loadWardrobe();
  },

  loadWardrobe() {
    const app = getApp();
    const wardrobe = app.globalData.wardrobe || [];
    const ownedItems = wardrobe.filter(i => i.status === ItemStatus.OWNED);
    const wishlistItems = wardrobe.filter(i => i.status === ItemStatus.WISHLIST);
    this.setData({ wardrobe, ownedItems, wishlistItems });
    this.checkCanGenerate();
  },

  checkCanGenerate() {
    const { mode, preBuySource, selectedWishlistId, externalLink, externalImage } = this.data;
    let can = true;
    if (mode === 'PRE_BUY') {
      if (preBuySource === 'WISHLIST' && !selectedWishlistId) can = false;
      if (preBuySource === 'EXTERNAL' && !externalLink && !externalImage) can = false;
    }
    this.setData({ canGenerate: can });
  },

  setMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode, step: 'CONFIG', generatedOutfit: null, outfitPreview: null, isApplied: false }, () => this.checkCanGenerate());
  },

  selectOccasion(e) {
    this.setData({ selectedOccasion: e.currentTarget.dataset.occasion });
  },

  toggleCustom(e) {
    const id = e.currentTarget.dataset.id;
    let ids = [...this.data.selectedCustomIds];
    if (ids.includes(id)) {
      ids = ids.filter(i => i !== id);
    } else {
      if (ids.length >= 3) return;
      ids.push(id);
    }
    this.setData({ selectedCustomIds: ids });
  },

  setPreBuySource(e) {
    this.setData({ preBuySource: e.currentTarget.dataset.source }, () => this.checkCanGenerate());
  },

  selectWishlist(e) {
    const item = e.currentTarget.dataset.item;
    this.setData({ selectedWishlistId: item.id }, () => this.checkCanGenerate());
  },

  onLinkInput(e) {
    this.setData({ externalLink: e.detail.value }, () => this.checkCanGenerate());
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ externalImage: res.tempFilePaths[0] }, () => this.checkCanGenerate());
      }
    });
  },

  handleGenerate() {
    if (!this.data.canGenerate) return;
    this.setData({ step: 'GENERATING', isApplied: false });

    let textIndex = 0;
    const textInterval = setInterval(() => {
      textIndex = (textIndex + 1) % AI_LOADING_TEXTS.length;
      this.setData({ loadingText: AI_LOADING_TEXTS[textIndex] });
    }, 800);

    const { mode, selectedOccasion, wardrobe, selectedCustomIds, preBuySource, selectedWishlistId } = this.data;
    const app = getApp();
    const userStats = app.globalData.userStats || { topStyle: '极简风' };

    let lockedIds = [];
    let promptOccasion = selectedOccasion;

    if (mode === 'PRE_BUY') {
      if (preBuySource === 'WISHLIST' && selectedWishlistId) {
        lockedIds = [selectedWishlistId];
      }
      promptOccasion = '购买评估：请务必包含我指定的新品，并用衣橱里的旧衣物来搭配它。';
    } else if (mode === 'CUSTOM') {
      lockedIds = selectedCustomIds;
      promptOccasion = '自由搭配';
    }

    const inventory = this.buildInventory(lockedIds);

    // 读取最近已生成的搭配组合签名，让模型避开重复
    const avoidSets = wx.getStorageSync('recent_outfits') || [];

    doubao.simulateProcessingDelay(2500)
      .then(() => doubao.generateOutfitSuggestion(
        inventory, promptOccasion, MOCK_WEATHER.condition, MOCK_WEATHER.temp,
        userStats.topStyle, lockedIds, avoidSets
      ))
      .then(outfit => {
        clearInterval(textInterval);
        // 记录本次搭配的 id 组合签名，供下次避开（最多保留 5 组）
        const ids = (outfit.items || []).map(i => i.id).sort().join(',');
        if (ids) {
          const next = [ids, ...avoidSets.filter(s => s !== ids)].slice(0, 5);
          wx.setStorageSync('recent_outfits', next);
        }
        const preview = this.buildOutfitPreview(outfit);
        this.setData({ generatedOutfit: outfit, outfitPreview: preview, step: 'RESULT' });
      })
      .catch(err => {
        clearInterval(textInterval);
        console.error('生成失败:', err);
        this.setData({ step: 'CONFIG' });
      });
  },

  // 把搭配结果按部位拆出来，供人形剪影预览叠加
  buildOutfitPreview(outfit) {
    const items = (outfit && outfit.items) || [];
    const find = (cats) => items.find(i => cats.indexOf(i.category) > -1);
    return {
      top: (find([Category.TOP]) || {}).imageUrl || '',
      outer: (find([Category.OUTERWEAR]) || {}).imageUrl || '',
      bottom: (find([Category.BOTTOM]) || {}).imageUrl || '',
      dress: (find([Category.DRESS]) || {}).imageUrl || '',
      shoes: (find([Category.SHOES, '鞋履']) || {}).imageUrl || ''
    };
  },

  buildInventory(lockedIds) {
    const { wardrobe, mode, preBuySource, externalImage, externalLink } = this.data;
    let inventory = wardrobe.filter(i => i.status === ItemStatus.OWNED);
    if (mode === 'PRE_BUY' && preBuySource === 'EXTERNAL' && (externalImage || externalLink)) {
      inventory = [...inventory, {
        id: 'temp-' + Date.now(),
        category: Category.TOP,
        imageUrl: externalImage || '',
        tags: ['新品', '待评估'],
        color: '未知',
        season: '四季',
        wearCount: 0,
        status: ItemStatus.WISHLIST
      }];
    }
    return inventory;
  },

  handleApply() {
    const { generatedOutfit } = this.data;
    if (!generatedOutfit || this.data.isApplied) return;
    const top = generatedOutfit.items.find(i =>
      i.category === Category.TOP || i.category === Category.DRESS || i.category === Category.OUTERWEAR
    );
    const bottom = generatedOutfit.items.find(i => i.category === Category.BOTTOM);
    let topColor = '#FFFFFF', bottomColor = '#3B82F6';
    if (top) topColor = COLOR_MAP[top.color] || topColor;
    if (bottom) bottomColor = COLOR_MAP[bottom.color] || bottomColor;
    else if (top && top.category === Category.DRESS) bottomColor = topColor;
    getApp().globalData.currentOutfit = { topColor, bottomColor };
    this.setData({ isApplied: true });
  },

  goBack() {
    this.setData({ step: 'CONFIG', generatedOutfit: null, outfitPreview: null, isApplied: false });
  }
});
