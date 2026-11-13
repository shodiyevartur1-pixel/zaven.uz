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
  Clock,
  ChevronDown,
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
  const { t, language, getCategoryText, getBannerText } = useThemeLanguage();

  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Requirement 8: Collapsible trust/tariff/payment sections closed by default on mobile
  const [openTrustPanel, setOpenTrustPanel] = useState<
    'quality' | 'tariffs' | 'payments' | null
  >(null);

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

  const activeCoupon = coupons.find(
    (c) => c.isActive && c.usedCount < c.usageLimit
  );
  const enabledTrustItems = storeSettings.trustItems.filter(
    (item) => item.isEnabled
  );
  const enabledRegions = storeSettings.delivery.regions.filter(
    (reg) => reg.isEnabled
  );
  const enabledPayments = storeSettings.paymentMethods.filter(
    (pm) => pm.isEnabled
  );

  const compactHeroDescription =
    language === 'ru'
      ? 'Товары для дома, гаджеты и аксессуары с проверкой качества на складе ZAVEN.'
      : language === 'en'
      ? 'Quality-checked home essentials, everyday gadgets, and phone accessories.'
      : 'Sifat nazoratidan oʻtgan uy-roʻzgʻor buyumlari, gadjetlar va aksessuarlar.';

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
        return <ShieldCheck className="w-4 h-4 text-brand-green shrink-0" />;
      case 'Truck':
        return <Truck className="w-4 h-4 text-brand-green shrink-0" />;
      case 'CreditCard':
        return <CreditCard className="w-4 h-4 text-brand-green shrink-0" />;
      default:
        return <Headphones className="w-4 h-4 text-brand-green shrink-0" />;
    }
  };

  const toggleTrustPanel = (panel: 'quality' | 'tariffs' | 'payments') => {
    setOpenTrustPanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <div className="w-full max-w-full overflow-x-clip bg-[#F8F9FA] dark:bg-[#0B1512] space-y-6 sm:space-y-10 py-3 sm:py-6">
      {/* 1. Compact Marketplace Hero (~185–220px tall on phones) */}
      {activeBanner && localizedBanner && (
        <section className="zaven-page-container">
          <div className="bg-[#0F3D2E] rounded-2xl overflow-hidden border border-[#1D4D3C] shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
              <div className="min-w-0 px-4 py-3.5 sm:p-6 lg:p-7 lg:col-span-8 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-extrabold bg-[#C89D54] text-[#09261C]">
                    {localizedBanner.badgeText}
                  </span>
                  <span className="text-[11px] sm:text-xs text-emerald-100/90 font-medium">
                    • {t('delivery.estimateValue')}
                  </span>
                </div>

                <h1 className="text-[15px] sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-snug line-clamp-2 break-words">
                  {localizedBanner.headline}
                </h1>

                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed line-clamp-2 max-w-2xl break-words">
                  {compactHeroDescription}
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <Link
                    to={activeBanner.ctaLink || '/catalog'}
                    className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-3.5 rounded-lg bg-[#C89D54] hover:bg-[#B5893E] text-[#09261C] font-extrabold text-xs shadow-sm transition-colors"
                  >
                    <span>{localizedBanner.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </Link>

                  {activeCoupon && (
                    <button
                      type="button"
                      onClick={() => handleCopyCoupon(activeCoupon.code)}
                      className="inline-flex items-center gap-1.5 h-8 sm:h-9 px-2.5 rounded-lg bg-[#09261C]/90 hover:bg-[#09261C] border border-[#C89D54]/45 text-[11px] font-bold text-[#E5C992] transition-colors"
                      title={activeCoupon.description}
                    >
                      <Tag className="w-3 h-3 text-[#C89D54] shrink-0" />
                      <span>{activeCoupon.code}</span>
                      {copiedCode === activeCoupon.code ? (
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#C89D54] shrink-0" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-4 h-full max-h-[210px] bg-[#09261C] relative overflow-hidden">
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

      {/* 2. Popular Products — Visible Near First Screen on Mobile */}
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
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

      {/* 3. Categories Strip */}
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
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

        <div className="flex lg:grid lg:grid-cols-5 gap-3 sm:gap-4 overflow-x-auto lg:overflow-visible scrollbar-thin pb-1">
          {activeCategories.map((category) => {
            const locCat = getCategoryText(category);
            return (
              <Link
                key={category.id}
                to={`/catalog?category=${category.slug}`}
                className="w-44 sm:w-48 lg:w-auto shrink-0 group bg-white dark:bg-[#12211C] rounded-xl border border-gray-200 dark:border-[#28453B] overflow-hidden hover:border-brand-green transition-all flex items-center lg:flex-col p-2.5 lg:p-3 gap-2.5 min-w-0 shadow-sm"
              >
                <div className="w-11 h-11 lg:w-full lg:h-28 rounded-lg bg-gray-100 dark:bg-[#1A3028] overflow-hidden shrink-0 relative">
                  <img
                    src={category.image}
                    alt={locCat.name}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="hidden lg:flex absolute top-2 left-2 w-7 h-7 rounded-md bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#2F5246] items-center justify-center shadow-sm">
                    {renderCategoryIcon(category.iconName)}
                  </div>
                </div>
                <div className="min-w-0 flex-1 lg:w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-green line-clamp-2 leading-tight break-words">
                    {locCat.name}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 4. New Arrivals Section */}
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
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
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
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

      {/* ===================================================================== */}
      {/* 6. Requirement 8: Compact Collapsible Trust, Delivery & Payment Block */}
      {/* Closed by default on mobile; deep forest surfaces with zero gray band */}
      {/* ===================================================================== */}
      <section className="zaven-page-container bg-transparent">
        <div className="bg-white dark:bg-[#0F1D18] rounded-2xl border border-gray-200 dark:border-[#243E35] p-4 sm:p-6 shadow-sm space-y-3">
          {/* Compact Summary Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-gray-100 dark:border-[#243E35]">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="green" size="sm">
                  {t('home.transparentRulesBadge')}
                </Badge>
                <Badge variant="gold" size="sm">
                  <Clock className="w-3 h-3 mr-1 shrink-0" />
                  <span>{t('delivery.estimateValue')}</span>
                </Badge>
              </div>
              <h2 className="text-sm sm:text-lg font-extrabold text-gray-900 dark:text-gray-100 mt-1.5 break-words">
                {t('home.trustSectionTitle')}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('home.trustSectionSub')}
              </p>
            </div>
          </div>

          {/* 3 Labeled Collapsible Sections (Closed by default on mobile) */}
          <div className="divide-y divide-gray-200 dark:divide-[#243E35]">
            {/* Collapsible 1: Quality & Store Guarantees */}
            {enabledTrustItems.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => toggleTrustPanel('quality')}
                  aria-expanded={openTrustPanel === 'quality'}
                  className="w-full py-3 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <ShieldCheck className="w-4 h-4 text-brand-green shrink-0" />
                    <span className="truncate">
                      {t('home.trustAccordionQuality')}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                      openTrustPanel === 'quality' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openTrustPanel === 'quality' && (
                  <div className="pb-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {enabledTrustItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#142620] border border-gray-200 dark:border-[#28453B] flex items-start gap-2.5 min-w-0"
                      >
                        <div className="w-8 h-8 rounded-lg bg-brand-green-light flex items-center justify-center shrink-0">
                          {renderTrustIcon(item.iconName)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 break-words">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed break-words">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Collapsible 2: Regional Delivery Tariffs */}
            {storeSettings.delivery.isDeliveryEnabled && (
              <div>
                <button
                  type="button"
                  onClick={() => toggleTrustPanel('tariffs')}
                  aria-expanded={openTrustPanel === 'tariffs'}
                  className="w-full py-3 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Truck className="w-4 h-4 text-brand-green shrink-0" />
                    <span className="truncate">
                      {t('home.regionalTariffs')}
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                      openTrustPanel === 'tariffs' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openTrustPanel === 'tariffs' && (
                  <div className="pb-3.5 space-y-2.5 text-xs">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {storeSettings.delivery.generalDeliveryNote}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {enabledRegions.map((reg) => (
                        <div
                          key={reg.id}
                          className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-[#142620] border border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2"
                        >
                          <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-1 min-w-0">
                            <MapPin className="w-3 h-3 text-brand-gold-dark shrink-0" />
                            <span className="truncate">{reg.regionName}</span>
                          </span>
                          <span className="font-extrabold text-brand-green shrink-0">
                            {formatUZS(reg.fee)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible 3: Accepted Payment Methods */}
            <div>
              <button
                type="button"
                onClick={() => toggleTrustPanel('payments')}
                aria-expanded={openTrustPanel === 'payments'}
                className="w-full py-3 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <CreditCard className="w-4 h-4 text-brand-green shrink-0" />
                  <span className="truncate">
                    {t('home.acceptedPayments')}
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                    openTrustPanel === 'payments' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openTrustPanel === 'payments' && (
                <div className="pb-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {enabledPayments.map((pm) => (
                    <div
                      key={pm.id}
                      className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#142620] border border-gray-200 dark:border-[#28453B] min-w-0"
                    >
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100 block break-words">
                        {pm.name}
                      </span>
                      <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed break-words">
                        {pm.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Compact Instagram Community Banner */}
      <section className="zaven-page-container">
        <div className="bg-[#09261C] rounded-2xl p-4 sm:p-5 text-white border border-[#C89D54]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#C89D54] text-[#09261C] flex items-center justify-center shrink-0 shadow-sm">
              <Instagram className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-base font-extrabold text-white break-words">
                {t('home.instagramTitle')}
              </h3>
              <p className="text-xs text-emerald-100 mt-0.5 break-words">
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
