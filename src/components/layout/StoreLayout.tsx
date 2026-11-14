import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, Heart, ShoppingBag, User } from 'lucide-react';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { ToastContainer } from '../ui/ToastContainer';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';

interface StoreLayoutProps {
  children: React.ReactNode;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
  const { cart, favoriteIds } = useStore();
  const { t } = useThemeLanguage();
  const location = useLocation();

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const favoritesCount = favoriteIds.length;

  // Full informational footer is rendered strictly on the homepage ('/')
  const isHomePage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#0B1512] text-gray-900 dark:text-gray-100 pb-20 md:pb-8 transition-colors">
      <StoreHeader />

      <main className="flex-1 bg-transparent">{children}</main>

      {isHomePage && <StoreFooter />}

      {/* Mobile Sticky Bottom Tab Bar (5 Comfortable, Uncluttered Entries including Favorites) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#12211C] border-t border-gray-200 dark:border-[#28453B] shadow-lg grid grid-cols-5 items-center h-16 px-1 pb-safe transition-opacity duration-150"
      >
        <Link
          to="/"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-w-0 ${
            location.pathname === '/'
              ? 'text-brand-green font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full px-0.5">{t('nav.home')}</span>
        </Link>

        <Link
          to="/catalog"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-w-0 ${
            location.pathname.startsWith('/catalog')
              ? 'text-brand-green font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Grid className="w-5 h-5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full px-0.5">{t('nav.catalog')}</span>
        </Link>

        <Link
          to="/favorites"
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-w-0 ${
            location.pathname === '/favorites'
              ? 'text-brand-green font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <Heart
              className={`w-5 h-5 mb-0.5 shrink-0 ${
                location.pathname === '/favorites' && favoritesCount > 0
                  ? 'fill-current text-rose-500'
                  : ''
              }`}
            />
            {favoritesCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </div>
          <span className="truncate max-w-full px-0.5">
            {t('header.favoritesShort')}
          </span>
        </Link>

        <Link
          to="/cart"
          className={`relative flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-w-0 ${
            location.pathname === '/cart' ||
            location.pathname.startsWith('/checkout')
              ? 'text-brand-green font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5 shrink-0" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[#C89D54] text-[#09261C] text-[9px] font-extrabold flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </div>
          <span className="truncate max-w-full px-0.5">{t('header.cart')}</span>
        </Link>

        <Link
          to="/account"
          className={`flex flex-col items-center justify-center py-1 rounded-lg text-[10px] font-semibold min-w-0 ${
            location.pathname === '/account'
              ? 'text-brand-green font-bold'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <User className="w-5 h-5 mb-0.5 shrink-0" />
          <span className="truncate max-w-full px-0.5">
            {t('header.account')}
          </span>
        </Link>
      </nav>

      <ToastContainer />
    </div>
  );
};
