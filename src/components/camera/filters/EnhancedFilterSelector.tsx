
import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Filter {
  id: string;
  name: string;
  icon: string;
  preview: string;
  description: string;
}

interface EnhancedFilterSelectorProps {
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  disabled?: boolean;
}

const FILTERS: Filter[] = [
  {
    id: 'normal',
    name: 'Normal',
    icon: '📷',
    preview: '📷',
    description: 'No filter'
  },
  {
    id: 'clarendon',
    name: 'Clarendon',
    icon: '☀️',
    preview: '☀️',
    description: 'Bright & vibrant'
  },
  {
    id: 'gingham',
    name: 'Gingham',
    icon: '🌸',
    preview: '🌸',
    description: 'Soft & vintage'
  },
  {
    id: 'juno',
    name: 'Juno',
    icon: '🌊',
    preview: '🌊',
    description: 'Cool tones'
  },
  {
    id: 'lark',
    name: 'Lark',
    icon: '✨',
    preview: '✨',
    description: 'Light & airy'
  }
];

export const EnhancedFilterSelector: React.FC<EnhancedFilterSelectorProps> = ({
  activeFilter,
  onFilterChange,
  disabled = false
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    checkScrollability();
  }, []);

  const checkScrollability = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
  };

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -100, behavior: 'smooth' });
      setTimeout(checkScrollability, 300);
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 100, behavior: 'smooth' });
      setTimeout(checkScrollability, 300);
    }
  };

  const handleFilterSelect = (filterId: string) => {
    onFilterChange(filterId);
    localStorage.setItem('lastUsedFilter', filterId);
  };

  return (
    <div className="absolute bottom-36 left-4 right-4">
      <div className="relative flex items-center justify-center">
        {/* Left scroll button */}
        {canScrollLeft && (
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollLeft}
            className="absolute left-0 z-10 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronLeft size={16} />
          </Button>
        )}

        {/* Filters container */}
        <div 
          ref={scrollRef}
          className="flex items-center gap-4 overflow-x-auto scrollbar-hide px-10 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          onScroll={checkScrollability}
        >
          {FILTERS.map((filter) => (
            <Button
              key={filter.id}
              variant="ghost"
              size="sm"
              onClick={() => handleFilterSelect(filter.id)}
              disabled={disabled}
              className={`flex-shrink-0 w-14 h-14 rounded-full p-0 text-xl transition-all duration-300 ${
                activeFilter === filter.id
                  ? 'bg-white/90 scale-110 shadow-lg ring-2 ring-white/50'
                  : 'bg-black/30 hover:bg-white/40 hover:scale-105'
              }`}
            >
              <div className="flex flex-col items-center justify-center">
                <span className="text-lg leading-none">{filter.icon}</span>
                {activeFilter === filter.id && (
                  <div className="w-1 h-1 bg-blue-400 rounded-full mt-1 animate-pulse" />
                )}
              </div>
            </Button>
          ))}
        </div>

        {/* Right scroll button */}
        {canScrollRight && (
          <Button
            variant="ghost"
            size="icon"
            onClick={scrollRight}
            className="absolute right-0 z-10 w-8 h-8 rounded-full bg-black/50 text-white hover:bg-black/70"
          >
            <ChevronRight size={16} />
          </Button>
        )}
      </div>

      {/* Filter name indicator */}
      <div className="text-center mt-2">
        <span className="text-white/80 text-sm font-medium">
          {FILTERS.find(f => f.id === activeFilter)?.name || 'None'}
        </span>
      </div>
    </div>
  );
};
