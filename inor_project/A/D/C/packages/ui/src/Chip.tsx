'use client';
import { useRef, useState } from 'react';
import { cn } from '@yt/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
}

interface ChipBarProps {
  chips: { id: string; label: string }[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  className?: string;
}

export function Chip({ label, selected, onClick }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'bg-white text-black'
          : 'bg-[#272727] text-white hover:bg-[#3a3a3a]',
      )}
    >
      {label}
    </button>
  );
}

export function ChipBar({ chips, selectedId, onSelect, className }: ChipBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 1);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 200;
    scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className={cn('relative', className)}>
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-[#0f0f0f] to-transparent flex items-center justify-start pl-1"
        >
          <ChevronLeft className="text-white" size={20} />
        </button>
      )}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-2 px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            label={chip.label}
            selected={chip.id === selectedId}
            onClick={() => onSelect?.(chip.id)}
          />
        ))}
      </div>
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-[#0f0f0f] to-transparent flex items-center justify-end pr-1"
        >
          <ChevronRight className="text-white" size={20} />
        </button>
      )}
    </div>
  );
}
