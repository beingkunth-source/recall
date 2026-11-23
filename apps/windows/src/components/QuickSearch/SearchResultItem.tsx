import {
  FileText,
  Image as ImageIcon,
  StickyNote,
  File,
  Globe,
  Youtube,
  Calculator,
  Sparkles,
  Folder,
  Terminal,
} from 'lucide-react';
import { formatDate } from '@/components/FileCard';

export interface QuickHit {
  file_id: string;
  filename: string;
  file_type: string;
  content_snippet: string;
  content_type: string;
  page_number?: number | null;
  local_path: string;
  score?: number;
  updated_at?: string | null;
}

interface Props {
  hit: QuickHit;
  query: string;
  active: boolean;
  index?: number;
  onSelect: () => void;
  onHover: () => void;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'ig');
  const parts = text.split(re);
  const qLower = query.toLowerCase();
  return parts.map((part, i) =>
    part.toLowerCase() === qLower ? (
      <mark key={`${i}-${part}`}>{part}</mark>
    ) : (
      <span key={`${i}-${part}`}>{part}</span>
    )
  );
}

function renderSpotlightIcon(fileType: string) {
  switch (fileType) {
    case 'folder':
      return (
        <div className="spotlight-icon-box folder">
          <Folder size={20} className="text-amber-500 fill-amber-500/20" />
        </div>
      );
    case 'pdf':
      return (
        <div className="spotlight-icon-box pdf">
          <FileText size={20} className="text-red-500" />
          <span className="spotlight-icon-tag">PDF</span>
        </div>
      );
    case 'image':
      return (
        <div className="spotlight-icon-box image">
          <ImageIcon size={20} className="text-blue-500" />
        </div>
      );
    case 'youtube':
      return (
        <div className="spotlight-icon-box youtube">
          <Youtube size={20} className="text-red-600 fill-red-600" />
        </div>
      );
    case 'web':
    case 'google':
      return (
        <div className="spotlight-icon-box web">
          <Globe size={20} className="text-sky-500" />
        </div>
      );
    case 'calc':
      return (
        <div className="spotlight-icon-box calc">
          <Calculator size={20} className="text-emerald-500" />
        </div>
      );
    case 'terminal':
      return (
        <div className="spotlight-icon-box terminal">
          <Terminal size={20} className="text-indigo-600" />
        </div>
      );
    case 'ai':
      return (
        <div className="spotlight-icon-box ai">
          <Sparkles size={20} className="text-violet-500" />
        </div>
      );
    default:
      return (
        <div className="spotlight-icon-box doc">
          <File size={20} className="text-slate-500" />
        </div>
      );
  }
}

function formatSubtitle(hit: QuickHit): string {
  if (hit.file_type === 'youtube') return 'YouTube · Search Videos in Browser';
  if (hit.file_type === 'google') return 'Google · Search Web';
  if (hit.file_type === 'web') return hit.local_path.replace(/^https?:\/\//, '');
  if (hit.file_type === 'calc') return 'Calculator · Press Enter to Copy';
  if (hit.file_type === 'terminal') return 'PowerShell · Execute Command';

  const parts: string[] = [];
  if (hit.file_type === 'pdf') parts.push('PDF Document');
  else if (hit.file_type === 'image') parts.push(hit.content_type === 'ocr' ? 'Image · OCR' : 'Image');
  else if (hit.file_type === 'note') parts.push('Note');
  else if (hit.file_type === 'folder') parts.push('Folder');
  else parts.push('File');

  if (hit.page_number != null) parts.push(`Page ${hit.page_number}`);
  if (hit.updated_at) {
    const formatted = formatDate(hit.updated_at);
    if (formatted) parts.push(formatted);
  }

  if (hit.local_path && !hit.local_path.startsWith('http')) {
    // Show parent directory name for clean Mac-like path
    const segs = hit.local_path.replace(/\\/g, '/').split('/');
    if (segs.length > 1) {
      parts.push(segs.slice(-2, -1)[0]);
    }
  }

  return parts.join(' · ');
}

function SearchResultItem({ hit, query, active, index = 0, onSelect, onHover }: Props) {
  return (
    <button
      type="button"
      className={`spotlight-row${active ? ' active' : ''}`}
      style={{ animationDelay: `${Math.min(index, 8) * 18}ms` }}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      {renderSpotlightIcon(hit.file_type)}
      <div className="spotlight-row-meta">
        <div className="spotlight-row-title">{highlight(hit.filename, query)}</div>
        <div className="spotlight-row-subtitle" title={hit.local_path}>
          {formatSubtitle(hit)}
        </div>
      </div>
    </button>
  );
}

export default SearchResultItem;
