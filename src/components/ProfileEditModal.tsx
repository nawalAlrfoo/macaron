import React, { useRef, useState } from 'react';
import { Check, Upload, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { Language, NICKNAME_REGEX, normalizeNickname, SiteSettings, VALIDATION_LIMITS } from '@/src/types/chat';
import { compressAvatarFile, CURATED_AVATARS } from '@/src/utils/image';
import { AvatarImg } from './AvatarImg';

interface ProfileEditModalProps {
  language: Language;
  settings: SiteSettings;
  currentName: string;
  currentNickname: string;
  currentEmail: string;
  currentPhotoUrl: string;
  onClose: () => void;
  onSave: (data: {
    name: string;
    nickname: string;
    email: string;
    photoUrl: string;
  }) => Promise<void>;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  language,
  settings,
  currentName,
  currentNickname,
  currentEmail,
  currentPhotoUrl,
  onClose,
  onSave,
}) => {
  const t = TRANSLATIONS[language];
  const isRtl = language === 'ar';

  const [name, setName] = useState(currentName);
  const [nickname, setNickname] = useState(currentNickname);
  const [email, setEmail] = useState(currentEmail);
  const [photoUrl, setPhotoUrl] = useState(currentPhotoUrl);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        nickname: trimmedNickname,
        email: trimmedEmail,
        photoUrl: trimmedPhoto,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-900/35 backdrop-blur-md">
      <div className="w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain sheet-in glass-strong rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-700 p-5 pb-safe sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
            {t.editProfile}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <AvatarImg src={photoUrl} name={name} sizeClass="w-16 h-16" />
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
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer w-fit"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{t.uploadPhoto}</span>
              </button>
              <div className="flex items-center gap-2">
                {CURATED_AVATARS.map((av) => {
                  const selected = photoUrl === av.url;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => setPhotoUrl(av.url)}
                      className={`relative rounded-full p-0.5 cursor-pointer ${
                        selected ? 'ring-2 ring-violet-400' : ''
                      }`}
                    >
                      <AvatarImg src={av.url} name={av.labelEn} sizeClass="w-9 h-9" />
                      {selected && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-violet-500 text-white flex items-center justify-center">
                          <Check className="w-2 h-2" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.nameLabel}
              </label>
              <input
                type="text"
                required
                maxLength={VALIDATION_LIMITS.MAX_NAME_LEN}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-2xl text-sm border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-violet-200/60 dark:focus:ring-violet-500/20 transition-shadow"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t.nicknameLabel}
              </label>
              <div className="relative" dir="ltr">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-sm font-semibold text-slate-400 pointer-events-none">@</span>
                <input
                  type="text"
                  required
                  dir="ltr"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={20}
                  value={nickname}
                  onChange={(e) => setNickname(normalizeNickname(e.target.value))}
                  className="w-full ps-8 pe-3.5 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0F1014] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-violet-200/60 dark:focus:ring-violet-500/20 focus:border-violet-400 transition-shadow"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{t.nicknameHint}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.emailLabel}
            </label>
            <input
              type="email"
              required
              dir="ltr"
              maxLength={VALIDATION_LIMITS.MAX_EMAIL_LEN}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-2xl text-sm border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-[#0F1014] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-violet-200/60 dark:focus:ring-violet-500/20 transition-shadow"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 px-3.5 py-2 text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-full text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {t.cancelAction}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-60 border bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white border-transparent"
            >
              {saving ? t.savingProfile : isRtl ? t.saveAction : t.saveAction}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
