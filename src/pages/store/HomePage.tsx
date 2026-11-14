import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  Home,
  Smartphone,
  Zap,
  Gift,
  Compass,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatUZS, calculateDiscountPercent } from '../../utils/format';

export const HomePage: React.FC = () => {
  const {
    products,
    categories,
    storeSettings,
    recordRecentlyViewed,
  } = useStore();
  const { t, getCategoryText, getProductText } = useThemeLanguage();

  // Collapsible trust/tariff/payment sections closed by default on mobile
  const [openTrustPanel, setOpenTrustPanel] = useState<
    'quality' | 'tariffs' | 'payments' | null
  >(null);

  // Featured product carousel state
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const carouselPauseTimeoutRef = useRef<number | null>(null);

  const pauseCarouselBriefly = () => {
    setIsCarouselPaused(true);
    if (carouselPauseTimeoutRef.current !== null) {
      window.clearTimeout(carouselPauseTimeoutRef.current);
    }
    carouselPauseTimeoutRef.current = window.setTimeout(() => {
      setIsCarouselPaused(false);
      carouselPauseTimeoutRef.current = null;
    }, 5000);
  };

  useEffect(
    () => () => {
      if (carouselPauseTimeoutRef.current !== null) {
        window.clearTimeout(carouselPauseTimeoutRef.current);
      }
    },
    []
  );

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (p) => p.status === 'active' || p.status === 'out_of_stock'
      ),
    [products]
  );

  // Real active products with images for the top featured carousel
  const carouselProducts = useMemo(() => {
    const activeWithImages = products.filter(
      (p) => p.status === 'active' && p.images && p.images.length > 0
    );
    const featured = activeWithImages.filter(
      (p) => p.isPopular || p.isRecommended || p.isNew
    );
    return (featured.length > 0 ? featured : activeWithImages).slice(0, 5);
  }, [products]);

  // Rotate featured products gently; respect reduced-motion and background tabs.
  useEffect(() => {
    if (carouselProducts.length < 2 || isCarouselPaused) return;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionPreference.matches) return;

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        setActiveSlideIdx((current) => (current + 1) % carouselProducts.length);
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [carouselProducts.length, isCarouselPaused]);

  const safeSlideIdx =
    carouselProducts.length > 0
      ? activeSlideIdx % carouselProducts.length
      : 0;
  const currentCarouselProduct = carouselProducts[safeSlideIdx] || null;

  const handlePrevSlide = () => {
    if (carouselProducts.length <= 1) return;
    pauseCarouselBriefly();
    setActiveSlideIdx((prev) =>
      prev === 0 ? carouselProducts.length - 1 : prev - 1
    );
  };

  const handleNextSlide = () => {
    if (carouselProducts.length <= 1) return;
    pauseCarouselBriefly();
    setActiveSlideIdx((prev) =>
      prev === carouselProducts.length - 1 ? 0 : prev + 1
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        handleNextSlide();
      } else {
        handlePrevSlide();
      }
    }
    setTouchStartX(null);
  };

  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const popularProducts = [...visibleProducts]
    .filter((p) => p.isPopular)
    .sort((a, b) => b.soldCount - a.soldCount)
    .slice(0, 4);

  const newArrivals = visibleProducts.filter((p) => p.isNew).slice(0, 4);

  const specialOffers = visibleProducts
    .filter((p) => p.salePrice && p.salePrice < p.price)
    .slice(0, 4);

  const enabledTrustItems = storeSettings.trustItems.filter(
    (item) => item.isEnabled
  );
  const enabledRegions = storeSettings.delivery.regions.filter(
    (reg) => reg.isEnabled
  );
  const enabledPayments = storeSettings.paymentMethods.filter(
    (pm) => pm.isEnabled
  );

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
      {/* ===================================================================== */}
      {/* 1. Requirement 3: Compact Image-First Featured Product Carousel        */}
      {/* Driven by real active products; touch swipe + prev/next + pagination  */}
      {/* ===================================================================== */}
      {currentCarouselProduct && (
        <section
          aria-roledescription="carousel"
          aria-label={t('home.popularTitle')}
          onMouseEnter={() => setIsCarouselPaused(true)}
          onMouseLeave={() => setIsCarouselPaused(false)}
          className="zaven-page-container"
        >
          <div
            className="relative overflow-hidden rounded-2xl border border-[#1D4D3C] bg-[#0F3D2E] shadow-card"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="flex motion-reduce:transition-none transition-transform duration-500 ease-in-out"
              style={{
                width: `${carouselProducts.length * 100}%`,
                transform: `translate3d(-${safeSlideIdx * (100 / carouselProducts.length)}%, 0, 0)`,
              }}
            >
              {carouselProducts.map((product, idx) => {
                const localizedProduct = getProductText(product);
                const category = categories.find(
                  (item) => item.id === product.categoryId
                );
                const localizedCategory = category
                  ? getCategoryText(category)
                  : null;
                const price = product.salePrice ?? product.price;
                const discount = calculateDiscountPercent(
                  product.price,
                  product.salePrice
                );
                const isCurrent = idx === safeSlideIdx;

                return (
                  <article
                    key={product.id}
                    aria-roledescription="slide"
                    aria-label={`${idx + 1} / ${carouselProducts.length}`}
                    aria-hidden={!isCurrent}
                    className="box-border flex h-[204px] w-full shrink-0 items-center gap-3 p-3 sm:h-[232px] sm:gap-6 sm:p-5 lg:h-[248px] lg:p-6"
                    style={{ width: `${100 / carouselProducts.length}%` }}
                  >
                    <Link
                      to={`/product/${product.slug}`}
                      tabIndex={isCurrent ? 0 : -1}
                      onClick={() => {
                        recordRecentlyViewed(product.id);
                        window.scrollTo(0, 0);
                      }}
                      className="relative aspect-square w-[88px] shrink-0 overflow-hidden rounded-xl border border-[#C89D54]/40 bg-white sm:w-36 lg:w-40"
                    >
                      <img
                        src={product.images[0]}
                        alt={localizedProduct.name}
                        className="block h-full w-full object-cover"
                      />
                      {discount > 0 && (
                        <span className="absolute left-1 top-1 rounded-md bg-[#C89D54] px-1.5 py-0.5 text-[10px] font-extrabold text-[#09261C] shadow-sm">
                          -{discount}%
                        </span>
                      )}
                    </Link>

                    <div className="flex h-full min-w-0 flex-1 flex-col justify-center gap-1.5 py-1 sm:gap-2">
                      <span className="h-4 truncate text-[9px] font-bold uppercase tracking-wide text-[#E5C992] sm:h-5 sm:text-xs">
                        {localizedCategory?.name || '\u00a0'}
                      </span>
                      <Link
                        to={`/product/${product.slug}`}
                        tabIndex={isCurrent ? 0 : -1}
                        title={localizedProduct.name}
                        onClick={() => {
                          recordRecentlyViewed(product.id);
                          window.scrollTo(0, 0);
                        }}
                        className="line-clamp-3 min-h-[2.75rem] break-words text-xs font-extrabold leading-4 text-white hover:text-[#E5C992] sm:min-h-[3.5rem] sm:text-xl sm:leading-7 lg:text-2xl"
                      >
                        {localizedProduct.name}
                      </Link>
                      <div className="flex min-h-9 min-w-0 flex-col justify-center gap-1 sm:min-h-11 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
                        <span className="truncate text-sm font-extrabold leading-tight text-[#C89D54] sm:text-2xl">
                          {formatUZS(price)}
                        </span>
                        {product.salePrice && (
                          <span className="truncate text-[10px] leading-tight text-emerald-200/70 line-through sm:text-sm">
                            {formatUZS(product.price)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1.5">
                        <Link
                          to={`/product/${product.slug}`}
                          tabIndex={isCurrent ? 0 : -1}
                          onClick={() => {
                            recordRecentlyViewed(product.id);
                            window.scrollTo(0, 0);
                          }}
                          className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg bg-[#C89D54] px-2.5 text-[11px] font-extrabold text-[#09261C] sm:h-9 sm:gap-1.5 sm:rounded-xl sm:px-4 sm:text-sm"
                        >
                          {t('home.carouselViewBtn')}
                          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                        </Link>
                        {carouselProducts.length > 1 && isCurrent && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handlePrevSlide}
                              aria-label={t('home.carouselPrevAria')}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700/70 bg-[#09261C]/80 text-white transition-colors hover:bg-[#16533F]"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={handleNextSlide}
                              aria-label={t('home.carouselNextAria')}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-700/70 bg-[#09261C]/80 text-white transition-colors hover:bg-[#16533F]"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {carouselProducts.length > 1 && (
              <div
                role="tablist"
                aria-label={t('home.popularTitle')}
                className="flex items-center justify-center gap-1.5 pb-2.5 sm:pb-3"
              >
                {carouselProducts.map((product, idx) => (
                  <button
                    key={product.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === safeSlideIdx}
                    aria-label={`${t('home.carouselSlideAria')} ${idx + 1}`}
                    onClick={() => {
                      pauseCarouselBriefly();
                      setActiveSlideIdx(idx);
                    }}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === safeSlideIdx
                        ? 'w-6 bg-[#C89D54]'
                        : 'w-2 bg-emerald-700/70 hover:bg-emerald-500'
                    }`}
                  />
                ))}
              </div>
            )}
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
      {/* 6. Requirement 1: Homepage Information Section                        */}
      {/* Large "Taxminan 10–25 kun" badge removed from this section header     */}
      {/* ===================================================================== */}
      <section className="zaven-page-container bg-transparent">
        <div className="bg-white dark:bg-[#0F1D18] rounded-2xl border border-gray-200 dark:border-[#243E35] p-4 sm:p-6 shadow-sm space-y-3">
          {/* Compact Summary Header (No delivery-time badge here) */}
          <div className="pb-2 border-b border-gray-100 dark:border-[#243E35]">
            <Badge variant="green" size="sm">
              {t('home.transparentRulesBadge')}
            </Badge>
            <h2 className="text-sm sm:text-lg font-extrabold text-gray-900 dark:text-gray-100 mt-1.5 break-words">
              {t('home.trustSectionTitle')}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('home.trustSectionSub')}
            </p>
          </div>

          {/* 3 Labeled Collapsible Sections */}
          <div className="divide-y divide-gray-200 dark:divide-[#243E35]">
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
