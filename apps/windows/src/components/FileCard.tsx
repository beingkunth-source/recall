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
      return <Image size={20} className="text-violet-500" />;
    case 'pdf':
      return <FileText size={20} className="text-rose-500" />;
    case 'note':
      return <StickyNote size={20} className="text-amber-500" />;
    default:
      return <File size={20} className="text-slate-500" />;
  }
}

function getIconBg(fileType: string) {
  switch (fileType) {
    case 'image':
      return 'bg-violet-100/70 text-violet-600';
    case 'pdf':
      return 'bg-rose-100/70 text-rose-600';
    case 'note':
      return 'bg-amber-100/70 text-amber-600';
    default:
      return 'bg-slate-100/70 text-slate-600';
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
      className={`liquid-card w-full text-left flex items-start gap-3.5 p-4 rounded-2xl group transition-all duration-200 ${
        canOpen ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default'
      }`}
    >
      <div
        className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${getIconBg(
          fileType
        )}`}
      >
        {getFileIcon(fileType)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-semibold text-slate-800 truncate tracking-tight">{filename}</h4>
          <StatusBadge status={status} />
          {canOpen && (
            <ExternalLink
              size={14}
              className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ml-auto flex-shrink-0"
            />
          )}
        </div>
        {snippet && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-2 leading-relaxed bg-white/40 rounded-lg p-1.5 border border-white/60">
            {snippet}
          </p>
        )}
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <span className="font-medium text-slate-600">{formatFileSize(fileSize)}</span>
          <span>·</span>
          <span>{formatDate(date)}</span>
        </div>
      </div>
    </button>
  );
}

export default FileCard;
export { formatFileSize, formatDate, getFileIcon };
