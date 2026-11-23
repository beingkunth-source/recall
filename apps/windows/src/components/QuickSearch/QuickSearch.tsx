import { useCallback, useEffect, useRef, useState } from 'react';
import recallLogo from '@/assets/recall-logo.png';
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
          const res = await fetch(
            `http://127.0.0.1:8000/search/quick?${new URLSearchParams({ q, limit: '8' })}`
          );
          if (!res.ok) throw new Error(`Search failed (${res.status})`);
          const data = (await res.json()) as QuickSearchResponse;
          if (id !== requestId.current) return;
          const rawHits = (data.results || []) as QuickHit[];
          const webActions: QuickHit[] = [];

          const ytMatch = q.match(/^(?:search\s+youtube\s*(?:for)?|youtube\s*:?|yt\s*:?)\s*(.+)$/i);
          if (ytMatch && ytMatch[1].trim()) {
            const ytQuery = ytMatch[1].trim();
            webActions.push({
              file_id: 'action-yt',
              filename: `Search YouTube: "${ytQuery}"`,
              file_type: 'youtube',
              content_snippet: `Open YouTube search for "${ytQuery}" in default browser`,
              content_type: 'web',
              local_path: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`,
            });
          }

          setHits([...webActions, ...rawHits]);
          setActiveIndex(0);
          setTookMs(typeof data.took_ms === 'number' ? data.took_ms : null);
        } else {
          const data = (await window.recall.quickSearch.query(q)) as QuickSearchResponse;
          if (id !== requestId.current) return;
          const rawHits = (data?.results || []) as QuickHit[];
          const webActions: QuickHit[] = [];

          const ytMatch = q.match(/^(?:search\s+youtube\s*(?:for)?|youtube\s*:?|yt\s*:?)\s*(.+)$/i);
          if (ytMatch && ytMatch[1].trim()) {
            const ytQuery = ytMatch[1].trim();
            webActions.push({
              file_id: 'action-yt',
              filename: `Search YouTube: "${ytQuery}"`,
              file_type: 'youtube',
              content_snippet: `Open YouTube search for "${ytQuery}" in default browser`,
              content_type: 'web',
              local_path: `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`,
            });
          }

          setHits([...webActions, ...rawHits]);
          setActiveIndex(0);
          setTookMs(typeof data?.took_ms === 'number' ? data.took_ms : null);
        }
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'Search error');
        setHits([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [query]);

  const openHit = useCallback(async (hit: QuickHit) => {
    setOpenError(null);
    try {
      if (hit.file_type === 'youtube' || hit.local_path.startsWith('http')) {
        if (window.recall?.shell?.openExternal) {
          await window.recall.shell.openExternal(hit.local_path);
        } else {
          window.open(hit.local_path, '_blank');
        }
        await window.recall?.quickSearch?.hide?.();
        return;
      }

      if (!window.recall?.quickSearch?.open) {
        window.open(
          `http://127.0.0.1:8000/files/${encodeURIComponent(hit.file_id)}/content`,
          '_blank'
        );
        return;
      }
      const res = await window.recall.quickSearch.open(hit.local_path);
      if (!res.ok) {
        setOpenError(res.error || 'Failed to open file');
      }
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : 'Failed to open');
    }
  }, []);

  const handleOpenMainApp = useCallback(() => {
    if (window.recall?.app?.showMain) {
      void window.recall.app.showMain();
      void window.recall.quickSearch?.hide?.();
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
      if (hit) {
        void openHit(hit);
      } else if (!query.trim()) {
        handleOpenMainApp();
      }
    }
  };

  return (
    <div className="qs-root">
      <div className="qs-panel">
        {/* Real-time WebGL Volumetric Fluid / Smoke Caustics */}
        <FluidCanvas />

        <div className="qs-content-wrap">
          <div className="qs-brand">
            <img
              src={recallLogo}
              alt=""
              className="qs-brand-logo"
              draggable={false}
            />
            <span className="qs-brand-text">Recall</span>
          </div>

          {!query.trim() && (
            <div className="qs-hero">
              <h1 className="qs-headline">
                Search anything across your PC
              </h1>
            </div>
          )}

          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            onKeyDown={onKeyDown}
            onSubmit={() => {
              const hit = hits[activeIndex];
              if (hit) void openHit(hit);
            }}
          />

          {!query.trim() && (
            <div className="qs-initial-state">
              <button
                type="button"
                className="qs-dark-action-pill"
                onClick={handleOpenMainApp}
              >
                <span>Open Recall Workspace</span>
              </button>
              <p className="qs-subtext">
                We'll search your local screenshots, scanned PDFs, OCR text, and notes without sending data to any external server.
              </p>
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

          {hits.length > 0 && (
            <div className="qs-subtle-status">
              <span>{hits.length} result{hits.length === 1 ? '' : 's'}</span>
              {tookMs != null && <span>{Math.round(tookMs)}ms</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickSearch;
