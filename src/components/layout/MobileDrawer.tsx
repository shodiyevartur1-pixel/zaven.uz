import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
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
        className="fixed inset-0 bg-gray-900/60 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Content */}
      <div className="relative w-full max-w-xs bg-white h-full flex flex-col justify-between overflow-y-auto z-10 shadow-2xl">
        <div>
          {/* Drawer Header */}
          <div className="bg-brand-green text-white p-4 flex items-center justify-between">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-2.5"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-gold flex items-center justify-center text-brand-green-dark font-extrabold text-lg">
                Z
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-wider block leading-none">
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
              className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-brand-green-hover"
              aria-label={t('product.close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Theme & Language Controls */}
          <div className="px-4 py-3 bg-surface-page border-b border-gray-200 flex items-center justify-between">
            <ThemeLanguageControls variant="surface" />
          </div>

          {/* Customer Profile Quick Card */}
          <div className="p-4 bg-brand-green-light/60 border-b border-gray-200">
            <Link
              to="/account"
              onClick={onClose}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-green text-brand-gold flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {currentCustomer
                      ? currentCustomer.fullName
                      : t('header.account')}
                  </p>
                  <p className="text-xs text-gray-600">
                    {currentCustomer
                      ? currentCustomer.phone
                      : t('header.signIn')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </Link>
          </div>

          {/* Primary Navigation Links */}
          <div className="p-3 space-y-1 border-b border-gray-200">
            <Link
              to="/"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <Home className="w-4 h-4 text-brand-green" />
              <span>{t('nav.home')}</span>
            </Link>
            <Link
              to="/catalog"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <Grid className="w-4 h-4 text-brand-green" />
              <span>{t('nav.allProducts')}</span>
            </Link>
            <Link
              to="/catalog?filter=discounted"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-brand-gold-dark bg-brand-gold-light/70 hover:bg-brand-gold-light"
            >
              <Tag className="w-4 h-4 text-brand-gold-dark" />
              <span>{t('nav.specialDiscounts')}</span>
            </Link>
            <Link
              to="/catalog?filter=new"
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span>{t('nav.newArrivals')}</span>
            </Link>
            <Link
              to="/cart"
              onClick={onClose}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-4 h-4 text-brand-green" />
                <span>{t('header.cart')}</span>
              </div>
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-brand-green text-white">
                {cartCount} {t('product.units')}
              </span>
            </Link>
          </div>

          {/* Product Categories */}
          <div className="p-4">
            <p className="px-2 text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              {t('nav.categoriesTitle')}
            </p>
            <ul className="space-y-1">
              {activeCategories.map((cat) => {
                const locCat = getCategoryText(cat);
                return (
                  <li key={cat.id}>
                    <Link
                      to={`/catalog?category=${cat.slug}`}
                      onClick={onClose}
                      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-brand-green-light hover:text-brand-green transition-colors"
                    >
                      <span>{locCat.name}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Drawer Footer: Contact Info Only (No public Admin button) */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 space-y-2 text-xs text-gray-600">
          <a
            href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
            className="flex items-center gap-2 font-bold text-gray-900 hover:text-brand-green"
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