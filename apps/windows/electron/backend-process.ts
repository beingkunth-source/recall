import { app } from 'electron';
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { net } from 'electron';

const HEALTH_URL = 'http://127.0.0.1:8000/health';

let child: ChildProcessWithoutNullStreams | null = null;
let startedByUs = false;
let starting = false;
let restartAttempts = 0;
let restartTimer: NodeJS.Timeout | null = null;
let allowRestart = true;

function dataDir(): string {
  const dir = app.getPath('userData');
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

function walkParents(start: string, max = 6): string[] {
  const out: string[] = [];
  let cur = path.resolve(start);
  for (let i = 0; i < max; i++) {
    out.push(cur);
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return out;
}

function pythonBackendCandidates(): { cmd: string; args: string[]; cwd: string }[] {
  const seeds = [
    process.cwd(),
    app.getAppPath(),
    path.dirname(app.getPath('exe')),
  ];
  const roots = new Set<string>();
  for (const seed of seeds) {
    for (const dir of walkParents(seed)) roots.add(dir);
  }

  const out: { cmd: string; args: string[]; cwd: string }[] = [];
  for (const root of roots) {
    const entry = path.join(root, 'backend_entry.py');
    if (!fs.existsSync(entry)) continue;

    const venvWin = path.join(root, '.venv', 'Scripts', 'python.exe');
    const venvWin2 = path.join(root, 'venv', 'Scripts', 'python.exe');
    const venvUnix = path.join(root, '.venv', 'bin', 'python');
    const venvUnix2 = path.join(root, 'venv', 'bin', 'python');

    if (fs.existsSync(venvWin)) {
      out.push({ cmd: venvWin, args: [entry], cwd: root });
    } else if (fs.existsSync(venvWin2)) {
      out.push({ cmd: venvWin2, args: [entry], cwd: root });
    } else if (fs.existsSync(venvUnix)) {
      out.push({ cmd: venvUnix, args: [entry], cwd: root });
    } else if (fs.existsSync(venvUnix2)) {
      out.push({ cmd: venvUnix2, args: [entry], cwd: root });
    } else {
      out.push({
        cmd: process.platform === 'win32' ? 'python.exe' : 'python3',
        args: [entry],
        cwd: root,
      });
    }
  }
  return out;
}

function backendExeCandidates(): { exe: string; cwd: string }[] {
  const resources = process.resourcesPath;
  const localResources = path.join(process.cwd(), 'resources', 'backend');
  const pairs = [
    // Packaged onedir distribution
    {
      exe: path.join(resources, 'backend', 'recall-server', 'recall-server.exe'),
      cwd: path.join(resources, 'backend', 'recall-server'),
    },
    // Packaged single-file distribution
    {
      exe: path.join(resources, 'backend', 'recall-server.exe'),
      cwd: path.join(resources, 'backend'),
    },
    // Local development compiled directory
    {
      exe: path.join(localResources, 'recall-server', 'recall-server.exe'),
      cwd: path.join(localResources, 'recall-server'),
    },
    // Local development standalone
    {
      exe: path.join(localResources, 'recall-server.exe'),
      cwd: localResources,
    },
  ];

  return pairs.filter((p) => fs.existsSync(p.exe));
}

export async function isBackendHealthy(timeoutMs = 500): Promise<boolean> {
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

function scheduleRestart(reason: string): void {
  if (!allowRestart || !startedByUs) return;
  if (restartAttempts >= 8) {
    logLaunch(`Giving up restarting backend after failures (${reason})`);
    return;
  }
  if (restartTimer) return;
  const delay = Math.min(10_000, 800 + restartAttempts * 700);
  restartAttempts += 1;
  logLaunch(`Scheduling backend restart #${restartAttempts} in ${delay}ms (${reason})`);
  restartTimer = setTimeout(() => {
    restartTimer = null;
    void (async () => {
      if (await isBackendHealthy()) {
        restartAttempts = 0;
        return;
      }
      child = null;
      spawnBackend();
    })();
  }, delay);
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
      if (allowRestart) scheduleRestart(`exit ${code}`);
    });
    return;
  }

  const py = pythonBackendCandidates()[0];
  if (py) {
    logLaunch(`Starting Python backend: ${py.cmd} (${py.cwd})`);
    const outLog = fs.openSync(backendLogPath(), 'a');
    const proc = spawn(py.cmd, py.args, {
      cwd: py.cwd,
      env: {
        ...process.env,
        RECALL_HOST: '127.0.0.1',
        RECALL_PORT: '8000',
        PYTHONUNBUFFERED: '1',
      },
      stdio: ['ignore', outLog, outLog],
      windowsHide: true,
    });
    child = proc;
    startedByUs = true;
    proc.on('exit', (code) => {
      logLaunch(`Python backend exited with code ${code}`);
      if (child === proc) child = null;
      if (allowRestart) scheduleRestart(`exit ${code}`);
    });
    return;
  }

  logLaunch('No backend executable or Python entrypoint found');
}

/** Non-blocking: start backend as part of normal app lifecycle. */
export function startBackendInBackground(): void {
  if (starting) return;
  starting = true;
  allowRestart = true;
  void (async () => {
    try {
      if (await isBackendHealthy()) {
        startedByUs = false;
        restartAttempts = 0;
        logLaunch('Backend already healthy');
        return;
      }
      spawnBackend();
    } finally {
      starting = false;
    }
  })();
}

export async function waitForBackend(maxMs = 8000): Promise<boolean> {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (await isBackendHealthy()) {
      restartAttempts = 0;
      return true;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

export function stopBackend(): void {
  allowRestart = false;
  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = null;
  }
  if (!startedByUs || !child) return;
  try {
    if (process.platform === 'win32' && child.pid) {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    /* ignore */
  }
  child = null;
  startedByUs = false;
}

process.on('exit', () => stopBackend());
process.on('SIGINT', () => {
  stopBackend();
  process.exit(0);
});
process.on('SIGTERM', () => {
  stopBackend();
  process.exit(0);
});
