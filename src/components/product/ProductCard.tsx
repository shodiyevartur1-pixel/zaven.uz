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

  const handleOpenQuickView = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    recordRecentlyViewed(product.id);
    setIsQuickViewOpen(true);
  };

  return (
    <>
      <article className="group bg-white dark:bg-[#12211C] rounded-xl sm:rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden flex flex-col justify-between h-full transition-all duration-200 hover:border-brand-green/60 dark:hover:border-brand-gold/60 hover:shadow-card-hover">
        <div className="flex-1 flex flex-col">
          {/* Compact Square Image Area for 2-Column Mobile Comparison */}
          <div className="relative aspect-square bg-gray-100 dark:bg-[#1A3028] overflow-hidden shrink-0">
            <Link
              to={`/product/${product.slug}`}
              onClick={() => recordRecentlyViewed(product.id)}
              className="block w-full h-full focus:outline-none"
              title={localizedProduct.name}
            >
              <img
                src={product.images[0]}
                alt={localizedProduct.name}
                loading="lazy"
                className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
                  isOutOfStock ? 'opacity-60 grayscale-[25%]' : ''
                }`}
              />
            </Link>

            {/* Restrained Top-Left Badges */}
            <div className="absolute top-2 left-2 flex flex-wrap items-center gap-1 pointer-events-none max-w-[78%]">
              {discountPercent > 0 && (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-extrabold bg-[#C89D54] text-[#09261C] border border-[#E5C992] shadow-sm">
                  -{discountPercent}%
                </span>
              )}
              {product.isNew ? (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-[#0F3D2E] text-white border border-emerald-500/40 shadow-sm">
                  <Sparkles className="w-2.5 h-2.5 mr-0.5 text-[#C89D54] shrink-0" />
                  {t('product.new')}
                </span>
              ) : product.isPopular && discountPercent === 0 ? (
                <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-sky-950/90 text-sky-200 border border-sky-700/60 shadow-sm">
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

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-x-0 bottom-0 bg-gray-900/90 text-white text-[10px] sm:text-xs font-bold py-1 px-2 text-center">
                {t('product.outOfStockShort')}
              </div>
            )}
          </div>

          {/* Compact Card Body (Title limited to 2 lines, prominent price, small stock label) */}
          <div className="p-2.5 sm:p-4 flex-1 flex flex-col justify-between gap-2">
            <div>
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
                className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-green transition-colors line-clamp-2 min-h-[2.1rem] sm:min-h-[2.4rem] leading-snug"
              >
                {localizedProduct.name}
              </Link>
            </div>

            {/* Price & Compact Stock Row */}
            <div className="pt-1.5 border-t border-gray-100 dark:border-[#28453B]">
              <div className="flex flex-col">
                <span className="text-sm sm:text-base font-extrabold text-brand-green leading-tight">
                  {formatUZS(effectivePrice)}
                </span>
                {product.salePrice ? (
                  <span className="text-[11px] text-gray-400 line-through leading-tight mt-0.5">
                    {formatUZS(product.price)}
                  </span>
                ) : (
                  <span className="text-[11px] text-transparent select-none leading-tight mt-0.5">
                    &nbsp;
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center justify-between text-[10px] sm:text-[11px]">
                {isOutOfStock ? (
                  <span className="text-red-600 dark:text-red-400 font-semibold truncate">
                    {t('product.outOfStockShort')}
                  </span>
                ) : isLowStock ? (
                  <span className="text-amber-700 dark:text-amber-300 font-semibold truncate">
                    {t('product.lowStock')}: {product.stock}{' '}
                    {t('product.units')}
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
        <div className="px-2.5 pb-2.5 sm:px-4 sm:pb-4">
          {isOutOfStock ? (
            <button
              type="button"
              disabled
              className="w-full h-9 sm:h-10 rounded-lg border border-gray-200 dark:border-[#28453B] bg-gray-100 dark:bg-[#162621] text-gray-400 text-xs font-bold cursor-not-allowed"
            >
              {t('product.outOfStockShort')}
            </button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center justify-between bg-brand-green-light dark:bg-[#1A332A] rounded-lg p-0.5 border border-brand-green/25 dark:border-emerald-600/40 h-9 sm:h-10">
              <button
                type="button"
                onClick={() =>
                  updateCartQuantity(product.id, quantityInCart - 1)
                }
                className="w-8 h-8 rounded-md bg-white dark:bg-[#12211C] text-brand-green hover:bg-gray-50 flex items-center justify-center font-bold shadow-sm transition-colors shrink-0"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-extrabold text-brand-green px-1 truncate">
                {quantityInCart} {t('product.units')}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateCartQuantity(product.id, quantityInCart + 1)
                }
                disabled={quantityInCart >= product.stock}
                className="w-8 h-8 rounded-md bg-[#0F3D2E] text-white hover:bg-[#16533F] disabled:opacity-40 flex items-center justify-center font-bold shadow-sm transition-colors shrink-0"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => addToCart(product.id, 1)}
              className="w-full h-9 sm:h-10 px-2.5 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] active:bg-[#09261C] text-white border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
              <span className="truncate">{t('product.addToCart')}</span>
            </button>
          )}
        </div>
      </article>

      {/* Quick View Modal (Preserves full description, SKU, savings, and feature list) */}
      <Modal
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
        title={t('product.quickViewTitle')}
        maxWidth="xl"
        footer={
          <div className="w-full flex flex-wrap items-center justify-between gap-3">
            <Link
              to={`/product/${product.slug}`}
              onClick={() => setIsQuickViewOpen(false)}
              className="text-sm font-bold text-brand-green hover:underline"
            >
              {t('product.goToFullPage')}
            </Link>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsQuickViewOpen(false)}
              >
                {t('product.close')}
              </Button>
              {!isOutOfStock && (
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={<ShoppingBag className="w-4 h-4" />}
                  onClick={() => {
                    addToCart(product.id, 1);
                    setIsQuickViewOpen(false);
                  }}
                >
                  {t('product.addToCart')}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-[#1A3028] border border-gray-200 dark:border-[#28453B] aspect-square">
            <img
              src={product.images[0]}
              alt={localizedProduct.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {localizedCategory && (
                <Badge variant="neutral">{localizedCategory.name}</Badge>
              )}
              <span className="text-xs text-gray-500">SKU: {product.sku}</span>
            </div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {localizedProduct.name}
            </h4>
            <div className="flex items-baseline gap-2.5">
              <span className="text-xl font-extrabold text-brand-green">
                {formatUZS(effectivePrice)}
              </span>
              {product.salePrice && (
                <span className="text-sm text-gray-400 line-through">
                  {formatUZS(product.price)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {localizedProduct.description}
            </p>
            {localizedProduct.features.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-1.5">
                  {t('product.keyFeatures')}
                </p>
                <ul className="space-y-1">
                  {localizedProduct.features.map((feat, idx) => (
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
        </div>
      </Modal>
    </>
  );
};
