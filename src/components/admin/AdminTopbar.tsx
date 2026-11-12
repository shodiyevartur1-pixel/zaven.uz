import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  Plus,
  ShoppingCart,
  AlertTriangle,
  MessageSquare,
  X,
  RefreshCw,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { formatUZS } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ThemeLanguageControls } from '../ui/ThemeLanguageControls';

interface AdminTopbarProps {
  onOpenMobileMenu: () => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  onOpenMobileMenu,
}) => {
  const navigate = useNavigate();
  const {
    orders,
    products,
    customers,
    inquiries,
    resetAllDemoData,
  } = useStore();
  const { t, getProductText } = useThemeLanguage();
  const { ownerEmail, authMode, signOutOwner } = useOwnerAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const newOrders = orders.filter((o) => o.status === 'new');
  const lowStockProducts = products.filter(
    (p) =>
      p.status !== 'archived' &&
      (p.stock === 0 || p.stock <= p.lowStockThreshold)
  );
  const unreadInquiries = inquiries.filter((i) => i.status === 'unread');
  const totalAlertCount =
    newOrders.length + lowStockProducts.length + unreadInquiries.length;

  const q = searchQuery.trim().toLowerCase();
  const matchedOrders = q
    ? orders
        .filter(
          (o) =>
            o.orderNumber.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            o.customerPhone.includes(q)
        )
        .slice(0, 3)
    : [];

  const matchedProducts = q
    ? products
        .filter((p) => {
          const loc = getProductText(p);
          return (
            p.name.toLowerCase().includes(q) ||
            loc.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)
          );
        })
        .slice(0, 3)
    : [];

  const matchedCustomers = q
    ? customers
        .filter(
          (c) =>
            c.fullName.toLowerCase().includes(q) || c.phone.includes(q)
        )
        .slice(0, 3)
    : [];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSignOut = async () => {
    await signOutOwner();
    navigate('/admin/login', { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-6 flex items-center justify-between gap-3 shadow-sm">
      {/* Left: Mobile Menu Button & Global Admin Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-gray-700 hover:bg-gray-100"
          aria-label="Open admin menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div ref={searchRef} className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => setIsSearchOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              placeholder={t('admin.searchPlaceholder')}
              className="w-full h-10 pl-10 pr-8 rounded-xl border border-gray-300 bg-surface-page focus:bg-white text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:border-brand-green focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isSearchOpen && q.length >= 1 && (
            <div className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-gray-200 shadow-xl overflow-hidden z-50 max-h-[70vh] overflow-y-auto">
              {matchedOrders.length === 0 &&
              matchedProducts.length === 0 &&
              matchedCustomers.length === 0 ? (
                <div className="p-5 text-center text-xs text-gray-500">
                  «{searchQuery}» — {t('header.noSearchMatch')}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 text-xs">
                  {matchedOrders.length > 0 && (
                    <div className="p-2.5">
                      <p className="px-2 py-1 font-extrabold uppercase tracking-wider text-gray-400 text-[10px]">
                        Orders ({matchedOrders.length})
                      </p>
                      {matchedOrders.map((ord) => (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            navigate(`/admin/orders?q=${ord.orderNumber}`);
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-green-light/50 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-mono font-bold text-brand-green">
                              #{ord.orderNumber}
                            </span>
                            <span className="text-gray-700 ml-2 font-medium">
                              {ord.customerName}
                            </span>
                          </div>
                          <span className="font-bold text-gray-900">
                            {formatUZS(ord.totalAmount)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchedProducts.length > 0 && (
                    <div className="p-2.5">
                      <p className="px-2 py-1 font-extrabold uppercase tracking-wider text-gray-400 text-[10px]">
                        Products ({matchedProducts.length})
                      </p>
                      {matchedProducts.map((prod) => {
                        const loc = getProductText(prod);
                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => {
                              setIsSearchOpen(false);
                              navigate(`/admin/products?q=${prod.sku}`);
                            }}
                            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-green-light/50 flex items-center justify-between gap-2"
                          >
                            <div className="truncate">
                              <span className="font-bold text-gray-900">
                                {loc.name}
                              </span>
                              <span className="text-gray-500 ml-2">
                                ({prod.sku})
                              </span>
                            </div>
                            <span className="shrink-0 font-bold text-brand-green">
                              {prod.stock} {t('product.units')}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {matchedCustomers.length > 0 && (
                    <div className="p-2.5">
                      <p className="px-2 py-1 font-extrabold uppercase tracking-wider text-gray-400 text-[10px]">
                        Customers ({matchedCustomers.length})
                      </p>
                      {matchedCustomers.map((cust) => (
                        <button
                          key={cust.id}
                          type="button"
                          onClick={() => {
                            setIsSearchOpen(false);
                            navigate(
                              `/admin/customers?q=${encodeURIComponent(
                                cust.phone
                              )}`
                            );
                          }}
                          className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-brand-green-light/50 flex items-center justify-between"
                        >
                          <span className="font-bold text-gray-900">
                            {cust.fullName}
                          </span>
                          <span className="text-gray-600">{cust.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Theme/Language Switcher, Quick Actions, Notifications & Verified Single-Owner Badge */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        <ThemeLanguageControls variant="surface" />

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => navigate('/admin/products?action=new')}
          className="hidden xl:inline-flex"
        >
          {t('admin.addProduct')}
        </Button>

        {authMode === 'dev_demo' && (
          <button
            type="button"
            onClick={resetAllDemoData}
            className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:text-brand-green"
            title={t('admin.resetDemo')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('admin.resetDemo')}</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen((prev) => !prev)}
            className="relative p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
            aria-label={t('admin.notifications')}
          >
            <Bell className="w-5 h-5" />
            {totalAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-extrabold flex items-center justify-center">
                {totalAlertCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden z-50">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                  {t('admin.notifications')}
                </span>
                <Badge variant="gold" size="sm">
                  {totalAlertCount}
                </Badge>
              </div>

              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto text-xs">
                {newOrders.length > 0 && (
                  <Link
                    to="/admin/orders?status=new"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-3.5 hover:bg-surface-page flex items-start gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-brand-gold-light text-brand-gold-dark flex items-center justify-center shrink-0">
                      <ShoppingCart className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {newOrders.length} yangi buyurtma / new orders
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        #{newOrders[0].orderNumber} ({newOrders[0].customerName})
                      </p>
                    </div>
                  </Link>
                )}

                {lowStockProducts.length > 0 && (
                  <Link
                    to="/admin/inventory"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-3.5 hover:bg-surface-page flex items-start gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {lowStockProducts.length} — {t('product.lowStock')}
                      </p>
                    </div>
                  </Link>
                )}

                {unreadInquiries.length > 0 && (
                  <Link
                    to="/admin/inquiries"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-3.5 hover:bg-surface-page flex items-start gap-3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">
                        {unreadInquiries[0].customerName}: «
                        {unreadInquiries[0].subject}»
                      </p>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Single-Owner Session Indicator & Sign Out */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
          <div className="hidden md:flex flex-col text-right">
            <span className="text-xs font-extrabold text-gray-900 leading-none flex items-center justify-end gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-brand-green" />
              <span>Store Owner</span>
            </span>
            <span className="text-[11px] text-gray-500 truncate max-w-[150px] mt-0.5">
              {ownerEmail}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="p-2 rounded-xl border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
            title={t('account.signOut')}
            aria-label={t('account.signOut')}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};