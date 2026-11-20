import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { dismissToast, useToasts } from '@/src/lib/toast';

type Dict = Record<string, string>;

/** Global toasts + an "offline" bar. Reads the current UI language from <html lang>. */
export const Toaster: React.FC = () => {
  const toasts = useToasts();
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const lang = (typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ar') as
    | 'ar'
    | 'en';
  const t = TRANSLATIONS[lang] as unknown as Dict;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return (
    <div className="fixed z-[60] bottom-4 inset-x-0 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
      {!online && (
        <div className="pointer-events-auto msg-in flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-lg">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>{t.errOfflineBar}</span>
        </div>
      )}
      {toasts.map((toast) => {
        const Icon = toast.kind === 'error' ? AlertCircle : toast.kind === 'success' ? CheckCircle2 : Info;
        const color =
          toast.kind === 'error'
            ? 'text-rose-500'
            : toast.kind === 'success'
              ? 'text-emerald-500'
              : 'text-[var(--primary)]';
        return (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto msg-in w-full max-w-sm flex items-start gap-2.5 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#26272F] bg-white dark:bg-[#16171C] text-sm text-slate-700 dark:text-slate-200 shadow-lg"
          >
            <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${color}`} />
            <span className="flex-1 leading-relaxed">{toast.text ?? (toast.key ? t[toast.key] ?? toast.key : '')}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label={t.closeBtn}
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
