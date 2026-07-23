// ========================================
// 智绘衣橱 (SmartStyle) — 类型定义
// 对应原 React 项目 shared/types + src/types.ts
// ========================================

// ---- Enums ----
const Category = {
  TOP: '上装',
  BOTTOM: '下装',
  DRESS: '连衣裙',
  OUTERWEAR: '外套',
  SHOES: '鞋子',
  ACCESSORIES: '配饰'
};

const Season = {
  SPRING: '春季',
  SUMMER: '夏季',
  AUTUMN: '秋季',
  WINTER: '冬季',
  ALL: '四季'
};

const BodyShape = {
  PEAR: '梨形',
  APPLE: '苹果形',
  HOURGLASS: '沙漏形',
  RECTANGLE: '矩形',
  INVERTED_TRIANGLE: '倒三角'
};

const ItemStatus = {
  OWNED: 'OWNED',
  WISHLIST: 'WISHLIST'
};

const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE'
};

const ViewState = {
  HOME: 'HOME',
  WARDROBE: 'WARDROBE',
  TRY_ON: 'TRY_ON',
  PROFILE: 'PROFILE'
};

module.exports = {
  Category,
  Season,
  BodyShape,
  ItemStatus,
  Gender,
  ViewState
};
