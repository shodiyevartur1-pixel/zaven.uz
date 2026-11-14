import React from 'react';
import {
  SlidersHorizontal,
  X,
  Tag,
  Sparkles,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { Category } from '../../types';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUZS } from '../../utils/format';

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
  activeFilterCount: number;
  onResetAll: () => void;
  onOpenMobileFilters: () => void;
}

/**
 * PART 2 FIX:
 * - Places "Filtrlar" button and a responsive themed native <select> sort control
 *   in one balanced row (stacking cleanly only on ultra-narrow <340px screens),
 *   so the sort menu never renders off-screen or behind the sticky bottom nav.
 * - Aligns compact filter chips ("Chegirmalar", "Yangi kelganlar", "Omborda mavjud")
 *   with consistent h-9 height and even gap-2 spacing.
 */
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

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'popular', label: t('catalog.sortPopular') },
    { value: 'newest', label: t('catalog.sortNewest') },
    { value: 'price_asc', label: t('catalog.sortPriceAsc') },
    { value: 'price_desc', label: t('catalog.sortPriceDesc') },
    { value: 'discount', label: t('catalog.sortDiscount') },
  ];

  return (
    <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-3 sm:p-4 shadow-card space-y-2.5">
      {/* Row 1: Balanced Filter Trigger + Accessible Viewport-Safe Sort Selector */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpenMobileFilters}
          className="xl:hidden h-10 px-3.5 rounded-xl bg-[#0F3D2E] hover:bg-[#16533F] text-white border border-emerald-500/30 text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
          <span>{t('catalog.filtersAndPrice')}</span>
          {activeFilterCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] text-[10px] font-extrabold leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop Quick Chips inline on xl+ */}
        <div className="hidden xl:flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onToggleDiscounted}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              onlyDiscounted
                ? 'bg-[#C89D54] text-[#09261C] border-[#C89D54] font-extrabold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-gold'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>{t('nav.discounts')}</span>
          </button>

          <button
            type="button"
            onClick={onToggleNew}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              onlyNew
                ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-green'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
            <span>{t('nav.newArrivals')}</span>
          </button>

          <button
            type="button"
            onClick={onToggleInStock}
            className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
              onlyInStock
                ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{t('product.inStock')}</span>
          </button>
        </div>

        {/* Responsive Styled Native Select Sort Control (Never renders off-screen or behind bottom nav) */}
        <div className="relative flex-1 min-w-[165px] sm:flex-initial sm:w-auto ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-brand-green absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            aria-label={t('catalog.sortLabel')}
            value={sortBy}
            onChange={(e) => onChangeSort(e.target.value as SortOption)}
            className="w-full h-10 pl-8 pr-8 rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] text-xs font-bold text-gray-800 dark:text-gray-100 appearance-none cursor-pointer focus:border-brand-green focus:outline-none shadow-sm"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Row 2 on Mobile/Tablet (<xl): Compact, Consistently Sized Filter Chips */}
      <div className="xl:hidden flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100 dark:border-[#28453B]">
        <button
          type="button"
          onClick={onToggleDiscounted}
          aria-pressed={onlyDiscounted}
          className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
            onlyDiscounted
              ? 'bg-[#C89D54] text-[#09261C] border-[#C89D54] font-extrabold shadow-sm'
              : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246]'
          }`}
        >
          <Tag className="w-3.5 h-3.5 shrink-0" />
          <span>{t('nav.discounts')}</span>
        </button>

        <button
          type="button"
          onClick={onToggleNew}
          aria-pressed={onlyNew}
          className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
            onlyNew
              ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
              : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246]'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
          <span>{t('nav.newArrivals')}</span>
        </button>

        <button
          type="button"
          onClick={onToggleInStock}
          aria-pressed={onlyInStock}
          className={`h-9 inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold border transition-colors ${
            onlyInStock
              ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
              : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>{t('product.inStock')}</span>
        </button>
      </div>

      {/* Row 3: Active Filters & Clear All */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#28453B]">
          <div className="flex flex-wrap items-center gap-1.5">
            {localizedSelectedCategory && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-green-light text-brand-green">
                <span>{localizedSelectedCategory.name}</span>
                <button
                  type="button"
                  onClick={() => onSelectCategory('')}
                  aria-label="Clear category"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-brand-green-light text-brand-green">
                <span>«{searchQuery.trim()}»</span>
                <button
                  type="button"
                  onClick={onClearSearch}
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {hasPriceFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-gray-100 dark:bg-[#1D352D] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2F5246]">
                <span>
                  {minPrice ? formatUZS(Number(minPrice)) : '0'} —{' '}
                  {maxPrice ? formatUZS(Number(maxPrice)) : '∞'}
                </span>
                <button
                  type="button"
                  onClick={onClearPrice}
                  aria-label="Clear price"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{t('catalog.clearAllFilters')}</span>
          </button>
        </div>
      )}
    </div>
  );
};
