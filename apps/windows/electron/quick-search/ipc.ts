import { app, ipcMain, shell, net } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { hideQuickSearch, showQuickSearch, toggleQuickSearch } from './window';
import {
  getActiveShortcut,
  reregisterQuickSearchShortcut,
} from './shortcut';
import { loadSettings, saveSettings, type RecallAppSettings } from '../settings-store';

const BACKEND_URL = 'http://127.0.0.1:8000';

function isSafeLocalPath(filePath: unknown): filePath is string {
  return (
    typeof filePath === 'string' &&
    filePath.length > 0 &&
    filePath.length < 2048 &&
    !filePath.startsWith('note://') &&
    path.isAbsolute(filePath)
  );
}

async function backendGet(endpoint: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = net.request({ method: 'GET', url: `${BACKEND_URL}${endpoint}` });
    request.setHeader('Accept', 'application/json');
    let data = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => {
        data += chunk.toString();
      });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(parsed.detail || `HTTP ${response.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (err) {
          reject(err);
        }
      });
      response.on('error', reject);
    });
    request.on('error', reject);
    request.end();
  });
}

let registered = false;

export function registerQuickSearchIpc(options: {
  showMain: () => void;
  openSettings: () => void;
}): void {
  if (registered) return;
  registered = true;

  ipcMain.handle('quick-search:query', async (_event, rawQuery: unknown) => {
    if (typeof rawQuery !== 'string') {
      throw new Error('Invalid query');
    }
    const q = rawQuery.trim().slice(0, 200);
    if (!q) {
      return { results: [], total: 0, query: '', took_ms: 0 };
    }
    const params = new URLSearchParams({ q, limit: '10' });
    return backendGet(`/search/quick?${params.toString()}`);
  });

  ipcMain.handle('quick-search:open', async (_event, filePath: unknown) => {
    if (!isSafeLocalPath(filePath)) {
      return { ok: false, error: 'Invalid or unsupported path' };
    }
    if (!fs.existsSync(filePath)) {
      return { ok: false, error: 'File not found on disk' };
    }
    const err = await shell.openPath(filePath);
    if (err) {
      return { ok: false, error: err };
    }
    hideQuickSearch();
    return { ok: true };
  });

  ipcMain.handle('quick-search:hide', async () => {
    hideQuickSearch();
    return true;
  });

  ipcMain.handle('quick-search:show', async () => {
    showQuickSearch();
    return true;
  });

  ipcMain.handle('quick-search:toggle', async () => {
    toggleQuickSearch();
    return true;
  });

  ipcMain.handle('quick-search:get-shortcut', async () => {
    return {
      accelerator: getActiveShortcut(),
      settings: loadSettings(),
    };
  });

  ipcMain.handle(
    'quick-search:set-shortcut',
    async (_event, accelerator: unknown) => {
      if (typeof accelerator !== 'string' || !accelerator.trim()) {
        return { ok: false, error: 'Invalid accelerator' };
      }
      const result = reregisterQuickSearchShortcut(accelerator.trim());
      return result;
    }
  );

  ipcMain.handle('settings:get', async () => loadSettings());

  ipcMain.handle(
    'settings:update',
    async (_event, partial: unknown) => {
      if (!partial || typeof partial !== 'object') {
        throw new Error('Invalid settings payload');
      }
      const incoming = partial as Partial<RecallAppSettings>;
      const next = saveSettings({
        launchAtLogin:
          typeof incoming.launchAtLogin === 'boolean'
            ? incoming.launchAtLogin
            : undefined,
        quickSearchShortcut:
          typeof incoming.quickSearchShortcut === 'string'
            ? incoming.quickSearchShortcut
            : undefined,
        alternateShortcut:
          typeof incoming.alternateShortcut === 'string'
            ? incoming.alternateShortcut
            : undefined,
      });

      if (typeof incoming.launchAtLogin === 'boolean') {
        try {
          appSetLoginItem(incoming.launchAtLogin);
        } catch {
          // ignore platform limitations
        }
      }

      if (typeof incoming.quickSearchShortcut === 'string') {
        reregisterQuickSearchShortcut(incoming.quickSearchShortcut);
      }

      return next;
    }
  );

  ipcMain.handle('app:show-main', async () => {
    options.showMain();
    return true;
  });

  ipcMain.handle('app:open-settings', async () => {
    options.openSettings();
    return true;
  });
}

function appSetLoginItem(enabled: boolean): void {
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: true,
    path: process.execPath,
  });
}

export function applyLaunchAtLoginFromSettings(): void {
  const settings = loadSettings();
  try {
    appSetLoginItem(Boolean(settings.launchAtLogin));
  } catch {
    // ignore
  }
}
