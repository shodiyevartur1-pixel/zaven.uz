import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ZoomIn,
  Truck,
  AlertCircle,
  CheckCircle2,
  Share2,
  ArrowLeft,
  Sparkles,
  Flame,
  CreditCard,
  FileText,
  Sliders,
  Heart,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatUZS, calculateDiscountPercent } from '../../utils/format';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const {
    products,
    categories,
    cart,
    favoriteIds,
    recentlyViewedIds,
    storeSettings,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    toggleFavorite,
    recordRecentlyViewed,
    addToast,
  } = useStore();
  const { t, getProductText, getCategoryText } = useThemeLanguage();

  const product = useMemo(
    () =>
      products.find(
        (p) =>
          (p.slug === slug || p.id === slug) &&
          p.status !== 'archived' &&
          p.status !== 'hidden'
      ),
    [products, slug]
  );

  const [selectedImageIdx, setSelectedImageIdx] = useState<number>(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState<boolean>(false);
  const [isZoomedInLightbox, setIsZoomedInLightbox] = useState<boolean>(false);
  const [pendingQty, setPendingQty] = useState<number>(1);

  const [openSection, setOpenSection] = useState<
    'description' | 'specs' | 'delivery' | null
  >('description');

  const purchaseActionsRef = useRef<HTMLDivElement>(null);
  const [showStickyMobileBar, setShowStickyMobileBar] =
    useState<boolean>(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedImageIdx(0);
    setPendingQty(1);
    setIsZoomedInLightbox(false);
    setShowStickyMobileBar(false);
    setOpenSection('description');

    if (product) {
      recordRecentlyViewed(product.id);
      const loc = getProductText(product);
      document.title = `${loc.name} — ${storeSettings.storeName}`;
    } else {
      document.title = storeSettings.seoTitle;
    }
  }, [product?.id, slug]);

  useEffect(() => {
    const targetEl = purchaseActionsRef.current;
    if (!targetEl) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isPastMainCta =
          !entry.isIntersecting && entry.boundingClientRect.top < 0;
        setShowStickyMobileBar(isPastMainCta);
      },
      {
        root: null,
        threshold: 0,
      }
    );

    observer.observe(targetEl);
    return () => observer.disconnect();
  }, [product?.id]);

  if (!product) {
    return (
      <div className="zaven-page-container py-12">
        <EmptyState
          title={t('product.notFoundTitle')}
          description={t('product.notFoundDesc')}
          actionLabel={t('nav.catalog')}
          onAction={() => navigate('/catalog')}
        />
      </div>
    );
  }

  const localizedProduct = getProductText(product);
  const category = categories.find((c) => c.id === product.categoryId);
  const localizedCategory = category ? getCategoryText(category) : null;

  const cartItem = cart.find((item) => item.productId === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  const isInCart = quantityInCart > 0;
  const isFavorited = favoriteIds.includes(product.id);

  // Requirement #6: Displayed quantity always reflects the real cart quantity when in cart
  const displayedQuantity = isInCart ? quantityInCart : pendingQty;

  const effectivePrice = product.salePrice ?? product.price;
  const discountPercent = calculateDiscountPercent(
    product.price,
    product.salePrice
  );
  const isOutOfStock =
    product.status === 'out_of_stock' || product.stock <= 0;

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [
          'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
        ];

  const currentImage = images[selectedImageIdx] || images[0];

  const relatedProducts = products
    .filter(
      (p) =>
        p.id !== product.id &&
        p.categoryId === product.categoryId &&
        (p.status === 'active' || p.status === 'out_of_stock')
    )
    .slice(0, 4);

  const fallbackRelated =
    relatedProducts.length < 4
      ? [
          ...relatedProducts,
          ...products
            .filter(
              (p) =>
                p.id !== product.id &&
                p.categoryId !== product.categoryId &&
                p.status === 'active'
            )
            .slice(0, 4 - relatedProducts.length),
        ]
      : relatedProducts;

  const recentlyViewedProducts = recentlyViewedIds
    .filter((id) => id !== product.id)
    .map((id) =>
      products.find(
        (p) =>
          p.id === id &&
          (p.status === 'active' || p.status === 'out_of_stock')
      )
    )
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 4);

  const enabledRegions = storeSettings.delivery.regions.filter(
    (r) => r.isEnabled
  );
  const showDeliveryBlock =
    storeSettings.delivery.isDeliveryEnabled &&
    storeSettings.delivery.showDeliveryInfoOnProductPage;

  // Requirement #6: Unified quantity stepper handlers
  const handleDecreaseQuantity = () => {
    if (isInCart) {
      if (quantityInCart <= 1) {
        removeFromCart(product.id);
        setPendingQty(1);
      } else {
        updateCartQuantity(product.id, quantityInCart - 1);
      }
    } else {
      setPendingQty((prev) => Math.max(1, prev - 1));
    }
  };

  const handleIncreaseQuantity = () => {
    if (isOutOfStock) return;
    if (isInCart) {
      if (quantityInCart < product.stock) {
        updateCartQuantity(product.id, quantityInCart + 1);
      }
    } else {
      setPendingQty((prev) => Math.min(product.stock, prev + 1));
    }
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart(product.id, pendingQty);
  };

  const handleShareProduct = () => {
    const shareUrl = window.location.href;
    navigator.clipboard?.writeText(shareUrl).catch(() => {});
    addToast({
      type: 'info',
      title: shareUrl,
    });
  };

  const handlePrevImage = () => {
    setSelectedImageIdx((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    setSelectedImageIdx((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const toggleAccordion = (section: 'description' | 'specs' | 'delivery') => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  // Minus button is only disabled when the item is NOT in the cart and pendingQty is 1.
  // When the item IS in the cart at quantity 1, minus stays enabled so pressing it removes the item.
  const isMinusDisabled = !isInCart && pendingQty <= 1;
  const isPlusDisabled = displayedQuantity >= product.stock;

  return (
    <div className="zaven-page-container py-3.5 sm:py-6 pb-20 md:pb-8 space-y-6 sm:space-y-8">
      {/* Requirement #1: Removed "Bosh sahifa > Katalog > ..." breadcrumb row; kept only compact Back action */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#28453B] text-xs font-bold text-gray-800 dark:text-gray-100 hover:border-brand-green shadow-sm transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-brand-green" />
          <span>{t('product.back')}</span>
        </button>

        <button
          type="button"
          onClick={handleShareProduct}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#28453B] text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-brand-green shadow-sm transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{t('product.share')}</span>
        </button>
      </div>

      {/* Primary Product Card */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 lg:p-8 shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
          {/* Left Column: Multi-Image Gallery & Evenly Sized Square Thumbnails */}
          <div className="lg:col-span-6 space-y-3 min-w-0">
            <div className="relative aspect-square rounded-2xl bg-gray-100 dark:bg-[#1A3028] border border-gray-200 dark:border-[#28453B] overflow-hidden group">
              <img
                src={currentImage}
                alt={`${localizedProduct.name} — ${selectedImageIdx + 1}`}
                onClick={() => setIsLightboxOpen(true)}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
              />

              {/* Requirements #3 & #5: High-contrast badges with right clearance so they never overlap top-right controls */}
              <div className="absolute top-3 left-3 right-24 pr-2 flex flex-wrap items-center gap-1.5 pointer-events-none z-10">
                {discountPercent > 0 && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#C89D54] text-[#09261C] border border-[#F3D79B] shadow-md">
                    -{discountPercent}%
                  </span>
                )}
                {product.isNew && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#0F3D2E] text-white border border-emerald-400/50 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-[#C89D54] shrink-0" />
                    <span>{t('product.new')}</span>
                  </span>
                )}
                {product.isPopular && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#09261C] text-[#F3D79B] border border-[#C89D54] shadow-md">
                    <Flame className="w-3.5 h-3.5 mr-1 text-[#C89D54] shrink-0" />
                    <span>{t('product.popular')}</span>
                  </span>
                )}
              </div>

              {/* Top-Right Heart Favorite + Zoom Buttons */}
              <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleFavorite(product.id)}
                  aria-pressed={isFavorited}
                  aria-label={
                    isFavorited
                      ? t('favorites.removeAria')
                      : t('favorites.addAria')
                  }
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md transition-all ${
                    isFavorited
                      ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400'
                      : 'bg-white/95 dark:bg-[#12211C]/95 hover:bg-white border-gray-200 dark:border-[#2F5246] text-gray-700 dark:text-gray-200 hover:text-rose-600'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`}
                  />
                </button>

                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="w-9 h-9 sm:w-auto sm:px-2.5 rounded-xl bg-white/95 dark:bg-[#12211C]/95 hover:bg-[#0F3D2E] text-gray-800 dark:text-gray-100 hover:text-white border border-gray-200 dark:border-[#2F5246] text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
                  aria-label={t('product.zoom')}
                >
                  <ZoomIn className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('product.zoom')}</span>
                </button>
              </div>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-[#12211C]/95 hover:bg-[#0F3D2E] text-gray-800 dark:text-gray-100 hover:text-white border border-gray-200 dark:border-[#2F5246] flex items-center justify-center shadow-md transition-colors"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-[#12211C]/95 hover:bg-[#0F3D2E] text-gray-800 dark:text-gray-100 hover:text-white border border-gray-200 dark:border-[#2F5246] flex items-center justify-center shadow-md transition-colors"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div
                role="tablist"
                aria-label="Product image thumbnails"
                className="flex items-center gap-2.5 overflow-x-auto scrollbar-thin py-1 px-0.5"
              >
                {images.map((imgUrl, idx) => {
                  const isSelected = selectedImageIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-label={`Rasm ${idx + 1}`}
                      onClick={() => setSelectedImageIdx(idx)}
                      className={`relative w-16 h-16 sm:w-20 sm:h-20 flex-none aspect-square rounded-xl overflow-hidden border-2 transition-all focus:outline-none ${
                        isSelected
                          ? 'border-[#C89D54] opacity-100 shadow-sm scale-[1.02]'
                          : 'border-gray-200 dark:border-[#28453B] opacity-65 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`${localizedProduct.name} — ${idx + 1}`}
                        className="w-full h-full object-cover block"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Core Purchase Panel */}
          <div className="lg:col-span-6 space-y-4 sm:space-y-5 min-w-0">
            {/* Category Badge Only (Requirement #2: Removed "Taxminan 10–25 kun" badge from product detail page) */}
            {category && localizedCategory && (
              <div>
                <Link to={`/catalog?category=${category.slug}`}>
                  <Badge variant="neutral" size="sm">
                    {localizedCategory.name}
                  </Badge>
                </Link>
              </div>
            )}

            <div className="space-y-1.5">
              <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 leading-snug break-words">
                {localizedProduct.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                {localizedProduct.shortDescription}
              </p>
            </div>

            {/* Requirement #4: Price Block + Exact Remaining Stock Quantity ("Omborda: 19 dona") */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-brand-green">
                    {formatUZS(effectivePrice)}
                  </span>
                  {product.salePrice && (
                    <span className="text-sm text-gray-400 line-through font-medium">
                      {formatUZS(product.price)}
                    </span>
                  )}
                </div>
                {product.salePrice && (
                  <span className="inline-block mt-1 text-xs font-bold text-brand-gold-dark">
                    {t('product.savings')}:{' '}
                    {formatUZS(product.price - product.salePrice)}
                  </span>
                )}
              </div>

              <div>
                {isOutOfStock ? (
                  <Badge variant="danger" size="md">
                    <AlertCircle className="w-3.5 h-3.5 mr-1" />
                    {t('product.outOfStockShort')}
                  </Badge>
                ) : (
                  <Badge variant="success" size="md">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {t('product.stockPrefix')} {product.stock}{' '}
                    {t('product.units')}
                  </Badge>
                )}
              </div>
            </div>

            {/* Requirements #6 & #7: Synchronized Quantity Control + Single Non-Competing Purchase Action */}
            <div ref={purchaseActionsRef} className="pt-1">
              {!isOutOfStock ? (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {/* Unified Quantity Stepper */}
                  <div className="flex items-center justify-between sm:justify-start border border-gray-300 dark:border-[#2F5246] rounded-xl bg-white dark:bg-[#0D1915] px-3 py-1.5 shrink-0">
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 sm:hidden mr-3">
                      {t('product.quantityLabel')}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDecreaseQuantity}
                        disabled={isMinusDisabled}
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#162923] hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-800 dark:text-gray-100 font-bold transition-colors"
                        aria-label={
                          isInCart && quantityInCart === 1
                            ? 'Mahsulotni savatdan olib tashlash / Remove from cart'
                            : 'Miqdorni kamaytirish / Decrease quantity'
                        }
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center text-sm font-extrabold text-gray-900 dark:text-gray-100">
                        {displayedQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={handleIncreaseQuantity}
                        disabled={isPlusDisabled}
                        className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-[#162923] hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-800 dark:text-gray-100 font-bold transition-colors"
                        aria-label="Miqdorni oshirish / Increase quantity"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Single Primary CTA: "Savatga oʻtish" when in cart, or "Savatchaga — [narx]" when not in cart */}
                  {isInCart ? (
                    <Button
                      type="button"
                      variant="gold"
                      size="lg"
                      fullWidth
                      leftIcon={<ShoppingBag className="w-5 h-5" />}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                      onClick={() => navigate('/cart')}
                    >
                      {t('product.goToCartBtn')} ({quantityInCart}{' '}
                      {t('product.units')})
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={
                        <ShoppingBag className="w-5 h-5 text-[#C89D54]" />
                      }
                      onClick={handleAddToCart}
                    >
                      {t('product.addToCart')} —{' '}
                      {formatUZS(effectivePrice * pendingQty)}
                    </Button>
                  )}
                </div>
              ) : (
                <Button variant="outline" size="lg" fullWidth disabled>
                  {t('product.outOfStock')}
                </Button>
              )}
            </div>

            {/* Expandable Accordion Sections */}
            <div className="pt-2 divide-y divide-gray-200 dark:divide-[#28453B] border-t border-b border-gray-200 dark:border-[#28453B]">
              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('description')}
                  aria-expanded={openSection === 'description'}
                  className="w-full py-3.5 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-brand-green shrink-0" />
                    <span>{t('product.tabDescription')}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                      openSection === 'description' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSection === 'description' && (
                  <div className="pb-4 space-y-3.5 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <p className="leading-relaxed break-words">
                      {localizedProduct.description}
                    </p>

                    {localizedProduct.features.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                          {t('product.keyFeatures')}
                        </p>
                        <ul className="space-y-1.5">
                          {localizedProduct.features.map((feat, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"
                            >
                              <Check className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                              <span className="break-words">{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                      <span>
                        {t('product.stockPrefix')}{' '}
                        <strong className="text-gray-800 dark:text-gray-200">
                          {product.stock} {t('product.units')}
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        {t('product.soldCount')}:{' '}
                        <strong className="text-gray-800 dark:text-gray-200">
                          {product.soldCount} {t('product.units')}
                        </strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => toggleAccordion('specs')}
                  aria-expanded={openSection === 'specs'}
                  className="w-full py-3.5 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100"
                >
                  <span className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-brand-green shrink-0" />
                    <span>
                      {t('product.tabSpecs')} (
                      {product.specifications.length + 1})
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                      openSection === 'specs' ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {openSection === 'specs' && (
                  <div className="pb-4">
                    <div className="border border-gray-200 dark:border-[#28453B] rounded-xl overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <tbody className="divide-y divide-gray-200 dark:divide-[#28453B]">
                          <tr className="bg-gray-50 dark:bg-[#162923]">
                            <th className="py-2.5 px-3.5 font-semibold text-gray-600 dark:text-gray-300 w-1/2">
                              SKU
                            </th>
                            <td className="py-2.5 px-3.5 font-mono font-bold text-gray-900 dark:text-gray-100">
                              {product.sku}
                            </td>
                          </tr>
                          {product.specifications.map((spec, idx) => (
                            <tr
                              key={idx}
                              className={
                                idx % 2 === 1
                                  ? 'bg-gray-50 dark:bg-[#162923]'
                                  : 'bg-white dark:bg-[#12211C]'
                              }
                            >
                              <th className="py-2.5 px-3.5 font-semibold text-gray-600 dark:text-gray-300 w-1/2">
                                {spec.label}
                              </th>
                              <td className="py-2.5 px-3.5 font-medium text-gray-900 dark:text-gray-100">
                                {spec.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {showDeliveryBlock && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleAccordion('delivery')}
                    aria-expanded={openSection === 'delivery'}
                    className="w-full py-3.5 flex items-center justify-between gap-3 text-left text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100"
                  >
                    <span className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-brand-green shrink-0" />
                      <span>{t('product.tabDelivery')}</span>
                    </span>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${
                        openSection === 'delivery' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {openSection === 'delivery' && (
                    <div className="pb-4 space-y-3 text-xs text-gray-600 dark:text-gray-300">
                      <p className="leading-relaxed">
                        {storeSettings.delivery.generalDeliveryNote}
                      </p>

                      <div className="space-y-1.5 pt-1">
                        {enabledRegions.map((reg) => (
                          <div
                            key={reg.id}
                            className="p-2.5 rounded-lg bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2"
                          >
                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                              {reg.regionName}
                            </span>
                            <span className="font-extrabold text-brand-green shrink-0">
                              {formatUZS(reg.fee)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-[#28453B] flex flex-wrap items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-brand-green shrink-0" />
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {t('home.acceptedPayments')}:
                        </span>
                        {storeSettings.paymentMethods
                          .filter((pm) => pm.isEnabled)
                          .map((pm) => (
                            <Badge key={pm.id} variant="neutral" size="sm">
                              {pm.name}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {fallbackRelated.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100">
            {t('product.relatedTitle')}
          </h2>

          <div className="zaven-product-grid zaven-product-grid-4">
            {fallbackRelated.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Products Section */}
      {recentlyViewedProducts.length > 0 && (
        <section className="space-y-3 pt-4 border-t border-gray-200 dark:border-[#28453B]">
          <h2 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100">
            {t('product.recentlyViewedTitle')}
          </h2>

          <div className="zaven-product-grid zaven-product-grid-4">
            {recentlyViewedProducts.map((viewedProduct) => (
              <ProductCard key={viewedProduct.id} product={viewedProduct} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Bottom Purchase Bar on Mobile */}
      {showStickyMobileBar && (
        <div
          className="md:hidden fixed bottom-16 left-0 right-0 z-30 bg-white dark:bg-[#12211C] border-t border-gray-200 dark:border-[#28453B] px-4 py-2 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]"
          role="region"
          aria-label={localizedProduct.name}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <img
                src={images[0]}
                alt={localizedProduct.name}
                className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-[#28453B] shrink-0 bg-gray-50"
              />
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                  {localizedProduct.name}
                </p>
                <span className="text-sm font-extrabold text-brand-green block">
                  {formatUZS(effectivePrice)}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {isOutOfStock ? (
                <span className="inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-[#162621] text-gray-400 text-xs font-bold">
                  {t('product.outOfStockShort')}
                </span>
              ) : isInCart ? (
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-brand-green-light dark:bg-[#1A332A] rounded-lg p-0.5 border border-brand-green/30 dark:border-emerald-600/40 h-9">
                    <button
                      type="button"
                      onClick={handleDecreaseQuantity}
                      className="w-7 h-7 rounded-md bg-white dark:bg-[#12211C] text-brand-green flex items-center justify-center font-bold shadow-sm"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold text-brand-green px-2">
                      {quantityInCart}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncreaseQuantity}
                      disabled={quantityInCart >= product.stock}
                      className="w-7 h-7 rounded-md bg-[#0F3D2E] text-white disabled:opacity-40 flex items-center justify-center font-bold shadow-sm"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <Link
                    to="/cart"
                    className="h-9 px-3 rounded-lg bg-[#C89D54] text-[#09261C] font-extrabold text-xs inline-flex items-center justify-center shadow-sm"
                  >
                    {t('product.goToCartBtn')}
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="h-9 px-3.5 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] active:bg-[#09261C] text-white border border-emerald-500/30 font-bold text-xs inline-flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                  <span>{t('product.addToCart')}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      <Modal
        isOpen={isLightboxOpen}
        onClose={() => {
          setIsLightboxOpen(false);
          setIsZoomedInLightbox(false);
        }}
        title={localizedProduct.name}
        maxWidth="2xl"
        footer={
          <div className="w-full flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {selectedImageIdx + 1} / {images.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsLightboxOpen(false);
                setIsZoomedInLightbox(false);
              }}
            >
              {t('product.close')}
            </Button>
          </div>
        }
      >
        <div className="relative rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center max-h-[65vh]">
          <img
            src={currentImage}
            alt={localizedProduct.name}
            onClick={() => setIsZoomedInLightbox((prev) => !prev)}
            className={`max-h-[60vh] w-auto object-contain transition-transform duration-300 ${
              isZoomedInLightbox
                ? 'scale-125 cursor-zoom-out'
                : 'scale-100 cursor-zoom-in'
            }`}
          />
        </div>
      </Modal>
    </div>
  );
};
