'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@yt/shared';
import { Search, X, Mic } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  className?: string;
}

export function SearchBar({ onSearch, className }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubmit = useCallback((q?: string) => {
    const searchQuery = q ?? query;
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
      setSuggestions([]);
    }
  }, [query, onSearch]);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        const res = await fetch(`${apiUrl}/search/suggest?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
        }
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        setQuery(suggestions[selectedIndex]);
        handleSubmit(suggestions[selectedIndex]);
      } else {
        handleSubmit();
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
    }
  };

  return (
    <div className={cn('relative flex-1 max-w-[600px]', className)}>
      <div
        className={cn(
          'flex items-center border rounded-full overflow-hidden transition-colors',
          focused ? 'border-blue-500 bg-[#0f0f0f]' : 'border-[#3a3a3a] bg-[#0f0f0f]',
        )}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Search"
          className="flex-1 bg-transparent text-white placeholder-gray-400 px-4 py-2 outline-none text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setSuggestions([]); inputRef.current?.focus(); }}
            className="text-gray-400 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        )}
        <button
          onClick={() => handleSubmit()}
          className="px-5 py-2 bg-[#222222] hover:bg-[#3a3a3a] border-l border-[#3a3a3a] transition-colors"
        >
          <Search size={18} className="text-white" />
        </button>
      </div>
      {suggestions.length > 0 && focused && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#272727] border border-[#3a3a3a] rounded-xl shadow-2xl z-50 overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={() => { setQuery(s); handleSubmit(s); }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                i === selectedIndex ? 'bg-[#3a3a3a] text-white' : 'text-gray-300 hover:bg-[#3a3a3a]',
              )}
            >
              <Search size={16} className="text-gray-500 shrink-0" />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
