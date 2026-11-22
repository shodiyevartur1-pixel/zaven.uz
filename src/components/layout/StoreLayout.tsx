import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, User } from 'lucide-react';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { ToastContainer } from '../ui/ToastContainer';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';

interface StoreLayoutProps {
  children: React.ReactNode;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
  const { cart, currentCustomer } = useStore();
  const { t } = useThemeLanguage();
  const location = useLocation();

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Full informational footer is rendered strictly on the homepage ('/')
  const isHomePage = location.pathname === '/';
  const isCheckoutPage = location.pathname.startsWith('/checkout');
  const isRecoveryPage =
    new URLSearchParams(location.search).get('type') === 'recovery' ||
    new URLSearchParams(location.hash.replace(/^#/, '')).get('type') ===
      'recovery';
  const isAuthenticationPage =
    location.pathname === '/account' &&
    (!currentCustomer?.emailVerified || isRecoveryPage);
  const showMobileBottomNav = !isCheckoutPage && !isAuthenticationPage;
  const mobileBottomNavPadding = showMobileBottomNav
    ? 'pb-[calc(5.25rem+env(safe-area-inset-bottom))]'
    : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]';

  return (
    <div
      className={`min-h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#0B1512] text-gray-900 dark:text-gray-100 ${mobileBottomNavPadding} md:pb-8 transition-colors`}
    >
      <StoreHeader />

      <main className={`flex-1 bg-transparent ${isCheckoutPage ? 'min-w-0' : ''}`}>
        <ToastContainer />
        {children}
      </main>

      {isHomePage && <StoreFooter />}

      {/* Mobile navigation: wishlist is in the header, so the four main destinations stay clear. */}
      {showMobileBottomNav && <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-3 right-3 z-40 bg-white/95 dark:bg-[#12211C]/95 backdrop-blur-md border border-gray-200 dark:border-[#28453B] shadow-[0_-8px_28px_rgba(0,0,0,0.16)] grid grid-cols-4 items-center h-[4.25rem] px-1 rounded-2xl transition-opacity duration-150"
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
      </nav>}

      {/* Desktop cart access stays separate from the ZAVEN brand header. */}
      <Link
        to="/cart"
        aria-label={`${t('header.cart')}${cartItemCount ? ` (${cartItemCount})` : ''}`}
        className="zaven-desktop-cart hidden md:flex fixed bottom-5 right-6 z-40 items-center gap-2.5 rounded-full border border-[#C89D54]/40 bg-[#0F3D2E] px-4 py-3 text-white shadow-xl transition-colors hover:bg-[#16533F]"
      >
        <span className="relative"><ShoppingBag className="h-5 w-5 text-[#E5C992]" />{cartItemCount > 0 && <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C89D54] px-1 text-[9px] font-extrabold text-[#09261C]">{cartItemCount > 99 ? '99+' : cartItemCount}</span>}</span>
        <span className="text-sm font-bold">{t('header.cart')}</span>
      </Link>

    </div>
  );
};
