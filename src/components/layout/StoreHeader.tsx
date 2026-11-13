import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  Phone,
  ShieldCheck,
  X,
  ChevronRight,
  Sparkles,
  Tag,
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

interface StoreHeaderProps {
  onOpenMobileMenu: () => void;
}

const COMPACT_LANGS: { code: Language; label: string }[] = [
  { code: 'uz', label: 'OʻZ' },
  { code: 'ru', label: 'РУ' },
  { code: 'en', label: 'EN' },
];

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  onOpenMobileMenu,
}) => {
  const { products, categories, cart, currentCustomer, storeSettings } =
    useStore();
  const {
    t,
    theme,
    toggleTheme,
    language,
    setLanguage,
    getProductText,
    getCategoryText,
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

  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => {
    const product = products.find((p) => p.id === item.productId);
    if (!product) return total;
    const unitPrice = product.salePrice ?? product.price;
    return total + unitPrice * item.quantity;
  }, 0);

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
  // COMPACT TASK-FOCUSED HEADER FOR CART & CHECKOUT ROUTES
  // ============================================================================
  if (isCompactCheckoutRoute) {
    return (
      <header className="sticky top-0 z-40 bg-[#0F3D2E] text-white border-b border-[#09261C] shadow-sm">
        <div className="zaven-page-container h-14 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 group focus:outline-none shrink-0"
              aria-label="ZAVEN"
            >
              <div className="w-8 h-8 rounded-lg bg-[#C89D54] flex items-center justify-center text-[#09261C] font-extrabold text-base tracking-tight shadow-sm">
                Z
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg tracking-wider text-white leading-none">
                  {storeSettings.storeName}
                </span>
                <span className="text-[9px] text-[#E5C992] font-semibold tracking-widest uppercase mt-0.5 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate max-w-[120px] sm:max-w-none">
                    {t('header.secureCheckoutBadge')}
                  </span>
                </span>
              </div>
            </Link>

            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#09261C]/80 hover:bg-[#C89D54] text-emerald-100 hover:text-[#09261C] border border-emerald-700/70 text-xs font-bold transition-colors truncate"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{t('cart.backToShop')}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <ThemeLanguageControls variant="header-dark" />
            </div>

            <button
              type="button"
              onClick={cycleLanguageMobile}
              className="sm:hidden h-8 px-2.5 rounded-lg bg-[#09261C]/80 border border-emerald-700 text-[11px] font-extrabold text-[#C89D54]"
              aria-label="Switch language"
            >
              {COMPACT_LANGS.find((l) => l.code === language)?.label || 'OʻZ'}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="sm:hidden w-8 h-8 rounded-lg bg-[#09261C]/80 border border-emerald-700 flex items-center justify-center text-[#C89D54]"
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
              className="w-8 h-8 rounded-lg bg-[#09261C]/80 hover:bg-[#16533F] border border-[#C89D54]/40 text-white flex items-center justify-center transition-colors"
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
  // STOREFRONT HEADER (Redundant mobile category ribbon removed below search bar)
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
            <a
              href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 hover:text-[#C89D54] transition-colors font-medium"
            >
              <Phone className="w-3.5 h-3.5 text-[#C89D54]" />
              <span>{storeSettings.supportPhone}</span>
            </a>
            <span className="hidden lg:inline text-emerald-700">|</span>
            <span className="hidden lg:inline text-emerald-200">
              {storeSettings.workingHours}
            </span>
            <ThemeLanguageControls variant="header-dark" />
          </div>
        </div>
      </div>

      {/* Main Header Row + Search Bar */}
      <div ref={searchContainerRef} className="bg-[#0F3D2E] text-white">
        <div className="zaven-page-container py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Left: Menu Button + Brand Identity */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="lg:hidden w-9 h-9 -ml-1 rounded-lg text-white hover:bg-[#16533F] flex items-center justify-center focus:outline-none"
                aria-label={t('nav.menu')}
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                to="/"
                className="flex items-center gap-2 group focus:outline-none"
                aria-label="ZAVEN"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-[#C89D54] flex items-center justify-center text-[#09261C] font-extrabold text-lg sm:text-xl tracking-tight shadow-sm shrink-0">
                  Z
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-lg sm:text-xl tracking-wider text-white leading-none">
                    {storeSettings.storeName}
                  </span>
                  <span className="hidden sm:block text-[9px] text-[#E5C992] font-semibold tracking-widest uppercase mt-0.5">
                    {t('header.onlineStore')}
                  </span>
                </div>
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

            {/* Right Actions: Mobile Lang/Theme + Account + Cart */}
            <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
              <button
                type="button"
                onClick={cycleLanguageMobile}
                className="md:hidden h-8 px-2.5 rounded-lg bg-[#09261C]/80 border border-emerald-700/80 text-[11px] font-extrabold text-[#C89D54]"
                title="Til / Язык / Language"
                aria-label="Switch language"
              >
                {COMPACT_LANGS.find((l) => l.code === language)?.label || 'OʻZ'}
              </button>

              <button
                type="button"
                onClick={toggleTheme}
                className="md:hidden w-8 h-8 rounded-lg bg-[#09261C]/80 border border-emerald-700/80 flex items-center justify-center text-[#C89D54]"
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

              <Link
                to="/account"
                className="flex items-center gap-2 px-1.5 sm:px-2.5 py-1.5 rounded-lg hover:bg-[#16533F] transition-colors text-white"
                title={t('header.account')}
              >
                <div className="w-8 h-8 rounded-lg bg-[#09261C]/80 border border-[#C89D54]/40 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-[#C89D54]" />
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[10px] text-emerald-200 leading-none">
                    {currentCustomer
                      ? t('header.welcome')
                      : t('header.account')}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[100px] mt-0.5">
                    {currentCustomer
                      ? currentCustomer.fullName.split(' ')[0]
                      : t('header.signIn')}
                  </span>
                </div>
              </Link>

              <Link
                to="/cart"
                className="relative flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#09261C] hover:bg-[#C89D54] hover:text-[#09261C] border border-[#C89D54]/60 transition-colors group"
                aria-label={t('header.cart')}
              >
                <div className="relative">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] group-hover:text-[#09261C] transition-colors" />
                  <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-[#C89D54] text-[#09261C] group-hover:bg-[#09261C] group-hover:text-white text-[10px] font-extrabold flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col text-left pl-1">
                  <span className="text-[10px] text-emerald-200 group-hover:text-[#09261C]/80 leading-none">
                    {t('header.cart')}
                  </span>
                  <span className="text-xs font-extrabold text-white group-hover:text-[#09261C] mt-0.5 whitespace-nowrap">
                    {formatUZS(cartSubtotal)}
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
                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                  SKU: {item.sku}
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

      {/* Requirement 2: Desktop-Only Category Navigation Strip (Removed from mobile header) */}
      <nav
        aria-label={t('nav.categoriesTitle')}
        className="hidden lg:block bg-white dark:bg-[#12211C] border-t border-gray-200 dark:border-[#28453B] text-gray-900 dark:text-gray-100"
      >
        <div className="zaven-page-container py-1.5 flex items-center justify-between gap-3">
          <div className="flex-1 flex items-center gap-1.5 flex-wrap py-0.5 min-w-0">
            <Link
              to="/catalog"
              className={`shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                location.pathname === '/catalog' && !location.search
                  ? 'bg-[#0F3D2E] text-white font-bold shadow-sm border border-emerald-500/30'
                  : 'text-gray-800 dark:text-gray-200 bg-surface-page dark:bg-[#162923] hover:bg-brand-green-light dark:hover:bg-[#1D352D] hover:text-brand-green'
              }`}
            >
              {t('nav.allProducts')}
            </Link>

            {activeCategories.map((cat) => {
              const locCat = getCategoryText(cat);
              const isActive =
                location.search.includes(`category=${cat.slug}`) ||
                location.search.includes(`category=${cat.id}`);
              return (
                <Link
                  key={cat.id}
                  to={`/catalog?category=${cat.slug}`}
                  className={`shrink-0 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#0F3D2E] text-white font-bold shadow-sm border border-emerald-500/30'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-brand-green-light/70 dark:hover:bg-[#1D352D] hover:text-brand-green'
                  }`}
                >
                  {locCat.name}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0 pl-2 border-l border-gray-200 dark:border-[#28453B]">
            <Link
              to="/catalog?filter=discounted"
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                location.search.includes('filter=discounted')
                  ? 'bg-[#C89D54] text-[#09261C] border-[#C89D54]'
                  : 'text-brand-gold-dark bg-brand-gold-light border-brand-gold-border hover:bg-[#C89D54] hover:text-[#09261C]'
              }`}
            >
              <Tag className="w-3 h-3 shrink-0" />
              <span>{t('nav.discounts')}</span>
            </Link>
            <Link
              to="/catalog?filter=new"
              className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg transition-colors ${
                location.search.includes('filter=new')
                  ? 'bg-[#0F3D2E] text-white border border-emerald-500/30'
                  : 'text-brand-green bg-brand-green-light/60 hover:bg-brand-green-light'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#C89D54] shrink-0" />
              <span>{t('nav.newShort')}</span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};
