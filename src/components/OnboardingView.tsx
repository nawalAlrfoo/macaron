import React, { useEffect, useRef, useState } from 'react';
import { User } from 'firebase/auth';
import {
  Globe,
  Moon,
  Sun,
  Upload,
  Check,
  LogOut,
  ArrowRight,
  ArrowLeft,
  Users,
  Lock,
  Heart,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import {
  Language,
  NICKNAME_REGEX,
  normalizeNickname,
  SiteSettings,
  ThemeMode,
  VALIDATION_LIMITS,
} from '@/src/types/chat';
import { hexToRgba, resolveChatBackdropStyle } from '@/src/utils/colors';
import { assetUrl, compressAvatarFile, CURATED_AVATARS, WELCOME_BANNER_URL } from '@/src/utils/image';
import { AvatarImg } from './AvatarImg';
import { MacaronLogo } from './MacaronLogo';

interface OnboardingViewProps {
  user: User | null;
  language: Language;
  themeMode: ThemeMode;
  settings: SiteSettings;
  onToggleLanguage: (lang: Language) => void;
  onToggleThemeMode: (mode: ThemeMode) => void;
  onGoogleSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onCompleteProfile: (data: {
    name: string;
    nickname: string;
    email: string;
    photoUrl: string;
  }) => Promise<void>;
  initialProfile?: {
    name?: string;
    nickname?: string;
    email?: string;
    photoUrl?: string;
  };
}

export const OnboardingView: React.FC<OnboardingViewProps> = ({
  user,
  language,
  themeMode,
  settings,
  onToggleLanguage,
  onToggleThemeMode,
  onGoogleSignIn,
  onSignOut,
  onCompleteProfile,
  initialProfile,
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';
  const siteTitle = isRtl ? settings.siteNameAr : settings.siteNameEn;

  const [photoUrl, setPhotoUrl] = useState<string>(
    initialProfile?.photoUrl || CURATED_AVATARS[0].url
  );
  const [name, setName] = useState<string>(
    initialProfile?.name || user?.displayName || ''
  );
  const [nickname, setNickname] = useState<string>(initialProfile?.nickname || '');
  const [email, setEmail] = useState<string>(
    initialProfile?.email || user?.email || ''
  );
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [bannerFailed, setBannerFailed] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      if (!name && user.displayName) setName(user.displayName.slice(0, VALIDATION_LIMITS.MAX_NAME_LEN));
      if (!email && user.email) setEmail(user.email.slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN));
    }
  }, [user, name, email]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const compressed = await compressAvatarFile(file);
      setPhotoUrl(compressed);
    } catch {
      setError(t.imageTooLargeError);
    }
  };

  const handleSignInClick = async () => {
    setError('');
    setAuthLoading(true);
    try {
      await onGoogleSignIn();
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setError(t.authPopupClosed);
      } else if (code === 'auth/popup-blocked') {
        setError(t.authPopupBlocked);
      } else if (code === 'auth/network-request-failed') {
        setError(t.authNetwork);
      } else if (code === 'auth/unauthorized-domain') {
        setError(t.authUnauthorized);
      } else {
        console.error('Sign-in failed:', err);
        setError(t.authGeneric);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN);
    const trimmedNickname = normalizeNickname(nickname);
    const trimmedEmail = email.trim().slice(0, VALIDATION_LIMITS.MAX_EMAIL_LEN);
    const trimmedPhoto = photoUrl.trim();

    if (!trimmedName || !trimmedNickname || !trimmedEmail || !trimmedPhoto) {
      setError(t.profileRequiredError);
      return;
    }

    if (!NICKNAME_REGEX.test(trimmedNickname)) {
      setError(t.nicknameInvalid);
      return;
    }

    if (!VALIDATION_LIMITS.EMAIL_REGEX.test(trimmedEmail)) {
      setError(t.invalidEmailError);
      return;
    }

    setSubmitting(true);
    try {
      await onCompleteProfile({
        name: trimmedName,
        nickname: trimmedNickname,
        email: trimmedEmail,
        photoUrl: trimmedPhoto,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const backdropStyle = resolveChatBackdropStyle(settings, themeMode);
  const DirectionalArrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div
      style={backdropStyle}
      className="relative min-h-screen flex flex-col overflow-hidden transition-colors duration-200"
    >
      {/* Decorative floating pastel blobs */}
      <span aria-hidden="true" className="pastel-blob w-[28rem] h-[28rem] -top-40 -start-32" style={{ backgroundColor: settings.yellowAccent }} />
      <span aria-hidden="true" className="pastel-blob w-[26rem] h-[26rem] top-1/3 -end-40 [animation-delay:-4s]" style={{ backgroundColor: settings.pinkAccent }} />
      <span aria-hidden="true" className="pastel-blob w-[24rem] h-[24rem] -bottom-40 start-1/3 [animation-delay:-8s]" style={{ backgroundColor: settings.blueAccent }} />
      {/* Clean Single-Row Top Bar */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="logo-shine inline-flex rounded-[0.75rem] shadow-md rotate-[-6deg] shrink-0">
            <MacaronLogo size={42} />
          </span>
          <span className="text-xl font-bold tracking-tight text-gradient whitespace-nowrap shrink-0">
            {siteTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onToggleLanguage(isRtl ? 'en' : 'ar')}
            className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#262A36] shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isRtl ? 'EN' : 'عربي'}</span>
          </button>

          <button
            type="button"
            onClick={() => onToggleThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-[#262A36] shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {themeMode === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">{t.nightMode}</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{t.dayMode}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main 2-Column Balanced Onboarding Split */}
      <main className="relative z-10 flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:py-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-stretch">
          {/* Editorial Pastel Showcase Column */}
          <div className="msg-in glass lg:col-span-5 flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-700/70 p-6 lg:p-8 shadow-sm">
            <div className="space-y-4">
              <p className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-violet-600 dark:text-violet-300 shadow-xs w-fit">
                <span aria-hidden="true">✨</span>
                {t.appTagline}
              </p>
              <h1
                className="text-3xl lg:text-4xl font-bold leading-tight text-gradient"
                style={{ textWrap: 'balance' }}
              >
                {t.welcomeHeroTitle}
              </h1>
              <p className="text-sm lg:text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {t.welcomeHeroSubtitle}
              </p>
            </div>

            <div className="mt-6 rounded-3xl overflow-hidden border-4 border-slate-200 dark:border-slate-700/70 aspect-video bg-gradient-to-br from-[#FEF08A]/50 via-[#FBCFE8]/50 to-[#BAE6FD]/50 shadow-lg rotate-[-1.5deg] hover:rotate-0 transition-transform duration-500">
              {!bannerFailed ? (
                <img
                  src={assetUrl(WELCOME_BANNER_URL)}
                  alt={siteTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setBannerFailed(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
                  {siteTitle}
                </div>
              )}
            </div>

            {/* Feature chips */}
            <ul className="mt-6 grid grid-cols-2 gap-2">
              {[
                { icon: Users, label: t.featureRooms, tone: settings.pinkAccent },
                { icon: Lock, label: t.featurePrivate, tone: settings.blueAccent },
                { icon: Heart, label: t.featureReactions, tone: settings.yellowAccent },
                { icon: Moon, label: t.featureNight, tone: settings.blueAccent },
              ].map(({ icon: Icon, label, tone }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200"
                >
                  <span
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: hexToRgba(tone, themeMode === 'dark' ? 0.3 : 0.85) }}
                  >
                    <Icon className="w-3.5 h-3.5 text-slate-800 dark:text-slate-100" />
                  </span>
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Interactive Profile Gate Form Column */}
          <div className="msg-in glass-strong lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-700/70 p-6 lg:p-10 shadow-sm flex flex-col justify-center [animation-delay:80ms]">
            {!user ? (
              <div className="flex flex-col items-center text-center gap-6 py-6 lg:py-10 max-w-sm mx-auto w-full">
                <span className="logo-shine inline-flex rounded-[1.55rem] shadow-xl rotate-[-6deg] hover:rotate-0 transition-transform duration-500">
                  <MacaronLogo size={88} />
                </span>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                    {t.step1Title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {t.step1Desc}
                  </p>
                </div>

                {error && (
                  <div className="msg-in rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  disabled={authLoading}
                  onClick={handleSignInClick}
                  className="group w-full inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.99] cursor-pointer disabled:opacity-60 shadow-sm border bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-transparent"
                >
                  {authLoading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>{t.signInGoogle}</span>
                  <DirectionalArrow className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </button>

                <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                  <span>{t.privacyNote}</span>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                      {t.step2Title}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t.step2Desc}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.signOut}</span>
                  </button>
                </div>

                {/* Photo Selector + Upload */}
                <div className="space-y-2.5">
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t.photoLabel}
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <AvatarImg src={photoUrl} name={name || 'User'} sizeClass="w-20 h-20" className="ring-4 ring-white dark:ring-slate-800 shadow-lg" />

                    <div className="flex flex-col gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer w-fit"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{t.uploadPhoto}</span>
                      </button>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {t.orPickAvatar}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {CURATED_AVATARS.map((av) => {
                        const selected = photoUrl === av.url;
                        return (
                          <button
                            key={av.id}
                            type="button"
                            onClick={() => setPhotoUrl(av.url)}
                            title={isRtl ? av.labelAr : av.labelEn}
                            className={`relative rounded-full p-0.5 transition-transform hover:scale-105 cursor-pointer ${
                              selected ? 'ring-2 ring-offset-2 ring-violet-400 dark:ring-offset-[#171A23]' : ''
                            }`}
                          >
                            <AvatarImg src={av.url} name={av.labelEn} sizeClass="w-10 h-10" />
                            {selected && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-violet-500 text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Name & Nickname Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="onboard-name"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t.nameLabel}
                    </label>
                    <input
                      id="onboard-name"
                      type="text"
                      required
                      maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t.namePlaceholder}
                      className="w-full px-4 py-2.5 rounded-2xl text-sm border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-[#11131A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow focus:outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-500/25"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="onboard-nickname"
                      className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                    >
                      {t.nicknameLabel}
                    </label>
<div className="relative" dir="ltr">
                      <span className="absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">@</span>
                      <input
                        id="onboard-nickname"
                        type="text"
                        required
                        dir="ltr"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        maxLength={20}
                        value={nickname}
                        onChange={(e) => setNickname(normalizeNickname(e.target.value))}
                        placeholder="nawal_99"
                        className="w-full ps-8 pe-4 py-2.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#11131A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-500/25 focus:border-violet-400 transition-shadow"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.nicknameHint}</p>
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="onboard-email"
                    className="block text-sm font-semibold text-slate-700 dark:text-slate-200"
                  >
                    {t.emailLabel}
                  </label>
                  <input
                    id="onboard-email"
                    type="email"
                    required
                    maxLength={VALIDATION_LIMITS.MAX_EMAIL_LEN}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    dir="ltr"
                    className="w-full px-4 py-2.5 rounded-2xl text-sm border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-[#11131A] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-shadow focus:outline-none focus:ring-4 focus:ring-violet-200/70 dark:focus:ring-violet-500/25"
                  />
                </div>

                {error && (
                  <div className="msg-in rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="group w-full inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-semibold transition-colors active:scale-[0.99] cursor-pointer disabled:opacity-60 shadow-sm border bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-transparent"
                >
                  <span>{submitting ? t.savingProfile : t.startChatting}</span>
                  <DirectionalArrow className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 pb-5 pt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        {t.madeBy}{' '}
        <a
          href="https://nawal.pro"
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-violet-600 dark:text-violet-300 hover:underline underline-offset-2"
        >
          {t.authorName}
        </a>{' '}
        <span aria-hidden="true">🩷</span> · © {new Date().getFullYear()}
        <div className="mt-1.5 flex items-center justify-center gap-3">
          <a href="#/about" className="hover:text-violet-600 dark:hover:text-violet-300 hover:underline underline-offset-2">{t.aboutLink}</a>
          <span aria-hidden="true">·</span>
          <a href="#/privacy" className="hover:text-violet-600 dark:hover:text-violet-300 hover:underline underline-offset-2">{t.privacyLink}</a>
          <span aria-hidden="true">·</span>
          <a href="#/terms" className="hover:text-violet-600 dark:hover:text-violet-300 hover:underline underline-offset-2">{t.termsLink}</a>
        </div>
      </footer>
    </div>
  );
};
