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

export function createTray(handlers: TrayHandlers): Tray {
  destroyTray();
  const icon = loadTrayIcon();
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
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
