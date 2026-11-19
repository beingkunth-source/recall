import { useEffect, useState } from 'react';
import { X, PenSquare } from 'lucide-react';

interface CreateNoteModalProps {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string) => Promise<boolean> | boolean;
}

function CreateNoteModal({ open, busy, onClose, onSubmit }: CreateNoteModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (open) {
      setTitle('');
      setContent('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onSubmit(title, content);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
              <PenSquare size={18} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Create note</h2>
              <p className="text-xs text-muted">Saved notes are searchable instantly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-slate-700 transition-default"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <label htmlFor="note-title" className="block text-xs font-medium text-slate-600 mb-1.5">
            Title
          </label>
          <input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting notes, recipe, idea…"
            autoFocus
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-default"
          />
        </div>

        <div>
          <label htmlFor="note-body" className="block text-xs font-medium text-slate-600 mb-1.5">
            Content
          </label>
          <textarea
            id="note-body"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Write anything you want to find later…"
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-default"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-default"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-default"
          >
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateNoteModal;
