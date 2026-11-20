import React, { useEffect, useState } from 'react';
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where, type Timestamp } from 'firebase/firestore';
import { Check, Flag, Trash2, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { db } from '@/src/lib/firebase';
import { showToast } from '@/src/lib/toast';
import type { Language } from '@/src/types/chat';

interface Report {
  id: string;
  reporterUid: string;
  targetUid: string;
  targetName?: string;
  targetNickname?: string;
  reason: 'spam' | 'abuse' | 'inappropriate' | 'other';
  note?: string;
  roomId?: string;
  chatId?: string;
  messageId?: string;
  messageText?: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt?: Timestamp;
}

export const ReportsPanel: React.FC<{ language: Language }> = ({ language }) => {
  const t = TRANSLATIONS[language];
  const [reports, setReports] = useState<Report[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'reports'), where('status', '==', 'open')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Report);
        list.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setReports(list);
      },
      (err) => console.warn('Reports listener skipped:', err.message)
    );
  }, []);

  const reasonLabel: Record<Report['reason'], string> = {
    spam: t.reasonSpam,
    abuse: t.reasonAbuse,
    inappropriate: t.reasonInappropriate,
    other: t.reasonOther,
  };

  const setStatus = async (r: Report, status: Report['status']) => {
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, 'reports', r.id), { status });
    } catch {
      showToast({ kind: 'error', key: 'errGeneric' });
    } finally {
      setBusyId(null);
    }
  };

  const deleteMessage = async (r: Report) => {
    if (!r.roomId || !r.messageId) return;
    setBusyId(r.id);
    try {
      await deleteDoc(doc(db, 'rooms', r.roomId, 'messages', r.messageId));
      await updateDoc(doc(db, 'reports', r.id), { status: 'resolved' });
      showToast({ kind: 'success', key: 'messageDeletedToast' });
    } catch {
      showToast({ kind: 'error', key: 'errGeneric' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23] p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-50">
          <Flag className="w-4 h-4 text-rose-500" />
          {t.reportsTitle}
        </h2>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 tabular-nums">
          {reports.length}
        </span>
      </div>

      {reports.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t.reportsEmpty}</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 dark:border-[#262A36] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-slate-900 dark:text-slate-100">{r.targetName ?? r.targetUid}</span>
                {r.targetNickname && (
                  <span className="text-xs text-slate-500" dir="ltr">@{r.targetNickname}</span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300">
                  {reasonLabel[r.reason]}
                </span>
                <span className="text-[11px] text-slate-400">
                  {r.roomId ? `#${r.roomId}` : r.chatId ? t.privateChatBadge : ''}
                  {r.createdAt?.toDate ? ` · ${r.createdAt.toDate().toLocaleString(language === 'ar' ? 'ar-JO' : 'en-US')}` : ''}
                </span>
              </div>
              {r.messageText && (
                <blockquote className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#11131A] border-s-2 border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300">
                  {r.messageText}
                </blockquote>
              )}
              {r.note && <p className="text-xs text-slate-600 dark:text-slate-300">“{r.note}”</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                {r.roomId && r.messageId && (
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => deleteMessage(r)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {t.deleteMessageAction}
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => setStatus(r, 'resolved')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#262A36] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E2230] disabled:opacity-60 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t.markResolved}
                </button>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => setStatus(r, 'dismissed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-[#1E2230] disabled:opacity-60 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  {t.dismissReport}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
