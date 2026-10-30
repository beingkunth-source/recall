import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useEffect } from 'react';

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
    <div className={`relative ${className}`}>
      <Search
        size={18}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-10 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-default"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-slate-700 transition-default"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default SearchBar;
