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
  ChevronLeft,
  Sparkles,
  Tag,
  Grid,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUZS } from '../../utils/format';
import { ThemeLanguageControls } from '../ui/ThemeLanguageControls';

interface StoreHeaderProps {
  onOpenMobileMenu: () => void;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
  onOpenMobileMenu,
}) => {
  const { products, categories, cart, currentCustomer, storeSettings } =
    useStore();
  const { t, getProductText, getCategoryText } = useThemeLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

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

  const updateScrollIndicators = () => {
    const el = categoryScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  };

  useEffect(() => {
    updateScrollIndicators();
    window.addEventListener('resize', updateScrollIndicators);
    return () => window.removeEventListener('resize', updateScrollIndicators);
  }, [activeCategories.length]);

  const scrollCategoryBar = (direction: 'left' | 'right') => {
    const el = categoryScrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === 'left' ? -240 : 240,
      behavior: 'smooth',
    });
  };

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

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      {/* Top Utility Bar (No public Admin links) */}
      <div className="bg-brand-green-dark text-emerald-50 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-gold shrink-0" />
            <span className="font-medium truncate hidden sm:inline">
              {t('top.tagline')}
            </span>
            <a
              href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
              className="sm:hidden inline-flex items-center gap-1 text-emerald-100 font-semibold"
            >
              <Phone className="w-3 h-3 text-brand-gold" />
              <span>{storeSettings.supportPhone}</span>
            </a>
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <a
              href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
              className="hidden md:inline-flex items-center gap-1.5 hover:text-brand-gold transition-colors font-medium"
            >
              <Phone className="w-3.5 h-3.5 text-brand-gold" />
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

      {/* Main Header Row */}
      <div className="bg-brand-green text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-3 sm:gap-5">
            {/* Mobile Menu Button & Brand Logo */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                type="button"
                onClick={onOpenMobileMenu}
                className="lg:hidden p-2 -ml-1 rounded-lg text-white hover:bg-brand-green-hover focus:outline-none"
                aria-label={t('nav.menu')}
              >
                <Menu className="w-6 h-6" />
              </button>

              <Link
                to="/"
                className="flex items-center gap-2.5 group focus:outline-none"
                aria-label="ZAVEN"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-gold flex items-center justify-center text-brand-green-dark font-extrabold text-xl tracking-tight shadow-sm group-hover:bg-brand-gold-hover transition-colors shrink-0">
                  Z
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-xl sm:text-2xl tracking-wider text-white leading-none">
                    {storeSettings.storeName}
                  </span>
                  <span className="text-[10px] text-brand-gold font-semibold tracking-widest uppercase mt-0.5">
                    {t('header.onlineStore')}
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop & Tablet Search Bar */}
            <div
              ref={searchContainerRef}
              className="hidden md:block flex-1 max-w-2xl relative"
            >
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
                  className="w-full h-11 pl-4 pr-28 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm border-2 border-transparent focus:border-brand-gold focus:outline-none shadow-sm"
                  aria-label={t('header.searchBtn')}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-24 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                    aria-label={t('catalog.clear')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3.5 rounded-md bg-brand-gold hover:bg-brand-gold-hover text-brand-green-dark font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  <span>{t('header.searchBtn')}</span>
                </button>
              </form>

              {/* Live Search Suggestions Dropdown */}
              {isSearchFocused && searchQuery.trim().length >= 1 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 text-gray-900">
                  {searchResults.length > 0 ? (
                    <div>
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>{t('header.foundProducts')}</span>
                        <span>
                          {searchResults.length} {t('header.resultsCount')}
                        </span>
                      </div>
                      <ul className="divide-y divide-gray-100">
                        {searchResults.map((item) => {
                          const loc = getProductText(item);
                          return (
                            <li key={item.id}>
                              <Link
                                to={`/product/${item.slug}`}
                                onClick={() => setIsSearchFocused(false)}
                                className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-brand-green-light/50 transition-colors"
                              >
                                <img
                                  src={item.images[0]}
                                  alt={loc.name}
                                  className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">
                                    {loc.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    SKU: {item.sku}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-sm font-bold text-brand-green">
                                    {formatUZS(item.salePrice ?? item.price)}
                                  </p>
                                  {item.salePrice && (
                                    <p className="text-[11px] text-gray-400 line-through">
                                      {formatUZS(item.price)}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="p-2.5 bg-gray-50 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={handleSearchSubmit}
                          className="w-full py-1.5 text-xs font-bold text-brand-green hover:underline flex items-center justify-center gap-1"
                        >
                          <span>{t('header.viewAllResults')}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center">
                      <p className="text-sm font-semibold text-gray-800">
                        «{searchQuery}» {t('header.noSearchMatch')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('header.noSearchHint')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Actions: Account & Cart */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <Link
                to="/account"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-brand-green-hover transition-colors text-white"
                title={t('header.account')}
              >
                <div className="w-8 h-8 rounded-full bg-brand-green-dark/80 border border-brand-gold/40 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-brand-gold" />
                </div>
                <div className="hidden xl:flex flex-col text-left">
                  <span className="text-[11px] text-emerald-200 leading-none">
                    {currentCustomer
                      ? t('header.welcome')
                      : t('header.account')}
                  </span>
                  <span className="text-xs font-bold text-white truncate max-w-[110px] mt-0.5">
                    {currentCustomer
                      ? currentCustomer.fullName.split(' ')[0]
                      : t('header.signIn')}
                  </span>
                </div>
              </Link>

              <Link
                to="/cart"
                className="relative flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-brand-green-dark hover:bg-brand-gold hover:text-brand-green-dark border border-brand-gold/50 transition-colors group"
                aria-label={t('header.cart')}
              >
                <div className="relative">
                  <ShoppingBag className="w-5 h-5 text-brand-gold group-hover:text-brand-green-dark transition-colors" />
                  <span className="absolute -top-2 -right-2 min-w-[20px] h-5 px-1 rounded-full bg-brand-gold text-brand-green-dark group-hover:bg-brand-green-dark group-hover:text-white text-[11px] font-extrabold flex items-center justify-center">
                    {cartItemCount}
                  </span>
                </div>
                <div className="hidden sm:flex flex-col text-left pl-1">
                  <span className="text-[10px] text-emerald-200 group-hover:text-brand-green-dark/80 leading-none">
                    {t('header.cart')}
                  </span>
                  <span className="text-xs font-extrabold text-white group-hover:text-brand-green-dark mt-0.5 whitespace-nowrap">
                    {formatUZS(cartSubtotal)}
                  </span>
                </div>
              </Link>
            </div>
          </div>

          {/* Mobile Search Input Row */}
          <div className="mt-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('header.searchMobilePlaceholder')}
                className="w-full h-10 pl-3.5 pr-24 rounded-lg bg-white text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
                aria-label={t('header.searchBtn')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-16 top-1/2 -translate-y-1/2 p-1 text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 top-1 bottom-1 px-3 rounded-md bg-brand-gold text-brand-green-dark font-bold text-xs flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{t('header.searchShortBtn')}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <nav
        aria-label={t('nav.categoriesTitle')}
        className="bg-white border-b border-gray-200 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
          {canScrollLeft && (
            <button
              type="button"
              onClick={() => scrollCategoryBar('left')}
              className="xl:hidden shrink-0 w-8 h-8 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-700 hover:text-brand-green"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div
            ref={categoryScrollRef}
            onScroll={updateScrollIndicators}
            className="flex-1 flex items-center gap-1.5 sm:gap-2 overflow-x-auto xl:overflow-visible xl:flex-wrap scrollbar-thin py-0.5 scroll-smooth"
          >
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="lg:hidden shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-surface-subtle text-gray-800 border border-gray-200"
            >
              <Grid className="w-3.5 h-3.5 text-brand-green" />
              <span>{t('nav.menu')}</span>
            </button>

            <Link
              to="/catalog"
              className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                location.pathname === '/catalog' && !location.search
                  ? 'bg-brand-green text-white shadow-sm'
                  : 'text-gray-800 bg-surface-page hover:bg-brand-green-light hover:text-brand-green'
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
                  className={`shrink-0 px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-green text-white font-bold shadow-sm'
                      : 'text-gray-700 hover:bg-brand-green-light/70 hover:text-brand-green'
                  }`}
                >
                  {locCat.name}
                </Link>
              );
            })}
          </div>

          {canScrollRight && (
            <button
              type="button"
              onClick={() => scrollCategoryBar('right')}
              className="xl:hidden shrink-0 w-8 h-8 rounded-full bg-white border border-gray-300 shadow-sm flex items-center justify-center text-gray-700 hover:text-brand-green"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2.5 shrink-0 pl-2 border-l border-gray-200">
            <Link
              to="/catalog?filter=discounted"
              className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${
                location.search.includes('filter=discounted')
                  ? 'bg-brand-gold text-brand-green-dark border-brand-gold'
                  : 'text-brand-gold-dark bg-brand-gold-light border-brand-gold-border hover:bg-brand-gold hover:text-brand-green-dark'
              }`}
            >
              <Tag className="w-3.5 h-3.5 shrink-0" />
              <span>{t('nav.discounts')}</span>
            </Link>
            <Link
              to="/catalog?filter=new"
              className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                location.search.includes('filter=new')
                  ? 'bg-brand-green text-white'
                  : 'text-brand-green bg-brand-green-light/60 hover:bg-brand-green-light'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0" />
              <span>{t('nav.newShort')}</span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};