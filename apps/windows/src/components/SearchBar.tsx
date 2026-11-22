import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
}

function SearchBar({
  placeholder = 'Search your files...',
  onSearch,
  className = '',
}: SearchBarProps) {
  const [value, setValue] = useState('');
  const debouncedValue = useDebounce(value, 300);

  useEffect(() => {
    onSearch(debouncedValue);
  }, [debouncedValue, onSearch]);

  const handleClear = useCallback(() => {
    setValue('');
  }, []);

  return (
    <div className={`relative group ${className}`}>
      {/* Liquid background glow aura */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500/20 via-indigo-500/10 to-teal-500/20 rounded-[20px] blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex items-center w-full">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-600 group-focus-within:scale-110 transition-all duration-300 ease-out pointer-events-none"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full h-13 py-3.5 pl-12 pr-12 bg-white/85 backdrop-blur-xl border border-white/90 rounded-2xl text-[14.5px] font-medium text-slate-800 placeholder:text-slate-400/90 shadow-[0_8px_32px_-4px_rgba(124,58,237,0.06),inset_0_1px_1px_rgba(255,255,255,0.9)] focus:outline-none focus:bg-white focus:border-violet-300 focus:ring-4 focus:ring-violet-500/15 focus:shadow-[0_16px_48px_-6px_rgba(124,58,237,0.18)] transition-all duration-300 ease-out"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="liquid-btn absolute right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-200/70 hover:bg-violet-100 flex items-center justify-center text-slate-500 hover:text-violet-700 transition-all duration-200 hover:scale-110 active:scale-90 shadow-sm"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
