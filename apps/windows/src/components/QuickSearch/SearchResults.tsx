import SearchResultItem, { type QuickHit } from './SearchResultItem';

interface Props {
  hits: QuickHit[];
  query: string;
  activeIndex: number;
  onSelect: (hit: QuickHit) => void;
  onHover: (index: number) => void;
}

function SearchResults({ hits, query, activeIndex, onSelect, onHover }: Props) {
  return (
    <div className="qs-results" role="listbox">
      {hits.map((hit, index) => (
        <SearchResultItem
          key={`${hit.file_id}-${index}`}
          hit={hit}
          query={query}
          active={index === activeIndex}
          onSelect={() => onSelect(hit)}
          onHover={() => onHover(index)}
        />
      ))}
    </div>
  );
}

export default SearchResults;
