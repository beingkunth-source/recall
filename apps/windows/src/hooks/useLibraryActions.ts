import { useCallback, useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/components/Toast';

export interface LocalFileInfo {
  path: string;
  filename: string;
  file_size: number;
  mime_type: string;
  file_type: 'image' | 'pdf' | 'document' | 'note';
  content?: string;
}

function inferBrowserFile(file: File): LocalFileInfo | null {
  const name = file.name;
  const lower = name.toLowerCase();
  let file_type: LocalFileInfo['file_type'] = 'document';
  let mime_type = file.type || 'application/octet-stream';

  if (
    mime_type.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(lower)
  ) {
    file_type = 'image';
  } else if (mime_type === 'application/pdf' || lower.endsWith('.pdf')) {
    file_type = 'pdf';
  } else {
    return null;
  }

  // Electron exposes absolute path on File; browsers do not.
  const absolutePath = (file as File & { path?: string }).path;
  if (!absolutePath) {
    return null;
  }

  return {
    path: absolutePath,
    filename: name,
    file_size: file.size,
    mime_type,
    file_type,
  };
}

export function useLibraryActions(onChanged?: () => void) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const registerFiles = useCallback(
    async (files: LocalFileInfo[]) => {
      if (files.length === 0) return 0;

      setBusy(true);
      let ok = 0;
      try {
        for (const file of files) {
          await api.createFile({
            filename: file.filename,
            file_type: file.file_type,
            file_path: file.path,
            file_size: file.file_size,
            mime_type: file.mime_type,
            content: file.content,
          });
          ok += 1;
        }
        toast(
          ok === 1
            ? `Indexed “${files[0].filename}”`
            : `Added ${ok} files for indexing`,
          'success'
        );
        onChanged?.();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to add files';
        toast(message, 'error');
      } finally {
        setBusy(false);
      }
      return ok;
    },
    [onChanged, toast]
  );

  const addFilesViaDialog = useCallback(async () => {
    if (!window.recall?.dialog?.openFiles) {
      toast('File picker is available in the desktop app', 'error');
      return;
    }
    try {
      const picked = await window.recall.dialog.openFiles();
      if (!picked.length) return;
      await registerFiles(picked);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not open file picker';
      toast(message, 'error');
    }
  }, [registerFiles, toast]);

  const addDroppedFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const mapped: LocalFileInfo[] = [];
      const skipped: string[] = [];

      for (const file of files) {
        const info = inferBrowserFile(file);
        if (info) {
          mapped.push(info);
        } else if (!(file as File & { path?: string }).path) {
          skipped.push(file.name);
        } else {
          skipped.push(file.name);
        }
      }

      if (skipped.length && mapped.length === 0) {
        toast(
          'Drop files in the desktop app, or use Add File (browser drops need Electron paths)',
          'error'
        );
        return;
      }

      if (skipped.length) {
        toast(`Skipped unsupported: ${skipped.slice(0, 3).join(', ')}`, 'info');
      }

      await registerFiles(mapped);
    },
    [registerFiles, toast]
  );

  const createNote = useCallback(
    async (title: string, content: string) => {
      const trimmedTitle = title.trim() || 'Untitled note';
      const trimmedContent = content.trim();
      if (!trimmedContent) {
        toast('Write something before saving the note', 'error');
        return false;
      }

      setBusy(true);
      try {
        let localPath = `note://${crypto.randomUUID()}`;
        let filename = `${trimmedTitle}.txt`;
        let fileSize = new TextEncoder().encode(
          `# ${trimmedTitle}\n\n${trimmedContent}`
        ).length;
        const body = `# ${trimmedTitle}\n\n${trimmedContent}`;

        if (window.recall?.notes?.save) {
          const saved = await window.recall.notes.save({
            title: trimmedTitle,
            content: trimmedContent,
          });
          localPath = saved.path;
          filename = saved.filename;
          fileSize = saved.file_size;
        }

        await api.createFile({
          filename,
          file_type: 'note',
          file_path: localPath,
          file_size: fileSize,
          mime_type: 'text/plain',
          content: body,
        });

        toast(`Note “${trimmedTitle}” saved`, 'success');
        onChanged?.();
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to create note';
        toast(message, 'error');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [onChanged, toast]
  );

  return {
    busy,
    addFilesViaDialog,
    addDroppedFiles,
    createNote,
    registerFiles,
  };
}
