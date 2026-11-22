import { FileText, Image, StickyNote, File, Globe, Youtube } from 'lucide-react';

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

function typeIcon(fileType: string) {
  switch (fileType) {
    case 'youtube':
      return <Youtube size={18} className="text-red-500" />;
    case 'web':
      return <Globe size={18} className="text-blue-500" />;
    case 'image':
      return <Image size={18} />;
    case 'pdf':
      return <FileText size={18} />;
    case 'note':
      return <StickyNote size={18} />;
    default:
      return <File size={18} />;
  }
}

function typeLabel(fileType: string, contentType: string): string {
  if (fileType === 'youtube') return 'YouTube Search';
  if (fileType === 'web') return 'Web Action';
  if (fileType === 'image') return contentType === 'ocr' ? 'Image · OCR' : 'Image';
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'note') return 'Note';
  return fileType;
}

function formatDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function SearchResultItem({ hit, query, active, onSelect, onHover }: Props) {
  const updated = formatDate(hit.updated_at);

  return (
    <button
      type="button"
      className={`qs-item${active ? ' active' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <div className={`qs-icon ${hit.file_type}`}>{typeIcon(hit.file_type)}</div>
      <div className="qs-meta">
        <div className="qs-title">{highlight(hit.filename, query)}</div>
        <div className="qs-sub">
          <span>{typeLabel(hit.file_type, hit.content_type)}</span>
          {hit.page_number != null && <span>· p.{hit.page_number}</span>}
          {updated && <span>· {updated}</span>}
        </div>
        {hit.content_snippet && (
          <div className="qs-snippet">{highlight(hit.content_snippet, query)}</div>
        )}
      </div>
    </button>
  );
}

export default SearchResultItem;
