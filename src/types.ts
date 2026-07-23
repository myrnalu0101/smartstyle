import { LucideIcon } from "lucide-react";

// Re-export all shared types
export {
  Category,
  Season,
  BodyShape,
  ItemStatus,
  Gender,
} from '../shared/types';

export type {
  ClothingItem,
  UserStats,
  Outfit,
  AvatarConfig,
  WeatherData,
  User,
  AuthResponse,
  ApiError,
} from '../shared/types';

// UI-specific types (depend on React/Lucide)
export enum ViewState {
  HOME = 'HOME',
  WARDROBE = 'WARDROBE',
  TRY_ON = 'TRY_ON',
  PROFILE = 'PROFILE'
}

export interface NavItem {
  id: ViewState;
  label: string;
  icon: LucideIcon;
}
