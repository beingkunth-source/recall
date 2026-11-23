import { useCallback, useEffect, useRef, useState } from 'react';
import SearchInput from './SearchInput';
import SearchResults from './SearchResults';
import PreviewPane from './PreviewPane';
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
      setHits([]);
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
      setHits([]);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    const timer = window.setTimeout(async () => {
      try {
        let rawHits: QuickHit[] = [];

        if (!window.recall?.quickSearch?.query) {
          const res = await fetch(
            `http://127.0.0.1:8000/search/quick?${new URLSearchParams({ q, limit: '10' })}`
          );
          if (res.ok) {
            const data = (await res.json()) as QuickSearchResponse;
            rawHits = (data.results || []) as QuickHit[];
          }
        } else {
          const data = (await window.recall.quickSearch.query(q)) as QuickSearchResponse;
          rawHits = (data?.results || []) as QuickHit[];
        }

        if (id !== requestId.current) return;

        // Smart fluent actions (Fluent Search style)
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
                content_snippet: `Calculated expression: ${sanitizedMath} = ${val}`,
                content_type: 'calc',
                local_path: String(val),
              });
            }
          } catch {
            /* ignore invalid syntax */
          }
        }

        // 2. Google Search action
        smartActions.push({
          file_id: 'action-google',
          filename: `Google: "${q}"`,
          file_type: 'google',
          content_snippet: `Search for "${q}" on Google`,
          content_type: 'web',
          local_path: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
        });

        // 3. YouTube Search action
        smartActions.push({
          file_id: 'action-yt',
          filename: `YouTube: "${q}"`,
          file_type: 'youtube',
          content_snippet: `Search YouTube for "${q}" in default browser`,
          content_type: 'web',
          local_path: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
        });

        // 4. URL detection
        if (/^(?:https?:\/\/)?[\w.-]+\.[a-z]{2,}(?:\/.*)?$/i.test(q)) {
          const targetUrl = q.startsWith('http') ? q : `https://${q}`;
          smartActions.push({
            file_id: 'action-url',
            filename: `Open Web: ${targetUrl}`,
            file_type: 'web',
            content_snippet: `Navigate directly to ${targetUrl}`,
            content_type: 'web',
            local_path: targetUrl,
          });
        }

        // 5. PowerShell Run action
        smartActions.push({
          file_id: 'action-terminal',
          filename: `Run in PowerShell: "${q}"`,
          file_type: 'terminal',
          content_snippet: `Execute "${q}" in Windows PowerShell`,
          content_type: 'terminal',
          local_path: `powershell -NoExit -Command "${q.replace(/"/g, '`"')}"`,
        });

        setHits([...rawHits, ...smartActions]);
        setActiveIndex(0);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof Error ? err.message : 'Search error');
        setHits([]);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 90);

    return () => window.clearTimeout(timer);
  }, [query]);

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

      if (hit.file_type === 'terminal') {
        if (window.recall?.shell?.openExternal) {
          await window.recall.shell.openExternal(`wt.exe powershell -NoExit -Command "${hit.filename}"`).catch(() => {
            void window.recall?.shell?.openPath?.(hit.local_path);
          });
        }
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

  const showInFolder = useCallback(async (hit: QuickHit) => {
    if (hit.local_path && window.recall?.shell?.showItemInFolder) {
      await window.recall.shell.showItemInFolder(hit.local_path);
      await window.recall?.quickSearch?.hide?.();
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
      if (hit) void openHit(hit);
    }
  };

  const activeHit = hits[activeIndex] || null;

  return (
    <div className="qs-fluent-root">
      <div className="qs-fluent-window">
        {/* Top Search Bar */}
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={setQuery}
          onKeyDown={onKeyDown}
        />

        {/* Master-Detail Split Pane */}
        <div className="qs-fluent-split">
          {/* Left: Results List */}
          <div className="qs-fluent-left-pane">
            {error && <div className="qs-fluent-error">{error}</div>}

            {query.trim() && loading && hits.length === 0 && (
              <div className="qs-fluent-state-msg">Searching…</div>
            )}

            {query.trim() && !loading && hits.length === 0 && !error && (
              <div className="qs-fluent-state-msg">No matches found for “{query.trim()}”</div>
            )}

            {!query.trim() && (
              <div className="qs-fluent-empty-list">
                <div className="qs-fluent-category-title">Suggested Searches</div>
                <button
                  type="button"
                  className="qs-fluent-row"
                  onClick={() => setQuery('screenshot')}
                >
                  <div className="qs-fluent-icon-box image">
                    <span className="text-xs">📸</span>
                  </div>
                  <div className="qs-fluent-meta">
                    <div className="qs-fluent-title">Screenshots</div>
                    <div className="qs-fluent-subtitle">Search text in screenshots</div>
                  </div>
                </button>
                <button
                  type="button"
                  className="qs-fluent-row"
                  onClick={() => setQuery('.pdf')}
                >
                  <div className="qs-fluent-icon-box pdf">
                    <span className="text-xs">📄</span>
                  </div>
                  <div className="qs-fluent-meta">
                    <div className="qs-fluent-title">PDF Documents</div>
                    <div className="qs-fluent-subtitle">Search inside scanned PDFs</div>
                  </div>
                </button>
              </div>
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
          </div>

          {/* Right: Preview & Action Panel */}
          <div className="qs-fluent-right-pane">
            <PreviewPane
              hit={activeHit}
              onOpen={openHit}
              onShowInFolder={showInFolder}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuickSearch;
