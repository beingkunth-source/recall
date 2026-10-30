import { useCallback } from 'react';
import {
  FolderOpen,
  Image,
  FileText,
  StickyNote,
  Plus,
  Camera,
  PenSquare,
} from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import FileCard from '@/components/FileCard';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import type { StatsResponse, FileRecord, PaginatedResponse } from '@/services/api';

function Dashboard() {
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
  } = useApi<StatsResponse>(useCallback(() => api.getStats(), []));

  const {
    data: recentFiles,
    loading: filesLoading,
    error: filesError,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(() => api.getFiles({ page_size: '5', sort: 'created_at', order: 'desc' }), [])
  );

  const quickActions = [
    { label: 'Add File', icon: <Plus size={18} />, onClick: () => {} },
    { label: 'Take Screenshot', icon: <Camera size={18} />, onClick: () => {} },
    { label: 'Create Note', icon: <PenSquare size={18} />, onClick: () => {} },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">
          Welcome to Recall
        </h1>
        <p className="text-sm text-muted mt-1">
          Your personal digital search engine
        </p>
      </div>

      {/* Stats cards */}
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

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Quick Actions
        </h2>
        <div className="flex gap-3">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:border-primary-300 hover:text-primary-600 hover:shadow-sm transition-default"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Files */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">
          Recent Files
        </h2>

        {statsError && filesError && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-3">
              <FolderOpen size={22} className="text-red-400" />
            </div>
            <p className="text-sm text-red-600 font-medium">
              Could not connect to backend
            </p>
            <p className="text-xs text-muted mt-1">
              Make sure the Recall server is running on port 8000
            </p>
          </div>
        )}

        {filesLoading && !filesError && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[72px] bg-slate-50 rounded-lg animate-pulse"
              />
            ))}
          </div>
        )}

        {!filesLoading &&
          !filesError &&
          recentFiles &&
          recentFiles.items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <FolderOpen size={22} className="text-muted" />
              </div>
              <p className="text-sm text-slate-600 font-medium">
                No files yet
              </p>
              <p className="text-xs text-muted mt-1">
                Add your first file to get started
              </p>
            </div>
          )}

        {!filesLoading &&
          !filesError &&
          recentFiles &&
          recentFiles.items.length > 0 && (
            <div className="space-y-2">
              {recentFiles.items.map((file) => (
                <FileCard
                  key={file.id}
                  filename={file.filename}
                  fileType={file.file_type}
                  fileSize={file.file_size}
                  date={file.created_at}
                  status={file.status}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}

export default Dashboard;
