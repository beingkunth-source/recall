import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Image,
  FileText,
  StickyNote,
  Plus,
  PenSquare,
  Search as SearchIcon,
  Scan,
  CheckCircle,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import FileCard from '@/components/FileCard';
import DropZone from '@/components/DropZone';
import CreateNoteModal from '@/components/CreateNoteModal';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import type { StatsResponse, FileRecord, PaginatedResponse, IndexingStatus } from '@/services/api';

function Dashboard() {
  const navigate = useNavigate();
  const [noteOpen, setNoteOpen] = useState(false);

  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useApi<StatsResponse>(useCallback(() => api.getStats(), []));

  const {
    data: recentFiles,
    loading: filesLoading,
    error: filesError,
    refetch: refetchFiles,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(() => api.getFiles({ page_size: '5', sort: 'created_at', order: 'desc' }), [])
  );

  const {
    data: indexing,
    refetch: refetchIndexing,
  } = useApi<IndexingStatus>(useCallback(() => api.getIndexingStatus(), []));

  const refresh = useCallback(() => {
    refetchStats();
    refetchFiles();
    refetchIndexing();
  }, [refetchStats, refetchFiles, refetchIndexing]);

  const { busy, addFilesViaDialog, addDroppedFiles, createNote } =
    useLibraryActions(refresh);

  // Retry when backend was offline at first paint.
  useEffect(() => {
    if (!statsError && !filesError) return;
    const id = window.setInterval(() => refresh(), 2000);
    return () => window.clearInterval(id);
  }, [statsError, filesError, refresh]);

  // Poll while files are still indexing so status badges update.
  useEffect(() => {
    const isActive = indexing?.status === 'scanning' || indexing?.status === 'indexing' ||
      (indexing?.files_pending ?? 0) > 0;
    if (!isActive) return;
    const id = window.setInterval(() => refresh(), 2500);
    return () => window.clearInterval(id);
  }, [indexing?.status, indexing?.files_pending, refresh]);

  const quickActions = [
    {
      label: 'Add Files',
      icon: <Plus size={18} className="text-violet-600" />,
      onClick: () => void addFilesViaDialog(),
    },
    {
      label: 'Create Note',
      icon: <PenSquare size={18} className="text-amber-600" />,
      onClick: () => setNoteOpen(true),
    },
    {
      label: 'Search Everything',
      icon: <SearchIcon size={18} className="text-indigo-600" />,
      onClick: () => navigate('/search'),
    },
  ];

  // Determine indexing banner state
  const isScanning = indexing?.status === 'scanning' || indexing?.status === 'indexing';
  const hasRoots = (indexing?.roots?.length ?? 0) > 0;
  const pendingFiles = indexing?.files_pending ?? 0;
  const indexedFiles = indexing?.files_indexed ?? 0;
  const discoveredFiles = indexing?.files_discovered ?? 0;
  const scanComplete = hasRoots && !isScanning && pendingFiles === 0 && indexedFiles > 0;

  return (
    <DropZone onDropFiles={(files) => void addDroppedFiles(files)} disabled={busy}>
      <div className="space-y-8 page-enter min-h-[calc(100vh-4rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              Welcome to Recall
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Search text inside screenshots, PDFs, documents and notes — your full system, instantly
            </p>
          </div>
          <button
            type="button"
            onClick={() => void addFilesViaDialog()}
            disabled={busy}
            className="liquid-btn inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35 disabled:opacity-60"
          >
            <Plus size={16} />
            {busy ? 'Adding…' : 'Add files'}
          </button>
        </div>

        {/* System Indexing Banner */}
        {hasRoots && isScanning && (
          <div className="liquid-card rounded-2xl px-5 py-4 border border-violet-200/60 bg-gradient-to-r from-violet-50/80 to-indigo-50/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 flex-shrink-0">
                <Scan size={18} className="animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">
                  Scanning your system — {discoveredFiles.toLocaleString()} files found
                </p>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {indexing?.current_file
                    ? `Indexing: ${indexing.current_file.split('\\').pop() ?? indexing.current_file}`
                    : `${pendingFiles.toLocaleString()} files queued · ${indexedFiles.toLocaleString()} indexed`}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="text-xs font-semibold text-violet-600">
                  {indexedFiles.toLocaleString()} / {discoveredFiles.toLocaleString()}
                </span>
                <div className="mt-1.5 w-28 h-1.5 bg-violet-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${discoveredFiles > 0 ? Math.round((indexedFiles / discoveredFiles) * 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
            {(indexing?.roots?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {indexing!.roots.slice(0, 4).map((r) => (
                  <span key={r.id} className="text-xs bg-white/60 border border-violet-100 rounded-lg px-2 py-0.5 text-slate-600 font-mono">
                    {r.path.split('\\').pop() ?? r.path}
                  </span>
                ))}
                {(indexing?.roots?.length ?? 0) > 4 && (
                  <span className="text-xs text-slate-400">+{(indexing?.roots?.length ?? 0) - 4} more</span>
                )}
              </div>
            )}
          </div>
        )}

        {hasRoots && scanComplete && (
          <div className="liquid-card rounded-2xl px-5 py-3.5 border border-emerald-200/60 bg-gradient-to-r from-emerald-50/60 to-teal-50/60">
            <div className="flex items-center gap-3">
              <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-slate-800">
                System indexed — {indexedFiles.toLocaleString()} files searchable across {indexing!.roots.length} folder{indexing!.roots.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<FolderOpen size={22} />}
            label="Total Files"
            value={statsLoading ? '...' : stats?.total_files ?? 0}
            color="green"
          />
          <StatsCard
            icon={<Image size={22} />}
            label="Images"
            value={statsLoading ? '...' : stats?.images ?? 0}
            color="blue"
          />
          <StatsCard
            icon={<FileText size={22} />}
            label="PDFs"
            value={statsLoading ? '...' : stats?.pdfs ?? 0}
            color="red"
          />
          <StatsCard
            icon={<StickyNote size={22} />}
            label="Notes"
            value={statsLoading ? '...' : stats?.notes ?? 0}
            color="amber"
          />
        </div>

        <div>
          <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={busy}
                className="liquid-card liquid-btn flex items-center gap-2.5 px-4 py-2.5 rounded-2xl text-sm font-semibold text-slate-800 disabled:opacity-60"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recent Files</h2>
            {pendingFiles > 0 && (
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                {pendingFiles.toLocaleString()} indexing in background…
              </span>
            )}
          </div>

          {statsError && filesError && (
            <div className="liquid-card flex flex-col items-center justify-center py-12 text-center rounded-3xl p-8 border border-amber-200/80 bg-amber-50/30">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-3 text-amber-600">
                <FolderOpen size={22} />
              </div>
              <p className="text-sm text-slate-800 font-semibold">Starting Recall engine…</p>
              <p className="text-xs text-slate-500 mt-1">
                The local backend process is booting automatically. Connection will establish momentarily.
              </p>
            </div>
          )}

          {filesLoading && !filesError && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 liquid-card rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!filesLoading && !filesError && recentFiles && recentFiles.items.length === 0 && (
            <div className="liquid-card flex flex-col items-center justify-center py-14 text-center rounded-3xl p-8 border border-dashed border-violet-200/80">
              <div className="w-14 h-14 rounded-2xl bg-violet-100/70 flex items-center justify-center mb-3 text-violet-600 shadow-sm">
                <FolderOpen size={24} />
              </div>
              {isScanning ? (
                <>
                  <p className="text-base text-slate-800 font-semibold">Scanning your system…</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs">
                    Recall is indexing your Documents, Desktop, Downloads and other folders. Files will appear here shortly.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-base text-slate-800 font-semibold">No files indexed yet</p>
                  <p className="text-xs text-slate-500 mt-1 mb-5 max-w-xs">
                    Add screenshots, PDFs, or write a note — then search any word or sentence inside them instantly.
                  </p>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={() => void addFilesViaDialog()}
                      className="liquid-btn px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25"
                    >
                      Add files
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="liquid-btn px-4 py-2 bg-white/80 border border-white/80 text-slate-700 rounded-xl text-sm font-medium shadow-sm"
                    >
                      Create note
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {!filesLoading && !filesError && recentFiles && recentFiles.items.length > 0 && (
            <div className="space-y-2.5">
              {recentFiles.items.map((file) => (
                <FileCard
                  key={file.id}
                  filename={file.filename}
                  fileType={file.file_type}
                  fileSize={file.file_size}
                  date={file.created_at}
                  status={file.status}
                  filePath={file.file_path}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateNoteModal
        open={noteOpen}
        busy={busy}
        onClose={() => setNoteOpen(false)}
        onSubmit={createNote}
      />
    </DropZone>
  );
}

export default Dashboard;
