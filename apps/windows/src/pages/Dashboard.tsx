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
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import FileCard from '@/components/FileCard';
import DropZone from '@/components/DropZone';
import CreateNoteModal from '@/components/CreateNoteModal';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import type { StatsResponse, FileRecord, PaginatedResponse } from '@/services/api';

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

  const refresh = useCallback(() => {
    refetchStats();
    refetchFiles();
  }, [refetchStats, refetchFiles]);

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
    const pending =
      (stats?.pending || 0) + (stats?.processing || 0);
    if (pending <= 0) return;
    const id = window.setInterval(() => refresh(), 2500);
    return () => window.clearInterval(id);
  }, [stats?.pending, stats?.processing, refresh]);

  const quickActions = [
    {
      label: 'Add File',
      icon: <Plus size={18} />,
      onClick: () => void addFilesViaDialog(),
    },
    {
      label: 'Create Note',
      icon: <PenSquare size={18} />,
      onClick: () => setNoteOpen(true),
    },
    {
      label: 'Search',
      icon: <SearchIcon size={18} />,
      onClick: () => navigate('/search'),
    },
  ];

  return (
    <DropZone onDropFiles={(files) => void addDroppedFiles(files)} disabled={busy}>
      <div className="space-y-8 page-enter min-h-[calc(100vh-4rem)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">
              Welcome to Recall
            </h1>
            <p className="text-sm text-muted mt-1">
              Search text inside screenshots, PDFs, and notes — drop files anywhere here
            </p>
          </div>
          <button
            type="button"
            onClick={() => void addFilesViaDialog()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-default shadow-sm shadow-primary-500/20"
          >
            <Plus size={16} />
            {busy ? 'Adding…' : 'Add files'}
          </button>
        </div>

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
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                disabled={busy}
                className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-600 hover:shadow-sm disabled:opacity-60 transition-default"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-700">Recent Files</h2>
            {(stats?.pending || 0) + (stats?.processing || 0) > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                {(stats?.pending || 0) + (stats?.processing || 0)} indexing…
              </span>
            )}
          </div>

          {statsError && filesError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
                <FolderOpen size={22} className="text-red-400" />
              </div>
              <p className="text-sm text-red-600 font-medium">Could not connect to backend</p>
              <p className="text-xs text-muted mt-1">
                Make sure the Recall server is running on port 8000
              </p>
            </div>
          )}

          {filesLoading && !filesError && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[72px] bg-slate-50 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {!filesLoading && !filesError && recentFiles && recentFiles.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <div className="w-12 h-12 rounded-full bg-white border border-slate-100 flex items-center justify-center mb-3 shadow-sm">
                <FolderOpen size={22} className="text-muted" />
              </div>
              <p className="text-sm text-slate-600 font-medium">No files yet</p>
              <p className="text-xs text-muted mt-1 mb-4 max-w-xs">
                Add a screenshot or PDF, or create a note — then search any text inside it
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void addFilesViaDialog()}
                  className="px-3.5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
                >
                  Add files
                </button>
                <button
                  type="button"
                  onClick={() => setNoteOpen(true)}
                  className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:border-slate-300 transition-default"
                >
                  Create note
                </button>
              </div>
            </div>
          )}

          {!filesLoading && !filesError && recentFiles && recentFiles.items.length > 0 && (
            <div className="space-y-2">
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
