import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomeView } from './views/Home';
import { WardrobeView } from './views/Wardrobe';
import { TryOnView } from './views/TryOn';
import { ProfileView } from './views/Profile';
import { ViewState, WeatherData, UserStats, ClothingItem, AvatarConfig } from './types';
import { MOCK_WEATHER } from './constants';
import { useAuth } from './contexts/AuthContext';
import { wardrobeAPI, profileAPI } from './api/client';
import { AuthScreen } from './views/AuthScreen';

const App: React.FC = () => {
  const { isAuthenticated, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.HOME);

  // Data from API
  const [wardrobe, setWardrobe] = useState<ClothingItem[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [weather] = useState<WeatherData>(MOCK_WEATHER);

  const [currentOutfit, setCurrentOutfit] = useState<AvatarConfig>({
    topColor: '#FFFFFF',
    bottomColor: '#3B82F6'
  });

  // Fetch wardrobe + profile when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        const [items, profile] = await Promise.all([
          wardrobeAPI.list(),
          profileAPI.get(),
        ]);
        setWardrobe(items);
        setUserStats({
          totalItems: profile.totalItems,
          topStyle: profile.topStyle,
          mostWornColor: profile.mostWornColor,
          bodyShape: profile.bodyShape,
          height: profile.height,
          weight: profile.weight,
          gender: profile.gender,
        });
      } catch (err) {
        console.error('Failed to load data:', err);
      }
    };

    loadData();
  }, [isAuthenticated]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-gray-400 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  // Not logged in — show auth screen
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const handleLogout = () => {
    logout();
    setCurrentView(ViewState.HOME);
  };

  const defaultStats: UserStats = userStats || {
    totalItems: 0,
    topStyle: '极简风',
    mostWornColor: '白色',
    bodyShape: '梨形' as any,
    height: 165,
    weight: 55,
    gender: 'FEMALE' as any,
  };

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return (
          <HomeView
            weather={weather}
            onChangeView={setCurrentView}
            userStats={userStats || defaultStats}
            currentOutfit={currentOutfit}
          />
        );
      case ViewState.WARDROBE:
        return <WardrobeView items={wardrobe} />;
      case ViewState.TRY_ON:
        return (
          <TryOnView
            wardrobe={wardrobe}
            userStats={userStats || defaultStats}
            onUpdateOutfit={setCurrentOutfit}
          />
        );
      case ViewState.PROFILE:
        return <ProfileView stats={userStats || defaultStats} onLogout={handleLogout} />;
      default:
        return (
          <HomeView
            weather={weather}
            onChangeView={setCurrentView}
            userStats={userStats || defaultStats}
            currentOutfit={currentOutfit}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-primary-100">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl overflow-hidden relative">
        {renderView()}
        <Navbar currentView={currentView} onChangeView={setCurrentView} />
      </div>
    </div>
  );
};

export default App;
