import { useCallback } from 'react';
import { Image as ImageIcon, Calendar, Plus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import { formatDate, formatFileSize } from '@/components/FileCard';
import StatusBadge from '@/components/StatusBadge';
import DropZone from '@/components/DropZone';
import type { FileRecord, PaginatedResponse } from '@/services/api';

function Images() {
  const {
    data: files,
    loading,
    error,
    refetch,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(
      () => api.getFiles({ file_type: 'image', page_size: '50', sort: 'created_at', order: 'desc' }),
      []
    )
  );

  const { busy, addFilesViaDialog, addDroppedFiles } = useLibraryActions(refetch);

  return (
    <DropZone onDropFiles={(list) => void addDroppedFiles(list)} disabled={busy}>
    <div className="space-y-6 page-enter min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Images</h1>
          <p className="text-sm text-muted mt-1">
            Browse all your indexed images
          </p>
        </div>
        <div className="flex items-center gap-3">
          {files && (
            <span className="text-sm text-muted">
              {files.total} image{files.total !== 1 ? 's' : ''}
            </span>
          )}
          <button
            type="button"
            onClick={() => void addFilesViaDialog()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-60 transition-default"
          >
            <Plus size={16} />
            Add
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="aspect-square bg-slate-50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && files && files.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-blue-200/70 rounded-xl bg-blue-50/30">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <ImageIcon size={28} className="text-blue-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium">
            No images found
          </p>
          <p className="text-xs text-muted mt-1 mb-4">
            Drop screenshots here — OCR will make the text searchable
          </p>
          <button
            type="button"
            onClick={() => void addFilesViaDialog()}
            className="px-3.5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
          >
            Add images
          </button>
        </div>
      )}

      {/* Grid of image cards */}
      {!loading && !error && files && files.items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.items.map((file: FileRecord) => (
            <button
              type="button"
              key={file.id}
              onClick={() => void window.recall?.shell?.openPath(file.file_path)}
              className="text-left bg-surface rounded-lg border border-slate-100 overflow-hidden hover:border-slate-200 hover:shadow-sm transition-default group"
            >
              <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center">
                <ImageIcon
                  size={36}
                  className="text-slate-300 group-hover:text-blue-300 transition-default"
                />
              </div>
              <div className="p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-slate-800 truncate flex-1">
                    {file.filename}
                  </h4>
                  <StatusBadge status={file.status} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <Calendar size={12} />
                  <span>{formatDate(file.created_at)}</span>
                  <span>·</span>
                  <span>{formatFileSize(file.file_size)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
    </DropZone>
  );
}

export default Images;
