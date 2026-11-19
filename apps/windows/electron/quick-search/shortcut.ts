import { globalShortcut, BrowserWindow } from 'electron';
import { loadSettings, saveSettings } from '../settings-store';

export type ShortcutToggleHandler = () => void;

let registeredAccelerator: string | null = null;
let onToggle: ShortcutToggleHandler | null = null;

export function getActiveShortcut(): string | null {
  return registeredAccelerator;
}

export function unregisterQuickSearchShortcut(): void {
  if (registeredAccelerator) {
    try {
      globalShortcut.unregister(registeredAccelerator);
    } catch {
      // ignore
    }
    registeredAccelerator = null;
  }
  // Also clear any leftovers from previous sessions
  try {
    globalShortcut.unregisterAll();
  } catch {
    // ignore
  }
}

/**
 * Register Ctrl+Space (or configured accelerator). Falls back to alternate
 * if the primary accelerator is unavailable.
 */
export function registerQuickSearchShortcut(
  toggle: ShortcutToggleHandler
): { accelerator: string; usedFallback: boolean; error?: string } {
  onToggle = toggle;
  unregisterQuickSearchShortcut();

  const settings = loadSettings();
  const candidates = [
    settings.quickSearchShortcut,
    settings.alternateShortcut,
    'Control+Shift+Space',
    'Alt+Space',
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  let lastError = '';
  for (let i = 0; i < candidates.length; i++) {
    const accel = candidates[i];
    try {
      const ok = globalShortcut.register(accel, () => {
        onToggle?.();
      });
      if (ok) {
        registeredAccelerator = accel;
        if (i > 0) {
          // Persist fallback so Settings UI reflects reality
          saveSettings({ quickSearchShortcut: accel });
        }
        return { accelerator: accel, usedFallback: i > 0 };
      }
      lastError = `Failed to register ${accel}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return {
    accelerator: '',
    usedFallback: false,
    error: lastError || 'No global shortcut could be registered',
  };
}

export function reregisterQuickSearchShortcut(
  accelerator: string
): { ok: boolean; error?: string } {
  if (!onToggle) {
    return { ok: false, error: 'Shortcut handler not initialized' };
  }
  unregisterQuickSearchShortcut();
  try {
    const ok = globalShortcut.register(accelerator, () => onToggle?.());
    if (!ok) {
      // restore previous best-effort
      registerQuickSearchShortcut(onToggle);
      return { ok: false, error: `Could not register ${accelerator}` };
    }
    registeredAccelerator = accelerator;
    saveSettings({ quickSearchShortcut: accelerator });
    return { ok: true };
  } catch (err) {
    registerQuickSearchShortcut(onToggle);
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Notify focused quick-search window that Escape was pressed locally — handled in renderer. */
export function focusQuickSearchIfVisible(win: BrowserWindow | null): void {
  if (win && !win.isDestroyed() && win.isVisible()) {
    win.focus();
  }
}
