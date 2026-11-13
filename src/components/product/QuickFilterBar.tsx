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
    <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-3 sm:p-4 shadow-card space-y-3">
      {/* Top Row: Filter Drawer Trigger (<xl), Quick Toggle Pills & Custom Themed Sort Dropdown */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-thin pb-0.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={onOpenMobileFilters}
            leftIcon={<SlidersHorizontal className="w-3.5 h-3.5 text-brand-green" />}
            className="xl:hidden shrink-0"
          >
            {t('catalog.filtersAndPrice')}
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[#0F3D2E] text-white text-[10px] font-extrabold leading-none">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Quick Toggle: Discounted */}
          <button
            type="button"
            onClick={onToggleDiscounted}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              onlyDiscounted
                ? 'bg-[#C89D54] text-[#09261C] border-[#C89D54] font-extrabold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-gold'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0" />
            <span>{t('nav.discounts')}</span>
          </button>

          {/* Quick Toggle: New Arrivals */}
          <button
            type="button"
            onClick={onToggleNew}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              onlyNew
                ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-green'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
            <span>{t('nav.newArrivals')}</span>
          </button>

          {/* Quick Toggle: In Stock Only */}
          <button
            type="button"
            onClick={onToggleInStock}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors shrink-0 ${
              onlyInStock
                ? 'bg-[#0F3D2E] text-white border-emerald-500/40 font-bold shadow-sm'
                : 'bg-surface-page dark:bg-[#162923] text-gray-700 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>{t('product.inStock')}</span>
          </button>
        </div>

        {/* Right Side: Total Count & Custom Accessible Sort Menu */}
        <div className="flex items-center justify-between md:justify-end gap-2.5 shrink-0 border-t md:border-t-0 pt-2.5 md:pt-0 border-gray-100 dark:border-[#28453B]">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('catalog.foundCount')}{' '}
            <strong className="text-gray-900 dark:text-gray-100 font-bold">
              {totalFilteredCount}
            </strong>
          </span>

          <div ref={sortMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              aria-haspopup="listbox"
              aria-expanded={isSortMenuOpen}
              className="h-9 px-3 rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] hover:border-brand-green dark:hover:border-brand-gold text-xs font-bold text-gray-800 dark:text-gray-100 inline-flex items-center gap-2 transition-colors shadow-sm"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-brand-green shrink-0" />
              <span className="truncate max-w-[165px]">{activeSortLabel}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
                  isSortMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isSortMenuOpen && (
              <ul
                role="listbox"
                aria-label={t('catalog.filtersAndSort')}
                className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#2F5246] shadow-2xl py-1.5 z-40 divide-y divide-gray-100 dark:divide-[#28453B]"
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
                        className={`w-full px-3.5 py-2.5 text-left text-xs font-semibold flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? 'bg-brand-green-light dark:bg-[#1D352D] text-brand-green font-extrabold'
                            : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#162923]'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <Check className="w-4 h-4 text-brand-green shrink-0" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Filter Chips & Clear All Action */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-gray-100 dark:border-[#28453B]">
          <span className="text-[11px] font-semibold text-gray-500 mr-1">
            {t('catalog.activeFilters')}
          </span>

          {localizedSelectedCategory && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-green-light text-brand-green">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-green-light text-brand-green">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#1D352D] text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-[#2F5246]">
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
