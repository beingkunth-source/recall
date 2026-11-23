import { forwardRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSubmit?: () => void;
}

const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, onKeyDown, onSubmit },
  ref
) {
  return (
    <div className="qs-input-pill-wrapper">
      <div className="qs-input-pill">
        <Search size={19} className="qs-pill-search-icon" />
        <input
          ref={ref}
          className="qs-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search files, OCR, notes, apps..."
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
        />
        {value ? (
          <button
            type="button"
            className="qs-pill-circle-btn"
            aria-label="Clear search"
            onClick={() => onChange('')}
          >
            <X size={15} />
          </button>
        ) : (
          <button
            type="button"
            className="qs-pill-circle-btn"
            aria-label="Submit search"
            onClick={onSubmit}
          >
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
});

export default SearchInput;
