import { useSyncExternalStore } from 'react';

/**
 * Per-device personal preferences (stored in localStorage, never sent to the server).
 */
export interface UserPrefs {
  /** 'system' follows the operating system's light/dark setting */
  theme: 'light' | 'dark' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  enterToSend: boolean;
  sound: boolean;
  desktopNotifications: boolean;
  /** Interface language chosen on this device (falls back to the site default) */
  language?: 'ar' | 'en';
}

export const DEFAULT_PREFS: UserPrefs = {
  theme: 'system',
  fontSize: 'md',
  enterToSend: true,
  sound: true,
  desktopNotifications: false,
};

const KEY = 'macaron-prefs-v1';
const listeners = new Set<() => void>();

function read(): UserPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<UserPrefs>) };
  } catch {
    return DEFAULT_PREFS;
  }
}

let current: UserPrefs = typeof window !== 'undefined' ? read() : DEFAULT_PREFS;

export function getPrefs(): UserPrefs {
  return current;
}

export function setPrefs(patch: Partial<UserPrefs>) {
  current = { ...current, ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    // storage unavailable (private mode) — keep in memory only
  }
  listeners.forEach((l) => l());
}

/** True if the user has saved a theme choice of their own on this device */
export function hasStoredTheme(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    return Boolean(raw && JSON.parse(raw).theme);
  } catch {
    return false;
  }
}

export function usePrefs(): UserPrefs {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => DEFAULT_PREFS
  );
}

/** Short, soft two-tone chime using Web Audio (no audio file needed) */
export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.08, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    // audio not available
  }
}
