import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal,
  X,
  Tag,
  Sparkles,
  CheckCircle2,
  ArrowUpDown,
  ChevronDown,
  Check,
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
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

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

  const activeSortLabel =
    sortOptions.find((o) => o.value === sortBy)?.label ||
    t('catalog.sortPopular');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(e.target as Node)
      ) {
        setIsSortMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSortMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-3 sm:p-4 shadow-card space-y-2.5">
      {/* Row 1: Filter Trigger + Quick Filter Chips + Compact Anchored Sort Menu */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-0.5 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileFilters}
            className="xl:hidden h-9 px-3 rounded-xl bg-[#0F3D2E] text-white border border-emerald-500/30 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
            <span>{t('catalog.filtersAndPrice')}</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] text-[10px] font-extrabold leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleDiscounted}
            className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              onlyDiscounted
                ? 'bg-[#C89D54] text-[#09261C] border-[#C89D54] font-extrabold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-gold'
            }`}
          >
            <Tag className="w-3 h-3 shrink-0" />
            <span>{t('nav.discounts')}</span>
          </button>

          <button
            type="button"
            onClick={onToggleNew}
            className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              onlyNew
                ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-green'
            }`}
          >
            <Sparkles className="w-3 h-3 text-[#C89D54] shrink-0" />
            <span>{t('nav.newArrivals')}</span>
          </button>

          <button
            type="button"
            onClick={onToggleInStock}
            className={`h-8 inline-flex items-center gap-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              onlyInStock
                ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>{t('product.inStock')}</span>
          </button>
        </div>

        {/* Compact Viewport-Bounded Sort Popover Next to Trigger */}
        <div ref={sortMenuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setIsSortMenuOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isSortMenuOpen}
            className="h-9 px-3 rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] hover:border-brand-green dark:hover:border-brand-gold text-xs font-bold text-gray-800 dark:text-gray-100 inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-brand-green shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-[180px]">
              {activeSortLabel}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${
                isSortMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isSortMenuOpen && (
            <ul
              role="listbox"
              aria-label={t('catalog.filtersAndSort')}
              className="absolute right-0 top-full mt-1.5 w-52 max-w-[calc(100vw-2rem)] rounded-xl bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#2F5246] shadow-xl py-1 z-30 divide-y divide-gray-100 dark:divide-[#28453B]"
            >
              {sortOptions.map((opt) => {
                const isSelected = sortBy === opt.value;
                return (
                  <li key={opt.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      onClick={() => {
                        onChangeSort(opt.value);
                        setIsSortMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                        isSelected
                          ? 'bg-brand-green-light dark:bg-[#1D352D] text-brand-green font-extrabold'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#162923]'
                      }`}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-brand-green shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Row 2: Active Filters & Clear All */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#28453B]">
          <div className="flex flex-wrap items-center gap-1.5">
            {localizedSelectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-brand-green-light text-brand-green">
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-brand-green-light text-brand-green">
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-bold bg-gray-100 dark:bg-[#1D352D] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2F5246]">
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
