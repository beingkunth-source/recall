import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

export function resolvePreload(): string {
  const appPath = app.getAppPath();
  const candidates = [
    path.join(appPath, 'dist-electron', 'preload.js'),
    path.join(appPath, 'preload.js'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || path.join(appPath, 'dist-electron', 'preload.js');
}
