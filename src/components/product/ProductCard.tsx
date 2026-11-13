import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Eye,
  Check,
  Sparkles,
  Flame,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUZS, calculateDiscountPercent } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export interface ProductCardProps {
  product: Product;
  showCategoryName?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showCategoryName = true,
}) => {
  const {
    categories,
    cart,
    addToCart,
    updateCartQuantity,
    recordRecentlyViewed,
  } = useStore();
  const { t, getProductText, getCategoryText } = useThemeLanguage();

  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [quickViewImgIdx, setQuickViewImgIdx] = useState(0);

  const category = categories.find((c) => c.id === product.categoryId);
  const localizedProduct = getProductText(product);
  const localizedCategory = category ? getCategoryText(category) : null;

  const cartItem = cart.find((item) => item.productId === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const discountPercent = calculateDiscountPercent(
    product.price,
    product.salePrice
  );
  const effectivePrice = product.salePrice ?? product.price;
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

  const handleOpenQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    recordRecentlyViewed(product.id);
    setQuickViewImgIdx(0);
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <article className="min-w-0 w-full group bg-white dark:bg-[#12211C] rounded-xl sm:rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden flex flex-col justify-between h-full transition-all duration-200 hover:border-brand-green/60 dark:hover:border-brand-gold/60 hover:shadow-card-hover">
        <div className="flex-1 flex flex-col min-w-0">
          {/* Square Image Container */}
          <div className="relative aspect-square bg-gray-100 dark:bg-[#1A3028] overflow-hidden shrink-0">
            <Link
              to={`/product/${product.slug}`}
              onClick={() => recordRecentlyViewed(product.id)}
              className="block w-full h-full focus:outline-none"
              title={localizedProduct.name}
            >
              <img
                src={images[0]}
                alt={localizedProduct.name}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  isOutOfStock ? 'opacity-60 grayscale-[25%]' : ''
                }`}
              />
            </Link>

            {/* Restrained Top-Left Badges */}
            <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1 pointer-events-none max-w-[75%]">
              {discountPercent > 0 && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-extrabold bg-[#C89D54] text-[#09261C] border border-[#E5C992] shadow-sm">
                  -{discountPercent}%
                </span>
              )}
              {product.isNew ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-[#0F3D2E] text-white border border-emerald-500/40 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5 text-[#C89D54] shrink-0" />
                  {t('product.new')}
                </span>
              ) : product.isPopular && discountPercent === 0 ? (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-sky-950/90 text-sky-200 border border-sky-700/60 shadow-sm">
                  <Flame className="w-2.5 h-2.5 mr-0.5 shrink-0" />
                  {t('product.popular')}
                </span>
              ) : null}
            </div>

            {/* Quick View Action Button */}
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="absolute top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/95 dark:bg-[#12211C]/95 hover:bg-[#0F3D2E] text-gray-800 dark:text-gray-100 hover:text-white border border-gray-200 dark:border-[#2F5246] flex items-center justify-center shadow-sm transition-colors"
              title={t('product.quickView')}
              aria-label={`${localizedProduct.name} — ${t('product.quickView')}`}
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {isOutOfStock && (
              <div className="absolute inset-x-0 bottom-0 bg-gray-900/90 text-white text-[10px] sm:text-xs font-bold py-1 px-2 text-center truncate">
                {t('product.outOfStockShort')}
              </div>
            )}
          </div>

          {/* Compact Card Body */}
          <div className="p-2.5 sm:p-3.5 flex-1 flex flex-col justify-between gap-1.5 min-w-0">
            <div className="min-w-0">
              {showCategoryName && category && localizedCategory && (
                <Link
                  to={`/catalog?category=${category.slug}`}
                  className="block text-[10px] sm:text-[11px] font-semibold text-brand-green hover:underline truncate mb-0.5"
                  title={localizedCategory.name}
                >
                  {localizedCategory.name}
                </Link>
              )}

              <Link
                to={`/product/${product.slug}`}
                onClick={() => recordRecentlyViewed(product.id)}
                title={localizedProduct.name}
                className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-green transition-colors line-clamp-2 min-h-[2.1rem] sm:min-h-[2.4rem] leading-snug break-words"
              >
                {localizedProduct.name}
              </Link>
            </div>

            {/* Price & Compact Stock Row */}
            <div className="pt-1.5 border-t border-gray-100 dark:border-[#28453B] min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-xs sm:text-base font-extrabold text-brand-green leading-tight truncate">
                  {formatUZS(effectivePrice)}
                </span>
                {product.salePrice ? (
                  <span className="text-[10px] sm:text-[11px] text-gray-400 line-through leading-tight mt-0.5 truncate">
                    {formatUZS(product.price)}
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-[11px] text-transparent select-none leading-tight mt-0.5">
                    &nbsp;
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px] min-w-0">
                {isOutOfStock ? (
                  <span className="text-red-600 dark:text-red-400 font-semibold truncate">
                    {t('product.outOfStockShort')}
                  </span>
                ) : isLowStock ? (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold truncate">
                    {t('product.lowStock')}: {product.stock}
                  </span>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-300 font-medium truncate">
                    {t('product.inStock')} ({product.stock})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Consistent Compact Cart Action Area */}
        <div className="px-2.5 pb-2.5 sm:px-3.5 sm:pb-3.5">
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="w-full h-9 rounded-lg border border-gray-200 dark:border-[#28453B] bg-gray-100 dark:bg-[#162621] text-gray-400 text-[11px] sm:text-xs font-bold cursor-not-allowed truncate px-2"
            >
              {t('product.outOfStockShort')}
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center justify-between bg-brand-green-light dark:bg-[#1A332A] rounded-lg p-0.5 border border-brand-green/25 dark:border-emerald-600/40 h-9">
              <button
                type="button"
                onClick={() =>
                  updateCartQuantity(product.id, quantityInCart - 1)
                }
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-white dark:bg-[#12211C] text-brand-green hover:bg-gray-50 flex items-center justify-center font-bold shadow-sm transition-colors shrink-0"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] sm:text-xs font-extrabold text-brand-green px-1 truncate">
                {quantityInCart} {t('product.units')}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateCartQuantity(product.id, quantityInCart + 1)
                }
                disabled={quantityInCart >= product.stock}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-md bg-[#0F3D2E] text-white hover:bg-[#16533F] disabled:opacity-40 flex items-center justify-center font-bold shadow-sm transition-colors shrink-0"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToCart(product.id, 1)}
              className="w-full h-9 px-2 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] active:bg-[#09261C] text-white border border-emerald-500/30 font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1 shadow-sm transition-colors min-w-0"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
              <span className="truncate">{t('product.addToCart')}</span>
            </button>
          )}
        </div>
      </article>

      {/* Requirement 3: Streamlined Quick View Dialog with Multi-Image Gallery, Short Summary, 3 Features & 2 Clear Actions */}
      <Modal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        title={t('product.quickViewTitle')}
        maxWidth="xl"
        footer={
          <div className="w-full flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <Link
              to={`/product/${product.slug}`}
              onClick={() => setIsQuickViewOpen(false)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 dark:border-[#2F5246] text-xs font-bold text-gray-800 dark:text-gray-100 hover:border-brand-green"
            >
              <span>{t('product.goToFullPage')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>

            {!isOutOfStock ? (
              <Button
                variant="primary"
                size="md"
                leftIcon={<ShoppingBag className="w-4 h-4 text-[#C89D54]" />}
                onClick={() => {
                  addToCart(product.id, 1);
                  setIsQuickViewOpen(false);
                }}
              >
                {t('product.addToCart')} — {formatUZS(effectivePrice)}
              </Button>
            ) : (
              <Button variant="outline" size="md" disabled>
                {t('product.outOfStock')}
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6">
          {/* Left: Product Image + Thumbnail Strip */}
          <div className="sm:col-span-5 space-y-2.5">
            <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-[#1A3028] border border-gray-200 dark:border-[#28453B] aspect-square">
              <img
                src={images[quickViewImgIdx] || images[0]}
                alt={localizedProduct.name}
                className="w-full h-full object-cover"
              />
              {discountPercent > 0 && (
                <div className="absolute top-2.5 left-2.5">
                  <Badge variant="gold" size="sm">
                    -{discountPercent}%
                  </Badge>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                {images.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setQuickViewImgIdx(idx)}
                    className={`w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      quickViewImgIdx === idx
                        ? 'border-brand-green ring-1 ring-brand-gold'
                        : 'border-gray-200 opacity-70 hover:opacity-100'
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

          {/* Right: Essential Product Info (Category, Title, Price, Short Summary, Up to 3 Features, Stock & Delivery Estimate) */}
          <div className="sm:col-span-7 flex flex-col justify-between space-y-3">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {localizedCategory && (
                  <Badge variant="neutral" size="sm">
                    {localizedCategory.name}
                  </Badge>
                )}
                {isOutOfStock ? (
                  <Badge variant="danger" size="sm">
                    {t('product.outOfStockShort')}
                  </Badge>
                ) : (
                  <Badge variant="success" size="sm">
                    {t('product.inStock')} ({product.stock}{' '}
                    {t('product.units')})
                  </Badge>
                )}
              </div>

              <h4 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100 leading-snug">
                {localizedProduct.name}
              </h4>

              <div className="flex flex-wrap items-baseline gap-2.5">
                <span className="text-xl font-extrabold text-brand-green">
                  {formatUZS(effectivePrice)}
                </span>
                {product.salePrice && (
                  <span className="text-xs text-gray-400 line-through">
                    {formatUZS(product.price)}
                  </span>
                )}
              </div>

              {/* Short Summary */}
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                {localizedProduct.shortDescription}
              </p>

              {/* Up to 3 Key Features */}
              {localizedProduct.features.length > 0 && (
                <div className="pt-1">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                    {t('product.keyFeatures')}
                  </p>
                  <ul className="space-y-1">
                    {localizedProduct.features.slice(0, 3).map((feat, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-gray-700 dark:text-gray-300 flex items-start gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5 text-brand-green shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Delivery Estimate Strip */}
            <div className="p-2.5 rounded-xl bg-brand-green-light/60 border border-brand-green/20 flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-brand-green shrink-0" />
                <span>{t('delivery.estimateLabel')}</span>
              </span>
              <strong className="font-extrabold text-brand-green shrink-0">
                {t('delivery.estimateValue')}
              </strong>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};
