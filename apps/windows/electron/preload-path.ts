import path from 'node:path';
import fs from 'node:fs';
import { app } from 'electron';

export function resolvePreload(): string {
  const candidates = [
    path.join(__dirname, 'preload.js'),
    path.join(__dirname, '../preload.js'),
    path.join(app.getAppPath(), 'dist-electron', 'preload.js'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || path.join(__dirname, 'preload.js');
}
