import { Image, FileText, StickyNote, File, ExternalLink } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface FileCardProps {
  filename: string;
  fileType: string;
  fileSize: number;
  date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  snippet?: string;
  filePath?: string;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return <Image size={20} className="text-blue-500" />;
    case 'pdf':
      return <FileText size={20} className="text-red-500" />;
    case 'note':
      return <StickyNote size={20} className="text-amber-500" />;
    default:
      return <File size={20} className="text-muted" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

async function openLocalPath(filePath?: string) {
  if (!filePath || filePath.startsWith('note://')) return;
  if (window.recall?.shell?.openPath) {
    await window.recall.shell.openPath(filePath);
  }
}

function FileCard({
  filename,
  fileType,
  fileSize,
  date,
  status,
  snippet,
  filePath,
}: FileCardProps) {
  const canOpen = Boolean(filePath && !filePath.startsWith('note://') && window.recall?.shell);

  return (
    <button
      type="button"
      onClick={() => void openLocalPath(filePath)}
      disabled={!canOpen}
      className={`w-full text-left flex items-start gap-3 p-4 bg-surface rounded-lg border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-default group ${
        canOpen ? 'cursor-pointer' : 'cursor-default'
      }`}
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center">
        {getFileIcon(fileType)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-slate-800 truncate">{filename}</h4>
          <StatusBadge status={status} />
          {canOpen && (
            <ExternalLink
              size={14}
              className="text-slate-300 opacity-0 group-hover:opacity-100 transition-default ml-auto flex-shrink-0"
            />
          )}
        </div>
        {snippet && (
          <p className="text-xs text-muted line-clamp-2 mb-1.5">{snippet}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-muted">
          <span>{formatFileSize(fileSize)}</span>
          <span>·</span>
          <span>{formatDate(date)}</span>
        </div>
      </div>
    </button>
  );
}

export default FileCard;
export { formatFileSize, formatDate, getFileIcon };
