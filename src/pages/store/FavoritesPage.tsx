import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ProductCard } from '../../components/product/ProductCard';
import { EmptyState } from '../../components/ui/EmptyState';

/**
 * Compact "Istaklarim" Favorites screen:
 * - Replaces the large bordered "Yoqtirilgan mahsulotlar" title card & description
 *   with a compact "Istaklarim" heading in the top-left corner.
 * - Removes the "Roʻyxatni tozalash" button.
 * - Preserves all saved products, heart buttons, and navigation.
 */
export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, favoriteIds } = useStore();
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
    <div className="zaven-page-container py-3.5 sm:py-6 space-y-3.5 sm:space-y-4">
      {/* Compact "Istaklarim" Label in the Top-Left Corner */}
      <div className="flex items-center px-0.5">
        <h1 className="text-base sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
          {t('favorites.title')}
        </h1>
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
