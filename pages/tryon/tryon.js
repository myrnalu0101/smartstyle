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
    this.setData({ mode, step: 'CONFIG', generatedOutfit: null, isApplied: false }, () => this.checkCanGenerate());
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

    doubao.simulateProcessingDelay(2500)
      .then(() => doubao.generateOutfitSuggestion(
        inventory, promptOccasion, MOCK_WEATHER.condition, MOCK_WEATHER.temp,
        userStats.topStyle, lockedIds
      ))
      .then(outfit => {
        clearInterval(textInterval);
        this.setData({ generatedOutfit: outfit, step: 'RESULT' });
      })
      .catch(err => {
        clearInterval(textInterval);
        console.error('生成失败:', err);
        this.setData({ step: 'CONFIG' });
      });
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
    this.setData({ step: 'CONFIG', generatedOutfit: null, isApplied: false });
  }
});
