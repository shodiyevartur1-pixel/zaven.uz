import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Flame,
  Tag,
  ThumbsUp,
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

  const newArrivals = visibleProducts.filter((p) => p.isNew).slice(0, 4);

  const popularProducts = [...visibleProducts]
    .filter((p) => p.isPopular)
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 4);

  const specialOffers = visibleProducts
    .filter((p) => p.salePrice && p.salePrice < p.price)
    .slice(0, 4);

  const recommendedProducts = visibleProducts
    .filter((p) => p.isRecommended)
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
        return <Home className="w-5 h-5 text-brand-green" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-brand-green" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-brand-green" />;
      case 'Gift':
        return <Gift className="w-5 h-5 text-brand-green" />;
      default:
        return <Compass className="w-5 h-5 text-brand-green" />;
    }
  };

  const renderTrustIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-brand-green" />;
      case 'Truck':
        return <Truck className="w-6 h-6 text-brand-green" />;
      case 'CreditCard':
        return <CreditCard className="w-6 h-6 text-brand-green" />;
      default:
        return <Headphones className="w-6 h-6 text-brand-green" />;
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 py-6 sm:py-8">
      {/* 1. Prominent Promotional Hero Banner */}
      {activeBanner && localizedBanner && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-brand-green rounded-2xl overflow-hidden border border-brand-green-dark shadow-card">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
              <div className="p-6 sm:p-10 lg:p-12 lg:col-span-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="inline-flex flex-wrap items-center gap-2.5">
                    <Badge variant="gold" size="md">
                      {localizedBanner.badgeText}
                    </Badge>
                    <span className="text-xs text-emerald-100 font-medium">
                      {t('home.fromWarehouse')}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-4xl lg:text-[40px] font-extrabold text-white tracking-tight leading-[1.15]">
                    {localizedBanner.headline}
                  </h1>

                  <p className="text-sm sm:text-base text-emerald-100 leading-relaxed max-w-xl">
                    {localizedBanner.subheadline}
                  </p>

                  {localizedBanner.offerText && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-green-dark/80 border border-brand-gold/40 text-brand-gold text-xs sm:text-sm font-bold">
                      <Tag className="w-4 h-4 shrink-0" />
                      <span>{localizedBanner.offerText}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link
                    to={activeBanner.ctaLink || '/catalog'}
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="gold"
                      size="lg"
                      fullWidth
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {localizedBanner.ctaText}
                    </Button>
                  </Link>
                  <Link
                    to="/catalog?filter=discounted"
                    className="w-full sm:w-auto"
                  >
                    <Button
                      variant="outline-light"
                      size="lg"
                      fullWidth
                      leftIcon={<Tag className="w-4 h-4 text-brand-gold" />}
                    >
                      {t('nav.specialDiscounts')}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 relative min-h-[260px] sm:min-h-[340px] bg-brand-green-dark">
                <img
                  src={activeBanner.image}
                  alt={localizedBanner.headline}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-4 bg-white/95 p-3.5 rounded-xl border border-gray-200 shadow-lg max-w-xs">
                  <p className="text-xs font-bold text-brand-green uppercase tracking-wider">
                    {t('home.singleRetailerBadge')}
                  </p>
                  <p className="text-xs text-gray-700 mt-0.5">
                    {t('home.singleRetailerDesc')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Shop by Category Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {t('home.shopByCategory')}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {t('home.shopByCategorySub')}
            </p>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-green hover:text-brand-green-hover"
          >
            <span>{t('home.viewAllCategories')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {activeCategories.map((category) => {
            const locCat = getCategoryText(category);
            const count = visibleProducts.filter(
              (p) => p.categoryId === category.id
            ).length;
            return (
              <Link
                key={category.id}
                to={`/catalog?category=${category.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-brand-green hover:shadow-card-hover transition-all flex flex-col justify-between"
              >
                <div className="relative h-36 bg-gray-100 overflow-hidden">
                  <img
                    src={category.image}
                    alt={locCat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 w-9 h-9 rounded-lg bg-white/95 border border-gray-200 flex items-center justify-center shadow-sm">
                    {renderCategoryIcon(category.iconName)}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-brand-green transition-colors">
                      {locCat.name}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {locCat.description}
                    </p>
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-brand-green">
                    <span>
                      {count} {t('home.productsCount')}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. New Arrivals Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-green mb-1">
              <Sparkles className="w-4 h-4 text-brand-gold" />
              <span>{t('home.newBatch')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {t('home.newArrivalsTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?filter=new"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-green hover:underline"
          >
            <span>{t('home.viewAllNew')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {newArrivals.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. Special Offers & Coupon Highlight */}
      <section className="bg-brand-gold-light/60 border-y border-brand-gold-border/60 py-10 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-brand-gold-border shadow-card">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2">
                <Badge variant="gold" size="md">
                  {t('home.greatDeal')}
                </Badge>
                <span className="text-xs font-semibold text-brand-gold-dark">
                  {t('home.limitedOffers')}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
                {t('home.specialOffersTitle')}
              </h2>
              <p className="text-sm text-gray-600">
                {t('home.specialOffersSub')}
              </p>
            </div>

            {activeCoupon && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-brand-green-light/70 border border-brand-green/20 rounded-xl p-3.5">
                <div>
                  <p className="text-xs font-bold text-brand-green">
                    {t('home.extraPromo')}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {activeCoupon.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyCoupon(activeCoupon.code)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-green text-white font-extrabold text-xs tracking-wider hover:bg-brand-green-hover transition-colors shrink-0"
                >
                  <span>{activeCoupon.code}</span>
                  {copiedCode === activeCoupon.code ? (
                    <Check className="w-4 h-4 text-brand-gold" />
                  ) : (
                    <Copy className="w-4 h-4 text-brand-gold" />
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {specialOffers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="text-center pt-2">
            <Link to="/catalog?filter=discounted">
              <Button
                variant="outline"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('home.viewAllDiscounted')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* 5. Popular Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-green mb-1">
              <Flame className="w-4 h-4 text-brand-gold" />
              <span>{t('home.customerChoice')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {t('home.popularTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?sort=popular"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-green hover:underline"
          >
            <span>{t('home.viewAllPopular')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {popularProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 6. Recommended Products Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-green mb-1">
              <ThumbsUp className="w-4 h-4 text-brand-gold" />
              <span>{t('home.zavenPick')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {t('home.recommendedTitle')}
            </h2>
          </div>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-green hover:underline"
          >
            <span>{t('home.goToCatalog')}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {recommendedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 7. Configurable Ordering, Delivery, Support & Payment Transparency Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-card space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <Badge variant="green" size="sm">
                {t('home.transparentRulesBadge')}
              </Badge>
              <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2">
                {t('home.trustSectionTitle')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('home.trustSectionSub')}
              </p>
            </div>
          </div>

          {enabledTrustItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {enabledTrustItems.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface-page border border-gray-200/80 space-y-2.5"
                >
                  <div className="w-10 h-10 rounded-lg bg-brand-green-light flex items-center justify-center">
                    {renderTrustIcon(item.iconName)}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Delivery Rules Box with Phase 5 "Taxminan 10–25 kun" Estimate */}
            <div className="rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <Truck className="w-5 h-5 text-brand-green" />
                  <h3 className="text-base font-bold text-gray-900">
                    {t('home.regionalTariffs')}
                  </h3>
                </div>
                <Badge variant="gold" size="md">
                  <Clock className="w-3.5 h-3.5 mr-1" />
                  {t('delivery.estimateValue')}
                </Badge>
              </div>

              {storeSettings.delivery.isDeliveryEnabled && (
                <>
                  <div className="p-3 rounded-lg bg-brand-green-light/60 border border-brand-green/20 text-xs space-y-1">
                    <p className="font-bold text-brand-green">
                      {t('delivery.estimateLabel')}{' '}
                      {t('delivery.estimateValue')}
                    </p>
                    <p className="text-gray-600">
                      {t('delivery.estimateDisclaimer')}
                    </p>
                  </div>

                  <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
                    <Info className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    <span>{storeSettings.delivery.generalDeliveryNote}</span>
                  </p>
                  <div className="divide-y divide-gray-100 text-xs">
                    {enabledRegions.map((reg) => (
                      <div
                        key={reg.id}
                        className="py-2.5 flex items-start justify-between gap-4"
                      >
                        <div>
                          <p className="font-bold text-gray-900 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-brand-gold-dark shrink-0" />
                            <span>{reg.regionName}</span>
                          </p>
                          <p className="text-gray-500 mt-0.5">{reg.note}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-brand-green block">
                            {formatUZS(reg.fee)}
                          </span>
                          {reg.freeDeliveryThreshold && (
                            <span className="text-[11px] text-emerald-700">
                              {formatUZS(reg.freeDeliveryThreshold)}{' '}
                              {t('home.freeFrom')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-brand-green" />
                  <h3 className="text-base font-bold text-gray-900">
                    {t('home.acceptedPayments')}
                  </h3>
                </div>
                <Badge variant="gold">{t('home.transparentBilling')}</Badge>
              </div>

              <p className="text-xs text-gray-600">{t('home.noHiddenFees')}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {enabledPayments.map((pm) => (
                  <div
                    key={pm.id}
                    className="p-3 rounded-lg border border-gray-200 bg-surface-page flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-gray-900">
                          {pm.name}
                        </span>
                        {pm.isDemoMode && (
                          <Badge variant="warning" size="sm">
                            Demo
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-600 mt-1">
                        {pm.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Instagram Community & Support Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-green-dark rounded-2xl p-6 sm:p-8 text-white border border-brand-gold/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-brand-gold text-brand-green-dark flex items-center justify-center shrink-0 shadow-md">
              <Instagram className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-gold">
                {t('home.socialBadge')}
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                {t('home.instagramTitle')}
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-xl">
                {t('home.instagramDesc')}{' '}
                <span className="font-bold text-brand-gold">
                  {storeSettings.instagramHandle}
                </span>
              </p>
            </div>
          </div>

          <a
            href={storeSettings.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full md:w-auto shrink-0"
          >
            <Button
              variant="gold"
              size="lg"
              fullWidth
              leftIcon={<Instagram className="w-5 h-5" />}
            >
              {t('home.instagramBtn')}
            </Button>
          </a>
        </div>
      </section>
    </div>
  );
};