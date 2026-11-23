import { Image as ImageIcon, FileText, StickyNote, File, ExternalLink, Eye, MoreHorizontal } from 'lucide-react';
import StatusBadge from './StatusBadge';

interface FileCardProps {
  filename: string;
  fileType: string;
  fileSize: number;
  date: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  snippet?: string;
  filePath?: string;
  className?: string;
  style?: React.CSSProperties;
}

function getFileIcon(fileType: string) {
  switch (fileType) {
    case 'image':
      return <ImageIcon size={19} className="text-violet-500" />;
    case 'pdf':
      return <FileText size={19} className="text-rose-500" />;
    case 'note':
      return <StickyNote size={19} className="text-amber-500" />;
    default:
      return <File size={19} className="text-slate-500" />;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  return `${size.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function openLocalPath(filePath?: string): Promise<void> {
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
  className = '',
  style,
}: FileCardProps) {
  const canOpen = Boolean(filePath && !filePath.startsWith('note://') && window.recall?.shell);

  return (
    <div
      style={style}
      className={`w-full bg-white/75 backdrop-blur-md border border-white/85 rounded-2xl p-3 flex items-center justify-between shadow-sm hover:bg-white/90 hover:shadow-md transition-all duration-200 group ${className}`}
    >
      {/* Left File Information */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100/80 text-violet-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          {getFileIcon(fileType)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h4
              onClick={() => void openLocalPath(filePath)}
              className={`text-[13.5px] font-semibold text-slate-800 truncate tracking-tight ${
                canOpen ? 'cursor-pointer hover:text-red-500 transition-colors' : ''
              }`}
              title={filename}
            >
              {filename}
            </h4>
            <StatusBadge status={status} />
          </div>
          <div className="flex items-center gap-2 text-[11.5px] text-slate-400 font-medium">
            <span>{formatFileSize(fileSize)}</span>
            <span>·</span>
            <span>{formatDate(date)}</span>
          </div>
        </div>
      </div>

      {/* Right Action Icons */}
      <div className="flex items-center gap-1 text-slate-400 flex-shrink-0 ml-3">
        {canOpen && (
          <>
            <button
              type="button"
              onClick={() => void openLocalPath(filePath)}
              title="Preview / Open"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <Eye size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (filePath && window.recall?.shell?.showItemInFolder) {
                  void window.recall.shell.showItemInFolder(filePath);
                }
              }}
              title="Open folder location"
              className="w-8 h-8 rounded-lg hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
            >
              <ExternalLink size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          title="More options"
          className="w-8 h-8 rounded-lg hover:bg-slate-100 hover:text-slate-700 flex items-center justify-center transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>
    </div>
  );
}

export default FileCard;
export { formatFileSize, formatDate, getFileIcon };
