// ========================================
// 衣橱页
// ========================================

const { ItemStatus, Category } = require('../../utils/types');

Page({
  data: {
    activeTab: 'OWNED',
    selectedCategory: 'ALL',
    searchText: '',
    items: [],
    filteredItems: [],
    categories: ['ALL', Category.TOP, Category.BOTTOM, Category.DRESS, Category.OUTERWEAR, Category.SHOES, Category.ACCESSORIES]
  },

  onShow() {
    console.log('[Wardrobe] onShow');
    const app = getApp();
    if (!app.globalData.isAuthenticated) {
      wx.switchTab({ url: '/pages/home/home' });
      return;
    }
    if (app.globalData.wardrobe && app.globalData.wardrobe.length > 0) {
      this.setData({ items: app.globalData.wardrobe });
      this.applyFilters();
    }
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
  }
});
