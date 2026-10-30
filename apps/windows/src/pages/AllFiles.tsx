import { useCallback } from 'react';
import { FolderOpen } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import { formatFileSize, formatDate } from '@/components/FileCard';
import StatusBadge from '@/components/StatusBadge';
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
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(
      () => api.getFiles({ page_size: '50', sort: 'created_at', order: 'desc' }),
      []
    )
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">All Files</h1>
          <p className="text-sm text-muted mt-1">
            Browse all your indexed files
          </p>
        </div>
        {files && (
          <span className="text-sm text-muted">
            {files.total} file{files.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-slate-50 rounded-lg animate-pulse" />
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
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <FolderOpen size={28} className="text-muted" />
          </div>
          <p className="text-sm text-slate-600 font-medium">No files found</p>
          <p className="text-xs text-muted mt-1">
            Add files to start indexing and searching
          </p>
        </div>
      )}

      {/* Table */}
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
                  className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50/50 transition-default"
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
  );
}

export default AllFiles;
