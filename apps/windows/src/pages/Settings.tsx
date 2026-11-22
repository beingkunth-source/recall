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
    <div className="flex items-center justify-between py-3.5">
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={onToggle}
        className="liquid-btn text-violet-600 hover:text-violet-700 transition-colors"
      >
        {enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} className="text-slate-300" />}
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
    <div className="space-y-6 max-w-3xl page-enter pb-10">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure indexing, shortcuts, and application preferences
        </p>
      </div>

      {/* General Settings */}
      <section className="liquid-card rounded-2xl overflow-hidden border border-white/80">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/60 bg-white/40">
          <div className="w-8 h-8 rounded-lg bg-violet-100/80 flex items-center justify-center text-violet-600">
            <SettingsIcon size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">General</h2>
        </div>
        <div className="px-6 divide-y divide-white/60">
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
            description="Enable optical character recognition for images and screenshots"
            enabled={ocrEnabled}
            onToggle={() => setOcrEnabled((prev) => !prev)}
          />
        </div>
      </section>

      {/* Quick Search Shortcut */}
      <section className="liquid-card rounded-2xl overflow-hidden border border-white/80">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/60 bg-white/40">
          <div className="w-8 h-8 rounded-lg bg-indigo-100/80 flex items-center justify-center text-indigo-600">
            <Keyboard size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Quick Search Overlay</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-xs text-slate-500">
            Active global shortcut:{' '}
            <span className="font-mono font-semibold px-2 py-0.5 rounded bg-violet-100 text-violet-800">
              {activeShortcut || 'Not registered'}
            </span>
          </p>
          <div>
            <label
              htmlFor="qs-shortcut"
              className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
            >
              Global accelerator
            </label>
            <div className="flex gap-2">
              <input
                id="qs-shortcut"
                type="text"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                placeholder="Control+Space"
                className="flex-1 h-10 px-3.5 bg-white/70 border border-slate-200/80 rounded-xl text-sm font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 focus:bg-white transition-all"
              />
              <button
                type="button"
                onClick={() => void saveShortcut()}
                className="liquid-btn px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30"
              >
                Apply
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              Default is Control+Space. Falls back to Control+Shift+Space or Alt+Space if taken.
            </p>
          </div>
        </div>
      </section>

      {/* Local storage indexing */}
      <section className="liquid-card rounded-2xl overflow-hidden border border-white/80">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/60 bg-white/40">
          <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center text-emerald-600">
            <HardDrive size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Local Storage Indexing</h2>
        </div>
        <div className="px-6 py-5 space-y-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            Choose folders or drives on this PC. Recall indexes them locally with zero cloud upload.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="rounded-xl bg-white/50 border border-white/60 p-3.5 backdrop-blur-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Status</p>
              <p className="font-bold text-slate-800 capitalize mt-1">
                {indexing?.paused ? 'paused' : indexing?.status || '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 border border-white/60 p-3.5 backdrop-blur-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Indexed</p>
              <p className="font-bold text-violet-700 mt-1">
                {indexing?.files_indexed ?? '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 border border-white/60 p-3.5 backdrop-blur-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Pending</p>
              <p className="font-bold text-amber-600 mt-1">
                {indexing?.files_pending ?? '—'}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 border border-white/60 p-3.5 backdrop-blur-sm">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Failed</p>
              <p className="font-bold text-rose-600 mt-1">
                {indexing?.files_failed ?? '—'}
              </p>
            </div>
          </div>

          {indexing?.current_file && (
            <p className="text-xs text-slate-500 truncate bg-white/40 p-2 rounded-lg border border-white/60" title={indexing.current_file}>
              Indexing: {indexing.current_file}
            </p>
          )}

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => void addFolder()}
              className="liquid-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              <Plus size={15} />
              Add folder
            </button>
            {indexing?.paused ? (
              <button
                type="button"
                onClick={() => void api.resumeIndexing().then(() => refetchIndexing())}
                className="liquid-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/80 border border-white/80 rounded-xl text-xs font-semibold text-slate-700 shadow-sm"
              >
                <Play size={15} />
                Resume
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void api.pauseIndexing().then(() => refetchIndexing())}
                className="liquid-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/80 border border-white/80 rounded-xl text-xs font-semibold text-slate-700 shadow-sm"
              >
                <Pause size={15} />
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
              className="liquid-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/80 border border-white/80 rounded-xl text-xs font-semibold text-slate-700 shadow-sm"
            >
              <RefreshCw size={15} />
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
              className="liquid-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/80 border border-white/80 rounded-xl text-xs font-semibold text-slate-700 shadow-sm"
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
              className="liquid-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-100"
            >
              Clear index
            </button>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">
              Available Drives
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
                    className="liquid-btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/80 bg-white/70 text-xs font-medium text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <HardDrive size={13} />
                    {d.label}
                    {already ? ' · added' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2.5">
              Indexed Folders
            </p>
            {(indexing?.roots || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-2">
                No folders yet — add Documents, Downloads, or a drive to begin.
              </p>
            ) : (
              <ul className="divide-y divide-white/60 border border-white/80 rounded-xl overflow-hidden bg-white/40">
                {(indexing?.roots || []).map((root) => (
                  <li
                    key={root.id}
                    className="flex items-center gap-3 px-3.5 py-2.5"
                  >
                    <FolderOpen size={16} className="text-slate-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {root.path}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {root.files_discovered ?? 0} discovered
                        {root.last_scan_at
                          ? ` · last scan ${new Date(root.last_scan_at).toLocaleTimeString()}`
                          : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeRoot(root.id, root.path)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                      aria-label="Remove folder"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Processing */}
      <section className="liquid-card rounded-2xl overflow-hidden border border-white/80">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/60 bg-white/40">
          <div className="w-8 h-8 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-600">
            <Cpu size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Processing Engine</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label
              htmlFor="tesseract-path"
              className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide"
            >
              Tesseract OCR Executable
            </label>
            <input
              id="tesseract-path"
              type="text"
              value={tesseractPath}
              onChange={(e) => setTesseractPath(e.target.value)}
              className="w-full h-10 px-3.5 bg-white/70 border border-slate-200/80 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 focus:bg-white transition-all"
            />
            <p className="text-xs text-slate-400 mt-1">
              Embedded standalone binary automatically located in bin/tesseract or standard system path.
            </p>
          </div>
        </div>
      </section>

      {/* Storage and Database */}
      <section className="liquid-card rounded-2xl overflow-hidden border border-white/80">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/60 bg-white/40">
          <div className="w-8 h-8 rounded-lg bg-sky-100/80 flex items-center justify-center text-sky-600">
            <Database size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">Storage & Database</h2>
        </div>
        <div className="px-6 py-4 space-y-3 divide-y divide-white/60">
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-slate-400" />
              <span className="text-sm text-slate-700">Database Location</span>
            </div>
            <span className="text-xs text-slate-500 font-mono">database/recall.db</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Total Indexed Records</span>
            <span className="text-sm font-semibold text-slate-800">{stats?.total_files ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Total Storage Processed</span>
            <span className="text-sm font-semibold text-slate-800">
              {stats ? formatBytes(stats.total_size) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Indexed (Completed)</span>
            <span className="text-sm font-semibold text-emerald-600">
              {stats?.completed ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Pending Background Processing</span>
            <span className="text-sm font-semibold text-amber-600">
              {stats?.pending ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Failed / Unreadable</span>
            <span className="text-sm font-semibold text-rose-600">
              {stats?.failed ?? '—'}
            </span>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="liquid-card rounded-2xl overflow-hidden border border-white/80">
        <div className="flex items-center gap-2.5 px-6 py-4 border-b border-white/60 bg-white/40">
          <div className="w-8 h-8 rounded-lg bg-purple-100/80 flex items-center justify-center text-purple-600">
            <Info size={16} />
          </div>
          <h2 className="text-sm font-semibold text-slate-800">About Recall</h2>
        </div>
        <div className="px-6 py-4 space-y-3 divide-y divide-white/60">
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-slate-700">Application</span>
            <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-800">
              <img
                src="/recall-logo.png"
                alt=""
                className="w-5 h-5 rounded-md object-cover shadow-sm"
                draggable={false}
              />
              Recall
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Version</span>
            <span className="text-xs text-slate-500 font-mono font-medium">0.1.0 (Windows 11 Liquid)</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Backend Status</span>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                health?.status === 'healthy' || health?.status === 'ok'
                  ? 'bg-emerald-100/80 text-emerald-700'
                  : 'bg-rose-100/80 text-rose-700'
              }`}
            >
              {health?.status === 'healthy' || health?.status === 'ok'
                ? 'Connected (Self-Hosted)'
                : 'Starting engine…'}
            </span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm text-slate-700">Description</span>
            <span className="text-xs text-slate-500">Personal Digital Search Engine</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
