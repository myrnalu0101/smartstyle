import React, { useState } from 'react';
import { ClothingItem, Category, ItemStatus } from '../types';
import { WardrobeItemCard } from '../components/WardrobeItemCard';
import { Search, Plus, Filter, ShoppingBag, Scissors } from 'lucide-react';

interface Props {
  items: ClothingItem[];
}

export const WardrobeView: React.FC<Props> = ({ items }) => {
  const [activeTab, setActiveTab] = useState<ItemStatus>(ItemStatus.OWNED);
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  
  const filteredItems = items.filter(item => {
      const matchStatus = item.status === activeTab;
      const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      return matchStatus && matchCategory;
  });

  const categories = ['ALL', ...Object.values(Category)];

  return (
    <div className="h-full flex flex-col pt-6 pb-24 bg-gray-50/50">
      
      {/* Top Toggle Switch */}
      <div className="px-6 mb-4">
        <div className="bg-gray-100 p-1 rounded-xl flex font-medium text-sm">
            <button 
                onClick={() => setActiveTab(ItemStatus.OWNED)}
                className={`flex-1 py-2 rounded-lg transition-all ${activeTab === ItemStatus.OWNED ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
                我的衣橱
            </button>
            <button 
                onClick={() => setActiveTab(ItemStatus.WISHLIST)}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center ${activeTab === ItemStatus.WISHLIST ? 'bg-white text-accent-600 shadow-sm' : 'text-gray-500'}`}
            >
                预购清单
                <span className="ml-1.5 w-1.5 h-1.5 bg-red-500 rounded-full block"></span>
            </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 mb-4 flex gap-3">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
                type="text" 
                placeholder={activeTab === ItemStatus.OWNED ? "搜索我的衣物..." : "搜索想买的..."}
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
        </div>
        <button className="bg-white border border-gray-200 text-gray-600 rounded-xl w-10 flex items-center justify-center">
            <Filter className="w-4 h-4" />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="pl-6 mb-4 overflow-x-auto no-scrollbar">
        <div className="flex space-x-2 pr-6">
            {categories.map((cat) => (
                <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat as Category | 'ALL')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                        selectedCategory === cat 
                        ? 'bg-gray-900 text-white' 
                        : 'bg-white text-gray-500 border border-gray-100'
                    }`}
                >
                    {cat === 'ALL' ? '全部' : cat}
                </button>
            ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-6">
        <div className="grid grid-cols-2 gap-4 pb-20">
            {/* Action Card based on Tab */}
            {activeTab === ItemStatus.OWNED ? (
                <div className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-primary-200 cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-gray-100 group-hover:bg-primary-50 flex items-center justify-center mb-3 transition-colors">
                        <Plus className="w-6 h-6 text-gray-400 group-hover:text-primary-600" />
                    </div>
                    <span className="text-xs font-medium group-hover:text-primary-600">拍照录入</span>
                </div>
            ) : (
                <div className="aspect-[3/4] border-2 border-dashed border-accent-200 bg-accent-50/30 rounded-xl flex flex-col items-center justify-center text-accent-400 hover:bg-accent-50 cursor-pointer transition-colors group">
                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center mb-3 shadow-sm">
                        <Scissors className="w-6 h-6 text-accent-500" />
                    </div>
                    <span className="text-xs font-bold text-accent-600">截图/链接录入</span>
                    <span className="text-[10px] text-accent-400 mt-1">自动识别网图</span>
                </div>
            )}

            {filteredItems.map(item => (
                <WardrobeItemCard key={item.id} item={item} />
            ))}
        </div>
      </div>
    </div>
  );
};