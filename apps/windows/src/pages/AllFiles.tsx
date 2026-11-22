import { useCallback } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import { formatFileSize, formatDate, openLocalPath } from '@/components/FileCard';
import StatusBadge from '@/components/StatusBadge';
import DropZone from '@/components/DropZone';
import type { FileRecord, PaginatedResponse } from '@/services/api';

function getFileTypeLabel(fileType: string): string {
  switch (fileType) {
    case 'image':
      return 'Image';
    case 'pdf':
      return 'PDF';
    case 'note':
      return 'Note';
    default:
      return fileType.charAt(0).toUpperCase() + fileType.slice(1);
  }
}

function AllFiles() {
  const {
    data: files,
    loading,
    error,
    refetch,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(
      () => api.getFiles({ page_size: '50', sort: 'created_at', order: 'desc' }),
      []
    )
  );

  const { busy, addFilesViaDialog, addDroppedFiles } = useLibraryActions(refetch);

  return (
    <DropZone onDropFiles={(list) => void addDroppedFiles(list)} disabled={busy}>
      <div className="space-y-6 page-enter min-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">All Files</h1>
            <p className="text-sm text-slate-500 mt-0.5">Browse all your indexed files and documents</p>
          </div>
          <div className="flex items-center gap-3">
            {files && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100/70 text-violet-700">
                {files.total} file{files.total !== 1 ? 's' : ''}
              </span>
            )}
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              disabled={busy}
              className="liquid-btn inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 disabled:opacity-60"
            >
              <Plus size={16} />
              Add files
            </button>
          </div>
        </div>

        {loading && (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 liquid-card rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="liquid-card rounded-2xl p-8 text-center">
            <p className="text-sm text-rose-600 font-medium">{error}</p>
          </div>
        )}

        {!loading && !error && files && files.items.length === 0 && (
          <div className="liquid-card flex flex-col items-center justify-center py-20 text-center border border-dashed border-violet-200/80 rounded-3xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-100/70 flex items-center justify-center mb-4 text-violet-600 shadow-sm">
              <FolderOpen size={30} />
            </div>
            <p className="text-base text-slate-800 font-semibold">No files indexed yet</p>
            <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm">
              Drag and drop screenshots, PDFs, or documents anywhere, or click below to choose files.
            </p>
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              className="liquid-btn px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35"
            >
              Add files
            </button>
          </div>
        )}

        {!loading && !error && files && files.items.length > 0 && (
          <div className="liquid-card rounded-2xl overflow-hidden border border-white/80 shadow-md shadow-violet-950/5">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/60 bg-white/40">
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                {files.items.map((file: FileRecord) => (
                  <tr
                    key={file.id}
                    onClick={() => void openLocalPath(file.file_path)}
                    className="hover:bg-violet-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-sm font-semibold text-slate-800 truncate block max-w-md group-hover:text-violet-700 transition-colors">
                        {file.filename}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                        {getFileTypeLabel(file.file_type)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-medium text-slate-500">
                        {formatFileSize(file.file_size)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-slate-500">
                        {formatDate(file.created_at)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={file.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DropZone>
  );
}

export default AllFiles;
