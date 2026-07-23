import React from 'react';
import { ClothingItem } from '../types';
import { Heart } from 'lucide-react';

interface Props {
  item: ClothingItem;
  onSelect?: (item: ClothingItem) => void;
  selected?: boolean;
}

export const WardrobeItemCard: React.FC<Props> = ({ item, onSelect, selected }) => {
  return (
    <div 
      className={`relative group rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200 aspect-[3/4] cursor-pointer ${selected ? 'ring-2 ring-primary-500' : ''}`}
      onClick={() => onSelect && onSelect(item)}
    >
      <img 
        src={item.imageUrl} 
        alt={item.category} 
        className="w-full h-full object-cover"
      />
      
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      {/* Tag Badge */}
      <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium text-gray-600 shadow-sm">
        {item.category}
      </div>

      {/* Stats/Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-2 text-white transform translate-y-full group-hover:translate-y-0 transition-transform">
        <div className="flex justify-between items-center">
            <span className="text-xs truncate">{item.tags[0]}</span>
            <Heart className="w-4 h-4 text-white hover:text-red-400" />
        </div>
      </div>
    </div>
  );
};