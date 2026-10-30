import { app, BrowserWindow, ipcMain, net } from 'electron';
import path from 'node:path';

const BACKEND_URL = 'http://127.0.0.1:8000';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    frame: true,
    titleBarStyle: 'default',
    title: 'Recall',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // In development, load from Vite dev server; in production, load built files
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// --- IPC Handlers for backend API communication ---

async function makeRequest(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const url = `${BACKEND_URL}${endpoint}`;
    const request = net.request({
      method,
      url,
    });

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

      response.on('error', (error) => {
        reject(error);
      });
    });

    request.on('error', (error) => {
      reject(error);
    });

    if (body) {
      request.write(JSON.stringify(body));
    }

    request.end();
  });
}

ipcMain.handle('api:getHealth', async () => {
  return makeRequest('GET', '/health');
});

ipcMain.handle('api:getFiles', async (_event, params?: Record<string, string>) => {
  const query = params ? '?' + new URLSearchParams(params).toString() : '';
  return makeRequest('GET', `/files${query}`);
});

ipcMain.handle('api:createFile', async (_event, data: unknown) => {
  return makeRequest('POST', '/files', data);
});

ipcMain.handle('api:search', async (_event, query: string, params?: Record<string, string>) => {
  const searchParams = new URLSearchParams({ q: query, ...params });
  return makeRequest('GET', `/search?${searchParams.toString()}`);
});

ipcMain.handle('api:getStats', async () => {
  return makeRequest('GET', '/stats');
});

// --- App lifecycle ---

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
