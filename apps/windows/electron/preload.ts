import { contextBridge, ipcRenderer } from 'electron';

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
});
