// ========================================
// 智绘衣橱 (SmartStyle) — AI 服务 (豆包)
// 对应原 React 项目 src/services/doubaoService.ts
// 小程序中通过 wx.request 调用后端代理
// 如果后端不可用，使用本地 fallback
// ========================================

const { Category, ItemStatus } = require('./types');

const { API_BASE } = require('./config');
const DOUBAO_PROXY_URL = API_BASE + '/ai/outfit'; // 后端代理接口

/**
 * 从数组中随机选取指定分类的单品
 */
function getRandomItem(items, category) {
  const filtered = items.filter(i => i.category === category);
  if (filtered.length === 0) return undefined;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

/**
 * 本地 fallback 搭配逻辑（不依赖 AI API）
 */
function fallbackOutfit(wardrobe, lockedItems) {
  const outfit = [...lockedItems];

  const hasTop = outfit.some(i =>
    i.category === Category.TOP || i.category === Category.DRESS || i.category === Category.OUTERWEAR
  );
  const hasBottom = outfit.some(i =>
    i.category === Category.BOTTOM || i.category === Category.DRESS
  );
  const hasShoes = outfit.some(i => i.category === Category.SHOES);

  if (!hasTop) {
    const top = getRandomItem(wardrobe, Category.TOP) || getRandomItem(wardrobe, Category.OUTERWEAR);
    if (top) outfit.push(top);
  }
  if (!hasBottom && !outfit.some(i => i.category === Category.DRESS)) {
    const bottom = getRandomItem(wardrobe, Category.BOTTOM);
    if (bottom) outfit.push(bottom);
  }
  if (!hasShoes) {
    const shoes = getRandomItem(wardrobe, Category.SHOES);
    if (shoes) outfit.push(shoes);
  }

  return outfit;
}

/**
 * 通过后端代理调用豆包 AI
 * avoidSets: 最近已生成的搭配组合签名（字符串数组），让模型避开重复
 */
function callDoubaoAPI(wardrobe, occasion, weather, temperature, userStyle, lockedItemIds, avoidSets = []) {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('smartstyle_token') || '';

    wx.request({
      url: DOUBAO_PROXY_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      data: {
        wardrobe,
        occasion,
        weather,
        temperature,
        userStyle,
        lockedItemIds,
        avoidSets
      },
      timeout: 30000,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error('AI API error: ' + res.statusCode));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/**
 * 生成穿搭建议
 * @param {Array} wardrobe - 衣橱物品列表
 * @param {string} occasion - 场景/目标
 * @param {string} weather - 天气
 * @param {number} temperature - 温度
 * @param {string} userStyle - 用户风格偏好
 * @param {string[]} lockedItemIds - 必须包含的单品 ID
 * @param {string[]} avoidSets - 最近已生成的搭配组合签名，让模型避开重复
 * @returns {Promise<Object>} Outfit 对象
 */
function generateOutfitSuggestion(wardrobe, occasion, weather, temperature, userStyle, lockedItemIds = [], avoidSets = []) {
  const lockedItems = wardrobe.filter(item => lockedItemIds.includes(item.id));

  // 尝试调用 AI 后端
  return callDoubaoAPI(wardrobe, occasion, weather, temperature, userStyle, lockedItemIds, avoidSets)
    .then(result => {
      const selectedIds = result.selectedItemIds || [];
      const finalIds = Array.from(new Set([...lockedItemIds, ...selectedIds]));
      const matchedItems = wardrobe.filter(item => finalIds.includes(item.id));

      return {
        id: Date.now().toString(),
        items: matchedItems.length > 0 ? matchedItems : fallbackOutfit(wardrobe, lockedItems),
        score: result.score || 85,
        reasoning: result.reasoning || '根据您的要求，为您搭配了这套造型。',
        occasion: occasion,
        dateCreated: new Date().toISOString()
      };
    })
    .catch(err => {
      console.warn('AI API 调用失败，使用本地搭配:', err);
      return {
        id: Date.now().toString(),
        items: fallbackOutfit(wardrobe, lockedItems),
        score: 80,
        reasoning: '网络连接受限，但我还是为您凭直觉挑了一套不错的搭配！',
        occasion: occasion,
        dateCreated: new Date().toISOString()
      };
    });
}

/**
 * 模拟处理延迟
 */
function simulateProcessingDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  generateOutfitSuggestion,
  simulateProcessingDelay
};
