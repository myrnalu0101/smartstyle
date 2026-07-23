import React, { useState } from 'react';
import { ClothingItem, Outfit, UserStats, ItemStatus, Category, AvatarConfig } from '../types';
import { OCCASIONS, MOCK_WEATHER, AI_LOADING_TEXTS, COLOR_MAP } from '../constants';
import { generateOutfitSuggestion, simulateProcessingDelay } from '../services/doubaoService';
import { Sparkles, RefreshCw, ThumbsUp, ThumbsDown, Share2, AlertCircle, ShoppingBag, Layers, Wand2, Check, Link as LinkIcon, Image as ImageIcon, Plus } from 'lucide-react';
import { WardrobeItemCard } from '../components/WardrobeItemCard';

interface Props {
  wardrobe: ClothingItem[];
  userStats: UserStats;
  onUpdateOutfit?: (config: AvatarConfig) => void;
}

type Mode = 'SCENARIO' | 'CUSTOM' | 'PRE_BUY';
type Step = 'CONFIG' | 'GENERATING' | 'RESULT';
type PreBuySource = 'WISHLIST' | 'EXTERNAL';

export const TryOnView: React.FC<Props> = ({ wardrobe, userStats, onUpdateOutfit }) => {
  const [mode, setMode] = useState<Mode>('SCENARIO');
  const [step, setStep] = useState<Step>('CONFIG');
  
  // Config States
  const [selectedOccasion, setSelectedOccasion] = useState(OCCASIONS[0]);
  
  // Custom Mode State
  const [selectedCustomIds, setSelectedCustomIds] = useState<string[]>([]);
  
  // Pre-Buy Mode State
  const [preBuySource, setPreBuySource] = useState<PreBuySource>('WISHLIST');
  const [selectedWishlistItem, setSelectedWishlistItem] = useState<ClothingItem | null>(null);
  const [externalLink, setExternalLink] = useState('');
  const [externalImage, setExternalImage] = useState<string | null>(null);

  // Result States
  const [generatedOutfit, setGeneratedOutfit] = useState<Outfit | null>(null);
  const [loadingText, setLoadingText] = useState(AI_LOADING_TEXTS[0]);
  const [isApplied, setIsApplied] = useState(false);

  // Helper to get active inventory for Pre-Buy
  const getActiveInventory = () => {
     let tempItem: ClothingItem | null = null;

     if (mode === 'PRE_BUY') {
         if (preBuySource === 'WISHLIST' && selectedWishlistItem) {
             tempItem = selectedWishlistItem;
         } else if (preBuySource === 'EXTERNAL') {
             // Create a temporary item from external input
             if (externalImage || externalLink) {
                 tempItem = {
                     id: 'temp-' + Date.now(),
                     category: Category.TOP, // Default assumption, AI might correct if we had image analysis
                     imageUrl: externalImage || 'https://picsum.photos/300/400?random=99', // Placeholder for link
                     tags: ['新品', '待评估'],
                     color: '未知',
                     season: userStats.mostWornColor as any || '四季',
                     wearCount: 0,
                     status: ItemStatus.WISHLIST
                 };
             }
         }
     }
     
     // Base inventory is owned items
     const baseInventory = wardrobe.filter(i => i.status === ItemStatus.OWNED);
     
     if (tempItem) {
         return { inventory: [...baseInventory, tempItem], lockedIds: [tempItem.id] };
     } else if (mode === 'CUSTOM') {
         return { inventory: baseInventory, lockedIds: selectedCustomIds };
     }
     
     return { inventory: baseInventory, lockedIds: [] };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setExternalImage(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  // Handle Generate Action
  const handleGenerate = async () => {
    // Validation
    if (mode === 'PRE_BUY') {
        if (preBuySource === 'WISHLIST' && !selectedWishlistItem) return;
        if (preBuySource === 'EXTERNAL' && !externalLink && !externalImage) return;
    }
    if (mode === 'CUSTOM' && selectedCustomIds.length === 0) {
        // Optional: Could allow generating with 0 items (pure random), but let's encourage selection
        // return; 
    }

    setIsApplied(false);
    setStep('GENERATING');
    
    let textIndex = 0;
    const textInterval = setInterval(() => {
        textIndex = (textIndex + 1) % AI_LOADING_TEXTS.length;
        setLoadingText(AI_LOADING_TEXTS[textIndex]);
    }, 800);

    try {
        await simulateProcessingDelay(2500);
        
        const { inventory, lockedIds } = getActiveInventory();

        // Contextual Prompt Logic
        let promptOccasion = selectedOccasion;
        if (mode === 'PRE_BUY') {
            promptOccasion = `购买评估：请务必包含我指定的新品（ID: ${lockedIds[0]}），并用衣橱里的旧衣物来搭配它。`;
        } else if (mode === 'CUSTOM') {
             promptOccasion = `自由搭配：必须包含我选定的单品（IDs: ${lockedIds.join(', ')}），请为它们搭配最合适的其他单品。`;
        }

        const outfit = await generateOutfitSuggestion(
            inventory, 
            promptOccasion, 
            MOCK_WEATHER.condition, 
            MOCK_WEATHER.temp, 
            userStats.topStyle,
            lockedIds // Pass constraints to AI
        );
        setGeneratedOutfit(outfit);
        setStep('RESULT');
    } catch (e) {
        console.error(e);
        setStep('CONFIG');
    } finally {
        clearInterval(textInterval);
    }
  };

  const handleApplyOutfit = () => {
      if (!generatedOutfit || !onUpdateOutfit) return;

      const top = generatedOutfit.items.find(i => i.category === Category.TOP || i.category === Category.DRESS || i.category === Category.OUTERWEAR);
      const bottom = generatedOutfit.items.find(i => i.category === Category.BOTTOM);

      let topColor = '#FFFFFF';
      let bottomColor = '#3B82F6';

      if (top) topColor = COLOR_MAP[top.color] || topColor;
      if (bottom) bottomColor = COLOR_MAP[bottom.color] || bottomColor;
      else if (top?.category === Category.DRESS) bottomColor = topColor;

      onUpdateOutfit({ topColor, bottomColor });
      setIsApplied(true);
  };

  const toggleCustomSelection = (id: string) => {
      if (selectedCustomIds.includes(id)) {
          setSelectedCustomIds(prev => prev.filter(i => i !== id));
      } else {
          if (selectedCustomIds.length >= 3) return; // Max 3 limit
          setSelectedCustomIds(prev => [...prev, id]);
      }
  };

  const renderConfig = () => {
      return (
        <div className="flex flex-col h-full">
            {/* Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6 flex-shrink-0">
                <button 
                    onClick={() => setMode('SCENARIO')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${mode === 'SCENARIO' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                    <Sparkles className="w-3 h-3" />
                    智能场景
                </button>
                <button 
                    onClick={() => setMode('CUSTOM')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${mode === 'CUSTOM' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                >
                    <Layers className="w-3 h-3" />
                    自由混搭
                </button>
                <button 
                    onClick={() => setMode('PRE_BUY')} 
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${mode === 'PRE_BUY' ? 'bg-white shadow-sm text-accent-600' : 'text-gray-500'}`}
                >
                    <ShoppingBag className="w-3 h-3" />
                    试穿新品
                </button>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
                {/* Mode: Scenario */}
                {mode === 'SCENARIO' && (
                    <div className="space-y-6 animate-fadeIn">
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-3">出行场景</label>
                            <div className="grid grid-cols-2 gap-3">
                                {OCCASIONS.map(occ => (
                                    <button
                                        key={occ}
                                        onClick={() => setSelectedOccasion(occ)}
                                        className={`py-3 px-4 rounded-xl text-sm font-medium transition-all text-left flex justify-between items-center ${
                                            selectedOccasion === occ 
                                            ? 'bg-gray-900 text-white shadow-lg scale-[1.02]' 
                                            : 'bg-white text-gray-600 border border-gray-200'
                                        }`}
                                    >
                                        {occ}
                                        {selectedOccasion === occ && <Sparkles className="w-4 h-4 text-yellow-400" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start">
                            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-blue-800">智能环境感知</h4>
                                <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                                    坐标上海，今日{MOCK_WEATHER.temp}°C，{MOCK_WEATHER.condition}。AI 已为您排除不适合天气的单品。
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mode: Custom */}
                {mode === 'CUSTOM' && (
                    <div className="space-y-4 animate-fadeIn">
                        <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-start">
                            <Wand2 className="w-5 h-5 text-purple-600 mt-0.5 mr-2 flex-shrink-0" />
                            <div>
                                <h3 className="text-sm font-bold text-purple-900">指定必选单品 ({selectedCustomIds.length}/3)</h3>
                                <p className="text-xs text-purple-700 mt-1">选定您想穿的衣服，AI 会自动补全剩余搭配。</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {wardrobe.filter(i => i.status === ItemStatus.OWNED).map(item => (
                                <div key={item.id} className="relative">
                                    <WardrobeItemCard 
                                        item={item} 
                                        selected={selectedCustomIds.includes(item.id)}
                                        onSelect={() => toggleCustomSelection(item.id)}
                                    />
                                    {selectedCustomIds.includes(item.id) && (
                                        <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full p-1 shadow-sm z-10">
                                            <Check className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mode: Pre-Buy */}
                {mode === 'PRE_BUY' && (
                    <div className="space-y-6 animate-fadeIn">
                        {/* Sub-Tabs */}
                        <div className="flex space-x-4 border-b border-gray-100 pb-2">
                            <button 
                                onClick={() => setPreBuySource('WISHLIST')}
                                className={`text-sm font-medium pb-2 relative ${preBuySource === 'WISHLIST' ? 'text-gray-900' : 'text-gray-400'}`}
                            >
                                愿望单选款
                                {preBuySource === 'WISHLIST' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full"></span>}
                            </button>
                            <button 
                                onClick={() => setPreBuySource('EXTERNAL')}
                                className={`text-sm font-medium pb-2 relative ${preBuySource === 'EXTERNAL' ? 'text-gray-900' : 'text-gray-400'}`}
                            >
                                外部录入
                                {preBuySource === 'EXTERNAL' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 rounded-full"></span>}
                            </button>
                        </div>

                        {preBuySource === 'WISHLIST' ? (
                            <div className="grid grid-cols-2 gap-3">
                                {wardrobe.filter(i => i.status === ItemStatus.WISHLIST).map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => setSelectedWishlistItem(item)}
                                        className={`relative rounded-xl overflow-hidden aspect-[3/4] cursor-pointer transition-all ${selectedWishlistItem?.id === item.id ? 'ring-2 ring-accent-500 scale-95 shadow-md' : 'opacity-80'}`}
                                    >
                                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                                        <div className="absolute top-2 left-2 bg-white/90 text-[10px] px-2 py-0.5 rounded font-medium">
                                            {item.category}
                                        </div>
                                    </div>
                                ))}
                                {wardrobe.filter(i => i.status === ItemStatus.WISHLIST).length === 0 && (
                                    <div className="col-span-2 py-8 text-center text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-xl">
                                        愿望单空空如也
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Link Input */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">粘贴商品链接</label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="text"
                                            value={externalLink}
                                            onChange={(e) => setExternalLink(e.target.value)}
                                            placeholder="https://taobao.com/item..."
                                            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 text-sm focus:ring-2 focus:ring-accent-100 outline-none transition-shadow"
                                        />
                                    </div>
                                </div>

                                {/* OR Divider */}
                                <div className="flex items-center text-xs text-gray-400">
                                    <div className="flex-1 h-px bg-gray-100"></div>
                                    <span className="px-2">或者</span>
                                    <div className="flex-1 h-px bg-gray-100"></div>
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block">上传图片截图</label>
                                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 transition-colors hover:bg-gray-50 relative group">
                                        <input 
                                            type="file" 
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                        />
                                        {externalImage ? (
                                            <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
                                                <img src={externalImage} className="w-full h-full object-contain" />
                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center text-white text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                    点击更换
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                                    <ImageIcon className="w-6 h-6 text-gray-400" />
                                                </div>
                                                <span className="text-xs">点击上传或拖拽图片</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Floating Generate Button */}
            <div className="absolute bottom-24 left-6 right-6 z-20">
                <button 
                    onClick={handleGenerate}
                    disabled={
                        (mode === 'PRE_BUY' && preBuySource === 'WISHLIST' && !selectedWishlistItem) ||
                        (mode === 'PRE_BUY' && preBuySource === 'EXTERNAL' && !externalLink && !externalImage)
                    }
                    className={`w-full font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center ${
                        (mode === 'PRE_BUY' && preBuySource === 'WISHLIST' && !selectedWishlistItem) ||
                        (mode === 'PRE_BUY' && preBuySource === 'EXTERNAL' && !externalLink && !externalImage)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-gray-900 text-white active:scale-95 shadow-gray-400/50'
                    }`}
                >
                    <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                    {mode === 'PRE_BUY' ? '生成试穿评估' : '开始生成搭配'}
                </button>
            </div>
        </div>
      )
  }

  if (step === 'CONFIG') {
    return (
      <div className="px-6 py-6 h-full relative">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">AI 试衣间</h1>
        {renderConfig()}
      </div>
    );
  }

  if (step === 'GENERATING') {
    return (
        <div className="h-full flex flex-col items-center justify-center p-6 pb-32">
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-accent-500 rounded-full border-t-transparent animate-spin"></div>
                <Sparkles className="absolute inset-0 m-auto text-accent-500 w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 text-center mb-2">
                {mode === 'PRE_BUY' ? '正在评估购买价值...' : 'AI 思考中'}
            </h3>
            <p className="text-gray-500 text-sm animate-pulse-fast text-center max-w-[200px]">{loadingText}</p>
        </div>
    );
  }

  // Result View
  return (
    <div className="h-full flex flex-col relative bg-gray-50">
        <div className="h-[55%] bg-white relative overflow-hidden">
             <div className="absolute inset-0 p-8 grid grid-cols-2 gap-4 content-center">
                {generatedOutfit?.items.map((item, index) => (
                    <div key={item.id} className={`bg-gray-50 rounded-xl overflow-hidden shadow-sm relative transition-all hover:scale-[1.02] ${index === 0 ? 'col-span-2 aspect-video' : 'aspect-square'}`}>
                        <img src={item.imageUrl} alt={item.category} className="w-full h-full object-cover" />
                        {/* Tag Pre-buy item */}
                        {item.status === ItemStatus.WISHLIST && (
                            <div className="absolute top-2 right-2 bg-accent-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg animate-pulse">
                                新品试穿
                            </div>
                        )}
                        {/* Tag Locked item */}
                        {item.status === ItemStatus.OWNED && mode === 'CUSTOM' && selectedCustomIds.includes(item.id) && (
                            <div className="absolute top-2 left-2 bg-gray-900/80 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm">
                                必选
                            </div>
                        )}
                    </div>
                ))}
             </div>
             <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
        </div>

        <div className="flex-1 bg-white rounded-t-3xl -mt-6 relative z-10 px-6 pt-8 pb-24 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">
                        {mode === 'PRE_BUY' ? '购买评估报告' : (mode === 'CUSTOM' ? '专属混搭方案' : selectedOccasion + '精选')}
                    </h2>
                    <div className="flex items-center space-x-2 mt-1">
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">匹配度: {generatedOutfit?.score}%</span>
                    </div>
                </div>
                {/* Apply Button */}
                <button 
                    onClick={handleApplyOutfit}
                    disabled={isApplied}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center shadow-lg ${isApplied ? 'bg-green-100 text-green-600' : 'bg-gray-900 text-white active:scale-95'}`}
                >
                    {isApplied ? (
                        <>
                            <Check className="w-3 h-3 mr-1" />
                            已穿上
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3 h-3 mr-1 text-yellow-300" />
                            今天穿这套
                        </>
                    )}
                </button>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-6">
                {generatedOutfit?.reasoning}
            </p>

            <div className="flex items-center justify-between gap-4">
                <button 
                    onClick={() => setStep('CONFIG')}
                    className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-medium flex items-center justify-center hover:bg-gray-50"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {mode === 'PRE_BUY' ? '换一件搭配' : '重试'}
                </button>
                <div className="flex gap-2">
                     <button className="p-3 bg-gray-900 text-white rounded-xl shadow-lg hover:bg-gray-800">
                        <ThumbsUp className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
};