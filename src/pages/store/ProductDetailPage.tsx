import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Check,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
  Truck,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Share2,
  ArrowLeft,
  Sparkles,
  Flame,
  Info,
  CreditCard,
  Clock,
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
    recentlyViewedIds,
    storeSettings,
    addToCart,
    updateCartQuantity,
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
  const [selectedQty, setSelectedQty] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<
    'description' | 'specs' | 'delivery'
  >('description');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setSelectedImageIdx(0);
    setSelectedQty(1);
    setIsZoomedInLightbox(false);

    if (product) {
      recordRecentlyViewed(product.id);
      const loc = getProductText(product);
      document.title = `${loc.name} — ${storeSettings.storeName}`;
    } else {
      document.title = storeSettings.seoTitle;
    }
  }, [product?.id, slug]);

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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

  const effectivePrice = product.salePrice ?? product.price;
  const discountPercent = calculateDiscountPercent(
    product.price,
    product.salePrice
  );
  const isOutOfStock =
    product.status === 'out_of_stock' || product.stock <= 0;
  const isLowStock =
    !isOutOfStock && product.stock <= product.lowStockThreshold;

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

  const handleAddSelectedQuantity = () => {
    if (isOutOfStock) return;
    addToCart(product.id, selectedQty);
  };

  const handleBuyNow = () => {
    if (isOutOfStock) return;
    if (quantityInCart === 0) {
      addToCart(product.id, selectedQty);
    }
    navigate('/cart');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-12">
      {/* Breadcrumb Navigation & Back Link */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500"
        >
          <Link to="/" className="hover:text-brand-green font-medium">
            {t('nav.home')}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <Link to="/catalog" className="hover:text-brand-green font-medium">
            {t('nav.catalog')}
          </Link>
          {category && localizedCategory && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <Link
                to={`/catalog?category=${category.slug}`}
                className="hover:text-brand-green font-medium"
              >
                {localizedCategory.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="font-bold text-gray-900 line-clamp-1 max-w-[220px] sm:max-w-xs">
            {localizedProduct.name}
          </span>
        </nav>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-green hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{t('product.back')}</span>
        </button>
      </div>

      {/* Main Product Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8 shadow-card">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          {/* Left Column: Multi-Image Gallery */}
          <div className="lg:col-span-6 space-y-4">
            <div className="relative aspect-square rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden group">
              <img
                src={currentImage}
                alt={`${localizedProduct.name} — ${selectedImageIdx + 1}`}
                onClick={() => setIsLightboxOpen(true)}
                className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
              />

              <div className="absolute top-3.5 left-3.5 flex flex-col items-start gap-1.5 pointer-events-none">
                {discountPercent > 0 && (
                  <Badge variant="gold" size="md">
                    -{discountPercent}%
                  </Badge>
                )}
                {product.isNew && (
                  <Badge variant="green" size="md">
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    {t('product.new')}
                  </Badge>
                )}
                {product.isPopular && (
                  <Badge variant="info" size="md">
                    <Flame className="w-3.5 h-3.5 mr-1" />
                    {t('product.popular')}
                  </Badge>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsLightboxOpen(true)}
                className="absolute top-3.5 right-3.5 px-3 py-1.5 rounded-lg bg-white/95 hover:bg-brand-green text-gray-800 hover:text-white border border-gray-200 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">{t('product.zoom')}</span>
              </button>

              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-brand-green text-gray-800 hover:text-white border border-gray-200 flex items-center justify-center shadow-md transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-brand-green text-gray-800 hover:text-white border border-gray-200 flex items-center justify-center shadow-md transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin pb-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImageIdx === idx
                        ? 'border-brand-green ring-2 ring-brand-gold/50'
                        : 'border-gray-200 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${localizedProduct.name} ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Details */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2.5">
                  {category && localizedCategory && (
                    <Link to={`/catalog?category=${category.slug}`}>
                      <Badge variant="neutral" size="md">
                        {localizedCategory.name}
                      </Badge>
                    </Link>
                  )}
                  <span className="text-xs font-mono text-gray-500">
                    SKU: <strong className="text-gray-800">{product.sku}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleShareProduct}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-brand-green transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t('product.share')}</span>
                </button>
              </div>

              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 leading-snug">
                  {localizedProduct.name}
                </h1>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                  {localizedProduct.shortDescription}
                </p>
              </div>

              {/* Availability Status Badge */}
              <div className="flex flex-wrap items-center gap-3">
                {isOutOfStock ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{t('product.outOfStock')}</span>
                  </div>
                ) : isLowStock ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                    <span>
                      {t('product.lowStock')}: {product.stock}{' '}
                      {t('product.units')}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      {t('product.inStock')} ({product.stock}{' '}
                      {t('product.units')})
                    </span>
                  </div>
                )}

                <span className="text-xs text-gray-500">
                  {t('product.soldCount')}:{' '}
                  <strong className="text-gray-800">
                    {product.soldCount} {t('product.units')}
                  </strong>
                </span>
              </div>

              {/* Pricing Card */}
              <div className="p-4 sm:p-5 rounded-xl bg-surface-page border border-gray-200 space-y-2">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="text-2xl sm:text-3xl font-extrabold text-brand-green">
                    {formatUZS(effectivePrice)}
                  </span>
                  {product.salePrice && (
                    <>
                      <span className="text-base text-gray-400 line-through font-medium">
                        {formatUZS(product.price)}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-brand-gold-light text-brand-gold-dark border border-brand-gold-border text-xs font-bold">
                        {t('product.savings')}:{' '}
                        {formatUZS(product.price - product.salePrice)}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {t('product.priceTaxNote')}
                </p>
              </div>

              {/* Key Features List */}
              {localizedProduct.features.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                    {t('product.keyFeatures')}
                  </h2>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {localizedProduct.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-xs sm:text-sm text-gray-700 bg-white p-2.5 rounded-lg border border-gray-200/80"
                      >
                        <Check className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Quantity Selector & Add-to-Cart */}
              <div className="pt-2 space-y-3">
                {!isOutOfStock ? (
                  <>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="flex items-center justify-between sm:justify-start border border-gray-300 rounded-xl bg-white px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedQty((prev) => Math.max(1, prev - 1))
                            }
                            disabled={selectedQty <= 1}
                            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-800 font-bold"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-10 text-center text-sm font-extrabold text-gray-900">
                            {selectedQty}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedQty((prev) =>
                                Math.min(product.stock, prev + 1)
                              )
                            }
                            disabled={selectedQty >= product.stock}
                            className="w-9 h-9 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center text-gray-800 font-bold"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        leftIcon={<ShoppingBag className="w-5 h-5" />}
                        onClick={handleAddSelectedQuantity}
                      >
                        {t('product.addToCart')} —{' '}
                        {formatUZS(effectivePrice * selectedQty)}
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <Button
                        variant="gold"
                        size="md"
                        fullWidth
                        onClick={handleBuyNow}
                      >
                        {t('product.buyNow')}
                      </Button>

                      {quantityInCart > 0 && (
                        <div className="flex items-center justify-between sm:justify-end gap-2 px-3.5 py-2 rounded-lg bg-brand-green-light text-brand-green text-xs font-bold shrink-0">
                          <span>
                            {t('product.inCart')}: {quantityInCart}{' '}
                            {t('product.units')}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  product.id,
                                  quantityInCart - 1
                                )
                              }
                              className="w-6 h-6 rounded bg-white border border-brand-green/20 flex items-center justify-center"
                            >
                              -
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  product.id,
                                  quantityInCart + 1
                                )
                              }
                              disabled={quantityInCart >= product.stock}
                              className="w-6 h-6 rounded bg-brand-green text-white disabled:opacity-40 flex items-center justify-center"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-gray-100 border border-gray-200 text-center">
                    <p className="text-sm font-bold text-gray-800">
                      {t('product.outOfStock')}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Phase 5: Clear Delivery Estimate ("Taxminan 10–25 kun") + Configurable Regional Tariffs */}
            {showDeliveryBlock && (
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-900 uppercase tracking-wider">
                    <Truck className="w-4 h-4 text-brand-green" />
                    <span>{t('product.deliveryRulesTitle')}</span>
                  </div>
                  <Badge variant="gold" size="md">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {t('delivery.estimateValue')}
                  </Badge>
                </div>

                {/* Clear Non-Guaranteed Delivery Estimate Callout */}
                <div className="p-3.5 rounded-xl bg-brand-green-light/60 border border-brand-green/20 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gray-800">
                      {t('delivery.estimateLabel')}
                    </span>
                    <strong className="text-brand-green font-extrabold text-sm">
                      {t('delivery.estimateValue')}
                    </strong>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {t('delivery.estimateDisclaimer')}
                  </p>
                </div>

                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                  <span>{storeSettings.delivery.generalDeliveryNote}</span>
                </p>

                {enabledRegions.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {enabledRegions.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-2.5 rounded-lg border border-gray-200 bg-white text-xs"
                      >
                        <p className="font-bold text-gray-900 flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-brand-gold-dark shrink-0" />
                          <span className="truncate">{reg.regionName}</span>
                        </p>
                        <p className="font-extrabold text-brand-green mt-1">
                          {formatUZS(reg.fee)}
                        </p>
                        {reg.freeDeliveryThreshold && (
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            {formatUZS(reg.freeDeliveryThreshold)}{' '}
                            {t('home.freeFrom')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Description, Technical Specifications & Delivery Tabs */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
        <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-8 flex items-center gap-2 overflow-x-auto scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveTab('description')}
            className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'description'
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('product.tabDescription')}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'specs'
                ? 'border-brand-green text-brand-green'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('product.tabSpecs')} ({product.specifications.length})
          </button>

          {showDeliveryBlock && (
            <button
              type="button"
              onClick={() => setActiveTab('delivery')}
              className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'delivery'
                  ? 'border-brand-green text-brand-green'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {t('product.tabDelivery')}
            </button>
          )}
        </div>

        <div className="p-6 sm:p-8">
          {activeTab === 'description' && (
            <div className="max-w-3xl space-y-6">
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {localizedProduct.description}
              </p>

              {localizedProduct.features.length > 0 && (
                <ul className="space-y-2.5">
                  {localizedProduct.features.map((feat, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-gray-700"
                    >
                      <div className="w-5 h-5 rounded-full bg-brand-green-light text-brand-green flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="max-w-2xl">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm text-left">
                  <tbody className="divide-y divide-gray-200">
                    <tr className="bg-gray-50">
                      <th className="py-3 px-4 font-semibold text-gray-600 w-1/2">
                        SKU
                      </th>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {product.sku}
                      </td>
                    </tr>
                    {product.specifications.map((spec, idx) => (
                      <tr
                        key={idx}
                        className={idx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <th className="py-3 px-4 font-semibold text-gray-600 w-1/2">
                          {spec.label}
                        </th>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {spec.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && showDeliveryBlock && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-brand-green" />
                    <span>{t('home.regionalTariffs')}</span>
                  </h3>
                  <Badge variant="gold" size="sm">
                    {t('delivery.estimateValue')}
                  </Badge>
                </div>

                <div className="p-3 rounded-xl bg-brand-green-light/60 border border-brand-green/20 text-xs">
                  <p className="font-bold text-brand-green">
                    {t('delivery.estimateLabel')} {t('delivery.estimateValue')}
                  </p>
                  <p className="text-gray-600 mt-1">
                    {t('delivery.estimateDisclaimer')}
                  </p>
                </div>

                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  {storeSettings.delivery.generalDeliveryNote}
                </p>
                <div className="space-y-2 pt-1">
                  {enabledRegions.map((reg) => (
                    <div
                      key={reg.id}
                      className="p-3 rounded-lg bg-surface-page border border-gray-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-bold text-gray-900">
                          {reg.regionName}
                        </p>
                        <p className="text-gray-500 mt-0.5">{reg.note}</p>
                      </div>
                      <span className="font-extrabold text-brand-green shrink-0 ml-3">
                        {formatUZS(reg.fee)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-green" />
                  <span>{t('home.acceptedPayments')}</span>
                </h3>
                <div className="space-y-2">
                  {storeSettings.paymentMethods
                    .filter((pm) => pm.isEnabled)
                    .map((pm) => (
                      <div
                        key={pm.id}
                        className="p-3 rounded-lg bg-surface-page border border-gray-200 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-900">
                            {pm.name}
                          </span>
                          {pm.isDemoMode && (
                            <Badge variant="warning" size="sm">
                              Demo
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-600 mt-1">{pm.description}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Related Products Section */}
      {fallbackRelated.length > 0 && (
        <section className="space-y-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {t('product.relatedTitle')}
            </h2>
            <p className="text-sm text-gray-600">{t('product.relatedSub')}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {fallbackRelated.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </section>
      )}

      {/* Recently Viewed Products Section */}
      {recentlyViewedProducts.length > 0 && (
        <section className="space-y-5 pt-4 border-t border-gray-200">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-gray-900">
              {t('product.recentlyViewedTitle')}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600">
              {t('product.recentlyViewedSub')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {recentlyViewedProducts.map((viewedProduct) => (
              <ProductCard key={viewedProduct.id} product={viewedProduct} />
            ))}
          </div>
        </section>
      )}

      {/* Enlarged Image / Zoom Lightbox Modal */}
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
        <div className="space-y-4">
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
        </div>
      </Modal>
    </div>
  );
};