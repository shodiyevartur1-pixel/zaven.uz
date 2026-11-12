import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, ShoppingBag, User } from 'lucide-react';
import { StoreHeader } from './StoreHeader';
import { MobileDrawer } from './MobileDrawer';
import { StoreFooter } from './StoreFooter';
import { ToastContainer } from '../ui/ToastContainer';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';

interface StoreLayoutProps {
  children: React.ReactNode;
}

export const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { cart } = useStore();
  const { t } = useThemeLanguage();
  const location = useLocation();

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-surface-page text-gray-900 pb-16 md:pb-0 transition-colors">
      <StoreHeader onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex-1">{children}</main>

      <StoreFooter />

      {/* Mobile Sticky Bottom Tab Bar (4 Customer Tabs — Public Admin Tab Removed) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg flex items-center justify-around h-16 px-2"
      >
        <Link
          to="/"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold ${
            location.pathname === '/'
              ? 'text-brand-green font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>{t('nav.home')}</span>
        </Link>

        <Link
          to="/catalog"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold ${
            location.pathname.startsWith('/catalog')
              ? 'text-brand-green font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <Grid className="w-5 h-5 mb-0.5" />
          <span>{t('nav.catalog')}</span>
        </Link>

        <Link
          to="/cart"
          className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold ${
            location.pathname === '/cart'
              ? 'text-brand-green font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-gold text-brand-green-dark text-[10px] font-extrabold flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </div>
          <span>{t('header.cart')}</span>
        </Link>

        <Link
          to="/account"
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[11px] font-semibold ${
            location.pathname === '/account'
              ? 'text-brand-green font-bold'
              : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>{t('header.account')}</span>
        </Link>
      </nav>

      <ToastContainer />
    </div>
  );
};