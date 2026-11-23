import { useState, useCallback, useEffect } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
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
      {/* Volumetric liquid fluid aura */}
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/25 via-indigo-400/20 to-teal-400/25 rounded-full blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />

      <div className="relative flex items-center w-full h-14 bg-white/95 backdrop-blur-2xl border border-white rounded-full px-2 pl-5 shadow-[0_12px_32px_-4px_rgba(124,58,237,0.1),inset_0_2px_3px_#ffffff,inset_0_-2px_3px_rgba(0,0,0,0.04)] group-focus-within:shadow-[0_16px_40px_-4px_rgba(124,58,237,0.22),0_0_0_3px_rgba(139,92,246,0.25)] transition-all duration-300 ease-out">
        <Search
          size={19}
          className="text-slate-400 group-focus-within:text-violet-600 group-focus-within:scale-110 transition-all duration-300 ease-out pointer-events-none mr-3 flex-shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent border-none outline-none text-[15px] font-medium text-slate-800 placeholder:text-slate-400"
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 hover:from-violet-50 hover:to-violet-100 text-slate-500 hover:text-violet-700 flex items-center justify-center transition-all duration-200 hover:scale-108 active:scale-95 shadow-sm border border-white/80 flex-shrink-0"
          >
            <X size={15} />
          </button>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 flex items-center justify-center shadow-sm border border-white/80 flex-shrink-0">
            <ArrowRight size={15} />
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchBar;
