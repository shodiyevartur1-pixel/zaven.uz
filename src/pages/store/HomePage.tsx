import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import { formatUZS } from '../../utils/format';

const SLIDE_DURATION_MS = 4200;

export const HomePage: React.FC = () => {
  const {
    products,
    isSyncingSupabase,
    categories,
    storeSettings,
    recentlyViewedIds,
    recordRecentlyViewed,
  } = useStore();
  const { t, getCategoryText, getProductText } = useThemeLanguage();

  const [openTrustPanel, setOpenTrustPanel] = useState<
    'quality' | 'tariffs' | 'payments' | null
  >(null);

  const visibleProducts = useMemo(
    () =>
      products.filter(
        (p) => p.status === 'active' || p.status === 'out_of_stock'
      ),
    [products]
  );

  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => visibleProducts.find((product) => product.id === id))
        .filter((product): product is (typeof visibleProducts)[number] =>
          Boolean(product)
        )
        .slice(0, 4),
    [recentlyViewedIds, visibleProducts]
  );

  // Featured products for the image-first slider
  const carouselProducts = useMemo(() => {
    const activeWithImages = products.filter(
      (p) => p.status === 'active' && p.images && p.images.length > 0
    );
    const featured = activeWithImages.filter(
      (p) => p.isPopular || p.isRecommended || p.isNew
    );
    return (featured.length > 0 ? featured : activeWithImages).slice(0, 5);
  }, [products]);

  const count = carouselProducts.length;

  /**
   * Seamless infinite loop track:
   * Extended array is `[lastSlideClone, ...carouselProducts, firstSlideClone]`
   * - Real slides live at trackIndex `1 .. count`
   * - Advancing past `count` lands on `count + 1` (firstSlideClone) with smooth animation,
   *   then `onTransitionEnd` snaps silently (`isTransitionEnabled = false`) back to `1`.
   */
  const extendedSlides = useMemo(() => {
    if (count <= 1) return carouselProducts;
    return [
      carouselProducts[count - 1],
      ...carouselProducts,
      carouselProducts[0],
    ];
  }, [carouselProducts, count]);

  const [trackIndex, setTrackIndex] = useState<number>(count > 1 ? 1 : 0);
  const [isTransitionEnabled, setIsTransitionEnabled] = useState<boolean>(true);
  const [cycleTick, setCycleTick] = useState<number>(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Active real slide index (0 .. count - 1) synchronized with indicator bar
  const activeLogicalIdx = useMemo(() => {
    if (count <= 1) return 0;
    if (trackIndex <= 0) return count - 1;
    if (trackIndex >= count + 1) return 0;
    return trackIndex - 1;
  }, [trackIndex, count]);

  // Reset trackIndex if product count changes
  useEffect(() => {
    setIsTransitionEnabled(false);
    setTrackIndex(count > 1 ? 1 : 0);
    setCycleTick((c) => c + 1);
  }, [count]);

  // Re-enable CSS transition on the frame after a silent clone snap
  useEffect(() => {
    if (!isTransitionEnabled) {
      let raf2 = 0;
      const raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          setIsTransitionEnabled(true);
        });
      });
      return () => {
        window.cancelAnimationFrame(raf1);
        window.cancelAnimationFrame(raf2);
      };
    }
  }, [isTransitionEnabled]);

  const advanceNext = useCallback(() => {
    if (count <= 1) return;
    setIsTransitionEnabled(true);
    setTrackIndex((prev) => {
      if (prev >= count + 1) return 1;
      return prev + 1;
    });
    setCycleTick((c) => c + 1);
  }, [count]);

  const advancePrev = useCallback(() => {
    if (count <= 1) return;
    setIsTransitionEnabled(true);
    setTrackIndex((prev) => {
      if (prev <= 0) return count;
      return prev - 1;
    });
    setCycleTick((c) => c + 1);
  }, [count]);

  const goToLogicalSlide = useCallback(
    (targetIdx: number) => {
      if (count <= 1) return;
      setIsTransitionEnabled(true);
      setTrackIndex(targetIdx + 1);
      setCycleTick((c) => c + 1);
    },
    [count]
  );

  // Continuous steady autoplay (does NOT pause on hover or focus; resets cleanly on manual interaction via cycleTick)
  useEffect(() => {
    if (count <= 1) return;
    const timer = window.setTimeout(() => {
      advanceNext();
    }, SLIDE_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [count, cycleTick, advanceNext]);

  // Safety guard if browser tab was backgrounded and transitionend didn't fire
  useEffect(() => {
    if (count <= 1) return;
    if (trackIndex === count + 1 || trackIndex === 0) {
      const fallbackTimer = window.setTimeout(() => {
        setIsTransitionEnabled(false);
        setTrackIndex(trackIndex === count + 1 ? 1 : count);
      }, 540);
      return () => window.clearTimeout(fallbackTimer);
    }
  }, [trackIndex, count]);

  const handleTrackTransitionEnd = () => {
    if (count <= 1) return;
    if (trackIndex >= count + 1) {
      setIsTransitionEnabled(false);
      setTrackIndex(1);
    } else if (trackIndex <= 0) {
      setIsTransitionEnabled(false);
      setTrackIndex(count);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) > 40) {
      if (deltaX < 0) {
        advanceNext();
      } else {
        advancePrev();
      }
    }
    setTouchStartX(null);
  };

  const handleOpenProductTop = (productId: string) => {
    recordRecentlyViewed(productId);
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
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
      {/* REQUIREMENTS 2 & 3: Large Image-First Continuous-Loop Product Slider  */}
      {/* - Shows the full product image with `object-contain` (never shrunk    */}
      {/*   into a small thumbnail beside a text card)                          */}
      {/* - Clicking any slide opens that product's detail page                 */}
      {/* - Loops continuously forward from last slide to first without jumping */}
      {/* - Active indicator bar visibly fills over 4.2s in sync with the slide */}
      {/* ===================================================================== */}
      {count > 0 && (
        <section
          aria-roledescription="carousel"
          aria-label={t('home.popularTitle')}
          className="zaven-page-container"
        >
          <div
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="relative min-h-[160px] overflow-hidden rounded-3xl border border-gray-200/90 bg-gradient-to-b from-white to-[#F2F6F4] shadow-card select-none dark:border-[#28453B] dark:from-[#12211C] dark:to-[#0C1713] sm:min-h-[220px] lg:min-h-[280px]"
          >
            {/* Sliding Image Track */}
            <div
              onTransitionEnd={handleTrackTransitionEnd}
              className={`flex w-full will-change-transform ${
                isTransitionEnabled
                  ? 'transition-transform duration-500 ease-out motion-reduce:transition-none'
                  : 'transition-none'
              }`}
              style={{
                transform: `translate3d(-${trackIndex * 100}%, 0, 0)`,
              }}
            >
              {extendedSlides.map((slideProduct, idx) => {
                const locProd = getProductText(slideProduct);
                const isLogicalActive =
                  count <= 1 ? true : idx - 1 === activeLogicalIdx;

                return (
                  <div
                    key={`${slideProduct.id}-slide-${idx}`}
                    aria-hidden={!isLogicalActive}
                    className="relative h-[160px] w-full shrink-0 overflow-hidden bg-[#07110D] sm:h-[220px] lg:h-[280px]"
                  >
                    <Link
                      to={`/product/${slideProduct.slug}`}
                      tabIndex={isLogicalActive ? 0 : -1}
                      aria-label={locProd.name}
                      title={locProd.name}
                      onClick={() => handleOpenProductTop(slideProduct.id)}
                      className="absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden focus:outline-none group"
                    >
                      <img
                        src={slideProduct.images[0]}
                        alt={locProd.name}
                        draggable={false}
                        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                      />
                      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#07110D]/50 via-transparent to-[#07110D]/20" />
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Subtle, Unobtrusive Prev / Next Controls */}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={advancePrev}
                  aria-label={t('home.carouselPrevAria')}
                  className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#09261C]/55 hover:bg-[#0F3D2E] text-white/90 hover:text-white border border-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                <button
                  type="button"
                  onClick={advanceNext}
                  aria-label={t('home.carouselNextAria')}
                  className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#09261C]/55 hover:bg-[#0F3D2E] text-white/90 hover:text-white border border-white/15 backdrop-blur-sm flex items-center justify-center shadow-sm transition-colors"
                >
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </>
            )}

            {/* Synchronized Animated Progress Indicator Bar */}
            {count > 1 && (
              <div
                role="tablist"
                aria-label="Carousel slides"
                className="absolute bottom-2.5 sm:bottom-3.5 left-1/2 -translate-x-1/2 z-20 px-3 py-1.5 rounded-full bg-[#09261C]/75 backdrop-blur-md border border-white/10 flex items-center gap-1.5"
              >
                {carouselProducts.map((item, idx) => {
                  const isCurrent = idx === activeLogicalIdx;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      role="tab"
                      aria-selected={isCurrent}
                      aria-label={`${t('home.carouselSlideAria')} ${idx + 1}`}
                      onClick={() => goToLogicalSlide(idx)}
                      className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 ${
                        isCurrent
                          ? 'w-9 sm:w-11 bg-white/25'
                          : 'w-2 bg-white/35 hover:bg-white/60'
                      }`}
                    >
                      {isCurrent && (
                        <span
                          key={`fill-${activeLogicalIdx}-${cycleTick}`}
                          className="block w-full h-full bg-[#C89D54] rounded-full zaven-carousel-progress-fill"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {visibleProducts.length === 0 && (
        <div className="zaven-page-container py-4" role="status">
          {isSyncingSupabase ? t('common.loading') : t('home.productsUnavailable')}
        </div>
      )}

      {/* 2. Popular Products */}
      {popularProducts.length > 0 && (
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {t('home.popularTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?sort=popular&view=products"
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
      )}

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
                to={`/catalog?category=${category.slug}&view=products`}
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
      {newArrivals.length > 0 && (
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {t('home.newArrivalsTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?filter=new&view=products"
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
      )}

      {/* 5. Discounted Products Section */}
      {specialOffers.length > 0 && (
      <section className="zaven-page-container space-y-3">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-[#C89D54] shrink-0" />
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {t('home.specialOffersTitle')}
            </h2>
          </div>
          <Link
            to="/catalog?filter=discounted&view=products"
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
      )}

      {/* Recently Viewed Products */}
      {recentlyViewedProducts.length > 0 && (
        <section className="zaven-page-container space-y-3">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
              {t('product.recentlyViewedTitle')}
            </h2>
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 shrink-0">
              {recentlyViewedProducts.length}
            </span>
          </div>
          <div className="zaven-product-grid zaven-product-grid-4">
            {recentlyViewedProducts.map((viewedProduct) => (
              <ProductCard key={viewedProduct.id} product={viewedProduct} />
            ))}
          </div>
        </section>
      )}

      {/* 6. Homepage Information Section */}
      <section className="zaven-page-container bg-transparent">
        <div className="bg-white dark:bg-[#0F1D18] rounded-2xl border border-gray-200 dark:border-[#243E35] p-4 sm:p-6 shadow-sm space-y-3">
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
