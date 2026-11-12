import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Eye,
  Check,
  AlertCircle,
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
      <article className="group bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col justify-between h-full transition-all duration-200 hover:border-brand-green/60 hover:shadow-card-hover">
        <div className="flex-1 flex flex-col">
          {/* Product Image & Restrained Badges */}
          <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden shrink-0">
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

            {/* Top-left Restrained Badges */}
            <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5 pointer-events-none max-w-[75%]">
              {discountPercent > 0 && (
                <Badge variant="gold" size="sm" className="shadow-sm">
                  -{discountPercent}%
                </Badge>
              )}
              {product.isNew ? (
                <Badge variant="green" size="sm" className="shadow-sm">
                  <Sparkles className="w-3 h-3 mr-1" />
                  {t('product.new')}
                </Badge>
              ) : product.isPopular ? (
                <Badge variant="info" size="sm" className="shadow-sm">
                  <Flame className="w-3 h-3 mr-1" />
                  {t('product.popular')}
                </Badge>
              ) : null}
            </div>

            {/* Quick View Action Button */}
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="absolute top-3 right-3 w-9 h-9 rounded-xl bg-white/95 hover:bg-brand-green text-gray-700 hover:text-white border border-gray-200 flex items-center justify-center shadow-sm transition-colors"
              title={t('product.quickView')}
              aria-label={`${localizedProduct.name} — ${t('product.quickView')}`}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Out of Stock Overlay */}
            {isOutOfStock && (
              <div className="absolute inset-x-0 bottom-0 bg-gray-900/85 text-white text-xs font-semibold py-1.5 px-3 text-center">
                {t('product.outOfStock')}
              </div>
            )}
          </div>

          {/* Card Body Content */}
          <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              {/* Category & SKU Meta Row */}
              <div className="flex items-center justify-between gap-2 text-xs">
                {showCategoryName && category && localizedCategory ? (
                  <Link
                    to={`/catalog?category=${category.slug}`}
                    className="font-semibold text-brand-green hover:underline truncate"
                    title={localizedCategory.name}
                  >
                    {localizedCategory.name}
                  </Link>
                ) : (
                  <span className="text-gray-500">ZAVEN</span>
                )}
                <span className="text-[11px] font-mono text-gray-400 shrink-0">
                  {product.sku}
                </span>
              </div>

              {/* Product Title with Full Accessible Tooltip */}
              <Link
                to={`/product/${product.slug}`}
                onClick={() => recordRecentlyViewed(product.id)}
                title={localizedProduct.name}
                className="block text-sm sm:text-[15px] font-bold text-gray-900 group-hover:text-brand-green transition-colors line-clamp-2 min-h-[2.6rem] leading-snug"
              >
                {localizedProduct.name}
              </Link>

              <p
                className="text-xs text-gray-500 line-clamp-2 leading-relaxed"
                title={localizedProduct.shortDescription}
              >
                {localizedProduct.shortDescription}
              </p>
            </div>

            {/* Price, Savings & Stock Status Block */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <div>
                  <div className="text-lg font-extrabold text-brand-green leading-none">
                    {formatUZS(effectivePrice)}
                  </div>
                  {product.salePrice && (
                    <div className="text-xs text-gray-400 line-through mt-1">
                      {formatUZS(product.price)}
                    </div>
                  )}
                </div>

                {product.salePrice && (
                  <span className="text-[11px] font-bold text-brand-gold-dark bg-brand-gold-light px-2 py-0.5 rounded-md border border-brand-gold-border shrink-0">
                    {t('product.savings')}:{' '}
                    {formatUZS(product.price - product.salePrice)}
                  </span>
                )}
              </div>

              {/* Restrained Stock Indicator */}
              <div className="flex items-center justify-between text-[11px]">
                {isOutOfStock ? (
                  <span className="text-red-600 font-semibold">
                    {t('product.outOfStockShort')}
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    {t('product.lowStock')}: {product.stock}{' '}
                    {t('product.units')}
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">
                    {t('product.inStock')} ({product.stock} {t('product.units')})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Cart Action Area */}
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-1">
          {isOutOfStock ? (
            <Button variant="outline" size="md" fullWidth disabled>
              {t('product.outOfStock')}
            </Button>
          ) : quantityInCart > 0 ? (
            <div className="flex items-center justify-between bg-brand-green-light rounded-xl p-1 border border-brand-green/25 min-h-[42px]">
              <button
                type="button"
                onClick={() =>
                  updateCartQuantity(product.id, quantityInCart - 1)
                }
                className="w-9 h-9 rounded-lg bg-white text-brand-green hover:bg-gray-50 flex items-center justify-center font-bold shadow-sm transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-brand-green px-2">
                {t('product.inCart')}: {quantityInCart} {t('product.units')}
              </span>
              <button
                type="button"
                onClick={() =>
                  updateCartQuantity(product.id, quantityInCart + 1)
                }
                disabled={quantityInCart >= product.stock}
                className="w-9 h-9 rounded-lg bg-brand-green text-white hover:bg-brand-green-hover disabled:opacity-40 flex items-center justify-center font-bold shadow-sm transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              onClick={() => addToCart(product.id, 1)}
            >
              {t('product.addToCart')}
            </Button>
          )}
        </div>
      </article>

      {/* Quick View Modal */}
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
          <div className="rounded-xl overflow-hidden bg-gray-100 border border-gray-200 aspect-square">
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
            <h4 className="text-lg font-bold text-gray-900">
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
            <p className="text-xs text-gray-600 leading-relaxed">
              {localizedProduct.description}
            </p>
            {localizedProduct.features.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-800 mb-1.5">
                  {t('product.keyFeatures')}
                </p>
                <ul className="space-y-1">
                  {localizedProduct.features.map((feat, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-gray-700 flex items-start gap-1.5"
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