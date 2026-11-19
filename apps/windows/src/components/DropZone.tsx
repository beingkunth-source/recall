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
        <div className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-primary-400 bg-primary-50/80 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 pointer-events-none">
          <Upload size={28} className="text-primary-600" />
          <p className="text-sm font-medium text-primary-700">Drop to index</p>
        </div>
      )}
    </div>
  );
}

export default DropZone;
