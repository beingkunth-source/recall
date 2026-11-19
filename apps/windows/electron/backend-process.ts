import { app } from 'electron';
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { net } from 'electron';

const BACKEND_URL = 'http://127.0.0.1:8000';
const HEALTH_URL = `${BACKEND_URL}/health`;

let child: ChildProcessWithoutNullStreams | null = null;
let startedByUs = false;
let starting = false;

function dataDir(): string {
  const dir = path.join(app.getPath('userData'));
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function backendLogPath(): string {
  return path.join(dataDir(), 'backend-launch.log');
}

function logLaunch(message: string): void {
  try {
    fs.appendFileSync(backendLogPath(), `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    /* ignore */
  }
  console.info('[Recall]', message);
}

function backendExeCandidates(): { exe: string; cwd: string }[] {
  const resources = process.resourcesPath;
  const candidates = [
    // Prefer full PyInstaller onedir (has _internal next to exe)
    path.join(resources, 'backend', 'recall-server', 'recall-server.exe'),
    path.join(resources, 'backend', 'recall-server.exe'),
    path.join(process.cwd(), 'resources', 'backend', 'recall-server', 'recall-server.exe'),
    path.join(process.cwd(), 'resources', 'backend', 'recall-server.exe'),
  ];
  return candidates
    .filter((exe) => fs.existsSync(exe))
    .map((exe) => ({ exe, cwd: path.dirname(exe) }));
}

function pythonBackendCandidates(): { cmd: string; args: string[]; cwd: string }[] {
  const roots = [
    path.resolve(app.getAppPath(), '..', '..'),
    path.resolve(process.cwd(), '..', '..'),
    path.resolve(app.getAppPath(), '..'),
    process.cwd(),
  ];
  const out: { cmd: string; args: string[]; cwd: string }[] = [];
  for (const root of roots) {
    const venvPy = path.join(root, '.venv', 'Scripts', 'python.exe');
    const entry = path.join(root, 'backend_entry.py');
    if (fs.existsSync(venvPy) && fs.existsSync(entry)) {
      out.push({ cmd: venvPy, args: [entry], cwd: root });
    }
  }
  return out;
}

export async function isBackendHealthy(timeoutMs = 400): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = net.request({ method: 'GET', url: HEALTH_URL });
      const timer = setTimeout(() => {
        try {
          request.abort();
        } catch {
          /* ignore */
        }
        resolve(false);
      }, timeoutMs);
      request.on('response', (response) => {
        clearTimeout(timer);
        resolve(!!response.statusCode && response.statusCode < 400);
      });
      request.on('error', () => {
        clearTimeout(timer);
        resolve(false);
      });
      request.end();
    } catch {
      resolve(false);
    }
  });
}

function spawnBackend(): void {
  if (child) return;

  const packaged = backendExeCandidates()[0];
  if (packaged) {
    logLaunch(`Starting packaged backend: ${packaged.exe}`);
    const outLog = fs.openSync(backendLogPath(), 'a');
    const proc = spawn(packaged.exe, [], {
      cwd: packaged.cwd,
      env: {
        ...process.env,
        RECALL_HOST: '127.0.0.1',
        RECALL_PORT: '8000',
      },
      stdio: ['ignore', outLog, outLog],
      windowsHide: true,
      detached: false,
    });
    child = proc;
    startedByUs = true;
    proc.on('exit', (code) => {
      logLaunch(`Backend exited with code ${code}`);
      if (child === proc) child = null;
    });
    return;
  }

  const py = pythonBackendCandidates()[0];
  if (py) {
    logLaunch(`Starting Python backend: ${py.cmd}`);
    const outLog = fs.openSync(backendLogPath(), 'a');
    const proc = spawn(py.cmd, py.args, {
      cwd: py.cwd,
      env: { ...process.env, RECALL_HOST: '127.0.0.1', RECALL_PORT: '8000' },
      stdio: ['ignore', outLog, outLog],
      windowsHide: true,
    });
    child = proc;
    startedByUs = true;
    proc.on('exit', (code) => {
      logLaunch(`Python backend exited with code ${code}`);
      if (child === proc) child = null;
    });
    return;
  }

  logLaunch('No backend executable or Python entrypoint found');
}

/**
 * Non-blocking: kick off backend and return immediately.
 * UI should open right away; health can be polled separately.
 */
export function startBackendInBackground(): void {
  if (starting) return;
  starting = true;
  void (async () => {
    try {
      if (await isBackendHealthy()) {
        startedByUs = false;
        logLaunch('Backend already healthy');
        return;
      }
      spawnBackend();
    } finally {
      starting = false;
    }
  })();
}

/** Optional short wait used only when explicitly needed. */
export async function waitForBackend(maxMs = 8000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (await isBackendHealthy()) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export function stopBackend(): void {
  if (!startedByUs || !child) return;
  try {
    child.kill();
  } catch {
    /* ignore */
  }
  child = null;
  startedByUs = false;
}
