import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

export interface RecallAppSettings {
  launchAtLogin: boolean;
  quickSearchShortcut: string;
  alternateShortcut: string;
  aiProvider: 'local' | 'ollama' | 'openai' | 'gemini';
  ollamaEndpoint: string;
  ollamaModel: string;
  apiKey: string;
  apiModel: string;
}

const DEFAULTS: RecallAppSettings = {
  launchAtLogin: false,
  quickSearchShortcut: 'Control+Space',
  alternateShortcut: 'Control+Shift+Space',
  aiProvider: 'ollama',
  ollamaEndpoint: 'http://127.0.0.1:11434',
  ollamaModel: 'llama3.2',
  apiKey: '',
  apiModel: 'gpt-4o-mini',
};

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'settings.json');
}

export function loadSettings(): RecallAppSettings {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<RecallAppSettings>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(partial: Partial<RecallAppSettings>): RecallAppSettings {
  const next = { ...loadSettings(), ...partial };
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(next, null, 2), 'utf8');
  return next;
}
