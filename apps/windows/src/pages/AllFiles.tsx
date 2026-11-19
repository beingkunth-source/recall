import { useCallback } from 'react';
import { FolderOpen, Plus } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import { formatFileSize, formatDate } from '@/components/FileCard';
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

  const openFile = async (file: FileRecord) => {
    if (!file.file_path || file.file_path.startsWith('note://')) return;
    await window.recall?.shell?.openPath(file.file_path);
  };

  return (
    <DropZone onDropFiles={(list) => void addDroppedFiles(list)} disabled={busy}>
      <div className="space-y-6 page-enter min-h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">All Files</h1>
            <p className="text-sm text-muted mt-1">Browse all your indexed files</p>
          </div>
          <div className="flex items-center gap-3">
            {files && (
              <span className="text-sm text-muted">
                {files.total} file{files.total !== 1 ? 's' : ''}
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

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-12">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && files && files.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-slate-200 rounded-xl">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FolderOpen size={28} className="text-muted" />
            </div>
            <p className="text-sm text-slate-600 font-medium">No files found</p>
            <p className="text-xs text-muted mt-1 mb-4">
              Drop files here or click Add to start indexing
            </p>
            <button
              type="button"
              onClick={() => void addFilesViaDialog()}
              className="px-3.5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
            >
              Add files
            </button>
          </div>
        )}

        {!loading && !error && files && files.items.length > 0 && (
          <div className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Size
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Date Added
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {files.items.map((file: FileRecord) => (
                  <tr
                    key={file.id}
                    onClick={() => void openFile(file)}
                    className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-default cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800 truncate block max-w-xs">
                        {file.filename}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted">
                        {getFileTypeLabel(file.file_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted">
                        {formatFileSize(file.file_size)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted">
                        {formatDate(file.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
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
