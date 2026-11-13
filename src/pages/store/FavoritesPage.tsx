import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Trash2, ArrowLeft } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ProductCard } from '../../components/product/ProductCard';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, favoriteIds, clearFavorites } = useStore();
  const { t } = useThemeLanguage();

  const favoriteProducts = useMemo(
    () =>
      favoriteIds
        .map((id) =>
          products.find(
            (p) =>
              p.id === id &&
              p.status !== 'archived' &&
              p.status !== 'hidden'
          )
        )
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [products, favoriteIds]
  );

  return (
    <div className="zaven-page-container py-4 sm:py-7 space-y-5">
      {/* Header Row */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Heart className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 break-words">
              {t('favorites.title')}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t('favorites.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link to="/catalog">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            >
              {t('nav.catalog')}
            </Button>
          </Link>

          {favoriteProducts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFavorites}
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
              className="text-red-600 hover:bg-red-50"
            >
              {t('favorites.clearAll')}
            </Button>
          )}
        </div>
      </div>

      {/* Saved Products Grid or Helpful Empty State */}
      {favoriteProducts.length > 0 ? (
        <div className="zaven-product-grid zaven-product-grid-4">
          {favoriteProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Heart className="w-7 h-7 text-rose-500" />}
          title={t('favorites.emptyTitle')}
          description={t('favorites.emptyDesc')}
          actionLabel={t('favorites.browseCatalog')}
          onAction={() => navigate('/catalog')}
        />
      )}
    </div>
  );
};
