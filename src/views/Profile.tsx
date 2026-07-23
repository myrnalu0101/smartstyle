import React from 'react';
import { UserStats } from '../types';
import { Settings, Ruler, Activity, Shirt } from 'lucide-react';

interface Props {
  stats: UserStats;
  onLogout?: () => void;
}

export const ProfileView: React.FC<Props> = ({ stats, onLogout }) => {
  return (
    <div className="px-6 py-8 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">数字分身</h1>
        <button className="text-gray-400 hover:text-gray-600">
            <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Avatar Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center">
        <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden mr-4 border-2 border-white shadow-md">
            <img src="https://picsum.photos/200/200?random=user" alt="User" className="w-full h-full object-cover" />
        </div>
        <div>
            <h2 className="text-lg font-bold text-gray-800">Alexa Wang</h2>
            <p className="text-xs text-gray-500 mt-1">时尚探索者 · {stats.bodyShape}</p>
        </div>
      </div>

      {/* Body Data Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center">
            <Ruler className="w-4 h-4 mr-2 text-primary-500" />
            身体数据
        </h3>
        <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-gray-400 text-xs mb-1">身高</div>
                <div className="font-bold text-gray-800">{stats.height} <span className="text-xs font-normal">cm</span></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-gray-400 text-xs mb-1">体重</div>
                <div className="font-bold text-gray-800">{stats.weight} <span className="text-xs font-normal">kg</span></div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-gray-400 text-xs mb-1">体型</div>
                <div className="font-bold text-gray-800">{stats.bodyShape}</div>
            </div>
        </div>
        <button className="w-full mt-4 text-xs text-primary-600 font-medium py-2 border border-primary-100 rounded-lg bg-primary-50">
            重新扫描测量
        </button>
      </div>

       {/* Insights */}
       <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg mb-6">
            <h3 className="text-sm font-bold mb-4 flex items-center text-gray-200">
                <Activity className="w-4 h-4 mr-2" />
                穿搭偏好分析
            </h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-sm text-gray-300">最爱风格</span>
                    <span className="font-medium">{stats.topStyle}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-3">
                    <span className="text-sm text-gray-300">常用色系</span>
                    <div className="flex items-center">
                        <div className="w-3 h-3 rounded-full bg-white mr-2"></div>
                        <span className="font-medium">{stats.mostWornColor}</span>
                    </div>
                </div>
            </div>
       </div>

        <button
            onClick={onLogout}
            className="w-full bg-white text-red-500 font-medium py-3 rounded-xl border border-gray-100 shadow-sm text-sm active:scale-95 transition-transform"
        >
            退出登录
        </button>
    </div>
  );
};