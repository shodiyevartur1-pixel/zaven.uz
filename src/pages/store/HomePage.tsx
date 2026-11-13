import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Flame,
  Tag,
  ShieldCheck,
  Truck,
  CreditCard,
  Headphones,
  Instagram,
  Copy,
  Check,
  Home,
  Smartphone,
  Zap,
  Gift,
  Compass,
  MapPin,
  Info,
  Clock,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatUZS } from '../../utils/format';

export const HomePage: React.FC = () => {
  const {
    products,
    categories,
    banners,
    coupons,
    storeSettings,
    addToast,
  } = useStore();
  const { t, getCategoryText, getBannerText } = useThemeLanguage();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const visibleProducts = products.filter(
    (p) => p.status === 'active' || p.status === 'out_of_stock'
  );

  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const activeBanner =
    banners.find((b) => b.isActive) || banners[0] || null;
  const localizedBanner = activeBanner ? getBannerText(activeBanner) : null;

  const popularProducts = [...visibleProducts]
    .filter((p) => p.isPopular)
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 4);

  const newArrivals = visibleProducts.filter((p) => p.isNew).slice(0, 4);

  const specialOffers = visibleProducts
    .filter((p) => p.salePrice && p.salePrice < p.price)
    .slice(0, 4);

  const activeCoupon = coupons.find((c) => c.isActive);
  const enabledTrustItems = storeSettings.trustItems.filter(
    (item) => item.isEnabled
  );
  const enabledRegions = storeSettings.delivery.regions.filter(
    (reg) => reg.isEnabled
  );
  const enabledPayments = storeSettings.paymentMethods.filter(
    (pm) => pm.isEnabled
  );

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    addToast({
      type: 'success',
      title: `Promokod: ${code}`,
    });
    setTimeout(() => setCopiedCode(null), 3000);
  };

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home':
        return <Home className="w-4 h-4 text-brand-green" />;
      case 'Smartphone':
        return <Smartphone className="w-4 h-4 text-brand-green" />;
      case 'Zap':
        return <Zap className="w-4 h-4 text-brand-green" />;
      case 'Gift':
        return <Gift className="w-4 h-4 text-brand-green" />;
      default:
        return <Compass className="w-4 h-4 text-brand-green" />;
    }
  };

  const renderTrustIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-brand-green" />;
      case 'Truck':
        return <Truck className="w-5 h-5 text-brand-green" />;
      case 'CreditCard':
        return <CreditCard className="w-5 h-5 text-brand-green" />;
      default:
        return <Headphones className="w-5 h-5 text-brand-green" />;
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-clip space-y-7 sm:space-y-12 py-3 sm:py-6">
      {/* 1. Compact, Zero-Overflow Hero Banner */}
      {activeBanner && localizedBanner && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="bg-[#0F3D2E] rounded-2xl overflow-hidden border border-[#09261C] shadow-card">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="min-w-0 p-4 sm:p-7 lg:p-8 lg:col-span-8 space-y-2.5 sm:space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="gold" size="sm">
                    {localizedBanner.badgeText}
                  </Badge>
                  <span className="text-[11px] sm:text-xs text-emerald-100 font-medium">
                    • {t('delivery.estimateValue')}
                  </span>
                </div>

                <h1 className="text-base sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug break-words">
                  {localizedBanner.headline}
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100/90 line-clamp-2 max-w-2xl break-words">
                  {localizedBanner.subheadline}
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <Link to={activeBanner.ctaLink || '/catalog'}>
                    <Button
                      variant="gold"
                      size="sm"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {localizedBanner.ctaText}
                    </Button>
                  </Link>

                  {activeCoupon && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(activeCoupon.code)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#09261C]/90 hover:bg-[#09261C] border border-[#C89D54]/50 text-xs font-bold text-[#E5C992] transition-colors max-w-full"
                      title={activeCoupon.description}
                    >
                      <Tag className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                      <span className="truncate">
                        Promokod: {activeCoupon.code}
                      </span>
                      {copiedCode === activeCoupon.code ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-4 h-full max-h-[240px] bg-[#09261C] relative overflow-hidden">
                <img
                  src={activeBanner.image}
                  alt={localizedBanner.headline}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Popular Products (2-Column Mobile Grid via .zaven-product-grid) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-5 h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 truncate">
              {t('home.popularTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?sort=popular"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-green hover:underline shrink-0"
          >
            <span>{t('home.viewAllPopular')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="zaven-product-grid zaven-product-grid-4">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 3. Categories Strip (Contained Horizontal Scroll on Mobile, 5-Col Grid on Desktop) */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold text-gray-900 truncate">
            {t('home.shopByCategory')}
          </h2>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-green hover:underline shrink-0"
          >
            <span>{t('home.viewAllCategories')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex lg:grid lg:grid-cols-5 gap-2.5 sm:gap-4 overflow-x-auto lg:overflow-visible scrollbar-thin pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
          {activeCategories.map((category) => {
            const locCat = getCategoryText(category);
            const count = visibleProducts.filter(
              (p) => p.categoryId === category.id
            ).length;
            return (
              <Link
                key={category.id}
                to={`/catalog?category=${category.slug}`}
                className="w-40 sm:w-48 lg:w-auto shrink-0 group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-brand-green transition-all flex items-center lg:flex-col p-2.5 lg:p-3 gap-2.5 min-w-0"
              >
                <div className="w-11 h-11 lg:w-full lg:h-28 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative">
                  <img
                    src={category.image}
                    alt={locCat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="hidden lg:flex absolute top-2 left-2 w-7 h-7 rounded-md bg-white border border-gray-200 items-center justify-center shadow-sm">
                    {renderCategoryIcon(category.iconName)}
                  </div>
                </div>
                <div className="min-w-0 flex-1 lg:w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-brand-green line-clamp-2 leading-tight break-words">
                    {locCat.name}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-brand-green font-semibold mt-0.5">
                    {count} {t('home.productsCount')}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-5 h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 truncate">
              {t('home.newArrivalsTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?filter=new"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-green hover:underline shrink-0"
          >
            <span>{t('home.viewAllNew')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="zaven-product-grid zaven-product-grid-4">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 5. Discounted Products Section */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-5 h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 truncate">
              {t('home.specialOffersTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?filter=discounted"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-brand-green hover:underline shrink-0"
          >
            <span>{t('nav.discounts')}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="zaven-product-grid zaven-product-grid-4">
          {specialOffers.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. Configurable Ordering, Delivery & Payment Transparency Section */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-7 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div className="min-w-0">
              <Badge variant="green" size="sm">
                {t('home.transparentRulesBadge')}
              </Badge>
              <h2 className="text-base sm:text-xl font-extrabold text-gray-900 mt-1.5 break-words">
                {t('home.trustSectionTitle')}
              </h2>
            </div>
            <Badge variant="gold" size="md">
              <Clock className="w-3.5 h-3.5 mr-1 shrink-0" />
              <span>{t('delivery.estimateValue')}</span>
            </Badge>
          </div>

          {enabledTrustItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {enabledTrustItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-surface-page border border-gray-200/80 flex items-start gap-3 min-w-0"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand-green-light flex items-center justify-center shrink-0">
                    {renderTrustIcon(item.iconName)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs sm:text-sm font-bold text-gray-900 break-words">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed break-words">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-xl border border-gray-200 p-4 space-y-3 min-w-0">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-green shrink-0" />
                <h3 className="text-sm font-bold text-gray-900">
                  {t('home.regionalTariffs')}
                </h3>
              </div>

              {storeSettings.delivery.isDeliveryEnabled && (
                <>
                  <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    <span className="break-words">
                      {storeSettings.delivery.generalDeliveryNote}
                    </span>
                  </p>
                  <div className="divide-y divide-gray-100 text-xs">
                    {enabledRegions.map((reg) => (
                      <div
                        key={reg.id}
                        className="py-2 flex items-start justify-between gap-3"
                      >
                        <p className="font-bold text-gray-900 flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 text-brand-gold-dark shrink-0" />
                          <span className="break-words">{reg.regionName}</span>
                        </p>
                        <span className="font-extrabold text-brand-green shrink-0">
                          {formatUZS(reg.fee)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-4 space-y-3 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-brand-green shrink-0" />
                  <h3 className="text-sm font-bold text-gray-900">
                    {t('home.acceptedPayments')}
                  </h3>
                </div>
                <Badge variant="gold" size="sm">
                  {t('home.transparentBilling')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {enabledPayments.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-2.5 rounded-lg border border-gray-200 bg-surface-page min-w-0"
                  >
                    <span className="text-xs font-bold text-gray-900 block break-words">
                      {pm.name}
                    </span>
                    <p className="text-[11px] text-gray-600 mt-0.5 line-clamp-2 break-words">
                      {pm.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Compact Instagram Banner */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="bg-[#09261C] rounded-2xl p-4 sm:p-6 text-white border border-[#C89D54]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#C89D54] text-[#09261C] flex items-center justify-center shrink-0 shadow-sm">
              <Instagram className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-white break-words">
                {t('home.instagramTitle')}
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 break-words">
                {t('home.instagramDesc')}{' '}
                <strong className="text-[#C89D54]">
                  {storeSettings.instagramHandle}
                </strong>
              </p>
            </div>
          </div>

          <a
            href={storeSettings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto shrink-0"
          >
            <Button
              variant="gold"
              size="sm"
              fullWidth
              leftIcon={<Instagram className="w-4 h-4" />}
            >
              {t('home.instagramBtn')}
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
};
