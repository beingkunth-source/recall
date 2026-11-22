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
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">PDF Documents</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Browse all your indexed PDF documents and papers
            </p>
          </div>
          <div className="flex items-center gap-3">
            {files && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100/70 text-rose-700">
                {files.total} PDF{files.total !== 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              disabled={busy}
              className="liquid-btn inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-60"
            >
              <Plus size={16} />
              Add PDFs
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 liquid-card rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="liquid-card rounded-2xl p-8 text-center">
            <p className="text-sm text-rose-600 font-medium">{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && files && files.items.length === 0 && (
          <div className="liquid-card flex flex-col items-center justify-center py-20 text-center border border-dashed border-rose-200/80 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-rose-100/70 flex items-center justify-center mb-4 text-rose-600 shadow-sm">
              <FileText size={30} />
            </div>
            <p className="text-base text-slate-800 font-semibold">No PDFs indexed yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm">
              Add PDF documents to extract their page-by-page text and make them instantly searchable.
            </p>
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              className="liquid-btn px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35"
            >
              Add PDFs
            </button>
          </div>
        )}

        {/* File list */}
        {!loading && !error && files && files.items.length > 0 && (
          <div className="space-y-2.5">
            {files.items.map((file: FileRecord) => (
              <button
                type="button"
                key={file.id}
                onClick={() => void window.recall?.shell?.openPath(file.file_path)}
                className="liquid-card w-full text-left flex items-center gap-4 p-4 rounded-2xl group hover:scale-[1.01] transition-all duration-200"
              >
                {/* PDF icon */}
                <div className="w-12 h-12 rounded-xl bg-rose-100/80 flex items-center justify-center flex-shrink-0 text-rose-600 group-hover:scale-105 transition-transform">
                  <FileText size={22} />
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
                      {file.filename}
                    </h4>
                    <StatusBadge status={file.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {file.page_count !== undefined && file.page_count !== null && (
                      <>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Hash size={12} className="text-slate-400" />
                          {file.page_count} page{file.page_count !== 1 ? 's' : ''}
                        </span>
                        <span>·</span>
                      </>
                    )}
                    <span>{formatFileSize(file.file_size)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
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
