import React, { useEffect, useState } from 'react';
import {
  Check,
  Globe,
  Moon,
  Palette,
  Plus,
  Shield,
  ShieldOff,
  Sun,
  Trash2,
  Users,
} from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import {
  AccentTone,
  AdminRecord,
  BubbleStyle,
  ChatBgStyle,
  ChatRoom,
  Language,
  SiteSettings,
  THEME_PRESETS,
  ThemeMode,
  UserPrivateInfo,
  UserPublicProfile,
  VALIDATION_LIMITS,
} from '@/src/types/chat';
import {
  getReadableTextColor,
  hexToRgba,
  resolveBubbleSurface,
  resolveChatBackdropStyle,
} from '@/src/utils/colors';
import { AvatarImg } from './AvatarImg';
import { ReportsPanel } from './ReportsPanel';

interface AdminPanelProps {
  currentUid: string;
  language: Language;
  themeMode: ThemeMode;
  settings: SiteSettings;
  rooms: ChatRoom[];
  members: UserPublicProfile[];
  privateInfos: Record<string, UserPrivateInfo>;
  adminsMap: Record<string, AdminRecord>;
  onSaveSettings: (next: Omit<SiteSettings, 'updatedAt' | 'updatedBy'>) => Promise<void>;
  onCreateRoom: (room: {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    accentTone: AccentTone;
  }) => Promise<void>;
  onDeleteRoom: (roomId: string) => Promise<void>;
  onToggleAdminRole: (targetUser: UserPublicProfile, email: string, makeAdmin: boolean) => Promise<void>;
  onPreviewThemeMode: (mode: ThemeMode) => void;
  onPreviewLanguage: (lang: Language) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUid,
  language,
  themeMode,
  settings,
  rooms,
  members,
  privateInfos,
  adminsMap,
  onSaveSettings,
  onCreateRoom,
  onDeleteRoom,
  onToggleAdminRole,
  onPreviewThemeMode,
  onPreviewLanguage,
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  const [draft, setDraft] = useState<Omit<SiteSettings, 'updatedAt' | 'updatedBy'>>({
    siteNameAr: settings.siteNameAr,
    siteNameEn: settings.siteNameEn,
    themeMode: settings.themeMode,
    defaultLanguage: settings.defaultLanguage,
    presetId: settings.presetId,
    primaryColor: settings.primaryColor,
    yellowAccent: settings.yellowAccent,
    pinkAccent: settings.pinkAccent,
    blueAccent: settings.blueAccent,
    myBubbleColor: settings.myBubbleColor,
    otherBubbleColor: settings.otherBubbleColor,
    chatBgStyle: settings.chatBgStyle,
    bubbleStyle: settings.bubbleStyle,
  });

  const [savingTheme, setSavingTheme] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [error, setError] = useState('');

  // Room form state
  const [roomNameAr, setRoomNameAr] = useState('');
  const [roomNameEn, setRoomNameEn] = useState('');
  const [roomDescAr, setRoomDescAr] = useState('');
  const [roomDescEn, setRoomDescEn] = useState('');
  const [roomTone, setRoomTone] = useState<AccentTone>('pink');
  const [creatingRoom, setCreatingRoom] = useState(false);

  // Member search
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    setDraft({
      siteNameAr: settings.siteNameAr,
      siteNameEn: settings.siteNameEn,
      themeMode: settings.themeMode,
      defaultLanguage: settings.defaultLanguage,
      presetId: settings.presetId,
      primaryColor: settings.primaryColor,
      yellowAccent: settings.yellowAccent,
      pinkAccent: settings.pinkAccent,
      blueAccent: settings.blueAccent,
      myBubbleColor: settings.myBubbleColor,
      otherBubbleColor: settings.otherBubbleColor,
      chatBgStyle: settings.chatBgStyle,
      bubbleStyle: settings.bubbleStyle,
    });
  }, [settings]);

  const applyPreset = (presetId: (typeof THEME_PRESETS)[number]['id']) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraft((prev) => ({
      ...prev,
      presetId: preset.id,
      primaryColor: preset.primaryColor,
      yellowAccent: preset.yellowAccent,
      pinkAccent: preset.pinkAccent,
      blueAccent: preset.blueAccent,
      myBubbleColor: preset.myBubbleColor,
      otherBubbleColor: preset.otherBubbleColor,
      chatBgStyle: preset.chatBgStyle,
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavingTheme(true);
    try {
      await onSaveSettings({
        ...draft,
        siteNameAr: draft.siteNameAr.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN) || 'ماكرون',
        siteNameEn: draft.siteNameEn.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN) || 'Macaron',
      });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingTheme(false);
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNameAr.trim() || !roomNameEn.trim()) return;
    setCreatingRoom(true);
    setError('');
    try {
      await onCreateRoom({
        nameAr: roomNameAr.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
        nameEn: roomNameEn.trim().slice(0, VALIDATION_LIMITS.MAX_NAME_LEN),
        descriptionAr: roomDescAr.trim().slice(0, VALIDATION_LIMITS.MAX_ROOM_DESC_LEN),
        descriptionEn: roomDescEn.trim().slice(0, VALIDATION_LIMITS.MAX_ROOM_DESC_LEN),
        accentTone: roomTone,
      });
      setRoomNameAr('');
      setRoomNameEn('');
      setRoomDescAr('');
      setRoomDescEn('');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingRoom(false);
    }
  };

  const previewSettings: SiteSettings = {
    ...draft,
    updatedBy: currentUid,
  };
  const previewBackdrop = resolveChatBackdropStyle(previewSettings, themeMode);
  const myPreviewBg = resolveBubbleSurface(draft.myBubbleColor, themeMode);
  const otherPreviewBg = resolveBubbleSurface(draft.otherBubbleColor, themeMode);
  const myPreviewText = getReadableTextColor(myPreviewBg);
  const otherPreviewText = getReadableTextColor(otherPreviewBg);

  const bubbleRadiusClass =
    draft.bubbleStyle === 'pill'
      ? 'rounded-3xl'
      : draft.bubbleStyle === 'classic'
        ? 'rounded-xl'
        : 'rounded-2xl';

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.nickname.toLowerCase().includes(q)
    );
  });

  const colorPickers: Array<{
    key: 'primaryColor' | 'yellowAccent' | 'pinkAccent' | 'blueAccent' | 'myBubbleColor' | 'otherBubbleColor';
    label: string;
  }> = [
    { key: 'primaryColor', label: t.primaryColorLabel },
    { key: 'yellowAccent', label: t.yellowAccentLabel },
    { key: 'pinkAccent', label: t.pinkAccentLabel },
    { key: 'blueAccent', label: t.blueAccentLabel },
    { key: 'myBubbleColor', label: t.myBubbleColorLabel },
    { key: 'otherBubbleColor', label: t.otherBubbleColorLabel },
  ];

  return (
    <div className="h-full overflow-y-auto pastel-scroll p-6 lg:p-8 space-y-8 bg-[var(--app-bg)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {t.adminPanelTitle}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            {t.adminPanelSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPreviewLanguage(isRtl ? 'en' : 'ar')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16171C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#23273D] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isRtl ? t.englishLang : t.arabicLang}</span>
          </button>
          <button
            type="button"
            onClick={() => onPreviewThemeMode(themeMode === 'light' ? 'dark' : 'light')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#16171C] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#23273D] cursor-pointer whitespace-nowrap shrink-0"
          >
            {themeMode === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5" />
                <span>{t.nightMode}</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5" />
                <span>{t.dayMode}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {savedToast && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{t.themeSavedToast}</span>
        </div>
      )}

      {/* Reports from members */}
      <ReportsPanel language={language} />

      {/* Theme & Color Studio Form */}
      <form onSubmit={handleSaveSettings} className="space-y-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left 7 Cols: Controls */}
          <div className="xl:col-span-7 space-y-6 msg-in glass-strong rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-800">
              <Palette className="w-4 h-4 text-violet-500" />
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
                {t.adminAppearanceSection}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.siteNameArLabel}
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                  value={draft.siteNameAr}
                  onChange={(e) => setDraft({ ...draft, siteNameAr: e.target.value })}
                  dir="rtl"
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.siteNameEnLabel}
                </label>
                <input
                  type="text"
                  required
                  maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                  value={draft.siteNameEn}
                  onChange={(e) => setDraft({ ...draft, siteNameEn: e.target.value })}
                  dir="ltr"
                  className="w-full px-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.globalThemeModeLabel}
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0F1014]">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, themeMode: 'light' });
                      onPreviewThemeMode('light');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      draft.themeMode === 'light'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>{t.dayMode}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, themeMode: 'dark' });
                      onPreviewThemeMode('dark');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      draft.themeMode === 'dark'
                        ? 'bg-[#26272F] text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>{t.nightMode}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.defaultLanguageLabel}
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0F1014]">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, defaultLanguage: 'ar' });
                      onPreviewLanguage('ar');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      draft.defaultLanguage === 'ar'
                        ? 'bg-white dark:bg-[#26272F] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.arabicLang}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...draft, defaultLanguage: 'en' });
                      onPreviewLanguage('en');
                    }}
                    className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                      draft.defaultLanguage === 'en'
                        ? 'bg-white dark:bg-[#26272F] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.englishLang}
                  </button>
                </div>
              </div>
            </div>

            {/* Colours & bubble shapes are fixed by the Instagram-style design (v3) */}
            <p className="flex items-start gap-2 p-3 rounded-xl bg-[var(--primary-soft)] text-xs leading-relaxed text-slate-700 dark:text-slate-200">
              <span aria-hidden="true">🎨</span>
              <span>{t.designLockedNote}</span>
            </p>

            {/* Pastel Presets (hidden: not used by the v3 design) */}
            <div className="hidden space-y-2.5 pt-2">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.presetsLabel}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {THEME_PRESETS.map((preset) => {
                  const active = draft.presetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={`flex items-center justify-between gap-3 p-3 rounded-2xl border text-start transition-colors cursor-pointer ${
                        active
                          ? 'border-violet-400 bg-violet-50/50 dark:bg-violet-950/20'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {isRtl ? preset.nameAr : preset.nameEn}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.yellowAccent }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.pinkAccent }}
                        />
                        <span
                          className="w-4 h-4 rounded-full border border-black/10"
                          style={{ backgroundColor: preset.blueAccent }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Hex Pickers (hidden: not used by the v3 design) */}
            <div className="hidden space-y-3 pt-2">
              <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.adminColorsSection}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {colorPickers.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-2.5 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-[#0F1014] cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] font-mono-tabular text-slate-500 dark:text-slate-400">
                        {draft[item.key].toUpperCase()}
                      </div>
                    </div>
                    <input
                      type="color"
                      value={draft[item.key]}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          presetId: 'custom',
                          [item.key]: e.target.value,
                        })
                      }
                      className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent cursor-pointer shrink-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* Backdrop & Bubble Shape (hidden: not used by the v3 design) */}
            <div className="hidden grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.chatBgStyleLabel}
                </label>
                <select
                  value={draft.chatBgStyle}
                  onChange={(e) =>
                    setDraft({ ...draft, chatBgStyle: e.target.value as ChatBgStyle })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-800 dark:text-slate-100"
                >
                  {(Object.keys(t.bgStyles) as ChatBgStyle[]).map((k) => (
                    <option key={k} value={k}>
                      {t.bgStyles[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t.bubbleStyleLabel}
                </label>
                <select
                  value={draft.bubbleStyle}
                  onChange={(e) =>
                    setDraft({ ...draft, bubbleStyle: e.target.value as BubbleStyle })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-800 dark:text-slate-100"
                >
                  {(Object.keys(t.bubbleStyles) as BubbleStyle[]).map((k) => (
                    <option key={k} value={k}>
                      {t.bubbleStyles[k]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Live Preview + Publish */}
          <div className="xl:col-span-5 space-y-4 msg-in glass-strong rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-6">
            <h3 className="hidden text-sm font-bold text-slate-900 dark:text-slate-50">
              {t.livePreviewLabel}
            </h3>

            <div
              style={previewBackdrop}
              className="hidden rounded-2xl border border-slate-200/80 dark:border-slate-700 p-5 space-y-4 min-h-[260px] flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Incoming Sample */}
                <div className="flex items-end gap-2.5 max-w-[85%]">
                  <AvatarImg name="Lina" sizeClass="w-8 h-8" />
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {isRtl ? 'لينا · غيمة الصباح' : 'Lina · Morning Cloud'}
                    </div>
                    <div
                      className={`px-4 py-2.5 text-xs leading-relaxed shadow-xs border border-black/5 dark:border-white/5 ${bubbleRadiusClass}`}
                      style={{
                        backgroundColor: otherPreviewBg,
                        color: otherPreviewText,
                      }}
                    >
                      {t.previewIncoming}
                    </div>
                  </div>
                </div>

                {/* Outgoing Sample */}
                <div className="flex items-end justify-end gap-2.5">
                  <div className="space-y-1 max-w-[85%] flex flex-col items-end">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t.youLabel}
                    </div>
                    <div
                      className={`px-4 py-2.5 text-xs leading-relaxed shadow-xs border border-black/5 dark:border-white/5 ${bubbleRadiusClass}`}
                      style={{
                        backgroundColor: myPreviewBg,
                        color: myPreviewText,
                      }}
                    >
                      {t.previewOutgoing}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Input Bar */}
              <div className="flex items-center gap-2 pt-3 border-t border-black/5 dark:border-white/10">
                <div className="flex-1 px-3.5 py-2 rounded-xl bg-white/85 dark:bg-[#0F1014]/90 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-400">
                  {t.typeMessagePlaceholder}
                </div>
                <span
                  className="px-4 py-2 rounded-xl text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: draft.primaryColor,
                    color: getReadableTextColor(draft.primaryColor),
                  }}
                >
                  {t.sendMessage}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingTheme}
              className="w-full py-3.5 px-5 rounded-2xl text-sm font-bold text-slate-900 shadow-sm border border-black/5 cursor-pointer disabled:opacity-60 transition-transform active:scale-[0.99]"
              style={{
                background: `linear-gradient(135deg, ${hexToRgba(draft.yellowAccent, 0.95)}, ${hexToRgba(draft.pinkAccent, 0.95)}, ${hexToRgba(draft.blueAccent, 0.95)})`,
              }}
            >
              {savingTheme ? t.savingTheme : t.saveThemeGlobal}
            </button>
          </div>
        </div>
      </form>

      {/* Rooms Manager */}
      <div className="msg-in glass-strong rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-6 space-y-5">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
          {t.adminRoomsSection}
        </h2>

        <form onSubmit={handleCreateRoom} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            required
            maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
            value={roomNameAr}
            onChange={(e) => setRoomNameAr(e.target.value)}
            placeholder={t.newRoomNameAr}
            dir="rtl"
            className="px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            required
            maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
            value={roomNameEn}
            onChange={(e) => setRoomNameEn(e.target.value)}
            placeholder={t.newRoomNameEn}
            dir="ltr"
            className="px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100"
          />
          <input
            type="text"
            maxLength={VALIDATION_LIMITS.MAX_ROOM_DESC_LEN}
            value={roomDescAr}
            onChange={(e) => setRoomDescAr(e.target.value)}
            placeholder={t.newRoomDescAr}
            dir="rtl"
            className="px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100"
          />
          <select
            value={roomTone}
            onChange={(e) => setRoomTone(e.target.value as AccentTone)}
            className="px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100"
          >
            <option value="yellow">{t.toneYellow}</option>
            <option value="pink">{t.tonePink}</option>
            <option value="blue">{t.toneBlue}</option>
          </select>
          <button
            type="submit"
            disabled={creatingRoom}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 cursor-pointer disabled:opacity-60"
            style={{
              backgroundColor:
                roomTone === 'yellow'
                  ? draft.yellowAccent
                  : roomTone === 'pink'
                    ? draft.pinkAccent
                    : draft.blueAccent,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.createRoomBtn}</span>
          </button>
        </form>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {rooms.map((room) => {
            const toneHex =
              room.accentTone === 'yellow'
                ? draft.yellowAccent
                : room.accentTone === 'pink'
                  ? draft.pinkAccent
                  : draft.blueAccent;
            return (
              <div
                key={room.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: toneHex }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {isRtl ? room.nameAr : room.nameEn}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {isRtl ? room.descriptionAr : room.descriptionEn}
                    </div>
                  </div>
                </div>
                {rooms.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onDeleteRoom(room.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t.deleteRoomBtn}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Members & Admin Permissions */}
      <div className="msg-in glass-strong rounded-2xl border border-slate-200 dark:border-slate-700/70 shadow-sm p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-500" />
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">
              {t.adminMembersSection}
            </h2>
          </div>
          <input
            type="text"
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder={t.searchMembersPlaceholder}
            className="px-3.5 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100 w-60"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-start">
                <th className="py-2.5 px-3 font-semibold text-start">{t.memberColUser}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{t.memberColNickname}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{t.memberColEmail}</th>
                <th className="py-2.5 px-3 font-semibold text-start">{t.memberColRole}</th>
                <th className="py-2.5 px-3 font-semibold text-end">{t.memberColActions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.map((member) => {
                const priv = privateInfos[member.uid];
                const email = priv?.email || '—';
                const isTargetAdmin =
                  Boolean(adminsMap[member.uid]) || email === 'nawalalrfoo@gmail.com';
                const isSelf = member.uid === currentUid;

                return (
                  <tr
                    key={member.uid}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <AvatarImg src={member.photoUrl} name={member.name} sizeClass="w-8 h-8" />
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {member.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                      {member.nickname}
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-slate-500 dark:text-slate-400" dir="ltr">
                      {email}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-200 font-medium">
                      {isTargetAdmin ? t.roleAdmin : t.roleMember}
                    </td>
                    <td className="py-3 px-3 text-end">
                      {!isSelf && priv?.email && email !== 'nawalalrfoo@gmail.com' && (
                        <button
                          type="button"
                          onClick={() => onToggleAdminRole(member, priv.email, !isTargetAdmin)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          {isTargetAdmin ? (
                            <>
                              <ShieldOff className="w-3.5 h-3.5 text-rose-500" />
                              <span>{t.removeAdmin}</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-3.5 h-3.5 text-sky-500" />
                              <span>{t.makeAdmin}</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
