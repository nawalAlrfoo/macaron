import React, { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { blockUser, submitReport, type ReportReason } from '@/src/lib/moderation';
import type { Language } from '@/src/types/chat';

export interface ReportTarget {
  uid: string;
  name: string;
  nickname: string;
  roomId?: string;
  chatId?: string;
  messageId?: string;
  messageText?: string;
}

interface ReportDialogProps {
  language: Language;
  myUid: string;
  target: ReportTarget;
  onClose: () => void;
  /** called after the user also chose to block */
  onBlocked?: () => void;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ language, myUid, target, onClose, onBlocked }) => {
  const t = TRANSLATIONS[language];
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);

  const reasons: { value: ReportReason; label: string }[] = [
    { value: 'spam', label: t.reasonSpam },
    { value: 'abuse', label: t.reasonAbuse },
    { value: 'inappropriate', label: t.reasonInappropriate },
    { value: 'other', label: t.reasonOther },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await submitReport({
      reporterUid: myUid,
      targetUid: target.uid,
      targetName: target.name,
      targetNickname: target.nickname,
      reason,
      note,
      roomId: target.roomId,
      chatId: target.chatId,
      messageId: target.messageId,
      messageText: target.messageText,
    });
    if (ok && alsoBlock) {
      await blockUser(myUid, target.uid);
      onBlocked?.();
    }
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md msg-in rounded-2xl border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23] shadow-xl p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-50">
              <Flag className="w-4 h-4 text-rose-500" />
              {target.messageId ? t.reportMessageTitle : t.reportUserTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {target.name} · <span dir="ltr">@{target.nickname}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t.closeBtn} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {target.messageText && (
          <blockquote className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#11131A] border-s-2 border-slate-300 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
            {target.messageText}
          </blockquote>
        )}

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{t.reportReasonLabel}</legend>
          {reasons.map((r) => (
            <label
              key={r.value}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors ${
                reason === r.value
                  ? 'border-[var(--primary)] bg-[var(--primary-soft)] text-slate-900 dark:text-slate-50'
                  : 'border-slate-200 dark:border-[#262A36] text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2230]'
              }`}
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-[var(--primary)]"
              />
              {r.label}
            </label>
          ))}
        </fieldset>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder={t.reportNotePlaceholder}
          className="w-full px-3 py-2 rounded-lg text-sm border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#11131A] text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-200/60 dark:focus:ring-violet-500/20 resize-none"
        />

        <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
          <input type="checkbox" checked={alsoBlock} onChange={(e) => setAlsoBlock(e.target.checked)} className="accent-[var(--primary)]" />
          {t.alsoBlockLabel}
        </label>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
            {t.cancelAction}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-60 cursor-pointer"
          >
            {t.reportSubmit}
          </button>
        </div>
      </form>
    </div>
  );
};
