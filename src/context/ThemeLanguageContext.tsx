import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  Category,
  HomepageBanner,
  Language,
  Product,
  ThemeMode,
} from '../types';
import {
  CATEGORY_TRANSLATIONS,
  PRODUCT_DEFAULT_TRANSLATIONS,
  UI_DICTIONARY,
} from '../i18n/translations';

interface ThemeLanguageContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  getProductText: (product: Product) => {
    name: string;
    shortDescription: string;
    description: string;
    features: string[];
  };
  getCategoryText: (category: Category) => {
    name: string;
    description: string;
  };
  getBannerText: (banner: HomepageBanner) => {
    badgeText: string;
    headline: string;
    subheadline: string;
    offerText: string;
    ctaText: string;
  };
}

const THEME_STORAGE_KEY = 'zaven_theme_mode_v1';
const LANG_STORAGE_KEY = 'zaven_language_v1';

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(
  undefined
);

export const ThemeLanguageProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  // Respect saved theme first, otherwise detect device prefers-color-scheme
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      if (
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ) {
        return 'dark';
      }
    } catch {
      // Fallback to light
    }
    return 'light';
  });

  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as Language | null;
      if (saved === 'uz' || saved === 'ru' || saved === 'en') {
        return saved;
      }
    } catch {
      // Fallback to Uzbek Latin
    }
    return 'uz';
  });

  // Apply or remove `.dark` class on `<html>` element and persist
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  // Update `<html lang="...">` attribute and persist language
  useEffect(() => {
    document.documentElement.lang = language;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, language);
    } catch {
      // Ignore storage error
    }
  }, [language]);

  const setTheme = (nextTheme: ThemeMode) => setThemeState(nextTheme);

  const toggleTheme = () =>
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));

  const setLanguage = (nextLang: Language) => setLanguageState(nextLang);

  // Safe UI dictionary lookup with automatic Uzbek fallback so raw keys never leak
  const t = (key: string, fallback?: string): string => {
    const langDict = UI_DICTIONARY[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    if (UI_DICTIONARY.uz[key]) {
      return UI_DICTIONARY.uz[key];
    }
    return fallback || key;
  };

  // Resolve localized product text: checks admin-edited `product.translations[language]` first,
  // then built-in seed translations, and finally falls back to the base Uzbek product fields.
  const getProductText = (product: Product) => {
    if (language === 'uz') {
      return {
        name: product.translations?.uz?.name?.trim() || product.name,
        shortDescription:
          product.translations?.uz?.shortDescription?.trim() ||
          product.shortDescription,
        description:
          product.translations?.uz?.description?.trim() || product.description,
        features:
          product.translations?.uz?.features &&
          product.translations.uz.features.length > 0
            ? product.translations.uz.features
            : product.features,
      };
    }

    const customTrans = product.translations?.[language];
    const seedTrans = PRODUCT_DEFAULT_TRANSLATIONS[product.id]?.[language];

    return {
      name: customTrans?.name?.trim() || seedTrans?.name || product.name,
      shortDescription:
        customTrans?.shortDescription?.trim() ||
        seedTrans?.shortDescription ||
        product.shortDescription,
      description:
        customTrans?.description?.trim() ||
        seedTrans?.description ||
        product.description,
      features:
        customTrans?.features && customTrans.features.length > 0
          ? customTrans.features
          : seedTrans?.features && seedTrans.features.length > 0
          ? seedTrans.features
          : product.features,
    };
  };

  const getCategoryText = (category: Category) => {
    if (language === 'uz') {
      return { name: category.name, description: category.description };
    }
    const mapped = CATEGORY_TRANSLATIONS[category.id]?.[language];
    return {
      name: mapped?.name || category.name,
      description: mapped?.description || category.description,
    };
  };

  const getBannerText = (banner: HomepageBanner) => {
    if (language === 'uz') {
      return {
        badgeText: banner.badgeText,
        headline: banner.headline,
        subheadline: banner.subheadline,
        offerText: banner.offerText,
        ctaText: banner.ctaText,
      };
    }
    if (language === 'ru' && banner.id === 'banner-main-1') {
      return {
        badgeText: 'НОВЫЕ ПОСТУПЛЕНИЯ',
        headline: 'Современные товары, делающие вашу повседневную жизнь удобнее',
        subheadline:
          'ZAVEN — интернет-магазин качественных товаров для дома, гаджетов и аксессуаров напрямую с проверенных фабрик Китая.',
        offerText: 'Спецпредложение: скидки до 25% на выделенный ассортимент',
        ctaText: 'Начать покупки',
      };
    }
    if (language === 'en' && banner.id === 'banner-main-1') {
      return {
        badgeText: 'NEW ARRIVALS',
        headline: 'Modern essentials designed to simplify your everyday life',
        subheadline:
          'ZAVEN brings quality-inspected home goods, smart gadgets, and mobile accessories directly from trusted manufacturers in China.',
        offerText: 'Special Offer: Up to 25% off selected essentials',
        ctaText: 'Shop Now',
      };
    }
    return {
      badgeText: banner.badgeText,
      headline: banner.headline,
      subheadline: banner.subheadline,
      offerText: banner.offerText,
      ctaText: banner.ctaText,
    };
  };

  return (
    <ThemeLanguageContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        language,
        setLanguage,
        t,
        getProductText,
        getCategoryText,
        getBannerText,
      }}
    >
      {children}
    </ThemeLanguageContext.Provider>
  );
};

export const useThemeLanguage = (): ThemeLanguageContextType => {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error(
      'useThemeLanguage must be used within a ThemeLanguageProvider'
    );
  }
  return context;
};
