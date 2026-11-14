import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  Minus,
  Heart,
  Sparkles,
  Flame,
} from 'lucide-react';
import { Product } from '../../types';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUZS, calculateDiscountPercent } from '../../utils/format';

export interface ProductCardProps {
  product: Product;
  showCategoryName?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showCategoryName = true,
}) => {
  const navigate = useNavigate();
  const {
    categories,
    cart,
    favoriteIds,
    addToCart,
    updateCartQuantity,
    toggleFavorite,
    recordRecentlyViewed,
  } = useStore();
  const { t, getProductText, getCategoryText } = useThemeLanguage();

  const category = categories.find((c) => c.id === product.categoryId);
  const localizedProduct = getProductText(product);
  const localizedCategory = category ? getCategoryText(category) : null;

  const cartItem = cart.find((item) => item.productId === product.id);
  const quantityInCart = cartItem ? cartItem.quantity : 0;
  const isFavorited = favoriteIds.includes(product.id);

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

  const handleToggleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(product.id);
  };

  const handleNavigateToProduct = () => {
    recordRecentlyViewed(product.id);
    navigate(`/product/${product.slug}`);
  };

  return (
    <article className="min-w-0 w-full group bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden flex flex-col justify-between h-full shadow-sm transition-all duration-200 hover:border-brand-green/60 dark:hover:border-brand-gold/60 hover:shadow-card-hover">
      <div className="flex-1 flex flex-col min-w-0">
        {/* 1:1 Square Image Container */}
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

          {/* Requirements #3 & #5: Top-Left Badges with guaranteed right clearance (right-12 pr-1.5) so they never touch or overlap the heart button */}
          <div className="absolute top-2 left-2 right-12 pr-1.5 flex flex-wrap items-center gap-1 pointer-events-none z-10">
            {discountPercent > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-extrabold bg-[#C89D54] text-[#09261C] border border-[#F3D79B] shadow-md">
                -{discountPercent}%
              </span>
            )}
            {product.isNew ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-extrabold bg-[#0F3D2E] text-white border border-emerald-400/50 shadow-md">
                <Sparkles className="w-2.5 h-2.5 mr-1 text-[#C89D54] shrink-0" />
                <span className="truncate">{t('product.new')}</span>
              </span>
            ) : product.isPopular && discountPercent === 0 ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-extrabold bg-[#09261C] text-[#F3D79B] border border-[#C89D54] shadow-md">
                <Flame className="w-2.5 h-2.5 mr-1 text-[#C89D54] shrink-0" />
                <span className="truncate">{t('product.popular')}</span>
              </span>
            ) : null}
          </div>

          {/* Requirement #5: Accessible Heart Favorite Button with clear space from badges */}
          <button
            type="button"
            onClick={handleToggleFavoriteClick}
            aria-pressed={isFavorited}
            aria-label={`${localizedProduct.name} — ${
              isFavorited
                ? t('favorites.removeAria')
                : t('favorites.addAria')
            }`}
            title={
              isFavorited
                ? t('favorites.removeAria')
                : t('favorites.addAria')
            }
            className={`absolute top-2 right-2 z-20 w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shadow-md transition-all active:scale-95 ${
              isFavorited
                ? 'bg-rose-50 dark:bg-rose-950 border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400'
                : 'bg-white/95 dark:bg-[#12211C]/95 hover:bg-white border-gray-200 dark:border-[#2F5246] text-gray-700 dark:text-gray-200 hover:text-rose-600'
            }`}
          >
            <Heart
              className={`w-4 h-4 transition-transform ${
                isFavorited ? 'fill-current scale-110' : ''
              }`}
            />
          </button>

          {isOutOfStock && (
            <div className="absolute inset-x-0 bottom-0 bg-gray-900/90 text-white text-[10px] sm:text-xs font-bold py-1 px-2 text-center truncate pointer-events-none">
              {t('product.outOfStockShort')}
            </div>
          )}
        </div>

        {/* Tappable Card Body */}
        <div
          onClick={handleNavigateToProduct}
          className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2 min-w-0 cursor-pointer"
        >
          <div className="min-w-0">
            {showCategoryName && category && localizedCategory && (
              <Link
                to={`/catalog?category=${category.slug}`}
                onClick={(e) => e.stopPropagation()}
                className="block text-[10px] sm:text-[11px] font-semibold text-brand-green hover:underline truncate mb-0.5"
                title={localizedCategory.name}
              >
                {localizedCategory.name}
              </Link>
            )}

            <Link
              to={`/product/${product.slug}`}
              onClick={(e) => {
                e.stopPropagation();
                recordRecentlyViewed(product.id);
              }}
              title={localizedProduct.name}
              className="block text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-brand-green transition-colors line-clamp-2 min-h-[2.2rem] sm:min-h-[2.5rem] leading-snug break-words"
            >
              {localizedProduct.name}
            </Link>
          </div>

          {/* Requirement #4: Price & Status Row (No exact remaining stock number on catalog cards) */}
          <div className="pt-2 border-t border-gray-100 dark:border-[#28453B] min-w-0">
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-extrabold text-brand-green leading-tight truncate">
                {formatUZS(effectivePrice)}
              </span>
              {product.salePrice ? (
                <span className="text-[11px] text-gray-400 line-through leading-tight mt-0.5 truncate">
                  {formatUZS(product.price)}
                </span>
              ) : (
                <span className="text-[11px] text-transparent select-none leading-tight mt-0.5">
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
                  {t('product.lowStock')}
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-300 font-medium truncate">
                  {t('product.inStock')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add-to-Cart / Quantity Stepper */}
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        {isOutOfStock ? (
          <button
            type="button"
            disabled
            className="w-full h-9 sm:h-10 rounded-xl border border-gray-200 dark:border-[#28453B] bg-gray-100 dark:bg-[#162621] text-gray-400 text-xs font-bold cursor-not-allowed truncate px-2"
          >
            {t('product.outOfStockShort')}
          </button>
        ) : quantityInCart > 0 ? (
          <div className="flex items-center justify-between bg-brand-green-light dark:bg-[#1A332A] rounded-xl p-0.5 border border-brand-green/25 dark:border-emerald-600/40 h-9 sm:h-10">
            <button
              type="button"
              onClick={() =>
                updateCartQuantity(product.id, quantityInCart - 1)
              }
              className="w-8 h-8 rounded-lg bg-white dark:bg-[#12211C] text-brand-green hover:bg-gray-50 flex items-center justify-center font-bold shadow-sm transition-colors shrink-0"
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
              className="w-8 h-8 rounded-lg bg-[#0F3D2E] text-white hover:bg-[#16533F] disabled:opacity-40 flex items-center justify-center font-bold shadow-sm transition-colors shrink-0"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => addToCart(product.id, 1)}
            className="w-full h-9 sm:h-10 px-2.5 rounded-xl bg-[#0F3D2E] hover:bg-[#16533F] active:bg-[#09261C] text-white border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-colors min-w-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
            <span className="truncate">{t('product.addToCart')}</span>
          </button>
        )}
      </div>
    </article>
  );
};
