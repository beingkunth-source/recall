export {};

interface RecallPickedFile {
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'pdf' | 'document' | 'note';
  content?: string;
  file_url?: string;
}

interface RecallAppSettings {
  launchAtLogin: boolean;
  quickSearchShortcut: string;
  alternateShortcut: string;
}

declare global {
  interface Window {
    recall?: {
      platform: string;
      versions: {
        electron: string;
        node: string;
        chrome: string;
      };
      api: {
        getHealth: () => Promise<unknown>;
        getFiles: (params?: Record<string, string>) => Promise<unknown>;
        createFile: (data: unknown) => Promise<unknown>;
        search: (query: string, params?: Record<string, string>) => Promise<unknown>;
        getStats: () => Promise<unknown>;
      };
      dialog: {
        openFiles: () => Promise<RecallPickedFile[]>;
        openDirectory: () => Promise<string | null>;
      };
      notes: {
        save: (payload: { title: string; content: string }) => Promise<RecallPickedFile>;
      };
      shell: {
        showItemInFolder: (filePath: string) => Promise<boolean>;
        openPath: (filePath: string) => Promise<string>;
        openExternal: (url: string) => Promise<void>;
      };
      fs: {
        getFileInfo: (filePath: string) => Promise<RecallPickedFile | null>;
      };
      quickSearch: {
        query: (q: string) => Promise<unknown>;
        open: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
        hide: () => Promise<boolean>;
        show: () => Promise<boolean>;
        toggle: () => Promise<boolean>;
        getShortcut: () => Promise<unknown>;
        setShortcut: (accelerator: string) => Promise<{ ok: boolean; error?: string }>;
        onFocus: (cb: () => void) => () => void;
        onClear: (cb: () => void) => () => void;
      };
      settings: {
        get: () => Promise<RecallAppSettings>;
        update: (partial: Partial<RecallAppSettings>) => Promise<RecallAppSettings>;
      };
      app: {
        showMain: () => Promise<boolean>;
        openSettings: () => Promise<boolean>;
        onNavigate: (cb: (path: string) => void) => () => void;
      };
    };
  }
}
