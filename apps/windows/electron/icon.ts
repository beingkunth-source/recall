import path from 'node:path';
import fs from 'node:fs';
import { app, nativeImage } from 'electron';

/** Resolve packaged or dev path to the Recall logo PNG. */
export function getLogoPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'assets', 'recall-logo.png'),
    path.join(process.resourcesPath, 'assets/recall-logo.png'),
    path.join(app.getAppPath(), 'dist', 'recall-logo.png'),
    path.join(app.getAppPath(), 'assets', 'recall-logo.png'),
    path.join(__dirname, '../assets/recall-logo.png'),
    path.join(__dirname, '../public/recall-logo.png'),
    path.join(process.cwd(), 'assets/recall-logo.png'),
    path.join(process.cwd(), 'public/recall-logo.png'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return '';
}

export function getIcoPath(): string {
  const candidates = [
    path.join(process.resourcesPath, 'assets', 'icon.ico'),
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(app.getAppPath(), 'assets', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(process.cwd(), 'assets', 'icon.ico'),
    path.join(process.cwd(), 'build', 'icon.ico'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || '';
}

export function loadAppIcon(): Electron.NativeImage {
  const logoPath = getLogoPath();
  if (logoPath && fs.existsSync(logoPath)) {
    return nativeImage.createFromPath(logoPath);
  }
  const icoPath = getIcoPath();
  if (icoPath && fs.existsSync(icoPath)) {
    return nativeImage.createFromPath(icoPath);
  }
  return nativeImage.createEmpty();
}

export function loadTrayIcon(): Electron.NativeImage {
  const ico = getIcoPath();
  if (ico && fs.existsSync(ico)) {
    return nativeImage.createFromPath(ico);
  }
  const img = loadAppIcon();
  if (!img.isEmpty()) {
    return img.resize({ width: 16, height: 16, quality: 'best' });
  }
  return img;
}
