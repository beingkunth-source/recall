import { useState, useCallback } from 'react';
import { Search as SearchIcon, FileText, Image, StickyNote, Layers } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import FileCard from '@/components/FileCard';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import type { SearchResult, PaginatedResponse } from '@/services/api';

type FilterType = 'all' | 'image' | 'pdf' | 'note';

const filterOptions: { label: string; value: FilterType; icon: React.ReactNode }[] = [
  { label: 'All', value: 'all', icon: <Layers size={16} /> },
  { label: 'Images', value: 'image', icon: <Image size={16} /> },
  { label: 'PDFs', value: 'pdf', icon: <FileText size={16} /> },
  { label: 'Notes', value: 'note', icon: <StickyNote size={16} /> },
];

function Search() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
  }, []);

  const {
    data: results,
    loading,
    error,
  } = useApi<PaginatedResponse<SearchResult>>(
    useCallback(() => {
      if (!query.trim()) {
        return Promise.resolve({ items: [], total: 0, page: 1, page_size: 20 });
      }
      const params: Record<string, string> = {};
      if (activeFilter !== 'all') {
        params.file_type = activeFilter;
      }
      return api.search(query, params);
    }, [query, activeFilter]),
    [query, activeFilter]
  );

  const hasQuery = query.trim().length > 0;

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Search</h1>
        <p className="text-sm text-muted mt-1">
          Search across all your indexed files
        </p>
      </div>

      {/* Search input */}
      <SearchBar
        placeholder="Search files, text, notes..."
        onSearch={handleSearch}
        className="max-w-2xl"
      />

      {/* Filter buttons */}
      <div className="flex gap-2">
        {filterOptions.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-default ${
              activeFilter === filter.value
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {filter.icon}
            {filter.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {!hasQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <SearchIcon size={28} className="text-muted" />
          </div>
          <p className="text-sm text-slate-600 font-medium">
            Start typing to search
          </p>
          <p className="text-xs text-muted mt-1">
            Search through your files, images, PDFs, and notes
          </p>
        </div>
      )}

      {hasQuery && loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[72px] bg-slate-50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {hasQuery && error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {hasQuery && !loading && !error && results && results.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <SearchIcon size={24} className="text-muted" />
          </div>
          <p className="text-sm text-slate-600 font-medium">
            No results found
          </p>
          <p className="text-xs text-muted mt-1">
            Try a different search term or filter
          </p>
        </div>
      )}

      {hasQuery && !loading && !error && results && results.items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted mb-2">
            {results.total} result{results.total !== 1 ? 's' : ''} found
          </p>
          {results.items.map((result, index) => (
            <FileCard
              key={`${result.file.id}-${index}`}
              filename={result.file.filename}
              fileType={result.file.file_type}
              fileSize={result.file.file_size}
              date={result.file.created_at}
              status={result.file.status}
              snippet={result.snippet}
              filePath={result.file.file_path}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Search;
