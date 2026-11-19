import { useCallback, useEffect, useRef, useState } from 'react';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';
import type { QuickHit } from './SearchResultItem';
import './QuickSearch.css';

interface QuickSearchResponse {
  results?: QuickHit[];
  total?: number;
  query?: string;
  took_ms?: number;
}

function QuickSearch() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<QuickHit[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tookMs, setTookMs] = useState<number | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);
  const requestId = useRef(0);

  const focusInput = useCallback(() => {
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
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
      setHits([]);
      setError(null);
      setOpenError(null);
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
      setHits([]);
      setError(null);
      setTookMs(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        if (!window.recall?.quickSearch?.query) {
          // Fallback to HTTP when running outside Electron preload path
          const res = await fetch(
            `http://127.0.0.1:8000/search/quick?${new URLSearchParams({ q, limit: '10' })}`
          );
          if (!res.ok) throw new Error(`Search failed (${res.status})`);
          const data = (await res.json()) as QuickSearchResponse;
          if (id !== requestId.current) return;
          setHits(data.results || []);
          setTookMs(data.took_ms ?? null);
          setActiveIndex(0);
        } else {
          const data = (await window.recall.quickSearch.query(q)) as QuickSearchResponse;
          if (id !== requestId.current) return;
          setHits(data.results || []);
          setTookMs(data.took_ms ?? null);
          setActiveIndex(0);
        }
      } catch (err) {
        if (id !== requestId.current) return;
        setHits([]);
        setError(
          err instanceof Error
            ? err.message.includes('fetch') || err.message.includes('Failed')
              ? 'Search unavailable — is the Recall backend running?'
              : err.message
            : 'Search failed'
        );
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query]);

  const openHit = useCallback(async (hit: QuickHit) => {
    setOpenError(null);
    if (!hit.local_path || hit.local_path.startsWith('note://')) {
      setOpenError('This item has no openable file path');
      return;
    }
    if (window.recall?.quickSearch?.open) {
      const result = await window.recall.quickSearch.open(hit.local_path);
      if (!result.ok) {
        setOpenError(result.error || 'Could not open file');
      }
      return;
    }
    if (window.recall?.shell?.openPath) {
      const err = await window.recall.shell.openPath(hit.local_path);
      if (err) setOpenError(err);
    }
  }, []);

  const hide = useCallback(() => {
    void window.recall?.quickSearch?.hide?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const hit = hits[activeIndex];
      if (hit) void openHit(hit);
    }
  };

  return (
    <div className="qs-root">
      <div className="qs-panel">
        <div className="qs-brand">
          <img
            src="/recall-logo.png"
            alt=""
            className="qs-brand-logo"
            draggable={false}
          />
          <span className="qs-brand-text">Recall</span>
        </div>

        <SearchInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          onKeyDown={onKeyDown}
        />

        {!query.trim() && (
          <div className="qs-hint">
            Search indexed files, OCR text, PDFs, and notes
          </div>
        )}

        {query.trim() && loading && hits.length === 0 && !error && (
          <div className="qs-hint">Searching…</div>
        )}

        {error && <div className="qs-error">{error}</div>}
        {openError && <div className="qs-error">{openError}</div>}

        {query.trim() && !loading && !error && hits.length === 0 && (
          <div className="qs-empty">No results for “{query.trim()}”</div>
        )}

        {hits.length > 0 && (
          <SearchResults
            hits={hits}
            query={query.trim()}
            activeIndex={activeIndex}
            onSelect={(hit) => void openHit(hit)}
            onHover={setActiveIndex}
          />
        )}

        <div className="qs-footer">
          <span>
            <span className="qs-kbd">↑↓</span> navigate
            <span className="qs-kbd">Enter</span> open
            <span className="qs-kbd">Esc</span> close
          </span>
          <span>
            {tookMs != null ? `${Math.round(tookMs)} ms` : ''}
            {hits.length > 0 ? ` · ${hits.length} results` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

export default QuickSearch;
