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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog backdrop"
        className="absolute inset-0 bg-slate-900/35 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg liquid-card rounded-3xl border border-white/80 shadow-[0_20px_60px_rgba(76,29,149,0.18)] p-6 space-y-4 animate-[fadeUp_260ms_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100/80 flex items-center justify-center shadow-sm">
              <PenSquare size={20} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800">Create note</h2>
              <p className="text-xs text-slate-500">Saved notes are searchable instantly</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <label htmlFor="note-title" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Title
          </label>
          <input
            id="note-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting notes, recipe, idea…"
            autoFocus
            className="w-full h-11 px-3.5 bg-white/70 border border-slate-200/80 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label htmlFor="note-body" className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
            Content
          </label>
          <textarea
            id="note-body"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            placeholder="Write anything you want to find later…"
            className="w-full px-3.5 py-3 bg-white/70 border border-slate-200/80 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 resize-y min-h-[160px] focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 focus:bg-white transition-all leading-relaxed"
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="liquid-btn px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !content.trim()}
            className="liquid-btn px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-medium shadow-md shadow-violet-500/25 hover:shadow-lg hover:shadow-violet-500/35 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy ? 'Saving…' : 'Save note'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateNoteModal;
