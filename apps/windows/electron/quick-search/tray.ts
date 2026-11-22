import { Tray, Menu } from 'electron';
import { showQuickSearch } from './window';
import { getActiveShortcut } from './shortcut';
import { loadTrayIcon } from '../icon';

let tray: Tray | null = null;

export interface TrayHandlers {
  showMain: () => void;
  openSettings: () => void;
  quit: () => void;
}

export function createTray(handlers: TrayHandlers): Tray | null {
  destroyTray();
  try {
    const icon = loadTrayIcon();
    if (!icon || icon.isEmpty()) {
      console.warn('[Recall] Tray icon is empty, skipping system tray');
      return null;
    }
    tray = new Tray(icon);
    tray.setToolTip('Recall');

    const shortcut = getActiveShortcut() || 'Control+Space';
    const menu = Menu.buildFromTemplate([
      { label: 'Open Recall', click: () => handlers.showMain() },
      {
        label: `Quick Search\t${shortcut.replace('Control', 'Ctrl')}`,
        click: () => showQuickSearch(),
      },
      { type: 'separator' },
      { label: 'Settings', click: () => handlers.openSettings() },
      { type: 'separator' },
      { label: 'Quit Recall', click: () => handlers.quit() },
    ]);
    tray.setContextMenu(menu);
    tray.on('double-click', () => handlers.showMain());
    tray.on('click', () => {
      if (process.platform === 'win32') showQuickSearch();
    });

    return tray;
  } catch (err) {
    console.warn('[Recall] Failed to create tray icon:', err);
    return null;
  }
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
