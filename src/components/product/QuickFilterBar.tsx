import React from 'react';
import {
  SlidersHorizontal,
  X,
  Tag,
  Sparkles,
  CheckCircle2,
  ArrowUpDown,
} from 'lucide-react';
import { Category } from '../../types';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUZS } from '../../utils/format';
import { Button } from '../ui/Button';

export type SortOption =
  | 'popular'
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'discount';

export interface QuickFilterBarProps {
  categories: Category[];
  selectedCategorySlug: string;
  onSelectCategory: (slug: string) => void;
  searchQuery: string;
  onClearSearch: () => void;
  minPrice: string;
  maxPrice: string;
  onClearPrice: () => void;
  onlyDiscounted: boolean;
  onToggleDiscounted: () => void;
  onlyInStock: boolean;
  onToggleInStock: () => void;
  onlyNew: boolean;
  onToggleNew: () => void;
  sortBy: SortOption;
  onChangeSort: (sort: SortOption) => void;
  totalFilteredCount: number;
  activeFilterCount: number;
  onResetAll: () => void;
  onOpenMobileFilters: () => void;
}

export const QuickFilterBar: React.FC<QuickFilterBarProps> = ({
  categories,
  selectedCategorySlug,
  onSelectCategory,
  searchQuery,
  onClearSearch,
  minPrice,
  maxPrice,
  onClearPrice,
  onlyDiscounted,
  onToggleDiscounted,
  onlyInStock,
  onToggleInStock,
  onlyNew,
  onToggleNew,
  sortBy,
  onChangeSort,
  totalFilteredCount,
  activeFilterCount,
  onResetAll,
  onOpenMobileFilters,
}) => {
  const { t, getCategoryText } = useThemeLanguage();

  const selectedCategory = categories.find(
    (c) => c.slug === selectedCategorySlug || c.id === selectedCategorySlug
  );
  const localizedSelectedCategory = selectedCategory
    ? getCategoryText(selectedCategory)
    : null;

  const hasPriceFilter = Boolean(minPrice.trim() || maxPrice.trim());

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-card space-y-3.5">
      {/* Top Row: Filter Drawer Trigger (<xl), Quick Toggle Pills & Sort Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenMobileFilters}
            leftIcon={<SlidersHorizontal className="w-4 h-4 text-brand-green" />}
            className="xl:hidden shrink-0"
          >
            {t('catalog.filtersAndPrice')}
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand-green text-white text-[11px] font-bold leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Quick Toggle: Discounted */}
          <button
            type="button"
            onClick={onToggleDiscounted}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              onlyDiscounted
                ? 'bg-brand-gold-light text-brand-gold-dark border-brand-gold font-bold shadow-sm'
                : 'bg-surface-page text-gray-700 border-gray-200 hover:border-brand-gold'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-brand-gold-dark" />
            <span>{t('nav.discounts')}</span>
          </button>

          {/* Quick Toggle: New Arrivals */}
          <button
            type="button"
            onClick={onToggleNew}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              onlyNew
                ? 'bg-brand-green text-white border-brand-green shadow-sm'
                : 'bg-surface-page text-gray-700 border-gray-200 hover:border-brand-green'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            <span>{t('nav.newArrivals')}</span>
          </button>

          {/* Quick Toggle: In Stock Only */}
          <button
            type="button"
            onClick={onToggleInStock}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              onlyInStock
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold shadow-sm'
                : 'bg-surface-page text-gray-700 border-gray-200 hover:border-emerald-300'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('product.inStock')}</span>
          </button>
        </div>

        {/* Right Side: Total Count & Sort Select */}
        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-gray-100">
          <span className="text-xs font-medium text-gray-500">
            {t('catalog.foundCount')}{' '}
            <strong className="text-gray-900 font-bold">
              {totalFilteredCount} {t('home.productsCount')}
            </strong>
          </span>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:inline" />
            <label htmlFor="catalog-sort" className="sr-only">
              Sort
            </label>
            <select
              id="catalog-sort"
              value={sortBy}
              onChange={(e) => onChangeSort(e.target.value as SortOption)}
              className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
            >
              <option value="popular">{t('catalog.sortPopular')}</option>
              <option value="newest">{t('catalog.sortNewest')}</option>
              <option value="price_asc">{t('catalog.sortPriceAsc')}</option>
              <option value="price_desc">{t('catalog.sortPriceDesc')}</option>
              <option value="discount">{t('catalog.sortDiscount')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Filter Chips & Clear All Action */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
          <span className="text-xs font-semibold text-gray-500 mr-1">
            {t('catalog.activeFilters')}
          </span>

          {localizedSelectedCategory && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green-light text-brand-green">
              <span>{localizedSelectedCategory.name}</span>
              <button
                type="button"
                onClick={() => onSelectCategory('')}
                className="hover:text-brand-green-dark"
                aria-label="Clear category"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {searchQuery.trim() && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green-light text-brand-green">
              <span>«{searchQuery.trim()}»</span>
              <button
                type="button"
                onClick={onClearSearch}
                className="hover:text-brand-green-dark"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {hasPriceFilter && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
              <span>
                {minPrice ? formatUZS(Number(minPrice)) : '0 soʻm'} —{' '}
                {maxPrice ? formatUZS(Number(maxPrice)) : '∞'}
              </span>
              <button
                type="button"
                onClick={onClearPrice}
                className="hover:text-red-600"
                aria-label="Clear price"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {onlyDiscounted && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-gold-light text-brand-gold-dark border border-brand-gold-border">
              <span>{t('catalog.onlyDiscounted')}</span>
              <button
                type="button"
                onClick={onToggleDiscounted}
                aria-label="Clear discount filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {onlyNew && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-green-light text-brand-green">
              <span>{t('catalog.onlyNew')}</span>
              <button
                type="button"
                onClick={onToggleNew}
                aria-label="Clear new filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          {onlyInStock && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span>{t('catalog.onlyInStock')}</span>
              <button
                type="button"
                onClick={onToggleInStock}
                aria-label="Clear stock filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetAll}
            className="text-xs font-bold text-red-600 hover:underline ml-auto"
          >
            {t('catalog.clearAllFilters')}
          </button>
        </div>
      )}
    </div>
  );
};