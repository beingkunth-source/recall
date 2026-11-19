import { contextBridge, ipcRenderer } from 'electron';

export interface PickedFile {
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'pdf' | 'document' | 'note';
  content?: string;
  file_url?: string;
}

contextBridge.exposeInMainWorld('recall', {
  platform: process.platform,
  versions: {
    electron: process.versions.electron,
    node: process.versions.node,
    chrome: process.versions.chrome,
  },
  api: {
    getHealth: (): Promise<unknown> => ipcRenderer.invoke('api:getHealth'),
    getFiles: (params?: Record<string, string>): Promise<unknown> =>
      ipcRenderer.invoke('api:getFiles', params),
    createFile: (data: unknown): Promise<unknown> =>
      ipcRenderer.invoke('api:createFile', data),
    search: (query: string, params?: Record<string, string>): Promise<unknown> =>
      ipcRenderer.invoke('api:search', query, params),
    getStats: (): Promise<unknown> => ipcRenderer.invoke('api:getStats'),
  },
  dialog: {
    openFiles: (): Promise<PickedFile[]> => ipcRenderer.invoke('dialog:openFiles'),
    openDirectory: (): Promise<string | null> =>
      ipcRenderer.invoke('dialog:openDirectory'),
  },
  notes: {
    save: (payload: { title: string; content: string }): Promise<PickedFile> =>
      ipcRenderer.invoke('notes:save', payload),
  },
  shell: {
    showItemInFolder: (filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('shell:showItemInFolder', filePath),
    openPath: (filePath: string): Promise<string> =>
      ipcRenderer.invoke('shell:openPath', filePath),
  },
  fs: {
    getFileInfo: (filePath: string): Promise<PickedFile | null> =>
      ipcRenderer.invoke('fs:getFileInfo', filePath),
  },
  quickSearch: {
    query: (q: string): Promise<unknown> => ipcRenderer.invoke('quick-search:query', q),
    open: (filePath: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('quick-search:open', filePath),
    hide: (): Promise<boolean> => ipcRenderer.invoke('quick-search:hide'),
    show: (): Promise<boolean> => ipcRenderer.invoke('quick-search:show'),
    toggle: (): Promise<boolean> => ipcRenderer.invoke('quick-search:toggle'),
    getShortcut: (): Promise<unknown> => ipcRenderer.invoke('quick-search:get-shortcut'),
    setShortcut: (accelerator: string): Promise<{ ok: boolean; error?: string }> =>
      ipcRenderer.invoke('quick-search:set-shortcut', accelerator),
    onFocus: (cb: () => void): (() => void) => {
      const listener = () => cb();
      ipcRenderer.on('quick-search:focus', listener);
      return () => ipcRenderer.removeListener('quick-search:focus', listener);
    },
    onClear: (cb: () => void): (() => void) => {
      const listener = () => cb();
      ipcRenderer.on('quick-search:clear', listener);
      return () => ipcRenderer.removeListener('quick-search:clear', listener);
    },
  },
  settings: {
    get: (): Promise<unknown> => ipcRenderer.invoke('settings:get'),
    update: (partial: unknown): Promise<unknown> =>
      ipcRenderer.invoke('settings:update', partial),
  },
  app: {
    showMain: (): Promise<boolean> => ipcRenderer.invoke('app:show-main'),
    openSettings: (): Promise<boolean> => ipcRenderer.invoke('app:open-settings'),
    onNavigate: (cb: (path: string) => void): (() => void) => {
      const listener = (_event: Electron.IpcRendererEvent, route: string) => cb(route);
      ipcRenderer.on('app:navigate', listener);
      return () => ipcRenderer.removeListener('app:navigate', listener);
    },
  },
});
