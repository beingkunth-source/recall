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

function typeIcon(fileType: string) {
  switch (fileType) {
    case 'folder':
      return <Folder size={17} className="text-amber-400" />;
    case 'calc':
      return <Calculator size={17} className="text-emerald-400" />;
    case 'ai':
      return <Sparkles size={17} className="text-violet-400" />;
    case 'youtube':
      return <Youtube size={17} className="text-red-500" />;
    case 'web':
    case 'google':
      return <Globe size={17} className="text-sky-400" />;
    case 'terminal':
      return <Terminal size={17} className="text-purple-400" />;
    case 'image':
      return <ImageIcon size={17} className="text-blue-400" />;
    case 'pdf':
      return <FileText size={17} className="text-red-400" />;
    case 'note':
      return <StickyNote size={17} className="text-amber-300" />;
    default:
      return <File size={17} className="text-slate-400" />;
  }
}

function SearchResultItem({ hit, query, active, onSelect, onHover }: Props) {
  return (
    <button
      type="button"
      className={`qs-fluent-row${active ? ' active' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <div className={`qs-fluent-icon-box ${hit.file_type}`}>
        {typeIcon(hit.file_type)}
      </div>
      <div className="qs-fluent-meta">
        <div className="qs-fluent-title">{highlight(hit.filename, query)}</div>
        <div className="qs-fluent-subtitle" title={hit.local_path}>
          {hit.local_path}
        </div>
      </div>
    </button>
  );
}

export default SearchResultItem;
