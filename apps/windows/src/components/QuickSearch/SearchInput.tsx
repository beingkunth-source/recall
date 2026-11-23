import { forwardRef } from 'react';
import { Search, X, Box } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  hasMatch?: boolean;
}

const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, onKeyDown, hasMatch },
  ref
) {
  return (
    <div className="spotlight-input-row">
      <Search size={22} className="spotlight-search-icon" />
      <div className="spotlight-input-wrapper">
        <input
          ref={ref}
          className="spotlight-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Spotlight Search"
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoFocus
        />
        {value.trim() && hasMatch && (
          <span className="spotlight-inline-badge">— Open</span>
        )}
      </div>
      {value ? (
        <button
          type="button"
          className="spotlight-clear-btn"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={15} />
        </button>
      ) : (
        <div className="spotlight-cube-icon" title="Spotlight Engine">
          <Box size={18} />
        </div>
      )}
    </div>
  );
});

export default SearchInput;
