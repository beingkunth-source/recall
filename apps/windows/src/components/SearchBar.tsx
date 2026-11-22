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
      <Search
        size={19}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-violet-500 transition-colors pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-11 bg-white/75 backdrop-blur-md border border-white/80 rounded-2xl text-sm font-medium text-slate-800 placeholder:text-slate-400 shadow-[0_4px_24px_rgba(124,58,237,0.05)] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 focus:bg-white transition-all duration-200"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="liquid-btn absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200/60 hover:bg-slate-300/80 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
