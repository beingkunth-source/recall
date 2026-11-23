import { useState } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  File,
  Globe,
  Youtube,
  Calculator,
  Terminal,
  Copy,
  FolderOpen,
  ExternalLink,
  CornerDownLeft,
  Check,
  Sparkles,
} from 'lucide-react';
import type { QuickHit } from './SearchResultItem';

interface Props {
  hit: QuickHit | null;
  onOpen: (hit: QuickHit) => void;
  onShowInFolder: (hit: QuickHit) => void;
}

function getLargeIcon(fileType: string) {
  switch (fileType) {
    case 'folder':
      return <Folder size={32} className="text-amber-400" />;
    case 'pdf':
      return <FileText size={32} className="text-red-400" />;
    case 'image':
      return <ImageIcon size={32} className="text-blue-400" />;
    case 'youtube':
      return <Youtube size={32} className="text-red-500" />;
    case 'web':
    case 'google':
      return <Globe size={32} className="text-sky-400" />;
    case 'calc':
      return <Calculator size={32} className="text-emerald-400" />;
    case 'terminal':
      return <Terminal size={32} className="text-purple-400" />;
    case 'ai':
      return <Sparkles size={32} className="text-violet-400" />;
    default:
      return <File size={32} className="text-slate-300" />;
  }
}

export default function PreviewPane({ hit, onOpen, onShowInFolder }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!hit?.local_path) return;
    try {
      await navigator.clipboard.writeText(hit.local_path);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore clipboard error */
    }
  };

  if (!hit) {
    return (
      <div className="qs-fluent-preview-empty">
        <div className="qs-fluent-empty-badge">
          <Sparkles size={28} className="text-blue-400" />
        </div>
        <h3 className="qs-fluent-empty-title">Recall Quick Search</h3>
        <p className="qs-fluent-empty-desc">
          Instant deep search across indexed files, OCR screenshot text, scanned PDFs, and local notes.
        </p>
        <div className="qs-fluent-shortcuts">
          <div className="qs-fluent-shortcut-row">
            <span className="qs-kbd-chip">↑↓</span>
            <span>Navigate results</span>
          </div>
          <div className="qs-fluent-shortcut-row">
            <span className="qs-kbd-chip">Enter</span>
            <span>Open selected item</span>
          </div>
          <div className="qs-fluent-shortcut-row">
            <span className="qs-kbd-chip">Esc</span>
            <span>Close search</span>
          </div>
        </div>
      </div>
    );
  }

  const isWebOrAction =
    hit.file_type === 'youtube' ||
    hit.file_type === 'web' ||
    hit.file_type === 'google' ||
    hit.file_type === 'terminal' ||
    hit.file_type === 'calc';

  return (
    <div className="qs-fluent-preview-content">
      {/* Top File Header */}
      <div className="qs-fluent-preview-header">
        <div className={`qs-fluent-preview-icon ${hit.file_type}`}>
          {getLargeIcon(hit.file_type)}
        </div>
        <div className="qs-fluent-preview-title-area">
          <h2 className="qs-fluent-preview-title" title={hit.filename}>
            {hit.filename}
          </h2>
          <p className="qs-fluent-preview-path" title={hit.local_path}>
            {hit.local_path}
          </p>
        </div>
      </div>

      {/* Primary and Secondary Action Buttons */}
      <div className="qs-fluent-actions-row">
        <button
          type="button"
          className="qs-fluent-btn-primary"
          onClick={() => onOpen(hit)}
        >
          {isWebOrAction ? <ExternalLink size={15} /> : <CornerDownLeft size={15} />}
          <span>{isWebOrAction ? 'Execute Action' : 'Open file'}</span>
          <span className="qs-fluent-key-hint">↵</span>
        </button>

        {!isWebOrAction && (
          <button
            type="button"
            className="qs-fluent-btn-secondary"
            onClick={() => onShowInFolder(hit)}
            title="Open folder location"
          >
            <FolderOpen size={15} />
            <span>Show in folder</span>
          </button>
        )}

        <button
          type="button"
          className="qs-fluent-btn-secondary"
          onClick={handleCopy}
          title="Copy path to clipboard"
        >
          {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          <span>{copied ? 'Copied' : 'Copy path'}</span>
        </button>
      </div>

      {/* Content / OCR Text Snippet */}
      {hit.content_snippet && (
        <div className="qs-fluent-snippet-container">
          <div className="qs-fluent-snippet-header">
            <span>{hit.content_type === 'ocr' ? 'OCR Extracted Text' : 'Content Snippet'}</span>
            {hit.page_number != null && <span>Page {hit.page_number}</span>}
          </div>
          <div className="qs-fluent-snippet-body">
            {hit.content_snippet}
          </div>
        </div>
      )}

      {/* Metadata Badges */}
      <div className="qs-fluent-meta-grid">
        <div className="qs-fluent-meta-item">
          <span className="qs-fluent-meta-label">Type</span>
          <span className="qs-fluent-meta-val uppercase">{hit.file_type}</span>
        </div>
        {hit.score != null && (
          <div className="qs-fluent-meta-item">
            <span className="qs-fluent-meta-label">Relevance</span>
            <span className="qs-fluent-meta-val">{Math.round(hit.score * 100)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
