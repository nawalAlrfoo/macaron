import { useSyncExternalStore } from 'react';

export type ToastKind = 'error' | 'info' | 'success';

export interface Toast {
  id: number;
  kind: ToastKind;
  /** Translation key from TRANSLATIONS (rendered in the current language) or a raw message */
  key?: string;
  text?: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(t: Omit<Toast, 'id'>, ttlMs = 4500) {
  // collapse duplicates that fire repeatedly (e.g. several listeners failing at once)
  if (toasts.some((x) => x.key === t.key && x.text === t.text)) return;
  const toast = { ...t, id: nextId++ };
  toasts = [...toasts.slice(-2), toast];
  emit();
  window.setTimeout(() => dismissToast(toast.id), ttlMs);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((x) => x.id !== id);
  emit();
}

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => toasts,
    () => toasts
  );
}

/** Map a Firebase error code to a friendly translation key */
export function errorKeyFor(err: unknown): string {
  const code = (err as { code?: string })?.code ?? '';
  if (code.includes('permission-denied')) return 'errPermission';
  if (code.includes('unavailable') || code.includes('network') || !navigator.onLine) return 'errOffline';
  if (code.includes('resource-exhausted')) return 'errQuota';
  if (code.includes('invalid-argument') || code.includes('failed-precondition')) return 'errInvalid';
  return 'errGeneric';
}
