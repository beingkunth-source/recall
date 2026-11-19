import { useCallback, useState } from 'react';
import { StickyNote, PenSquare, Calendar } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useLibraryActions } from '@/hooks/useLibraryActions';
import { api } from '@/services/api';
import { formatDate } from '@/components/FileCard';
import StatusBadge from '@/components/StatusBadge';
import CreateNoteModal from '@/components/CreateNoteModal';
import type { FileRecord, PaginatedResponse } from '@/services/api';

function Notes() {
  const [noteOpen, setNoteOpen] = useState(false);

  const {
    data: files,
    loading,
    error,
    refetch,
  } = useApi<PaginatedResponse<FileRecord>>(
    useCallback(
      () => api.getFiles({ file_type: 'note', page_size: '50', sort: 'created_at', order: 'desc' }),
      []
    )
  );

  const { busy, createNote } = useLibraryActions(refetch);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Notes</h1>
          <p className="text-sm text-muted mt-1">
            Your personal notes and text snippets
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
        >
          <PenSquare size={16} />
          Create Note
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-12">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!loading && !error && files && files.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-amber-200/80 rounded-xl bg-amber-50/40">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <StickyNote size={28} className="text-amber-400" />
          </div>
          <p className="text-sm text-slate-600 font-medium">No notes yet</p>
          <p className="text-xs text-muted mt-1 mb-4">
            Create your first note to make it searchable
          </p>
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="px-3.5 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-default"
          >
            Create note
          </button>
        </div>
      )}

      {!loading && !error && files && files.items.length > 0 && (
        <div className="space-y-3">
          {files.items.map((file: FileRecord) => (
            <div
              key={file.id}
              className="p-5 bg-surface rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-default"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <StickyNote size={16} className="text-amber-500 flex-shrink-0" />
                  <h4 className="text-sm font-medium text-slate-800">{file.filename}</h4>
                </div>
                <StatusBadge status={file.status} />
              </div>
              {file.extracted_text && (
                <p className="text-sm text-muted line-clamp-3 pl-6 mb-2">
                  {file.extracted_text}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted pl-6">
                <Calendar size={12} />
                <span>{formatDate(file.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateNoteModal
        open={noteOpen}
        busy={busy}
        onClose={() => setNoteOpen(false)}
        onSubmit={createNote}
      />
    </div>
  );
}

export default Notes;
