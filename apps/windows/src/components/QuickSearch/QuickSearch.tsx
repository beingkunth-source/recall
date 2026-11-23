import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';
import FluidCanvas from './FluidCanvas';
import type { QuickHit } from './SearchResultItem';
import './QuickSearch.css';

interface QuickSearchResponse {
  results?: QuickHit[];
  total?: number;
  query?: string;
  took_ms?: number;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'image', label: 'Images' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'note', label: 'Notes' },
  { id: 'folder', label: 'Folders' },
  { id: 'web', label: 'Web' },
];

function QuickSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [rawHits, setRawHits] = useState<QuickHit[]>([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const focusInput = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
  }, []);

  useEffect(() => {
    document.documentElement.style.background = 'transparent';
    document.body.style.background = 'transparent';
    const root = document.getElementById('root');
    if (root) root.style.background = 'transparent';
    focusInput();

    const offFocus = window.recall?.quickSearch?.onFocus?.(() => {
      focusInput();
    });
    const offClear = window.recall?.quickSearch?.onClear?.(() => {
      setQuery('');
      setRawHits([]);
      setError(null);
      setActiveIndex(0);
    });

    return () => {
      offFocus?.();
      offClear?.();
    };
  }, [focusInput]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setRawHits([]);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        let results: QuickHit[] = [];

        if (!window.recall?.quickSearch?.query) {
          const res = await fetch(
            `http://127.0.0.1:8000/search/quick?${new URLSearchParams({ q, limit: '12' })}`
          );
          if (res.ok) {
            const data = (await res.json()) as QuickSearchResponse;
            results = (data.results || []) as QuickHit[];
          }
        } else {
          const data = (await window.recall.quickSearch.query(q)) as QuickSearchResponse;
          results = (data?.results || []) as QuickHit[];
        }

        if (id !== requestId.current) return;

        // Spotlight smart action hits
        const smartActions: QuickHit[] = [];

        // 1. Math calculation preview
        const sanitizedMath = q.replace(/^(?:calc(?:ulate)?|=|eval(?:uate)?\s+)/i, '').trim();
        if (/^[0-9\s+\-*/().^%]+$/.test(sanitizedMath) && /[+\-*/^%]/.test(sanitizedMath)) {
          try {
            // eslint-disable-next-line no-eval
            const val = Function(`'use strict'; return (${sanitizedMath.replace(/\^/g, '**')})`)();
            if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) {
              smartActions.push({
                file_id: 'action-calc',
                filename: `${val.toLocaleString()}`,
                file_type: 'calc',
                content_snippet: `${sanitizedMath} = ${val}`,
                content_type: 'calc',
                local_path: String(val),
              });
            }
          } catch {
            /* ignore invalid syntax */
          }
        }

        // 2. Google Search
        smartActions.push({
          file_id: 'action-google',
          filename: `Google Search: "${q}"`,
          file_type: 'google',
          content_snippet: `Search for "${q}" on Google`,
          content_type: 'web',
          local_path: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        });

        // 3. YouTube Search
        smartActions.push({
          file_id: 'action-yt',
          filename: `YouTube: "${q}"`,
          file_type: 'youtube',
          content_snippet: `Watch videos for "${q}" on YouTube`,
          content_type: 'web',
          local_path: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        });

        setRawHits([...results, ...smartActions]);
        setActiveIndex(0);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'Search error');
        setRawHits([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 80);

    return () => window.clearTimeout(timer);
  }, [query]);

  // Filter hits based on selected category
  const filteredHits = useMemo(() => {
    if (activeCategory === 'all') return rawHits;
    if (activeCategory === 'web') {
      return rawHits.filter((h) => h.file_type === 'web' || h.file_type === 'google' || h.file_type === 'youtube');
    }
    return rawHits.filter((h) => h.file_type === activeCategory);
  }, [rawHits, activeCategory]);

  const openHit = useCallback(async (hit: QuickHit) => {
    try {
      if (hit.file_type === 'youtube' || hit.file_type === 'web' || hit.file_type === 'google' || hit.local_path.startsWith('http')) {
        if (window.recall?.shell?.openExternal) {
          await window.recall.shell.openExternal(hit.local_path);
        } else {
          window.open(hit.local_path, '_blank');
        }
        await window.recall?.quickSearch?.hide?.();
        return;
      }

      if (hit.file_type === 'calc') {
        await navigator.clipboard.writeText(hit.local_path);
        await window.recall?.quickSearch?.hide?.();
        return;
      }

      if (window.recall?.quickSearch?.open) {
        await window.recall.quickSearch.open(hit.local_path);
      } else {
        window.open(
          `http://127.0.0.1:8000/files/${encodeURIComponent(hit.file_id)}/content`,
          '_blank'
        );
      }
    } catch {
      /* ignore open errors */
    }
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      void window.recall?.quickSearch?.hide?.();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(filteredHits.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = filteredHits[activeIndex];
      if (hit) void openHit(hit);
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const currentIndex = CATEGORIES.findIndex((c) => c.id === activeCategory);
      const nextIndex = (currentIndex + 1) % CATEGORIES.length;
      setActiveCategory(CATEGORIES[nextIndex].id);
    }
  };

  return (
    <div className="spotlight-root">
      <div className="spotlight-card">
        {/* 144Hz Liquid Ice-Cyan Fluid Underlayer */}
        <FluidCanvas isSearching={loading || Boolean(query.trim())} className="spotlight-fluid" />

        {/* Top Search Bar */}
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          onKeyDown={onKeyDown}
          hasMatch={filteredHits.length > 0}
        />

        {/* Category Filter Pills (macOS Spotlight style) */}
        <div className="spotlight-pills-row">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`spotlight-pill${activeCategory === cat.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className={`spotlight-divider${loading ? ' loading' : ''}`} />

        {/* Results Area */}
        <div className="spotlight-body">
          {error && <div className="spotlight-msg error">{error}</div>}

          {query.trim() && loading && filteredHits.length === 0 && (
            <div className="spotlight-msg">Searching…</div>
          )}

          {query.trim() && !loading && filteredHits.length === 0 && !error && (
            <div className="spotlight-msg">No results for “{query.trim()}”</div>
          )}

          {!query.trim() && (
            <div className="spotlight-initial">
              <p className="spotlight-hint-title">Search Spotlight</p>
              <p className="spotlight-hint-sub">
                Search text in local images (OCR), scanned PDFs, notes, and web
              </p>
            </div>
          )}

          {filteredHits.length > 0 && (
            <SearchResults
              hits={filteredHits}
              query={query.trim()}
              activeIndex={activeIndex}
              onSelect={(hit) => void openHit(hit)}
              onHover={setActiveIndex}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickSearch;
