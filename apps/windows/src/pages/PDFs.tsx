import { useCallback } from 'react';
import { FileText, Calendar, Hash } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import { formatDate, formatFileSize } from '@/components/FileCard';
import StatusBadge from '@/components/StatusBadge';
import type { FileRecord, PaginatedResponse } from '@/services/api';

function PDFs() {
  const {
    data: files,
    loading,
    error,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(
      () => api.getFiles({ file_type: 'pdf', page_size: '50', sort: 'created_at', order: 'desc' }),
      []
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">PDFs</h1>
          <p className="text-sm text-muted mt-1">
            Browse all your indexed PDF documents
          </p>
        </div>
        {files && (
          <span className="text-sm text-muted">
            {files.total} PDF{files.total !== 1 ? 's' : ''}
          </span>
        )}
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
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
            <FileText size={28} className="text-red-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium">
            No PDFs found
          </p>
          <p className="text-xs text-muted mt-1">
            Add PDF documents to have them indexed and searchable
          </p>
        </div>
      )}

      {/* File list */}
      {!loading && !error && files && files.items.length > 0 && (
        <div className="space-y-2">
          {files.items.map((file: FileRecord) => (
            <div
              key={file.id}
              className="flex items-center gap-4 p-4 bg-surface rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-default"
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PDFs;
