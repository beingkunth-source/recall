import { forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  { value, onChange, onKeyDown },
  ref
) {
  return (
    <div className="qs-input-row">
      <Search size={20} />
      <input
        ref={ref}
        className="qs-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search anything..."
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
      />
      {value && (
        <button
          type="button"
          className="qs-clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
});

export default SearchInput;
