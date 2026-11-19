import { useState, useCallback, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Cpu,
  Info,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
  Keyboard,
  HardDrive,
  Plus,
  Trash2,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import { useToast } from '@/components/Toast';
import type { HealthResponse, StatsResponse, IndexingStatus } from '@/services/api';

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleOption({ label, description, enabled, onToggle }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="text-primary-500 hover:text-primary-600 transition-default"
      >
        {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-300" />}
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function Settings() {
  const { toast } = useToast();
  const [autoProcess, setAutoProcess] = useState(true);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [tesseractPath, setTesseractPath] = useState(
    'C:\\Program Files\\Tesseract-OCR\\tesseract.exe'
  );
  const [launchAtLogin, setLaunchAtLogin] = useState(false);
  const [shortcut, setShortcut] = useState('Control+Space');
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  const { data: health } = useApi<HealthResponse>(
    useCallback(() => api.getHealth(), [])
  );

  const { data: stats } = useApi<StatsResponse>(
    useCallback(() => api.getStats(), [])
  );

  const {
    data: indexing,
    refetch: refetchIndexing,
  } = useApi<IndexingStatus>(useCallback(() => api.getIndexingStatus(), []));

  useEffect(() => {
    void (async () => {
      try {
        const settings = await window.recall?.settings?.get?.();
        if (settings) {
          setLaunchAtLogin(Boolean(settings.launchAtLogin));
          setShortcut(settings.quickSearchShortcut || 'Control+Space');
        }
        const info = (await window.recall?.quickSearch?.getShortcut?.()) as
          | { accelerator?: string }
          | undefined;
        if (info?.accelerator) setActiveShortcut(info.accelerator);
      } catch {
        // running outside Electron
      }
    })();
  }, []);

  // Live progress while scanning/indexing
  useEffect(() => {
    const busy =
      indexing?.status === 'scanning' ||
      indexing?.status === 'indexing' ||
      (indexing?.files_pending || 0) > 0;
    if (!busy) return;
    const id = window.setInterval(() => refetchIndexing(), 2000);
    return () => window.clearInterval(id);
  }, [indexing?.status, indexing?.files_pending, refetchIndexing]);

  const addFolder = async () => {
    try {
      const folder = await window.recall?.dialog?.openDirectory?.();
      if (!folder) return;
      await api.addIndexRoot(folder);
      toast(`Indexing started for ${folder}`, 'success');
      refetchIndexing();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add folder', 'error');
    }
  };

  const addDrive = async (drivePath: string) => {
    const ok = window.confirm(
      `Index ${drivePath}?\n\nWindows/system folders are skipped automatically. Large drives can take a while.`
    );
    if (!ok) return;
    try {
      await api.addIndexRoot(drivePath);
      toast(`Indexing started for ${drivePath}`, 'success');
      refetchIndexing();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not add drive', 'error');
    }
  };

  const removeRoot = async (id: string, folderPath: string) => {
    if (!window.confirm(`Stop indexing “${folderPath}”?`)) return;
    const wipe = window.confirm(
      'Also remove search records for files in this folder from the local index?'
    );
    try {
      await api.removeIndexRoot(id, wipe);
      toast('Folder removed from indexing', 'success');
      refetchIndexing();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not remove folder', 'error');
    }
  };

  const toggleLaunchAtLogin = async () => {
    const next = !launchAtLogin;
    setLaunchAtLogin(next);
    try {
      await window.recall?.settings?.update?.({ launchAtLogin: next });
      toast(
        next ? 'Recall will launch at login' : 'Launch at login disabled',
        'success'
      );
    } catch {
      setLaunchAtLogin(!next);
      toast('Could not update launch setting', 'error');
    }
  };

  const saveShortcut = async () => {
    if (!window.recall?.quickSearch?.setShortcut) {
      toast('Shortcut changes require the desktop app', 'error');
      return;
    }
    const result = await window.recall.quickSearch.setShortcut(shortcut.trim());
    if (result.ok) {
      setActiveShortcut(shortcut.trim());
      toast(`Quick Search bound to ${shortcut.trim()}`, 'success');
    } else {
      toast(result.error || 'Could not register shortcut', 'error');
    }
  };

  return (
    <div className="space-y-8 max-w-3xl page-enter">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Configure Recall preferences and options
        </p>
      </div>

      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <SettingsIcon size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">General</h2>
        </div>
        <div className="px-5 divide-y divide-slate-100">
          <ToggleOption
            label="Launch at login"
            description="Start Recall in the background when Windows signs in (opt-in)"
            enabled={launchAtLogin}
            onToggle={() => void toggleLaunchAtLogin()}
          />
          <ToggleOption
            label="Auto-process new files"
            description="Automatically index and process files when they are added"
            enabled={autoProcess}
            onToggle={() => setAutoProcess((prev) => !prev)}
          />
          <ToggleOption
            label="OCR Processing"
            description="Enable optical character recognition for images"
            enabled={ocrEnabled}
            onToggle={() => setOcrEnabled((prev) => !prev)}
          />
        </div>
      </section>

      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Keyboard size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">Quick Search</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted">
            Active shortcut:{' '}
            <span className="font-mono text-slate-700">
              {activeShortcut || 'Not registered'}
            </span>
          </p>
          <div>
            <label
              htmlFor="qs-shortcut"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Global shortcut (Electron accelerator)
            </label>
            <div className="flex gap-2">
              <input
                id="qs-shortcut"
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="Control+Space"
                className="flex-1 h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-default font-mono"
              />
              <button
                type="button"
                onClick={() => void saveShortcut()}
                className="px-3.5 py-2 bg-primary-500 text-white rounded-md text-sm font-medium hover:bg-primary-600 transition-default"
              >
                Apply
              </button>
            </div>
            <p className="text-xs text-muted mt-1">
              Default is Control+Space. If unavailable, Recall falls back to
              Control+Shift+Space or Alt+Space.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <HardDrive size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">Local storage indexing</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-xs text-muted">
            Choose folders or drives on this PC. Recall indexes them locally
            (filenames + text in PDFs, docs, code, and OCR images). Nothing is uploaded.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-muted">Status</p>
              <p className="font-medium text-slate-800 capitalize mt-0.5">
                {indexing?.paused ? 'paused' : indexing?.status || '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-muted">Indexed</p>
              <p className="font-medium text-slate-800 mt-0.5">
                {indexing?.files_indexed ?? '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-muted">Pending</p>
              <p className="font-medium text-amber-700 mt-0.5">
                {indexing?.files_pending ?? '—'}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs text-muted">Failed</p>
              <p className="font-medium text-red-600 mt-0.5">
                {indexing?.files_failed ?? '—'}
              </p>
            </div>
          </div>

          {indexing?.current_file && (
            <p className="text-xs text-muted truncate" title={indexing.current_file}>
              Indexing: {indexing.current_file}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void addFolder()}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
            >
              <Plus size={16} />
              Add folder
            </button>
            {indexing?.paused ? (
              <button
                type="button"
                onClick={() => void api.resumeIndexing().then(() => refetchIndexing())}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 transition-default"
              >
                <Play size={16} />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void api.pauseIndexing().then(() => refetchIndexing())}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 transition-default"
              >
                <Pause size={16} />
                Pause
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                void api.startIndexing(false).then(() => {
                  toast('Scan started', 'success');
                  refetchIndexing();
                })
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 transition-default"
            >
              <RefreshCw size={16} />
              Rescan
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Rebuild the entire local index?')) return;
                void api.rebuildIndex().then(() => {
                  toast('Rebuild started', 'success');
                  refetchIndexing();
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-slate-300 transition-default"
            >
              Rebuild index
            </button>
            <button
              type="button"
              onClick={() => {
                if (!window.confirm('Clear all auto-indexed search data?')) return;
                void api.clearIndex().then(() => {
                  toast('Local index cleared', 'success');
                  refetchIndexing();
                });
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-default"
            >
              Clear index
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Available drives
            </p>
            <div className="flex flex-wrap gap-2">
              {(indexing?.drives || []).map((d) => {
                const already = (indexing?.roots || []).some(
                  (r) => r.path.toLowerCase() === d.path.toLowerCase()
                );
                return (
                  <button
                    key={d.path}
                    type="button"
                    disabled={already}
                    onClick={() => void addDrive(d.path)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 text-sm text-slate-700 hover:border-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition-default"
                  >
                    <HardDrive size={14} />
                    {d.label}
                    {already ? ' · added' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
              Indexed folders
            </p>
            {(indexing?.roots || []).length === 0 ? (
              <p className="text-sm text-muted py-2">
                No folders yet — add Documents, Downloads, or a drive to begin.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
                {(indexing?.roots || []).map((root) => (
                  <li
                    key={root.id}
                    className="flex items-center gap-3 px-3 py-2.5 bg-white"
                  >
                    <FolderOpen size={16} className="text-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-800 truncate font-medium">
                        {root.path}
                      </p>
                      <p className="text-xs text-muted">
                        {root.files_discovered ?? 0} discovered
                        {root.last_scan_at
                          ? ` · last scan ${new Date(root.last_scan_at).toLocaleString()}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeRoot(root.id, root.path)}
                      className="p-1.5 text-muted hover:text-red-600 transition-default"
                      aria-label="Remove folder"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Cpu size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">Processing</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label
              htmlFor="tesseract-path"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Tesseract Path
            </label>
            <input
              id="tesseract-path"
              type="text"
              value={tesseractPath}
              onChange={(e) => setTesseractPath(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-default"
            />
            <p className="text-xs text-muted mt-1">
              Path to the Tesseract OCR executable
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Database size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">Storage</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-muted" />
              <span className="text-sm text-slate-700">Database Location</span>
            </div>
            <span className="text-sm text-muted font-mono">database/recall.db</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Total Files</span>
            <span className="text-sm text-muted">{stats?.total_files ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Total Storage Used</span>
            <span className="text-sm text-muted">
              {stats ? formatBytes(stats.total_size) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Indexed (Completed)</span>
            <span className="text-sm text-primary-600 font-medium">
              {stats?.completed ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Pending</span>
            <span className="text-sm text-amber-600 font-medium">
              {stats?.pending ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Failed</span>
            <span className="text-sm text-red-600 font-medium">
              {stats?.failed ?? '—'}
            </span>
          </div>
        </div>
      </section>

      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Info size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">About</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Application</span>
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
              <img
                src="/recall-logo.png"
                alt=""
                className="w-6 h-6 rounded-md object-cover shadow-sm"
                draggable={false}
              />
              Recall
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Version</span>
            <span className="text-sm text-muted font-mono">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Backend Status</span>
            <span
              className={`text-sm font-medium ${
                health?.status === 'healthy' || health?.status === 'ok'
                  ? 'text-primary-600'
                  : 'text-red-500'
              }`}
            >
              {health?.status === 'healthy' || health?.status === 'ok'
                ? 'Connected'
                : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Description</span>
            <span className="text-sm text-muted">Personal Digital Search Engine</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
