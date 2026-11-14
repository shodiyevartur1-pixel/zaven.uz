import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  User,
  Grid,
  Phone,
  ShieldCheck,
  X,
  ChevronRight,
  ArrowLeft,
  Lock,
  Sun,
  Moon,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUZS } from '../../utils/format';
import { ThemeLanguageControls } from '../ui/ThemeLanguageControls';
import { Language } from '../../types';

const COMPACT_LANGS: { code: Language; label: string }[] = [
  { code: 'uz', label: 'OʻZ' },
  { code: 'ru', label: 'РУ' },
  { code: 'en', label: 'EN' },
];

export const StoreHeader: React.FC = () => {
  const { products, currentCustomer, storeSettings } = useStore();
  const {
    t,
    theme,
    toggleTheme,
    language,
    setLanguage,
    getProductText,
  } = useThemeLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const isCompactCheckoutRoute =
    location.pathname === '/cart' ||
    location.pathname.startsWith('/cart/') ||
    location.pathname.startsWith('/checkout');

  const configuredSupportPhone =
    storeSettings.supportPhone?.trim() === '+998 78 113-45-67'
      ? ''
      : storeSettings.supportPhone?.trim() || '';

  const searchResults =
    searchQuery.trim().length >= 1
      ? products
          .filter((p) => {
            if (p.status === 'archived' || p.status === 'hidden') return false;
            const q = searchQuery.toLowerCase();
            const localized = getProductText(p);
            return (
              p.name.toLowerCase().includes(q) ||
              localized.name.toLowerCase().includes(q) ||
              p.sku.toLowerCase().includes(q) ||
              localized.shortDescription.toLowerCase().includes(q)
            );
          })
          .slice(0, 5)
      : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchFocused(false);
    if (searchQuery.trim()) {
      navigate(`/catalog?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/catalog');
    }
  };

  const cycleLanguageMobile = () => {
    const idx = COMPACT_LANGS.findIndex((l) => l.code === language);
    const next = COMPACT_LANGS[(idx + 1) % COMPACT_LANGS.length];
    setLanguage(next.code);
  };

  // ============================================================================
  // PART 1 FIX: NON-OVERLAPPING COMPACT HEADER FOR /cart AND /checkout
  // - Uses a dedicated 40x40px back icon button on narrow phones (< sm)
  // - Hides secondary tagline on narrow phones so ZAVEN logo never clips
  // - Keeps language, theme, and account controls in distinct 40x40px touch areas
  // ============================================================================
  if (isCompactCheckoutRoute) {
    return (
      <header className="sticky top-0 z-40 bg-[#0F3D2E] text-white border-b border-[#09261C] shadow-sm">
        <div className="zaven-page-container h-14 flex items-center justify-between gap-2">
          {/* Left: Back to Shop Button + Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              to="/catalog"
              aria-label={t('cart.backToShop')}
              title={t('cart.backToShop')}
              className="w-10 h-10 sm:w-auto sm:h-9 sm:px-3 rounded-xl bg-[#09261C]/85 hover:bg-[#C89D54] text-emerald-100 hover:text-[#09261C] border border-emerald-700/70 inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-colors shrink-0"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t('cart.backToShop')}</span>
            </Link>

            <Link
              to="/"
              className="flex items-center gap-2 group focus:outline-none shrink-0"
              aria-label="ZAVEN"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C89D54] flex items-center justify-center text-[#09261C] font-extrabold text-base tracking-tight shadow-sm shrink-0">
                Z
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg tracking-wider text-white leading-none">
                  {storeSettings.storeName}
                </span>
                <span className="hidden md:flex text-[9px] text-[#E5C992] font-semibold tracking-widest uppercase mt-0.5 items-center gap-1">
                  <Lock className="w-2.5 h-2.5 shrink-0" />
                  <span>{t('header.secureCheckoutBadge')}</span>
                </span>
              </div>
            </Link>
          </div>

          {/* Right: Distinct Non-Overlapping Touch Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeLanguageControls variant="header-dark" />
            </div>

            <button
              type="button"
              onClick={cycleLanguageMobile}
              className="sm:hidden min-w-[40px] h-10 px-2.5 rounded-xl bg-[#09261C]/85 border border-emerald-700/80 text-xs font-extrabold text-[#C89D54] flex items-center justify-center shrink-0"
              aria-label="Tilni almashtirish / Switch language"
            >
              {COMPACT_LANGS.find((l) => l.code === language)?.label || 'OʻZ'}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="sm:hidden w-10 h-10 rounded-xl bg-[#09261C]/85 border border-emerald-700/80 flex items-center justify-center text-[#C89D54] shrink-0"
              aria-label={theme === 'dark' ? t('theme.light') : t('theme.dark')}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <Link
              to="/account"
              className="w-10 h-10 rounded-xl bg-[#09261C]/85 hover:bg-[#16533F] border border-[#C89D54]/40 text-white flex items-center justify-center transition-colors shrink-0"
              title={t('header.account')}
              aria-label={t('header.account')}
            >
              <User className="w-4 h-4 text-[#C89D54]" />
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // ============================================================================
  // STANDARD STOREFRONT HEADER
  // ============================================================================
  return (
    <header className="sticky top-0 z-40 bg-[#0F3D2E] text-white border-b border-[#09261C] shadow-sm">
      {/* Desktop Top Utility Bar */}
      <div className="hidden md:block bg-[#09261C] text-emerald-50 text-xs">
        <div className="zaven-page-container h-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
            <span className="font-medium truncate">{t('top.tagline')}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {configuredSupportPhone && (
              <a
                href={`tel:${configuredSupportPhone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 hover:text-[#C89D54] transition-colors font-medium"
              >
                <Phone className="w-3.5 h-3.5 text-[#C89D54]" />
                <span>{configuredSupportPhone}</span>
              </a>
            )}
            {configuredSupportPhone && (
              <span className="hidden lg:inline text-emerald-700">|</span>
            )}
            <span className="hidden lg:inline text-emerald-200">
              {storeSettings.workingHours}
            </span>
            <ThemeLanguageControls variant="header-dark" />
          </div>
        </div>
      </div>

      {/* Main Header Row + Single Search Bar */}
      <div ref={searchContainerRef} className="bg-[#0F3D2E] text-white">
        <div className="zaven-page-container py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Brand Identity & Desktop Catalog Link */}
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <Link
                to="/"
                className="flex items-center gap-1.5 sm:gap-2 group focus:outline-none shrink-0"
                aria-label="ZAVEN"
              >
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-[#C89D54] flex items-center justify-center text-[#09261C] font-extrabold text-sm sm:text-xl tracking-tight shadow-sm shrink-0">
                  Z
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm sm:text-xl tracking-wider text-white leading-none">
                    {storeSettings.storeName}
                  </span>
                  <span className="hidden sm:block text-[9px] text-[#E5C992] font-semibold tracking-widest uppercase mt-0.5">
                    {t('header.onlineStore')}
                  </span>
                </div>
              </Link>

              <Link
                to="/catalog"
                className="hidden md:inline-flex items-center gap-1.5 ml-2 px-3 py-2 rounded-lg bg-[#09261C]/80 hover:bg-[#16533F] border border-emerald-700/70 text-xs font-bold text-white transition-colors"
              >
                <Grid className="w-3.5 h-3.5 text-[#C89D54]" />
                <span>{t('nav.catalog')}</span>
              </Link>
            </div>

            {/* Desktop & Tablet Inline Search Bar */}
            <div className="hidden md:block flex-1 max-w-2xl relative">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onFocus={() => setIsSearchFocused(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearchFocused(true);
                  }}
                  placeholder={t('header.searchPlaceholder')}
                  className="w-full h-10 pl-4 pr-24 rounded-lg bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-sm border border-transparent focus:border-[#C89D54] focus:outline-none shadow-sm"
                  aria-label={t('header.searchBtn')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    aria-label={t('catalog.clear')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1 top-1 bottom-1 px-3 rounded-md bg-[#C89D54] hover:bg-brand-gold-hover text-[#09261C] font-extrabold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{t('header.searchBtn')}</span>
                </button>
              </form>
            </div>

            {/* Right Actions: Language, Theme and Account */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={cycleLanguageMobile}
                className="md:hidden min-w-[34px] h-8 sm:h-9 px-1.5 sm:px-2 rounded-xl bg-[#09261C]/85 border border-emerald-700/80 text-[10px] sm:text-[11px] font-extrabold text-[#C89D54] flex items-center justify-center shrink-0"
                title="Til / Язык / Language"
                aria-label="Switch language"
              >
                {COMPACT_LANGS.find((l) => l.code === language)?.label || 'OʻZ'}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="md:hidden w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#09261C]/85 border border-emerald-700/80 flex items-center justify-center text-[#C89D54] shrink-0"
                aria-label={
                  theme === 'dark' ? t('theme.light') : t('theme.dark')
                }
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>

              {/* Account Entry */}
              <Link
                to="/account"
                className="flex items-center gap-0 sm:gap-2 px-0 sm:px-2 py-1.5 rounded-xl hover:bg-[#16533F] transition-colors text-white shrink-0"
                title={t('header.account')}
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#09261C]/85 border border-[#C89D54]/40 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[#C89D54]" />
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[10px] text-emerald-200 leading-none">
                    {currentCustomer
                      ? t('header.welcome')
                      : t('header.account')}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[90px] mt-0.5">
                    {currentCustomer
                      ? currentCustomer.fullName.split(' ')[0]
                      : t('header.signIn')}
                  </span>
                </div>
              </Link>

            </div>
          </div>

          {/* Mobile Single Search Bar */}
          <div className="mt-2 md:hidden relative">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchFocused(true);
                }}
                placeholder={t('header.searchMobilePlaceholder')}
                className="w-full h-9 pl-9 pr-20 rounded-lg bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100 placeholder-gray-400 text-xs sm:text-sm focus:outline-none border border-transparent focus:border-[#C89D54]"
                aria-label={t('header.searchBtn')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                  aria-label={t('catalog.clear')}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-2.5 rounded-md bg-[#C89D54] text-[#09261C] font-extrabold text-[11px] flex items-center"
              >
                {t('header.searchShortBtn')}
              </button>
            </form>
          </div>

          {/* Live Search Suggestions Dropdown */}
          {isSearchFocused && searchQuery.trim().length >= 1 && (
            <div className="relative max-w-2xl mx-auto">
              <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-[#12211C] rounded-xl border border-gray-200 dark:border-[#2F5246] shadow-xl overflow-hidden z-50 text-gray-900 dark:text-gray-100">
                {searchResults.length > 0 ? (
                  <div>
                    <div className="px-3.5 py-2 bg-gray-50 dark:bg-[#162923] border-b border-gray-100 dark:border-[#28453B] flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{t('header.foundProducts')}</span>
                      <span>
                        {searchResults.length} {t('header.resultsCount')}
                      </span>
                    </div>
                    <ul className="divide-y divide-gray-100 dark:divide-[#28453B]">
                      {searchResults.map((item) => {
                        const loc = getProductText(item);
                        return (
                          <li key={item.id}>
                            <Link
                              to={`/product/${item.slug}`}
                              onClick={() => setIsSearchFocused(false)}
                              className="flex items-center gap-3 px-3.5 py-2 hover:bg-brand-green-light/50 dark:hover:bg-[#1D352D] transition-colors"
                            >
                              <img
                                src={item.images[0]}
                                alt={loc.name}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-[#28453B] shrink-0 bg-gray-50"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                  {loc.name}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs sm:text-sm font-bold text-brand-green">
                                  {formatUZS(item.salePrice ?? item.price)}
                                </p>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="p-2 bg-gray-50 dark:bg-[#162923] border-t border-gray-100 dark:border-[#28453B]">
                      <button
                        type="button"
                        onClick={handleSearchSubmit}
                        className="w-full py-1 text-xs font-bold text-brand-green hover:underline flex items-center justify-center gap-1"
                      >
                        <span>{t('header.viewAllResults')}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 text-center">
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">
                      «{searchQuery}» {t('header.noSearchMatch')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
