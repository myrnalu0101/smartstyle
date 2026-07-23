import React from 'react';
import { WeatherData, ViewState, UserStats, AvatarConfig, Gender } from '../types';
import { Sun, Camera, Box, Sparkles } from 'lucide-react';

interface Props {
  weather: WeatherData;
  onChangeView: (view: ViewState) => void;
  userStats: UserStats;
  currentOutfit: AvatarConfig;
}

const DigitalAvatar: React.FC<{ gender: Gender; outfit: AvatarConfig }> = ({ gender, outfit }) => {
    // Basic SVG Avatar Construction
    // Skin Tone
    const skinColor = "#FDE3D3";
    // Hair Color
    const hairColor = "#374151";

    return (
        <svg viewBox="0 0 200 320" className="w-full h-full drop-shadow-xl">
             <defs>
                 <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                     <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.15"/>
                 </filter>
             </defs>
             
             <g filter="url(#shadow)">
                {/* 1. Legs / Bottoms */}
                {/* Pants shape */}
                <path 
                    d="M75 180 L70 300 L90 300 L95 190 L105 190 L110 300 L130 300 L125 180 Z" 
                    fill={outfit.bottomColor} 
                />

                {/* 2. Shoes */}
                <path d="M65 300 L90 300 L90 310 Q77.5 320 65 310 Z" fill="#fff" />
                <path d="M110 300 L135 300 L135 310 Q122.5 320 110 310 Z" fill="#fff" />

                {/* 3. Neck */}
                <rect x="90" y="80" width="20" height="30" fill={skinColor} />

                {/* 4. Torso / Top */}
                {/* T-Shirt Shape */}
                <path 
                    d="M60 90 L140 90 L150 130 L130 140 L125 120 L125 190 L75 190 L75 120 L70 140 L50 130 Z" 
                    fill={outfit.topColor} 
                />

                {/* 5. Arms */}
                <path d="M50 130 L40 200 L55 200 L65 130 Z" fill={skinColor} />
                <path d="M150 130 L160 200 L145 200 L135 130 Z" fill={skinColor} />

                {/* 6. Head */}
                <ellipse cx="100" cy="60" rx="35" ry="40" fill={skinColor} />

                {/* 7. Face Details (Simple) */}
                {/* Eyes */}
                <circle cx="85" cy="55" r="3" fill="#333" />
                <circle cx="115" cy="55" r="3" fill="#333" />
                {/* Blush */}
                <ellipse cx="80" cy="65" rx="5" ry="2" fill="#FFB7B2" opacity="0.6" />
                <ellipse cx="120" cy="65" rx="5" ry="2" fill="#FFB7B2" opacity="0.6" />
                {/* Smile */}
                <path d="M90 75 Q100 82 110 75" stroke="#D97706" strokeWidth="2" fill="none" strokeLinecap="round" />

                {/* 8. Hair */}
                {gender === Gender.FEMALE ? (
                    // Female Hair (Long)
                    <path 
                        d="M65 60 Q65 20 100 20 Q135 20 135 60 L140 100 Q140 120 100 120 Q60 120 60 100 Z" 
                        fill={hairColor} 
                    />
                ) : (
                    // Male Hair (Short)
                    <path 
                        d="M65 50 Q65 15 100 15 Q135 15 135 50 Q135 60 130 55 Q100 30 70 55 Q65 60 65 50 Z" 
                        fill={hairColor} 
                    />
                )}
             </g>
        </svg>
    )
}

export const HomeView: React.FC<Props> = ({ weather, onChangeView, userStats, currentOutfit }) => {
  return (
    <div className="px-6 py-6 h-full overflow-y-auto pb-24">
      {/* Header Row: Greeting (Left) + Weather (Right) */}
      <div className="flex justify-between items-start mb-6">
        {/* Greeting moved up to occupy the top-left space */}
        <div className="pt-1">
           <h2 className="text-2xl font-bold text-gray-800">早安, Alexa <span className="inline-block animate-bounce">👋</span></h2>
           <p className="text-gray-500 text-sm mt-1">今天想穿成什么风格？</p>
        </div>

        {/* Weather Widget fixed on the right */}
        <div className="bg-white border border-gray-100 px-3 py-1.5 rounded-full flex items-center space-x-2 shadow-sm flex-shrink-0 ml-4">
            <Sun className="w-4 h-4 text-orange-400" fill="currentColor" />
            <span className="text-xs font-bold text-gray-600">{weather.temp}°</span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-gray-500">{weather.city}</span>
        </div>
      </div>

      {/* 2D Digital Twin (Avatar) Area */}
      <div className="relative w-full aspect-[4/5] bg-gradient-to-b from-primary-50 to-white rounded-3xl mb-6 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] border border-primary-100 overflow-hidden group">
         {/* Background Elements */}
         <div className="absolute top-10 left-10 w-24 h-24 bg-yellow-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-blob"></div>
         <div className="absolute top-20 right-10 w-24 h-24 bg-purple-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-blob animation-delay-2000"></div>
         <div className="absolute -bottom-10 left-20 w-32 h-32 bg-pink-200 rounded-full mix-blend-multiply filter blur-2xl opacity-60 animate-blob animation-delay-4000"></div>
         
         {/* The 2D Avatar Image */}
         <div className="absolute inset-0 flex items-end justify-center z-10 px-4 pb-8">
            <div className="w-full max-w-[240px] h-full transition-transform duration-700 ease-out group-hover:scale-105">
                <DigitalAvatar gender={userStats.gender} outfit={currentOutfit} />
            </div>
         </div>

         {/* Interactive Bubble */}
         <div className="absolute top-6 right-6 z-20 max-w-[140px]">
            <div className="bg-white/90 backdrop-blur-md px-3 py-2.5 rounded-2xl rounded-tr-none shadow-sm border border-white/50 animate-[bounce_3s_infinite]">
                <p className="text-xs font-medium text-gray-700 leading-tight">今天试试法式复古风？👗</p>
            </div>
         </div>

         {/* Floating Action Button inside Avatar area */}
         <button 
            onClick={() => onChangeView(ViewState.TRY_ON)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-gray-900/95 backdrop-blur-sm text-white pl-5 pr-6 py-3.5 rounded-full text-sm font-bold shadow-xl shadow-gray-900/20 hover:scale-105 active:scale-95 transition-all flex items-center whitespace-nowrap group-hover:bg-gray-800"
         >
            <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
            一键生成今日 OOTD
         </button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow cursor-pointer">
            <span className="text-lg font-bold text-gray-800">{userStats.totalItems}</span>
            <span className="text-[10px] text-gray-400 mt-0.5 font-medium">全部衣物</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow cursor-pointer">
            <span className="text-lg font-bold text-gray-800">85%</span>
            <span className="text-[10px] text-gray-400 mt-0.5 font-medium">衣橱利用率</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center hover:shadow-md transition-shadow cursor-pointer">
            <span className="text-lg font-bold text-accent-600">2</span>
            <span className="text-[10px] text-gray-400 mt-0.5 font-medium">心愿单</span>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div 
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer relative overflow-hidden group"
            onClick={() => onChangeView(ViewState.WARDROBE)}
        >
             <div className="absolute -top-2 -right-2 p-3 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity">
                <Camera className="w-16 h-16 text-green-600" />
             </div>
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-3 group-hover:bg-green-100 transition-colors">
                <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">极速录入</h3>
            <p className="text-[10px] text-gray-400 mt-1">拍照/截图自动入库</p>
        </div>
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform cursor-pointer relative overflow-hidden group">
            <div className="absolute -top-2 -right-2 p-3 opacity-[0.08] group-hover:opacity-[0.15] transition-opacity">
                <Box className="w-16 h-16 text-orange-600" />
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center text-orange-600 mb-3 group-hover:bg-orange-100 transition-colors">
                <Box className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">旅行打包</h3>
            <p className="text-[10px] text-gray-400 mt-1">生成行李箱清单</p>
        </div>
      </div>
    </div>
  );
};