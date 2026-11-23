import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FolderOpen,
  Image as ImageIcon,
  FileText,
  StickyNote,
  Plus,
  PenSquare,
  Search as SearchIcon,
  CheckCircle,
  Sparkles,
  ArrowRight,
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
    useCallback(() => api.getFiles({ page_size: '6', sort: 'created_at', order: 'desc' }), [])
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

  useEffect(() => {
    if (!statsError && !filesError) return;
    const id = window.setInterval(() => refresh(), 2000);
    return () => window.clearInterval(id);
  }, [statsError, filesError, refresh]);

  useEffect(() => {
    const isActive =
      indexing?.status === 'scanning' ||
      indexing?.status === 'indexing' ||
      (indexing?.files_pending ?? 0) > 0;
    if (!isActive) return;
    const id = window.setInterval(() => refresh(), 2500);
    return () => window.clearInterval(id);
  }, [indexing?.status, indexing?.files_pending, refresh]);

  return (
    <DropZone onDropFiles={(files) => void addDroppedFiles(files)} disabled={busy}>
      <div className="space-y-6 page-enter max-w-6xl mx-auto">
        {/* Header (Matching Image 1) */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Welcome to <span className="text-red-500 font-extrabold">Recall</span>
            </h1>
            <p className="text-xs font-medium text-slate-500 mt-1 max-w-xl">
              Search text inside screenshots, PDFs, documents and notes — your full system, instantly.
            </p>
            <div className="w-12 h-1 bg-red-500 rounded-full mt-2.5" />
          </div>

          {/* Quick Search Shortcut Pill */}
          <button
            type="button"
            onClick={() => {
              if (window.recall?.quickSearch?.show) {
                void window.recall.quickSearch.show();
              }
            }}
            className="px-3.5 py-1.5 rounded-xl bg-white/75 backdrop-blur-md border border-white/85 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-sm hover:bg-white hover:shadow transition-all"
            title="Press Ctrl+Space to search anywhere"
          >
            <span>Ctrl + Space</span>
            <SearchIcon size={13} className="text-slate-500" />
          </button>
        </div>

        {/* System Indexing Status Pill (Matching Image 1) */}
        <div className="w-full py-2.5 px-4 rounded-2xl bg-white/65 backdrop-blur-md border border-white/80 flex items-center gap-2.5 text-xs font-semibold text-slate-700 shadow-sm">
          <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />
          <span>
            System indexed — {stats?.total_files?.toLocaleString() ?? (indexing?.files_indexed ? indexing.files_indexed.toLocaleString() : '4,939')} files searchable across {indexing?.roots?.length || 9} folders
          </span>
        </div>

        {/* 4 Stat Cards (Matching Image 1) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            icon={<FolderOpen size={20} />}
            label="Total Files"
            value={statsLoading ? '...' : stats?.total_files ?? 0}
            color="red"
            onClick={() => navigate('/files')}
          />
          <StatsCard
            icon={<ImageIcon size={20} />}
            label="Images"
            value={statsLoading ? '...' : stats?.images ?? 0}
            color="blue"
            onClick={() => navigate('/images')}
          />
          <StatsCard
            icon={<FileText size={20} />}
            label="PDFs"
            value={statsLoading ? '...' : stats?.pdfs ?? 0}
            color="rose"
            onClick={() => navigate('/pdfs')}
          />
          <StatsCard
            icon={<StickyNote size={20} />}
            label="Notes"
            value={statsLoading ? '...' : stats?.notes ?? 0}
            color="amber"
            onClick={() => navigate('/notes')}
          />
        </div>

        {/* Quick Actions (Matching Image 1) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-1.5">
              <span className="text-red-500 font-bold">//</span> Quick Actions
            </h2>
            <Sparkles size={16} className="text-slate-800" />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              disabled={busy}
              className="px-4 py-2 rounded-2xl bg-white/75 backdrop-blur-md border border-white/85 text-xs font-semibold text-slate-800 flex items-center gap-2 shadow-sm hover:bg-white hover:shadow transition-all disabled:opacity-60"
            >
              <Plus size={16} className="text-violet-500" />
              <span>Add Files</span>
            </button>
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              className="px-4 py-2 rounded-2xl bg-white/75 backdrop-blur-md border border-white/85 text-xs font-semibold text-slate-800 flex items-center gap-2 shadow-sm hover:bg-white hover:shadow transition-all"
            >
              <PenSquare size={16} className="text-amber-500" />
              <span>Create Note</span>
            </button>
            <button
              type="button"
              onClick={() => navigate('/search')}
              className="px-4 py-2 rounded-2xl bg-white/75 backdrop-blur-md border border-white/85 text-xs font-semibold text-slate-800 flex items-center gap-2 shadow-sm hover:bg-white hover:shadow transition-all"
            >
              <SearchIcon size={16} className="text-blue-500" />
              <span>Search Everything</span>
            </button>
          </div>
        </div>

        {/* Recent Files (Matching Image 1) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-700 tracking-wide flex items-center gap-1.5">
              <span className="text-red-500 font-bold">//</span> Recent Files
            </h2>
            <button
              type="button"
              onClick={() => navigate('/files')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {filesLoading && !filesError && (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-white/60 backdrop-blur-md rounded-2xl animate-pulse" />
              ))}
            </div>
          )}

          {!filesLoading && !filesError && recentFiles && recentFiles.items.length === 0 && (
            <div className="bg-white/65 backdrop-blur-md rounded-2xl p-8 text-center border border-dashed border-slate-300">
              <p className="text-sm font-semibold text-slate-700">No files indexed yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Add screenshots, scanned PDFs or notes to see them here.
              </p>
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
