import { forwardRef } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, onKeyDown },
  ref
) {
  return (
    <div className="qs-fluent-search-bar">
      <div className="qs-fluent-prompt-icon">
        <ChevronRight size={22} className="text-sky-400 font-bold" />
      </div>
      <input
        ref={ref}
        className="qs-fluent-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type to search files, apps, OCR, web..."
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoFocus
      />
      {value ? (
        <button
          type="button"
          className="qs-fluent-clear-btn"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={16} />
        </button>
      ) : (
        <div className="qs-fluent-tag">
          <Search size={13} className="mr-1" />
          <span>Recall</span>
        </div>
      )}
    </div>
  );
});

export default SearchInput;
