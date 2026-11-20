import React from 'react';
import { Globe, Moon, Sun, X } from 'lucide-react';
import { TRANSLATIONS } from '@/src/i18n/translations';
import { Language, ThemeMode } from '@/src/types/chat';

interface UserSettingsModalProps {
  language: Language;
  themeMode: ThemeMode;
  onChangeLanguage: (lang: Language) => void;
  onChangeThemeMode: (mode: ThemeMode) => void;
  onClose: () => void;
}

export const UserSettingsModal: React.FC<UserSettingsModalProps> = ({
  language,
  themeMode,
  onChangeLanguage,
  onChangeThemeMode,
  onClose,
}) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-md">
      <div className="w-full max-w-md msg-in glass-strong rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
              {t.personalSettingsTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t.personalSettingsDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.closeBtn}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Day / Night Mode */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.globalThemeModeLabel}
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-[#11131A]">
              <button
                type="button"
                onClick={() => onChangeThemeMode('light')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>{t.dayMode}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeThemeMode('dark')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  themeMode === 'dark'
                    ? 'bg-[#262A36] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                <span>{t.nightMode}</span>
              </button>
            </div>
          </div>

          {/* Language Toggle */}
          <div className="space-y-2">
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              {t.languageLabel}
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-slate-100/80 dark:bg-[#11131A]">
              <button
                type="button"
                onClick={() => onChangeLanguage('ar')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  language === 'ar'
                    ? 'bg-white dark:bg-[#262A36] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t.arabicLang}</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeLanguage('en')}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-white dark:bg-[#262A36] text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>{t.englishLang}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
