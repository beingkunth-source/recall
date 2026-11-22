import { useCallback, useState, type ReactNode, type DragEvent } from 'react';
import { Upload } from 'lucide-react';

interface DropZoneProps {
  onDropFiles: (files: FileList) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}

function DropZone({ onDropFiles, children, className = '', disabled }: DropZoneProps) {
  const [active, setActive] = useState(false);

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setActive(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActive(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.stopPropagation();
      setActive(false);
      if (e.dataTransfer.files?.length) {
        onDropFiles(e.dataTransfer.files);
      }
    },
    [disabled, onDropFiles]
  );

  return (
    <div
      className={`relative ${className}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
      {active && (
        <div className="absolute inset-0 z-30 rounded-3xl border-2 border-dashed border-violet-400/80 bg-violet-500/10 backdrop-blur-md flex flex-col items-center justify-center gap-3 pointer-events-none animate-[fadeUp_200ms_cubic-bezier(0.22,1,0.36,1)]">
          <div className="w-14 h-14 rounded-2xl bg-white/80 shadow-lg shadow-violet-500/20 flex items-center justify-center text-violet-600">
            <Upload size={28} className="animate-bounce" />
          </div>
          <p className="text-base font-bold text-violet-900 tracking-tight">Drop files to index</p>
          <p className="text-xs text-violet-700/80">Screenshots, PDFs, or documents</p>
        </div>
      )}
    </div>
  );
}

export default DropZone;
