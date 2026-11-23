import { BrowserWindow, screen, app } from 'electron';
import path from 'node:path';
import { resolvePreload } from '../preload-path';

const WINDOW_WIDTH = 680;
const WINDOW_HEIGHT = 560;

let quickSearchWindow: BrowserWindow | null = null;
let blurCloseTimer: NodeJS.Timeout | null = null;


function positionOnActiveDisplay(win: BrowserWindow): void {
  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);
  const { x, y, width } = display.workArea;
  const left = Math.round(x + (width - WINDOW_WIDTH) / 2);
  const top = Math.round(y + Math.min(120, display.workArea.height * 0.12));
  win.setBounds({
    x: left,
    y: top,
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  });
}

function loadQuickSearchContent(win: BrowserWindow): void {
  const hash = '#/quick-search';
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}${hash}`);
  } else {
    win.loadFile(path.join(app.getAppPath(), 'dist/index.html'), { hash: '/quick-search' });
  }
}

export function createQuickSearchWindow(): BrowserWindow {
  if (quickSearchWindow && !quickSearchWindow.isDestroyed()) {
    return quickSearchWindow;
  }

  quickSearchWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    backgroundColor: '#00000000',
    title: 'Recall Quick Search',
    webPreferences: {
      preload: resolvePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  // Keep above fullscreen apps on Windows
  quickSearchWindow.setAlwaysOnTop(true, 'screen-saver');
  quickSearchWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  loadQuickSearchContent(quickSearchWindow);

  quickSearchWindow.on('blur', () => {
    // Slight delay so Enter/open-file click can complete before hide
    if (blurCloseTimer) clearTimeout(blurCloseTimer);
    blurCloseTimer = setTimeout(() => {
      if (
        quickSearchWindow &&
        !quickSearchWindow.isDestroyed() &&
        !quickSearchWindow.isFocused()
      ) {
        hideQuickSearch();
      }
    }, 160);
  });

  quickSearchWindow.on('closed', () => {
    quickSearchWindow = null;
  });

  screen.on('display-metrics-changed', () => {
    if (quickSearchWindow && !quickSearchWindow.isDestroyed() && quickSearchWindow.isVisible()) {
      positionOnActiveDisplay(quickSearchWindow);
    }
  });

  return quickSearchWindow;
}

export function getQuickSearchWindow(): BrowserWindow | null {
  return quickSearchWindow && !quickSearchWindow.isDestroyed()
    ? quickSearchWindow
    : null;
}

export function showQuickSearch(): void {
  const win = createQuickSearchWindow();
  positionOnActiveDisplay(win);
  if (!win.isVisible()) {
    win.show();
  }
  win.focus();
  win.webContents.send('quick-search:focus');
}

export function hideQuickSearch(): void {
  if (blurCloseTimer) {
    clearTimeout(blurCloseTimer);
    blurCloseTimer = null;
  }
  const win = getQuickSearchWindow();
  if (win && win.isVisible()) {
    win.hide();
    win.webContents.send('quick-search:clear');
  }
}

export function toggleQuickSearch(): void {
  const win = getQuickSearchWindow();
  if (win && win.isVisible()) {
    hideQuickSearch();
  } else {
    showQuickSearch();
  }
}

export function destroyQuickSearchWindow(): void {
  hideQuickSearch();
  if (quickSearchWindow && !quickSearchWindow.isDestroyed()) {
    quickSearchWindow.destroy();
  }
  quickSearchWindow = null;
}


