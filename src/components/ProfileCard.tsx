import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Flag, Send, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { db } from '@/src/lib/firebase';
import { Language, UserPublicProfile } from '@/src/types/chat';
import { AvatarImg } from './AvatarImg';

export interface ProfileCardTarget {
  uid: string;
  name: string;
  nickname: string;
  photoUrl?: string;
}

interface ProfileCardProps {
  target: ProfileCardTarget;
  language: Language;
  onClose: () => void;
  /** Opens (or creates a request for) a private chat */
  onMessage?: (profile: UserPublicProfile) => Promise<void> | void;
  onReport?: () => void;
}

/** Small profile sheet: tap someone's name/photo in a room to see who they are and message them. */
export const ProfileCard: React.FC<ProfileCardProps> = ({ target, language, onClose, onMessage, onReport }) => {
  const t = TRANSLATIONS[language];
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(db, 'users_public', target.uid))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) setProfile(snap.data() as UserPublicProfile);
        else setMissing(true);
      })
      .catch(() => !cancelled && setMissing(true));
    return () => {
      cancelled = true;
    };
  }, [target.uid]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const name = profile?.name ?? target.name;
  const nickname = profile?.nickname ?? target.nickname;
  const since = profile?.createdAt?.toDate?.();
  const sinceLabel = since
    ? new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-US', { month: 'long', year: 'numeric' }).format(since)
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label={name}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-xs sheet-in rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-[#26272F] bg-white dark:bg-[#16171C] shadow-xl px-6 pt-7 pb-safe sm:pb-6 text-center"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.closeBtn}
          className="absolute top-3 end-3 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative inline-block">
          <AvatarImg src={profile?.photoUrl || target.photoUrl} name={name} sizeClass="w-20 h-20" className="mx-auto ring-4 ring-violet-100 dark:ring-violet-500/20" />
          {profile?.status === 'online' && (
            <span className="absolute bottom-1 end-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white dark:border-[#16171C]" />
          )}
        </div>
        <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-50">{name}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400" dir="ltr">@{nickname}</p>
        {missing ? (
          <p className="mt-2 text-xs text-slate-400">{t.profileUnavailable}</p>
        ) : (
          sinceLabel && <p className="mt-2 text-xs text-slate-400">{t.memberSince.replace('{date}', sinceLabel)}</p>
        )}

        <div className="mt-5 flex gap-2">
          {onMessage && profile && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onMessage(profile);
                  onClose();
                } finally {
                  setBusy(false);
                }
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4 rtl:-scale-x-100" />
              {busy ? '…' : t.messageThisPerson}
            </button>
          )}
          {onReport && (
            <button
              type="button"
              onClick={onReport}
              title={t.reportAction}
              aria-label={t.reportAction}
              className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-[#26272F] text-slate-400 hover:text-rose-500 cursor-pointer"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
