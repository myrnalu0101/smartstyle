// ========================================
// App Configuration & Constants
// Mock data removed — now fetched from backend API
// ========================================

export const MOCK_WEATHER = {
  temp: 24,
  condition: "晴朗",
  city: "上海"
};

export const COLOR_MAP: Record<string, string> = {
  "白色": "#FFFFFF",
  "米色": "#F5F5DC",
  "灰色": "#9CA3AF",
  "黑色": "#1F2937",
  "蓝色": "#3B82F6",
  "浅蓝": "#93C5FD",
  "深蓝": "#1E3A8A",
  "红色": "#EF4444",
  "粉色": "#FBCFE8",
  "卡其色": "#D4B996",
  "棕色": "#78350F",
  "绿色": "#10B981",
  "紫色": "#A78BFA",
  "香芋紫": "#C084FC",
  "黄色": "#FCD34D",
  "橙色": "#F97316"
};

export const OCCASIONS = [
  "通勤上班",
  "周末约会",
  "户外运动",
  "正式晚宴",
  "居家休闲",
  "海边度假"
];

export const AI_LOADING_TEXTS = [
  "AI 正在翻箱倒柜...",
  "正在分析今日气温与湿度...",
  "正在为您系扣子...",
  "正在计算色彩美学...",
  "正在咨询时尚总监..."
];