import path from 'node:path';
import fs from 'node:fs';
import { app, nativeImage } from 'electron';

/** Resolve packaged or dev path to the Recall logo PNG. */
export function getLogoPath(): string {
  const candidates = [
    path.join(__dirname, '../assets/recall-logo.png'),
    path.join(__dirname, '../public/recall-logo.png'),
    path.join(process.cwd(), 'assets/recall-logo.png'),
    path.join(process.cwd(), 'public/recall-logo.png'),
  ];
  if (app.isPackaged) {
    candidates.unshift(path.join(process.resourcesPath, 'assets/recall-logo.png'));
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return candidates[0];
}

export function loadAppIcon(): Electron.NativeImage {
  const logoPath = getLogoPath();
  if (fs.existsSync(logoPath)) {
    return nativeImage.createFromPath(logoPath);
  }
  return nativeImage.createEmpty();
}

export function loadTrayIcon(): Electron.NativeImage {
  const img = loadAppIcon();
  if (img.isEmpty()) return img;
  // Windows tray works best around 16–32 px
  return img.resize({ width: 16, height: 16, quality: 'best' });
}
