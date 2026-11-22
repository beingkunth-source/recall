import { app, BrowserWindow, ipcMain, dialog, shell, net } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import {
  createQuickSearchWindow,
  destroyQuickSearchWindow,
  showQuickSearch,
  toggleQuickSearch,
} from './quick-search/window';
import {
  registerQuickSearchShortcut,
  unregisterQuickSearchShortcut,
} from './quick-search/shortcut';
import { createTray, destroyTray } from './quick-search/tray';
import {
  applyLaunchAtLoginFromSettings,
  registerQuickSearchIpc,
} from './quick-search/ipc';
import { loadAppIcon } from './icon';
import { resolvePreload } from './preload-path';
import { startBackendInBackground, stopBackend } from './backend-process';

app.setAppUserModelId('com.recall.app');

const BACKEND_URL = 'http://127.0.0.1:8000';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;


function createWindow(): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(false);
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    title: 'Recall',
    backgroundColor: '#f3f0f8',
    icon: loadAppIcon(),
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: resolvePreload(),
    },
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`[Recall] mainWindow failed to load: ${errorCode} - ${errorDescription}`);
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error(`[Recall] render-process-gone: ${details.reason} (exitCode: ${details.exitCode})`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    console.log('[Recall] mainWindow ready-to-show');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.setAlwaysOnTop(true);
  mainWindow.focus();
  mainWindow.setAlwaysOnTop(false);
}

function openSettings(): void {
  showMainWindow();
  const send = () => mainWindow?.webContents.send('app:navigate', '/settings');
  if (mainWindow?.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', send);
  } else {
    send();
  }
}

function quitApp(): void {
  isQuitting = true;
  unregisterQuickSearchShortcut();
  destroyTray();
  destroyQuickSearchWindow();
  stopBackend();
  app.quit();
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.md': 'text/markdown',
  };
  return map[ext] || 'application/octet-stream';
}

function detectFileType(filePath: string): 'image' | 'pdf' | 'document' {
  const mime = getMimeType(filePath);
  if (mime.startsWith('image/')) return 'image';
  if (mime === 'application/pdf') return 'pdf';
  return 'document';
}

function getNotesDir(): string {
  const dir = path.join(app.getPath('userData'), 'notes');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function makeRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${endpoint}`;
    const request = net.request({ method, url });
    request.setHeader('Content-Type', 'application/json');
    request.setHeader('Accept', 'application/json');
    let responseData = '';
    request.on('response', (response) => {
      response.on('data', (chunk) => {
        responseData += chunk.toString();
      });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(parsed.detail || `HTTP ${response.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch {
          resolve(responseData);
        }
      });
      response.on('error', (error) => reject(error));
    });
    request.on('error', (error) => reject(error));
    if (body) request.write(JSON.stringify(body));
    request.end();
  });
}

function registerCoreIpc(): void {
  ipcMain.handle('api:getHealth', async () => makeRequest('GET', '/health'));
  ipcMain.handle('api:getFiles', async (_e, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return makeRequest('GET', `/files${query}`);
  });
  ipcMain.handle('api:createFile', async (_e, data: unknown) =>
    makeRequest('POST', '/files', data)
  );
  ipcMain.handle(
    'api:search',
    async (_e, query: string, params?: Record<string, string>) => {
      const searchParams = new URLSearchParams({ q: query, ...params });
      return makeRequest('GET', `/search?${searchParams.toString()}`);
    }
  );
  ipcMain.handle('api:getStats', async () => makeRequest('GET', '/stats'));

  ipcMain.handle('dialog:openFiles', async () => {
    const opts: Electron.OpenDialogOptions = {
      title: 'Add files to Recall',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Supported',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'pdf'],
        },
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff'] },
        { name: 'PDFs', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    };
    const result =
      mainWindow && !mainWindow.isDestroyed()
        ? await dialog.showOpenDialog(mainWindow, opts)
        : await dialog.showOpenDialog(opts);
    if (result.canceled || result.filePaths.length === 0) return [];
    return result.filePaths.map((filePath) => {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        filename: path.basename(filePath),
        file_size: stats.size,
        mime_type: getMimeType(filePath),
        file_type: detectFileType(filePath),
      };
    });
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const opts: Electron.OpenDialogOptions = {
      title: 'Choose a folder for Recall to index',
      properties: ['openDirectory'],
    };
    const result =
      mainWindow && !mainWindow.isDestroyed()
        ? await dialog.showOpenDialog(mainWindow, opts)
        : await dialog.showOpenDialog(opts);
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle(
    'notes:save',
    async (_e, payload: { title: string; content: string }) => {
      const safeTitle =
        (payload.title || 'Untitled note')
          .replace(/[<>:"/\\|?*\x00-\x1f]/g, '-')
          .trim()
          .slice(0, 80) || 'Untitled note';
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${safeTitle}-${stamp}.txt`;
      const filePath = path.join(getNotesDir(), filename);
      const body = `# ${payload.title}\n\n${payload.content}`;
      fs.writeFileSync(filePath, body, 'utf8');
      return {
        path: filePath,
        filename,
        file_size: Buffer.byteLength(body, 'utf8'),
        mime_type: 'text/plain',
        file_type: 'note' as const,
        content: body,
      };
    }
  );

  ipcMain.handle('shell:showItemInFolder', async (_e, filePath: string) => {
    if (filePath && fs.existsSync(filePath)) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  });

  ipcMain.handle('shell:openPath', async (_e, filePath: string) => {
    if (filePath && fs.existsSync(filePath)) return shell.openPath(filePath);
    return 'File not found';
  });

  ipcMain.handle('shell:openExternal', async (_e, url: string) => {
    if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
    }
  });

  ipcMain.handle('fs:getFileInfo', async (_e, filePath: string) => {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    return {
      path: filePath,
      filename: path.basename(filePath),
      file_size: stats.size,
      mime_type: getMimeType(filePath),
      file_type: detectFileType(filePath),
      file_url: pathToFileURL(filePath).href,
    };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    showMainWindow();
  });
}

if (gotLock) app.whenReady().then(() => {
  // Show UI immediately on first event-loop tick
  createWindow();

  registerCoreIpc();
  registerQuickSearchIpc({ showMain: showMainWindow, openSettings });
  applyLaunchAtLoginFromSettings();

  createTray({
    showMain: showMainWindow,
    openSettings,
    quit: quitApp,
  });

  const shortcutResult = registerQuickSearchShortcut(() => toggleQuickSearch());
  if (shortcutResult.error) {
    console.warn('[Recall] Quick Search shortcut:', shortcutResult.error);
  } else if (shortcutResult.usedFallback) {
    console.info(
      `[Recall] Primary shortcut unavailable; using ${shortcutResult.accelerator}`
    );
  }

  // Self-host local backend concurrently in the background
  startBackendInBackground();

  // Defer creating secondary quick search HUD window until after initial paint
  setTimeout(() => {
    createQuickSearchWindow();
  }, 1200);

  app.on('activate', () => {
    showMainWindow();
  });
}); // gotLock

app.on('before-quit', () => {
  isQuitting = true;
  unregisterQuickSearchShortcut();
  destroyTray();
  destroyQuickSearchWindow();
  stopBackend();
});

app.on('will-quit', () => {
  unregisterQuickSearchShortcut();
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows/Linux
  if (process.platform === 'darwin') {
    // macOS typically keeps apps alive; no-op
  }
});
