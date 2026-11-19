import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = ++toastId;
      setItems((prev) => [...prev, { id, message, kind }]);
      window.setTimeout(() => dismiss(id), 3500);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg shadow-lg border text-sm animate-[slideIn_180ms_ease-out] ${
              item.kind === 'success'
                ? 'bg-white border-primary-200 text-slate-800'
                : item.kind === 'error'
                  ? 'bg-white border-red-200 text-slate-800'
                  : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            {item.kind === 'success' ? (
              <CheckCircle2 size={18} className="text-primary-500 flex-shrink-0 mt-0.5" />
            ) : item.kind === 'error' ? (
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 size={18} className="text-slate-400 flex-shrink-0 mt-0.5" />
            )}
            <p className="flex-1 leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="text-muted hover:text-slate-700 transition-default"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
