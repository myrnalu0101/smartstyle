import React from 'react';
import { Home, Shirt, Sparkles, User } from 'lucide-react';
import { ViewState, NavItem } from '../types';

interface NavbarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
}

const navItems: NavItem[] = [
  { id: ViewState.HOME, label: '首页', icon: Home },
  { id: ViewState.WARDROBE, label: '衣橱', icon: Shirt },
  { id: ViewState.TRY_ON, label: '试衣间', icon: Sparkles }, // Centerpiece
  { id: ViewState.PROFILE, label: '我的', icon: User },
];

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe pt-2 px-6 h-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50 flex justify-between items-start max-w-md mx-auto w-full">
      {navItems.map((item) => {
        const isActive = currentView === item.id;
        const Icon = item.icon;
        
        // Special styling for the main "Try On" AI feature
        if (item.id === ViewState.TRY_ON) {
            return (
                <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className="relative -top-6 group"
                >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isActive ? 'bg-accent-600 scale-110 shadow-accent-500/50' : 'bg-gray-900 text-white'}`}>
                        <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className={`text-xs mt-1 block text-center font-medium ${isActive ? 'text-accent-600' : 'text-gray-500'}`}>{item.label}</span>
                </button>
            )
        }

        return (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className="flex flex-col items-center justify-center w-12"
          >
            <Icon
              className={`w-6 h-6 transition-colors duration-200 ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            />
            <span
              className={`text-[10px] mt-1 font-medium transition-colors duration-200 ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};