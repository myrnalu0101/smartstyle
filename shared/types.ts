// ========================================
// Shared Types — used by both frontend (src/) and backend (server/)
// No UI dependencies (no React, no Lucide)
// ========================================

export enum Category {
  TOP = '上装',
  BOTTOM = '下装',
  SHOES = '鞋履',
  DRESS = '连衣裙',
  OUTERWEAR = '外套',
  ACCESSORY = '配饰'
}

export enum Season {
  SPRING = '春',
  SUMMER = '夏',
  AUTUMN = '秋',
  WINTER = '冬',
  ALL = '四季'
}

export enum BodyShape {
  PEAR = '梨形',
  APPLE = '苹果形',
  HOURGLASS = '沙漏形',
  H_SHAPE = 'H形'
}

export enum ItemStatus {
  OWNED = 'OWNED',
  WISHLIST = 'WISHLIST'
}

export enum Gender {
  FEMALE = 'FEMALE',
  MALE = 'MALE'
}

export interface ClothingItem {
  id: string;
  imageUrl: string;
  category: Category;
  tags: string[];
  color: string;
  brand?: string;
  season: Season;
  isFavorite?: boolean;
  wearCount: number;
  lastWorn?: string;
  status: ItemStatus;
}

export interface UserStats {
  totalItems: number;
  topStyle: string;
  mostWornColor: string;
  bodyShape: BodyShape;
  height: number;
  weight: number;
  gender: Gender;
}

export interface Outfit {
  id: string;
  items: ClothingItem[];
  score: number;
  reasoning: string;
  occasion: string;
  dateCreated: string;
}

export interface AvatarConfig {
  topColor: string;
  bottomColor: string;
}

export interface WeatherData {
  temp: number;
  condition: string;
  city: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
}
