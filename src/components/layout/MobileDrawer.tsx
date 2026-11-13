import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X,
  Home,
  Grid,
  ShoppingBag,
  User,
  Phone,
  Instagram,
  Tag,
  Sparkles,
  ChevronRight,
  Clock,
  MapPin,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ThemeLanguageControls } from '../ui/ThemeLanguageControls';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { categories, currentCustomer, storeSettings, cart } = useStore();
  const { t, getCategoryText } = useThemeLanguage();
  const location = useLocation();

  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/70 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative w-full max-w-xs bg-white dark:bg-[#12211C] h-full flex flex-col justify-between overflow-y-auto z-10 shadow-2xl border-r border-gray-200 dark:border-[#28453B]">
        <div>
          {/* Drawer Header */}
          <div className="bg-[#0F3D2E] text-white p-4 flex items-center justify-between">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-lg bg-[#C89D54] flex items-center justify-center text-[#09261C] font-extrabold text-lg">
                Z
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-wider block leading-none text-white">
                  {storeSettings.storeName}
                </span>
                <span className="text-[11px] text-emerald-200">
                  {t('header.onlineStore')}
                </span>
              </div>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-[#16533F]"
              aria-label={t('product.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Theme & Language Controls */}
          <div className="px-4 py-3 bg-surface-page dark:bg-[#0D1915] border-b border-gray-200 dark:border-[#28453B] flex items-center justify-between">
            <ThemeLanguageControls variant="surface" />
          </div>

          {/* Customer Profile Quick Card */}
          <div className="p-4 bg-brand-green-light/60 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B]">
            <Link
              to="/account"
              onClick={onClose}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0F3D2E] text-[#C89D54] border border-brand-gold/40 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {currentCustomer
                      ? currentCustomer.fullName
                      : t('header.account')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {currentCustomer
                      ? currentCustomer.phone
                      : t('header.signIn')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-300" />
            </Link>
          </div>

          {/* Primary Navigation Links */}
          <div className="p-3 space-y-1 border-b border-gray-200 dark:border-[#28453B]">
            <Link
              to="/"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === '/'
                  ? 'bg-[#0F3D2E] text-white font-bold'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1D352D]'
              }`}
            >
              <Home className="w-4 h-4 text-brand-green" />
              <span>{t('nav.home')}</span>
            </Link>
            <Link
              to="/catalog"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === '/catalog' && !location.search
                  ? 'bg-[#0F3D2E] text-white font-bold'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1D352D]'
              }`}
            >
              <Grid className="w-4 h-4 text-brand-green" />
              <span>{t('nav.allProducts')}</span>
            </Link>
            <Link
              to="/catalog?filter=discounted"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-brand-gold-dark bg-brand-gold-light/70 border border-brand-gold-border/60 hover:bg-[#C89D54] hover:text-[#09261C] transition-colors"
            >
              <Tag className="w-4 h-4 shrink-0" />
              <span>{t('nav.specialDiscounts')}</span>
            </Link>
            <Link
              to="/catalog?filter=new"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1D352D]"
            >
              <Sparkles className="w-4 h-4 text-[#C89D54]" />
              <span>{t('nav.newArrivals')}</span>
            </Link>
            <Link
              to="/cart"
              onClick={onClose}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                location.pathname === '/cart'
                  ? 'bg-[#0F3D2E] text-white font-bold'
                  : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1D352D]'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-brand-green" />
                <span>{t('header.cart')}</span>
              </div>
              <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-[#C89D54] text-[#09261C]">
                {cartCount} {t('product.units')}
              </span>
            </Link>
          </div>

          {/* Product Categories */}
          <div className="p-4">
            <p className="px-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              {t('nav.categoriesTitle')}
            </p>
            <ul className="space-y-1">
              {activeCategories.map((cat) => {
                const locCat = getCategoryText(cat);
                const isCatSelected = location.search.includes(cat.slug);
                return (
                  <li key={cat.id}>
                    <Link
                      to={`/catalog?category=${cat.slug}`}
                      onClick={onClose}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isCatSelected
                          ? 'bg-[#0F3D2E] text-white font-bold'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-brand-green-light dark:hover:bg-[#1D352D] hover:text-brand-green'
                      }`}
                    >
                      <span>{locCat.name}</span>
                      <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Drawer Footer: Contact Info */}
        <div className="p-4 bg-gray-50 dark:bg-[#0D1915] border-t border-gray-200 dark:border-[#28453B] space-y-2 text-xs text-gray-600 dark:text-gray-300">
          <a
            href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
            className="flex items-center gap-2 font-bold text-gray-900 dark:text-gray-100 hover:text-brand-green"
          >
            <Phone className="w-4 h-4 text-brand-green" />
            <span>{storeSettings.supportPhone}</span>
          </a>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{storeSettings.workingHours}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{storeSettings.cityLocation}</span>
          </div>
          <a
            href={storeSettings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-brand-green font-semibold hover:underline pt-1"
          >
            <Instagram className="w-4 h-4" />
            <span>Instagram: {storeSettings.instagramHandle}</span>
          </a>
        </div>
      </div>
    </div>
  );
};
