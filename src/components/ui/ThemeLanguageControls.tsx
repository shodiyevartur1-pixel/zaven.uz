import React from 'react';
import { Sun, Moon, Globe } from 'lucide-react';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Language } from '../../types';

interface ThemeLanguageControlsProps {
  variant?: 'header-dark' | 'surface';
}

const LANGUAGES: { code: Language; label: string; title: string }[] = [
  { code: 'uz', label: 'OʻZ', title: 'Oʻzbekcha (Lotin)' },
  { code: 'ru', label: 'РУ', title: 'Русский' },
  { code: 'en', label: 'EN', title: 'English' },
];

export const ThemeLanguageControls: React.FC<ThemeLanguageControlsProps> = ({
  variant = 'header-dark',
}) => {
  const { theme, toggleTheme, language, setLanguage, t } = useThemeLanguage();

  const isDarkVariant = variant === 'header-dark';

  return (
    <div className="inline-flex items-center gap-2">
      {/* Language Switcher Pill */}
      <div
        className={`inline-flex items-center rounded-lg p-0.5 border ${
          isDarkVariant
            ? 'bg-brand-green-dark/80 border-emerald-700/80 text-emerald-100'
            : 'bg-surface-page border-gray-200 text-gray-700'
        }`}
        role="group"
        aria-label="Tilni tanlash / Language selector"
      >
        <Globe
          className={`w-3.5 h-3.5 ml-1.5 mr-1 shrink-0 ${
            isDarkVariant ? 'text-brand-gold' : 'text-brand-green'
          }`}
        />
        {LANGUAGES.map((lang) => {
          const isActive = language === lang.code;
          return (
            <button
              key={lang.code}
              type="button"
              onClick={() => setLanguage(lang.code)}
              title={lang.title}
              className={`px-2 py-1 rounded-md text-[11px] font-extrabold transition-colors ${
                isActive
                  ? 'bg-brand-gold text-brand-green-dark shadow-sm'
                  : isDarkVariant
                  ? 'text-emerald-100 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {lang.label}
            </button>
          );
        })}
      </div>

      {/* Light / Dark Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        title={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
        className={`h-7 px-2.5 rounded-lg border inline-flex items-center gap-1.5 text-[11px] font-bold transition-colors ${
          isDarkVariant
            ? 'bg-brand-green-dark/80 border-emerald-700/80 text-emerald-100 hover:border-brand-gold hover:text-brand-gold'
            : 'bg-surface-page border-gray-200 text-gray-700 hover:border-brand-green'
        }`}
      >
        {theme === 'dark' ? (
          <>
            <Sun className="w-3.5 h-3.5 text-brand-gold" />
            <span className="hidden sm:inline">{t('theme.light')}</span>
          </>
        ) : (
          <>
            <Moon className="w-3.5 h-3.5 text-brand-gold" />
            <span className="hidden sm:inline">{t('theme.dark')}</span>
          </>
        )}
      </button>
    </div>
  );
};
