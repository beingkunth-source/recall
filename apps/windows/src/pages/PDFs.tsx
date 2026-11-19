import { useCallback } from 'react';
import { FileText, Calendar, Hash, Plus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import { formatDate, formatFileSize } from '@/components/FileCard';
import StatusBadge from '@/components/StatusBadge';
import DropZone from '@/components/DropZone';
import type { FileRecord, PaginatedResponse } from '@/services/api';

function PDFs() {
  const {
    data: files,
    loading,
    error,
    refetch,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(
      () => api.getFiles({ file_type: 'pdf', page_size: '50', sort: 'created_at', order: 'desc' }),
      []
    )
  );

  const { busy, addFilesViaDialog, addDroppedFiles } = useLibraryActions(refetch);

  return (
    <DropZone onDropFiles={(list) => void addDroppedFiles(list)} disabled={busy}>
    <div className="space-y-6 page-enter min-h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">PDFs</h1>
          <p className="text-sm text-muted mt-1">
            Browse all your indexed PDF documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          {files && (
            <span className="text-sm text-muted">
              {files.total} PDF{files.total !== 1 ? 's' : ''}
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
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-20 bg-slate-50 rounded-lg animate-pulse"
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
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-red-200/70 rounded-xl bg-red-50/30">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <FileText size={28} className="text-red-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium">
            No PDFs found
          </p>
          <p className="text-xs text-muted mt-1 mb-4">
            Add PDFs to extract and search their text
          </p>
          <button
            type="button"
            onClick={() => void addFilesViaDialog()}
            className="px-3.5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
          >
            Add PDFs
          </button>
        </div>
      )}

      {/* File list */}
      {!loading && !error && files && files.items.length > 0 && (
        <div className="space-y-2">
          {files.items.map((file: FileRecord) => (
            <button
              type="button"
              key={file.id}
              onClick={() => void window.recall?.shell?.openPath(file.file_path)}
              className="w-full text-left flex items-center gap-4 p-4 bg-surface rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-default"
            >
              {/* PDF icon */}
              <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <FileText size={22} className="text-red-500" />
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-slate-800 truncate">
                    {file.filename}
                  </h4>
                  <StatusBadge status={file.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {file.page_count !== undefined && file.page_count !== null && (
                    <>
                      <span className="flex items-center gap-1">
                        <Hash size={12} />
                        {file.page_count} page{file.page_count !== 1 ? 's' : ''}
                      </span>
                      <span>·</span>
                    </>
                  )}
                  <span>{formatFileSize(file.file_size)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(file.created_at)}
                  </span>
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

export default PDFs;
