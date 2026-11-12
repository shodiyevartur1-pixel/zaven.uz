import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Boxes,
  Users,
  TicketPercent,
  Image,
  Truck,
  CreditCard,
  BarChart3,
  MessageSquare,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { Language } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';

export interface AdminNavItem {
  id: string;
  labels: Record<Language, string>;
  path: string;
  icon: React.ReactNode;
  badgeCount?: number;
  badgeVariant?: 'gold' | 'danger' | 'info';
}

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const location = useLocation();
  const { orders, products, inquiries, storeSettings } = useStore();
  const { language, t } = useThemeLanguage();

  const newOrdersCount = orders.filter((o) => o.status === 'new').length;
  const lowStockCount = products.filter(
    (p) =>
      p.status !== 'archived' &&
      (p.stock === 0 || p.stock <= p.lowStockThreshold)
  ).length;
  const unreadInquiriesCount = inquiries.filter(
    (inq) => inq.status === 'unread'
  ).length;

  const navItems: AdminNavItem[] = [
    {
      id: 'dashboard',
      labels: {
        uz: 'Boshqaruv paneli',
        ru: 'Дашборд',
        en: 'Dashboard',
      },
      path: '/admin',
      icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'orders',
      labels: {
        uz: 'Buyurtmalar',
        ru: 'Заказы',
        en: 'Orders',
      },
      path: '/admin/orders',
      icon: <ShoppingCart className="w-5 h-5 shrink-0" />,
      badgeCount: newOrdersCount > 0 ? newOrdersCount : undefined,
      badgeVariant: 'gold',
    },
    {
      id: 'products',
      labels: {
        uz: 'Mahsulotlar',
        ru: 'Товары',
        en: 'Products',
      },
      path: '/admin/products',
      icon: <Package className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'categories',
      labels: {
        uz: 'Toifalar',
        ru: 'Категории',
        en: 'Categories',
      },
      path: '/admin/categories',
      icon: <FolderTree className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'inventory',
      labels: {
        uz: 'Ombor va zaxira',
        ru: 'Склад и запасы',
        en: 'Inventory',
      },
      path: '/admin/inventory',
      icon: <Boxes className="w-5 h-5 shrink-0" />,
      badgeCount: lowStockCount > 0 ? lowStockCount : undefined,
      badgeVariant: 'danger',
    },
    {
      id: 'customers',
      labels: {
        uz: 'Mijozlar',
        ru: 'Клиенты',
        en: 'Customers',
      },
      path: '/admin/customers',
      icon: <Users className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'coupons',
      labels: {
        uz: 'Chegirma va kuponlar',
        ru: 'Скидки и купоны',
        en: 'Coupons & Deals',
      },
      path: '/admin/coupons',
      icon: <TicketPercent className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'banners',
      labels: {
        uz: 'Bannerlar va kontent',
        ru: 'Баннеры и контент',
        en: 'Banners & Content',
      },
      path: '/admin/banners',
      icon: <Image className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'delivery',
      labels: {
        uz: 'Yetkazib berish',
        ru: 'Настройки доставки',
        en: 'Delivery Settings',
      },
      path: '/admin/delivery',
      icon: <Truck className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'payments',
      labels: {
        uz: 'Toʻlov sozlamalari',
        ru: 'Способы оплаты',
        en: 'Payment Settings',
      },
      path: '/admin/payments',
      icon: <CreditCard className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'reports',
      labels: {
        uz: 'Hisobotlar va tahlil',
        ru: 'Отчеты и аналитика',
        en: 'Reports & Analytics',
      },
      path: '/admin/reports',
      icon: <BarChart3 className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'inquiries',
      labels: {
        uz: 'Mijozlar murojaatlari',
        ru: 'Обращения клиентов',
        en: 'Customer Inquiries',
      },
      path: '/admin/inquiries',
      icon: <MessageSquare className="w-5 h-5 shrink-0" />,
      badgeCount: unreadInquiriesCount > 0 ? unreadInquiriesCount : undefined,
      badgeVariant: 'info',
    },
    {
      id: 'roles',
      labels: {
        uz: 'Xavfsizlik va Owner',
        ru: 'Безопасность (Owner)',
        en: 'Owner Security',
      },
      path: '/admin/roles',
      icon: <Shield className="w-5 h-5 shrink-0" />,
    },
    {
      id: 'settings',
      labels: {
        uz: 'Doʻkon sozlamalari',
        ru: 'Настройки магазина',
        en: 'Store Settings',
      },
      path: '/admin/settings',
      icon: <Settings className="w-5 h-5 shrink-0" />,
    },
  ];

  const isPathActive = (itemPath: string) => {
    if (itemPath === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(itemPath);
  };

  const renderSidebarInner = (mobileMode = false) => {
    const showText = mobileMode || !isCollapsed;

    return (
      <div className="h-full flex flex-col justify-between bg-brand-green-dark text-emerald-50 select-none">
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-800/80">
            <Link
              to="/admin"
              onClick={mobileMode ? onCloseMobile : undefined}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              <div className="w-9 h-9 rounded-lg bg-brand-gold flex items-center justify-center text-brand-green-dark font-extrabold text-lg shrink-0 shadow-sm">
                Z
              </div>
              {showText && (
                <div className="truncate">
                  <span className="font-extrabold text-lg tracking-wider text-white block leading-none">
                    {storeSettings.storeName}
                  </span>
                  <span className="text-[10px] text-brand-gold font-bold uppercase tracking-widest block mt-0.5">
                    {t('admin.title')}
                  </span>
                </div>
              )}
            </Link>

            {mobileMode ? (
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-brand-green"
              >
                <X className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-brand-green transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          <nav
            aria-label="Admin navigation"
            className="p-2.5 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin"
          >
            {navItems.map((item) => {
              const active = isPathActive(item.path);
              const itemLabel = item.labels[language] || item.labels.uz;

              const badgeStyle =
                item.badgeVariant === 'gold'
                  ? 'bg-brand-gold text-brand-green-dark'
                  : item.badgeVariant === 'danger'
                  ? 'bg-red-500 text-white'
                  : 'bg-sky-500 text-white';

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={mobileMode ? onCloseMobile : undefined}
                  title={!showText ? itemLabel : undefined}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-brand-gold text-brand-green-dark font-extrabold shadow-sm'
                      : 'text-emerald-100 hover:bg-brand-green hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={
                        active ? 'text-brand-green-dark' : 'text-brand-gold'
                      }
                    >
                      {item.icon}
                    </span>
                    {showText && <span className="truncate">{itemLabel}</span>}
                  </div>

                  {showText && item.badgeCount !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold leading-none shrink-0 ml-2 ${
                        active
                          ? 'bg-brand-green-dark text-white'
                          : badgeStyle
                      }`}
                    >
                      {item.badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-emerald-800/80 bg-brand-green/50">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-brand-green hover:bg-brand-green-hover text-white text-xs font-bold border border-emerald-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-brand-gold shrink-0" />
            {showText && <span>{t('admin.viewStorefront')}</span>}
          </Link>
        </div>
      </div>
    );
  };

  return (
    <>
      <aside
        className={`hidden lg:block shrink-0 transition-all duration-200 border-r border-emerald-900 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="sticky top-0 h-screen">{renderSidebarInner(false)}</div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-gray-900/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative w-72 max-w-full h-full z-10 shadow-2xl">
            {renderSidebarInner(true)}
          </div>
        </div>
      )}
    </>
  );
};