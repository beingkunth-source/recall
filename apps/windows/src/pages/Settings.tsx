import { useState, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Cpu,
  Info,
  FolderOpen,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { api } from '@/services/api';
import type { HealthResponse, StatsResponse } from '@/services/api';

interface ToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function ToggleOption({ label, description, enabled, onToggle }: ToggleProps) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-muted mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className="text-primary-500 hover:text-primary-600 transition-default"
      >
        {enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-slate-300" />}
      </button>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function Settings() {
  const [autoProcess, setAutoProcess] = useState(true);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [tesseractPath, setTesseractPath] = useState('C:\\Program Files\\Tesseract-OCR\\tesseract.exe');

  const { data: health } = useApi<HealthResponse>(
    useCallback(() => api.getHealth(), [])
  );

  const { data: stats } = useApi<StatsResponse>(
    useCallback(() => api.getStats(), [])
  );

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">Settings</h1>
        <p className="text-sm text-muted mt-1">
          Configure Recall preferences and options
        </p>
      </div>

      {/* General */}
      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <SettingsIcon size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">General</h2>
        </div>
        <div className="px-5 divide-y divide-slate-100">
          <ToggleOption
            label="Auto-process new files"
            description="Automatically index and process files when they are added"
            enabled={autoProcess}
            onToggle={() => setAutoProcess((prev) => !prev)}
          />
          <ToggleOption
            label="OCR Processing"
            description="Enable optical character recognition for images"
            enabled={ocrEnabled}
            onToggle={() => setOcrEnabled((prev) => !prev)}
          />
        </div>
      </section>

      {/* Processing */}
      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Cpu size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">Processing</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label
              htmlFor="tesseract-path"
              className="block text-sm font-medium text-slate-800 mb-1.5"
            >
              Tesseract Path
            </label>
            <input
              id="tesseract-path"
              type="text"
              value={tesseractPath}
              onChange={(e) => setTesseractPath(e.target.value)}
              className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500 transition-default"
            />
            <p className="text-xs text-muted mt-1">
              Path to the Tesseract OCR executable
            </p>
          </div>
        </div>
      </section>

      {/* Storage */}
      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Database size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">Storage</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FolderOpen size={16} className="text-muted" />
              <span className="text-sm text-slate-700">Database Location</span>
            </div>
            <span className="text-sm text-muted font-mono">
              ~/.recall/recall.db
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Total Files</span>
            <span className="text-sm text-muted">
              {stats?.total_files ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Total Storage Used</span>
            <span className="text-sm text-muted">
              {stats ? formatBytes(stats.total_size) : '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Indexed (Completed)</span>
            <span className="text-sm text-primary-600 font-medium">
              {stats?.completed ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Pending</span>
            <span className="text-sm text-amber-600 font-medium">
              {stats?.pending ?? '—'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Failed</span>
            <span className="text-sm text-red-600 font-medium">
              {stats?.failed ?? '—'}
            </span>
          </div>
        </div>
      </section>

      {/* About */}
      <section className="bg-surface rounded-lg border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
          <Info size={18} className="text-muted" />
          <h2 className="text-sm font-semibold text-slate-700">About</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Application</span>
            <span className="text-sm font-medium text-slate-800">Recall</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Version</span>
            <span className="text-sm text-muted font-mono">0.1.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Backend Status</span>
            <span
              className={`text-sm font-medium ${
                health?.status === 'healthy' || health?.status === 'ok'
                  ? 'text-primary-600'
                  : 'text-red-500'
              }`}
            >
              {health?.status === 'healthy' || health?.status === 'ok'
                ? 'Connected'
                : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-700">Description</span>
            <span className="text-sm text-muted">
              Personal Digital Search Engine
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Settings;
