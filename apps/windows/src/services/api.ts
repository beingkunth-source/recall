const API_BASE = 'http://127.0.0.1:8000';

export interface FileRecord {
  id: string | number;
  filename: string;
  file_type: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  extracted_text?: string;
  created_at: string;
  updated_at: string;
  page_count?: number;
}

export interface StatsResponse {
  total_files: number;
  images: number;
  pdfs: number;
  notes: number;
  total_size: number;
  completed: number;
  pending: number;
  processing: number;
  failed: number;
}

export interface SearchResult {
  file: FileRecord;
  snippet: string;
  score: number;
}

export interface HealthResponse {
  status: string;
  version?: string;
  database?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface CreateFileData {
  filename: string;
  file_type: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  content?: string;
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      ...options,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      throw new Error(
        errorBody?.detail || `Request failed with status ${response.status}`
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error('Cannot connect to backend. Is the server running?');
    }
    throw error;
  }
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    return request<HealthResponse>('/health');
  },

  async getFiles(params?: Record<string, string>): Promise<PaginatedResponse<FileRecord>> {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any>(`/files${query}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawList = raw.items || raw.files || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: FileRecord[] = rawList.map((f: any) => ({
      id: f.id,
      filename: f.filename,
      file_type: f.file_type,
      file_path: f.local_path || f.file_path || '',
      file_size: f.file_size || 0,
      mime_type: f.mime_type || '',
      status: (f.status || f.indexing_status || 'completed') as FileRecord['status'],
      created_at: f.created_at,
      updated_at: f.updated_at,
    }));

    return {
      items,
      total: raw.total ?? items.length,
      page: 1,
      page_size: items.length,
    };
  },

  async createFile(data: CreateFileData): Promise<FileRecord> {
    const payload = {
      filename: data.filename,
      file_type: data.file_type,
      file_size: data.file_size || 0,
      local_path: data.file_path,
      mime_type: data.mime_type || null,
      content: data.content || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await request<any>('/files', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return {
      id: res.id,
      filename: res.filename,
      file_type: res.file_type,
      file_path: res.local_path,
      file_size: res.file_size,
      mime_type: res.mime_type,
      status: (res.indexing_status || 'pending') as FileRecord['status'],
      created_at: res.created_at,
      updated_at: res.updated_at,
    };
  },

  async search(
    query: string,
    params?: Record<string, string>
  ): Promise<PaginatedResponse<SearchResult>> {
    const searchParams = new URLSearchParams({ q: query, ...params });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any>(`/search?${searchParams.toString()}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawList = raw.items || raw.results || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: SearchResult[] = rawList.map((r: any) => ({
      file: {
        id: r.file_id || r.file?.id || '',
        filename: r.filename || r.file?.filename || '',
        file_type: r.file_type || r.file?.file_type || 'document',
        file_path: r.local_path || r.file?.file_path || '',
        file_size: r.file_size || r.file?.file_size || 0,
        mime_type: r.mime_type || r.file?.mime_type || '',
        status: (r.status || r.file?.status || 'completed') as FileRecord['status'],
        created_at: r.created_at || r.file?.created_at || new Date().toISOString(),
        updated_at: r.updated_at || r.file?.updated_at || new Date().toISOString(),
      },
      snippet: r.content_snippet || r.snippet || '',
      score: r.confidence || r.score || 1.0,
    }));

    return {
      items,
      total: raw.total ?? items.length,
      page: 1,
      page_size: items.length,
    };
  },

  async getStats(): Promise<StatsResponse> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await request<any>('/stats');
    return {
      total_files: raw.total_files ?? 0,
      images: raw.total_images ?? raw.images ?? 0,
      pdfs: raw.total_pdfs ?? raw.pdfs ?? 0,
      notes: raw.total_notes ?? raw.notes ?? 0,
      total_size: raw.storage_used ?? raw.total_size ?? 0,
      completed: raw.total_indexed ?? raw.completed ?? 0,
      pending: raw.pending ?? 0,
      processing: raw.processing ?? 0,
      failed: raw.failed ?? 0,
    };
  },

  async getIndexingStatus(): Promise<IndexingStatus> {
    return request<IndexingStatus>('/indexing/status');
  },

  async addIndexRoot(folderPath: string): Promise<{ id: string; path: string }> {
    return request('/indexing/roots', {
      method: 'POST',
      body: JSON.stringify({ path: folderPath }),
    });
  },

  async removeIndexRoot(rootId: string, deleteIndexed = false): Promise<void> {
    const q = deleteIndexed ? '?delete_indexed=true' : '';
    await request(`/indexing/roots/${rootId}${q}`, { method: 'DELETE' });
  },

  async startIndexing(full = false): Promise<void> {
    await request(`/indexing/start?full=${full ? 'true' : 'false'}`, {
      method: 'POST',
    });
  },

  async pauseIndexing(): Promise<void> {
    await request('/indexing/pause', { method: 'POST' });
  },

  async resumeIndexing(): Promise<void> {
    await request('/indexing/resume', { method: 'POST' });
  },

  async rebuildIndex(): Promise<void> {
    await request('/indexing/rebuild', { method: 'POST' });
  },

  async clearIndex(): Promise<void> {
    await request('/indexing/clear', { method: 'POST' });
  },

  async seedDefaultRoots(): Promise<{ ok: boolean; roots: IndexRootInfo[] }> {
    return request('/indexing/roots/seed-defaults', { method: 'POST' });
  },

  async getDefaultRoots(): Promise<{ roots: string[] }> {
    return request('/indexing/default-roots');
  },
};

export interface IndexRootInfo {
  id: string;
  path: string;
  enabled: boolean;
  last_scan_at?: string | null;
  files_discovered?: number;
  files_indexed?: number;
}

export interface IndexingStatus {
  status: string;
  files_discovered: number;
  files_indexed: number;
  files_pending: number;
  files_failed: number;
  files_remaining: number;
  queue_size: number;
  current_file: string;
  last_scan_at?: string | null;
  indexed_bytes: number;
  error?: string;
  paused: boolean;
  roots: IndexRootInfo[];
  exclusions: { id: string; pattern: string; kind: string }[];
  drives: { path: string; label: string; exists: boolean }[];
}
