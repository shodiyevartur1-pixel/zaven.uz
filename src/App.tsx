import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from 'react-router-dom';
import { Compass, Home, Search } from 'lucide-react';
import { StoreProvider, useStore } from './context/StoreContext';
import {
  ThemeLanguageProvider,
  useThemeLanguage,
} from './context/ThemeLanguageContext';
import { OwnerAuthProvider } from './context/OwnerAuthContext';
import { StoreLayout } from './components/layout/StoreLayout';
import { AdminLayout } from './components/admin/AdminLayout';
import { PrototypeToolbar } from './components/layout/PrototypeToolbar';
import { HomePage } from './pages/store/HomePage';
import { CatalogPage } from './pages/store/CatalogPage';
import { ProductDetailPage } from './pages/store/ProductDetailPage';
import { CartCheckoutPage } from './pages/store/CartCheckoutPage';
import { AccountPage } from './pages/store/AccountPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminSettings } from './pages/admin/AdminSettings';
import { Button } from './components/ui/Button';
import { Badge } from './components/ui/Badge';

const RouteEffectsManager: React.FC = () => {
  const location = useLocation();
  const { storeSettings } = useStore();
  const { t, language } = useThemeLanguage();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const baseName = storeSettings.storeName || 'ZAVEN';
    let pageTitle = `${baseName} — ${t('header.onlineStore')}`;

    if (location.pathname === '/catalog') {
      pageTitle = `${t('catalog.titleAll')} — ${baseName}`;
    } else if (
      location.pathname === '/cart' ||
      location.pathname.startsWith('/checkout')
    ) {
      pageTitle = `${t('cart.title')} — ${baseName}`;
    } else if (location.pathname === '/account') {
      pageTitle = `${t('header.account')} — ${baseName}`;
    } else if (location.pathname.startsWith('/admin')) {
      pageTitle = `${t('admin.title')} — ${baseName}`;
    }

    if (!location.pathname.startsWith('/product/')) {
      document.title = pageTitle;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && storeSettings.seoDescription) {
      metaDesc.setAttribute('content', storeSettings.seoDescription);
    }
  }, [
    location.pathname,
    language,
    storeSettings.storeName,
    storeSettings.seoDescription,
    t,
  ]);

  return null;
};

const NotFoundPage: React.FC = () => {
  const { t } = useThemeLanguage();
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-2xl border border-gray-200 p-8 sm:p-10 text-center shadow-card space-y-5">
        <div className="w-16 h-16 rounded-full bg-brand-green-light text-brand-green flex items-center justify-center mx-auto">
          <Compass className="w-8 h-8" />
        </div>
        <Badge variant="gold" size="md">
          404
        </Badge>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
          404 — Page Not Found
        </h1>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link to="/">
            <Button variant="primary" leftIcon={<Home className="w-4 h-4" />}>
              {t('nav.home')}
            </Button>
          </Link>
          <Link to="/catalog">
            <Button
              variant="outline"
              leftIcon={<Search className="w-4 h-4" />}
            >
              {t('nav.catalog')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export function App() {
  return (
    <ThemeLanguageProvider>
      <OwnerAuthProvider>
        <StoreProvider>
          <BrowserRouter>
            <RouteEffectsManager />
            <Routes>
              {/* Customer Storefront Routes */}
              <Route
                path="/"
                element={
                  <StoreLayout>
                    <HomePage />
                  </StoreLayout>
                }
              />
              <Route
                path="/catalog"
                element={
                  <StoreLayout>
                    <CatalogPage />
                  </StoreLayout>
                  }
              />
              <Route
                path="/product/:slug"
                element={
                  <StoreLayout>
                    <ProductDetailPage />
                  </StoreLayout>
                }
              />
              <Route
                path="/cart"
                element={
                  <StoreLayout>
                    <CartCheckoutPage />
                  </StoreLayout>
                }
              />
              <Route
                path="/checkout"
                element={
                  <StoreLayout>
                    <CartCheckoutPage />
                  </StoreLayout>
                }
              />
              <Route
                path="/account"
                element={
                  <StoreLayout>
                    <AccountPage />
                  </StoreLayout>
                }
              />

              {/* Single-Owner Admin Sign-In Route */}
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Protected Single-Owner Admin Workspace Routes */}
              <Route
                path="/admin"
                element={
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <AdminLayout>
                    <AdminDashboard isReportsView />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/products"
                element={
                  <AdminLayout>
                    <AdminProducts initialSection="products" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <AdminLayout>
                    <AdminProducts initialSection="categories" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/inventory"
                element={
                  <AdminLayout>
                    <AdminProducts initialSection="inventory" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/orders"
                element={
                  <AdminLayout>
                    <AdminOrders initialSection="orders" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/customers"
                element={
                  <AdminLayout>
                    <AdminOrders initialSection="customers" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/inquiries"
                element={
                  <AdminLayout>
                    <AdminOrders initialSection="inquiries" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/coupons"
                element={
                  <AdminLayout>
                    <AdminSettings initialSection="coupons" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/banners"
                element={
                  <AdminLayout>
                    <AdminSettings initialSection="banners" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/delivery"
                element={
                  <AdminLayout>
                    <AdminSettings initialSection="delivery" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/payments"
                element={
                  <AdminLayout>
                    <AdminSettings initialSection="payments" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <AdminLayout>
                    <AdminSettings initialSection="roles" />
                  </AdminLayout>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <AdminLayout>
                    <AdminSettings initialSection="settings" />
                  </AdminLayout>
                }
              />

              <Route
                path="*"
                element={
                  <StoreLayout>
                    <NotFoundPage />
                  </StoreLayout>
                }
              />
            </Routes>

            <PrototypeToolbar />
          </BrowserRouter>
        </StoreProvider>
      </OwnerAuthProvider>
    </ThemeLanguageProvider>
  );
}

export default App;
