import { useState, useCallback } from 'react';
import { Search as SearchIcon, FileText, Image, StickyNote, Layers, Globe, Youtube, Calculator, Check, Copy } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import FileCard from '@/components/FileCard';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import type { SearchResult, PaginatedResponse } from '@/services/api';

type FilterType = 'all' | 'image' | 'pdf' | 'note';

const filterOptions: { label: string; value: FilterType; icon: React.ReactNode }[] = [
  { label: 'All', value: 'all', icon: <Layers size={15} /> },
  { label: 'Images', value: 'image', icon: <Image size={15} /> },
  { label: 'PDFs', value: 'pdf', icon: <FileText size={15} /> },
  { label: 'Notes', value: 'note', icon: <StickyNote size={15} /> },
];

function Search() {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [copied, setCopied] = useState(false);

  // Safe client-side math calculation preview for instant feedback
  const calcResult = (() => {
    const q = query.trim();
    if (!q) return null;
    const sanitized = q.replace(/^(?:calc(?:ulate)?|=|what\s+is\s+|eval(?:uate)?\s+)/i, '').trim();
    // percentage: "15% of 850"
    const pct = sanitized.match(/^(\d+(?:\.\d+)?)\s*%\s*(?:of|\*)\s*(\d+(?:\.\d+)?)$/i);
    if (pct) {
      const res = (parseFloat(pct[1]) / 100) * parseFloat(pct[2]);
      return { expr: q, display: Number.isInteger(res) ? String(res) : res.toLocaleString() };
    }
    // simple arithmetic e.g. "25*40", "1200 / 12"
    if (/^[0-9\s+\-*/().^%]+$/.test(sanitized) && /[+\-*/^%]/.test(sanitized)) {
      try {
        const clean = sanitized.replace(/\^/g, '**');
        // eslint-disable-next-line no-eval
        const val = Function(`'use strict'; return (${clean})`)();
        if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
          return { expr: q, display: Number.isInteger(val) ? String(val) : val.toLocaleString() };
        }
      } catch {
        /* ignore invalid syntax */
      }
    }
    return null;
  })();

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
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Search</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Fast OCR and full-text search across all screenshots, documents, and notes
        </p>
      </div>

      {/* Search input */}
      <SearchBar
        placeholder="Type to search content, text in images, notes, or file names…"
        onSearch={handleSearch}
        className="max-w-2xl"
      />

      {/* Filter pills */}
      <div className="flex gap-2">
        {filterOptions.map((filter) => {
          const isActive = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`liquid-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                  : 'bg-white/80 hover:bg-white text-slate-600 border border-white/80 shadow-sm'
              }`}
            >
              {filter.icon}
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Local AI Calculation Card */}
      {calcResult && (
        <div className="liquid-card p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border border-emerald-200/60 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
              <Calculator size={20} />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Local AI · Calculator</p>
              <p className="text-xl font-bold text-slate-900 tracking-tight">= {calcResult.display}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard.writeText(calcResult.display);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="liquid-btn px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-emerald-200/60 text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      )}

      {/* Quick Web Actions when typing search queries */}
      {hasQuery && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              const ytQuery = query.replace(/^(?:search\s+youtube\s*(?:for)?|youtube\s*:?|yt\s*:?)\s*/i, '').trim() || query;
              const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`;
              if (window.recall?.shell?.openExternal) {
                void window.recall.shell.openExternal(url);
              } else {
                window.open(url, '_blank');
              }
            }}
            className="liquid-btn inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200/60 rounded-xl text-xs font-medium transition-all"
          >
            <Youtube size={15} className="text-red-600" />
            <span>Search <strong>"{query.replace(/^(?:search\s+youtube\s*(?:for)?|youtube\s*:?|yt\s*:?)\s*/i, '').trim() || query}"</strong> on YouTube</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const gQuery = query.replace(/^(?:search\s+google\s*(?:for)?|google\s*:?|g\s*:?)\s*/i, '').trim() || query;
              const url = `https://www.google.com/search?q=${encodeURIComponent(gQuery)}`;
              if (window.recall?.shell?.openExternal) {
                void window.recall.shell.openExternal(url);
              } else {
                window.open(url, '_blank');
              }
            }}
            className="liquid-btn inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/60 rounded-xl text-xs font-medium transition-all"
          >
            <Globe size={15} className="text-blue-600" />
            <span>Search on Google</span>
          </button>
        </div>
      )}

      {/* Results */}
      {!hasQuery && (
        <div className="liquid-card flex flex-col items-center justify-center py-20 text-center rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-violet-100/70 flex items-center justify-center mb-4 text-violet-600 shadow-sm">
            <SearchIcon size={28} />
          </div>
          <p className="text-base text-slate-800 font-semibold">Ready to search</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Recall searches deep inside text, images via Tesseract OCR, and scanned pages in PDFs.
          </p>
        </div>
      )}

      {hasQuery && loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 liquid-card rounded-2xl animate-pulse"
            />
          ))}
        </div>
      )}

      {hasQuery && error && (
        <div className="liquid-card rounded-2xl p-8 text-center">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
        </div>
      )}

      {hasQuery && !loading && !error && results && results.items.length === 0 && (
        <div className="liquid-card flex flex-col items-center justify-center py-16 text-center rounded-3xl p-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-3 text-slate-400">
            <SearchIcon size={24} />
          </div>
          <p className="text-base text-slate-800 font-semibold">No results found</p>
          <p className="text-xs text-slate-500 mt-1">
            Try adjusting your search terms or selecting a different filter.
          </p>
        </div>
      )}

      {hasQuery && !loading && !error && results && results.items.length > 0 && (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold text-slate-500 px-1 mb-1">
            {results.total} match{results.total !== 1 ? 'es' : ''} found
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
