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
          <h1 className="font-display text-2xl font-bold text-slate-900 tracking-tight">Personal Notes</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quick notes, thoughts, and text snippets indexed for instant search
          </p>
        </div>
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="liquid-btn inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30"
        >
          <PenSquare size={16} />
          Create Note
        </button>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 liquid-card rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="liquid-card rounded-2xl p-8 text-center">
          <p className="text-sm text-rose-600 font-medium">{error}</p>
        </div>
      )}

      {!loading && !error && files && files.items.length === 0 && (
        <div className="liquid-card flex flex-col items-center justify-center py-20 text-center border border-dashed border-amber-200/80 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-amber-100/70 flex items-center justify-center mb-4 text-amber-600 shadow-sm">
            <StickyNote size={30} />
          </div>
          <p className="text-base text-slate-800 font-semibold">No notes yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-5 max-w-sm">
            Create notes, draft ideas, or paste clipboard text. Recall indexes everything locally for full-text lookup.
          </p>
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="liquid-btn px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35"
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
              className="liquid-card p-5 rounded-2xl group transition-all duration-200 hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-100/80 flex items-center justify-center text-amber-600">
                    <StickyNote size={16} />
                  </div>
                  <h4 className="text-sm font-semibold text-slate-800">{file.filename}</h4>
                </div>
                <StatusBadge status={file.status} />
              </div>
              {file.extracted_text && (
                <p className="text-xs text-slate-600 line-clamp-3 pl-10 mb-3 bg-white/40 p-2 rounded-xl border border-white/60 leading-relaxed font-mono">
                  {file.extracted_text}
                </p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-10">
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
