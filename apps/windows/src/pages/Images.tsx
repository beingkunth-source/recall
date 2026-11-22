import { useCallback } from 'react';
import { Image as ImageIcon, Calendar, Plus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import { formatDate, formatFileSize, openLocalPath } from '@/components/FileCard';
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
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Images & Screenshots</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              OCR-indexed images, screenshots, and visual notes
            </p>
          </div>
          <div className="flex items-center gap-3">
            {files && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100/70 text-violet-700">
                {files.total} image{files.total !== 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              disabled={busy}
              className="liquid-btn inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-60"
            >
              <Plus size={16} />
              Add images
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="aspect-square liquid-card rounded-2xl animate-pulse"
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
          <div className="liquid-card flex flex-col items-center justify-center py-20 text-center border border-dashed border-violet-200/80 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-100/70 flex items-center justify-center mb-4 text-violet-600 shadow-sm">
              <ImageIcon size={30} />
            </div>
            <p className="text-base text-slate-800 font-semibold">No images indexed</p>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm">
              Drop screenshots or photos here. Tesseract OCR will automatically extract the text so you can search them.
            </p>
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              className="liquid-btn px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35"
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
                onClick={() => void openLocalPath(file.file_path)}
                className="liquid-card rounded-2xl overflow-hidden text-left group hover:scale-[1.02] transition-all duration-200"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center border-b border-white/60">
                  <ImageIcon
                    size={36}
                    className="text-violet-400 group-hover:scale-110 group-hover:text-violet-600 transition-all duration-300"
                  />
                </div>
                <div className="p-3.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-800 truncate flex-1 group-hover:text-violet-700 transition-colors">
                      {file.filename}
                    </h4>
                    <StatusBadge status={file.status} />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={12} className="text-slate-400" />
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
