// ========================================
// 智绘衣橱 (SmartStyle) — API 客户端
// 对应原 React 项目 src/api/client.ts
// fetch() → wx.request()
// localStorage → wx.setStorageSync()
// ========================================

const { API_BASE } = require('./config');

function getToken() {
  return wx.getStorageSync('smartstyle_token') || null;
}

function setToken(token) {
  wx.setStorageSync('smartstyle_token', token);
}

function clearToken() {
  wx.removeStorageSync('smartstyle_token');
}

/**
 * 通用请求封装
 * @param {string} path - API 路径（如 /auth/login）
 * @param {object} options - 请求选项
 */
function apiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    const header = {};

    if (token) {
      header['Authorization'] = 'Bearer ' + token;
    }

    if (options.body && typeof options.body === 'object') {
      header['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    wx.request({
      url: API_BASE + path,
      method: options.method || 'GET',
      header: header,
      data: options.body,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          if (res.statusCode === 401) {
            clearToken();
            const app = getApp();
            app.clearAuth();
          }
          reject(new Error(res.data.error || 'Request failed: ' + res.statusCode));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'Network error'));
      }
    });
  });
}

// ---- Auth API ----
const authAPI = {
  register(username, email, password) {
    return apiRequest('/auth/register', {
      method: 'POST',
      body: { username, email, password }
    });
  },

  login(email, password) {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password }
    });
  },

  me() {
    return apiRequest('/auth/me');
  }
};

// ---- Wardrobe API ----
const wardrobeAPI = {
  list(params) {
    let query = '';
    if (params) {
      const parts = [];
      if (params.category) parts.push('category=' + encodeURIComponent(params.category));
      if (params.status) parts.push('status=' + encodeURIComponent(params.status));
      if (params.search) parts.push('search=' + encodeURIComponent(params.search));
      if (parts.length > 0) query = '?' + parts.join('&');
    }
    return apiRequest('/wardrobe' + query);
  },

  get(id) {
    return apiRequest('/wardrobe/' + id);
  },

  create(item) {
    return apiRequest('/wardrobe', {
      method: 'POST',
      body: item
    });
  },

  update(id, updates) {
    return apiRequest('/wardrobe/' + id, {
      method: 'PUT',
      body: updates
    });
  },

  delete(id) {
    return apiRequest('/wardrobe/' + id, {
      method: 'DELETE'
    });
  }
};

// ---- Upload API ----
const uploadAPI = {
  upload(filePath) {
    return new Promise((resolve, reject) => {
      const token = getToken();
      wx.uploadFile({
        url: API_BASE + '/upload',
        filePath: filePath,
        name: 'image',
        header: token ? { 'Authorization': 'Bearer ' + token } : {},
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(res.data));
          } else {
            reject(new Error('Upload failed: ' + res.statusCode));
          }
        },
        fail(err) {
          reject(new Error(err.errMsg || 'Upload error'));
        }
      });
    });
  }
};

// ---- Profile API ----
const profileAPI = {
  get() {
    return apiRequest('/profile');
  },

  update(data) {
    return apiRequest('/profile', {
      method: 'PUT',
      body: data
    });
  }
};

// ---- AI API ----
const aiAPI = {
  // 识图：传已上传图片的完整 URL，返回 { category, color, brand, season, tags }
  recognize(imageUrl) {
    return apiRequest('/ai/recognize', {
      method: 'POST',
      body: { imageUrl }
    });
  },

  // 抠图：传已上传图片的完整 URL，返回 { cutoutUrl, segmented }
  segment(imageUrl) {
    return apiRequest('/ai/segment', {
      method: 'POST',
      body: { imageUrl }
    });
  },

  // 检测：传已上传图片的完整 URL，返回 { items: [{ cropUrl, type, score }] }
  detect(imageUrl) {
    return apiRequest('/ai/detect', {
      method: 'POST',
      body: { imageUrl }
    });
  }
};

module.exports = {
  setToken,
  clearToken,
  getToken,
  authAPI,
  wardrobeAPI,
  uploadAPI,
  profileAPI,
  aiAPI
};
