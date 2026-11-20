import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';
import { unblockUser } from '@/src/lib/moderation';
import {
  Ban,
  Bell,
  Check,
  Copy,
  Edit2,
  Globe,
  Keyboard,
  LogOut,
  Monitor,
  Moon,
  Sun,
  Type,
  Volume2,
  X,
} from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { playChime, setPrefs, usePrefs, type UserPrefs } from '@/src/lib/prefs';
import { Language, ThemeMode, UserPublicProfile } from '@/src/types/chat';
import { AvatarImg } from './AvatarImg';

interface UserSettingsModalProps {
  language: Language;
  themeMode: ThemeMode;
  profile: UserPublicProfile;
  onChangeLanguage: (lang: Language) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onEditProfile: () => void;
  onSignOut: () => void;
  blockedUids: string[];
  onClose: () => void;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({
  icon,
  title,
  children,
}) => (
  <section className="space-y-2.5">
    <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {icon}
      <span>{title}</span>
    </h3>
    <div className="rounded-xl border border-slate-200 dark:border-[#262A36] divide-y divide-slate-200 dark:divide-[#262A36] overflow-hidden">
      {children}
    </div>
  </section>
);

const Row: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-[#171A23]">
    <div className="min-w-0">
      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</div>
      {hint && <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
      checked ? 'bg-[var(--primary)]' : 'bg-slate-300 dark:bg-slate-600'
    }`}
  >
    <span
      className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all ${
        checked ? 'start-[1.125rem]' : 'start-0.5'
      }`}
    />
  </button>
);

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-[#11131A]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            value === o.value
              ? 'bg-white dark:bg-[#262A36] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          {o.icon}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  language,
  themeMode,
  profile,
  onChangeLanguage,
  onChangeThemeMode,
  onEditProfile,
  onSignOut,
  blockedUids,
  onClose,
}) => {
  const t = TRANSLATIONS[language];
  const prefs = usePrefs();
  const [copied, setCopied] = useState(false);
  const notifSupported = typeof window !== 'undefined' && 'Notification' in window;
  const [notifDenied, setNotifDenied] = useState(
    notifSupported && Notification.permission === 'denied'
  );

  // Names for the blocked list
  const [blockedProfiles, setBlockedProfiles] = useState<Record<string, UserPublicProfile>>({});
  useEffect(() => {
    let cancelled = false;
    blockedUids.forEach(async (uid) => {
      if (blockedProfiles[uid]) return;
      try {
        const snap = await getDoc(doc(db, 'users_public', uid));
        if (!cancelled && snap.exists()) {
          setBlockedProfiles((p) => ({ ...p, [uid]: snap.data() as UserPublicProfile }));
        }
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockedUids.join(',')]);

  const themeValue: UserPrefs['theme'] = prefs.theme ?? themeMode;

  const handleTheme = (v: UserPrefs['theme']) => {
    setPrefs({ theme: v });
    if (v !== 'system') onChangeThemeMode(v);
  };

  const handleDesktopNotifications = async (on: boolean) => {
    if (!on) {
      setPrefs({ desktopNotifications: false });
      return;
    }
    if (!notifSupported) return;
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    setNotifDenied(perm === 'denied');
    setPrefs({ desktopNotifications: perm === 'granted' });
  };

  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${profile.nickname}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[88vh] flex flex-col msg-in rounded-2xl border border-slate-200 dark:border-[#262A36] bg-[var(--app-bg)] shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23]">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">{t.personalSettingsTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.settingsSavedOnDevice}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pastel-scroll px-6 py-5 space-y-6">
          {/* Account */}
          <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23]">
            <AvatarImg src={profile.photoUrl} name={profile.name} sizeClass="w-12 h-12" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">{profile.name}</div>
              <button
                type="button"
                onClick={copyUsername}
                dir="ltr"
                className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline cursor-pointer"
                title={t.copyAction}
              >
                @{profile.nickname}
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <button
              type="button"
              onClick={onEditProfile}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#262A36] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#1E2230] cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t.editProfile}</span>
            </button>
          </div>

          <Section icon={<Sun className="w-3.5 h-3.5" />} title={t.settingsAppearance}>
            <Row label={t.globalThemeModeLabel}>
              <Segmented<UserPrefs['theme']>
                value={themeValue}
                onChange={handleTheme}
                options={[
                  { value: 'light', label: t.dayMode, icon: <Sun className="w-3.5 h-3.5" /> },
                  { value: 'dark', label: t.nightMode, icon: <Moon className="w-3.5 h-3.5" /> },
                  { value: 'system', label: t.themeSystem, icon: <Monitor className="w-3.5 h-3.5" /> },
                ]}
              />
            </Row>
            <Row label={t.settingsFontSize}>
              <Segmented<UserPrefs['fontSize']>
                value={prefs.fontSize}
                onChange={(v) => setPrefs({ fontSize: v })}
                options={[
                  { value: 'sm', label: t.fontSmall, icon: <Type className="w-3 h-3" /> },
                  { value: 'md', label: t.fontMedium },
                  { value: 'lg', label: t.fontLarge, icon: <Type className="w-4 h-4" /> },
                ]}
              />
            </Row>
            <Row label={t.languageLabel}>
              <Segmented<Language>
                value={language}
                onChange={onChangeLanguage}
                options={[
                  { value: 'ar', label: 'العربية', icon: <Globe className="w-3.5 h-3.5" /> },
                  { value: 'en', label: 'English' },
                ]}
              />
            </Row>
          </Section>

          <Section icon={<Bell className="w-3.5 h-3.5" />} title={t.settingsNotifications}>
            <Row label={t.settingsSound} hint={t.settingsSoundHint}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={playChime}
                  title={t.settingsTestSound}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-[var(--primary)] hover:bg-slate-100 dark:hover:bg-[#1E2230] cursor-pointer"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <Toggle checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} label={t.settingsSound} />
              </div>
            </Row>
            <Row
              label={t.settingsDesktop}
              hint={!notifSupported ? t.settingsDesktopUnsupported : notifDenied ? t.settingsDesktopDenied : t.settingsDesktopHint}
            >
              <Toggle
                checked={prefs.desktopNotifications}
                onChange={handleDesktopNotifications}
                label={t.settingsDesktop}
              />
            </Row>
          </Section>

          <Section icon={<Keyboard className="w-3.5 h-3.5" />} title={t.settingsTyping}>
            <Row label={t.settingsEnterToSend} hint={prefs.enterToSend ? t.settingsEnterOn : t.settingsEnterOff}>
              <Toggle
                checked={prefs.enterToSend}
                onChange={(v) => setPrefs({ enterToSend: v })}
                label={t.settingsEnterToSend}
              />
            </Row>
          </Section>

          <Section icon={<Ban className="w-3.5 h-3.5" />} title={t.blockedListTitle}>
            {blockedUids.length === 0 ? (
              <div className="px-4 py-3 bg-white dark:bg-[#171A23] text-xs text-slate-500 dark:text-slate-400">
                {t.blockedListEmpty}
              </div>
            ) : (
              blockedUids.map((uid) => {
                const p = blockedProfiles[uid];
                return (
                  <div key={uid} className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#171A23]">
                    <AvatarImg src={p?.photoUrl} name={p?.name ?? '?'} sizeClass="w-8 h-8" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-slate-800 dark:text-slate-100 truncate">{p?.name ?? '…'}</div>
                      {p && <div className="text-[11px] text-slate-500" dir="ltr">@{p.nickname}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => unblockUser(profile.uid, uid)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-[#262A36] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1E2230] cursor-pointer"
                    >
                      {t.unblockAction}
                    </button>
                  </div>
                );
              })
            )}
          </Section>

          <button
            type="button"
            onClick={onSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium border border-slate-200 dark:border-[#262A36] bg-white dark:bg-[#171A23] text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
