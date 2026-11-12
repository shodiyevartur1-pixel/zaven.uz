import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  X,
  Check,
  PackageSearch,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { ProductCard } from '../../components/product/ProductCard';
import {
  QuickFilterBar,
  SortOption,
} from '../../components/product/QuickFilterBar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Badge } from '../../components/ui/Badge';
import { calculateDiscountPercent } from '../../utils/format';

const ITEMS_PER_PAGE = 6;

const PRICE_PRESETS = [
  { label: '≤ 100 000 soʻm', min: '', max: '100000' },
  { label: '100 000 – 150 000 soʻm', min: '100000', max: '150000' },
  { label: '150 000 – 200 000 soʻm', min: '150000', max: '200000' },
  { label: '≥ 200 000 soʻm', min: '200000', max: '' },
];

export const CatalogPage: React.FC = () => {
  const { products, categories } = useStore();
  const { t, getProductText, getCategoryText } = useThemeLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || '';
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = searchParams.get('filter') || '';
  const initialSort = (searchParams.get('sort') as SortOption) || 'popular';

  const [selectedCategorySlug, setSelectedCategorySlug] =
    useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>(initialQuery);
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [onlyDiscounted, setOnlyDiscounted] = useState<boolean>(
    initialFilter === 'discounted'
  );
  const [onlyNew, setOnlyNew] = useState<boolean>(initialFilter === 'new');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<SortOption>(initialSort);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visibleMultiplier, setVisibleMultiplier] = useState<number>(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  useEffect(() => {
    const catParam = searchParams.get('category') || '';
    const qParam = searchParams.get('q') || '';
    const filterParam = searchParams.get('filter') || '';
    const sortParam = (searchParams.get('sort') as SortOption) || 'popular';

    setSelectedCategorySlug(catParam);
    setSearchQuery(qParam);
    setOnlyDiscounted(filterParam === 'discounted');
    setOnlyNew(filterParam === 'new');
    setSortBy(sortParam);
    setCurrentPage(1);
    setVisibleMultiplier(1);
  }, [searchParams]);

  const syncUrlParams = (updates: {
    category?: string;
    q?: string;
    filter?: string;
    sort?: SortOption;
  }) => {
    const nextParams = new URLSearchParams(searchParams);

    if (updates.category !== undefined) {
      if (updates.category) nextParams.set('category', updates.category);
      else nextParams.delete('category');
    }
    if (updates.q !== undefined) {
      if (updates.q.trim()) nextParams.set('q', updates.q.trim());
      else nextParams.delete('q');
    }
    if (updates.filter !== undefined) {
      if (updates.filter) nextParams.set('filter', updates.filter);
      else nextParams.delete('filter');
    }
    if (updates.sort !== undefined) {
      if (updates.sort && updates.sort !== 'popular')
        nextParams.set('sort', updates.sort);
      else nextParams.delete('sort');
    }

    setSearchParams(nextParams, { replace: true });
  };

  const activeCategories = useMemo(
    () =>
      categories
        .filter((c) => c.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const catalogProducts = useMemo(
    () =>
      products.filter(
        (p) => p.status === 'active' || p.status === 'out_of_stock'
      ),
    [products]
  );

  const selectedCategoryObj = useMemo(
    () =>
      activeCategories.find(
        (c) =>
          c.slug === selectedCategorySlug || c.id === selectedCategorySlug
      ),
    [activeCategories, selectedCategorySlug]
  );

  const localizedSelectedCategory = selectedCategoryObj
    ? getCategoryText(selectedCategoryObj)
    : null;

  // Filter & Sort logic supporting Uzbek, Russian, and English product names/descriptions
  const filteredProducts = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;
    const query = searchQuery.trim().toLowerCase();

    const matches = catalogProducts.filter((product) => {
      if (selectedCategoryObj && product.categoryId !== selectedCategoryObj.id) {
        return false;
      }

      if (query) {
        const loc = getProductText(product);
        const nameMatch =
          product.name.toLowerCase().includes(query) ||
          loc.name.toLowerCase().includes(query);
        const skuMatch = product.sku.toLowerCase().includes(query);
        const descMatch =
          product.shortDescription.toLowerCase().includes(query) ||
          loc.shortDescription.toLowerCase().includes(query);
        if (!nameMatch && !skuMatch && !descMatch) {
          return false;
        }
      }

      const effectivePrice = product.salePrice ?? product.price;

      if (min !== null && !Number.isNaN(min) && effectivePrice < min) {
        return false;
      }
      if (max !== null && !Number.isNaN(max) && effectivePrice > max) {
        return false;
      }

      if (
        onlyDiscounted &&
        (!product.salePrice || product.salePrice >= product.price)
      ) {
        return false;
      }

      if (onlyNew && !product.isNew) {
        return false;
      }

      if (
        onlyInStock &&
        (product.status === 'out_of_stock' || product.stock <= 0)
      ) {
        return false;
      }

      return true;
    });

    return [...matches].sort((a, b) => {
      const priceA = a.salePrice ?? a.price;
      const priceB = b.salePrice ?? b.price;

      switch (sortBy) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'newest':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'discount': {
          const discA = calculateDiscountPercent(a.price, a.salePrice);
          const discB = calculateDiscountPercent(b.price, b.salePrice);
          return discB - discA;
        }
        case 'popular':
        default:
          return b.soldCount - a.soldCount;
      }
    });
  }, [
    catalogProducts,
    selectedCategoryObj,
    searchQuery,
    minPrice,
    maxPrice,
    onlyDiscounted,
    onlyNew,
    onlyInStock,
    sortBy,
    getProductText,
  ]);

  useEffect(() => {
    setCurrentPage(1);
    setVisibleMultiplier(1);
  }, [
    selectedCategorySlug,
    searchQuery,
    minPrice,
    maxPrice,
    onlyDiscounted,
    onlyNew,
    onlyInStock,
    sortBy,
  ]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCategorySlug) count += 1;
    if (searchQuery.trim()) count += 1;
    if (minPrice.trim() || maxPrice.trim()) count += 1;
    if (onlyDiscounted) count += 1;
    if (onlyNew) count += 1;
    if (onlyInStock) count += 1;
    return count;
  }, [
    selectedCategorySlug,
    searchQuery,
    minPrice,
    maxPrice,
    onlyDiscounted,
    onlyNew,
    onlyInStock,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE * visibleMultiplier;
  const displayedProducts = filteredProducts.slice(startIndex, endIndex);
  const hasMoreToLoad = endIndex < filteredProducts.length;

  const handleSelectCategory = (slug: string) => {
    setSelectedCategorySlug(slug);
    syncUrlParams({ category: slug });
  };

  const handleResetAllFilters = () => {
    setSelectedCategorySlug('');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setOnlyDiscounted(false);
    setOnlyNew(false);
    setOnlyInStock(false);
    setSortBy('popular');
    setSearchParams({}, { replace: true });
  };

  const handleShowMore = () => {
    setVisibleMultiplier((prev) => prev + 1);
  };

  const handlePageSelect = (page: number) => {
    setVisibleMultiplier(1);
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderFilterSidebarContent = () => (
    <div className="space-y-6">
      {/* 1. Search by Product Name / SKU */}
      <div>
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2.5">
          {t('catalog.searchByName')}
        </h3>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            syncUrlParams({ q: e.target.value });
          }}
          placeholder={t('header.searchMobilePlaceholder')}
          leftIcon={<Search className="w-4 h-4" />}
          rightElement={
            searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  syncUrlParams({ q: '' });
                }}
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            ) : undefined
          }
        />
      </div>

      {/* 2. Product Categories List */}
      <div className="pt-5 border-t border-gray-200">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 mb-2.5">
          {t('nav.categoriesTitle')}
        </h3>
        <ul className="space-y-1.5">
          <li>
            <button
              type="button"
              onClick={() => handleSelectCategory('')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                !selectedCategorySlug
                  ? 'bg-brand-green text-white font-bold shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100 font-medium'
              }`}
            >
              <span>{t('nav.allCategories')}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                  !selectedCategorySlug
                    ? 'bg-brand-green-dark text-brand-gold font-bold'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {catalogProducts.length}
              </span>
            </button>
          </li>

          {activeCategories.map((cat) => {
            const locCat = getCategoryText(cat);
            const count = catalogProducts.filter(
              (p) => p.categoryId === cat.id
            ).length;
            const isSelected =
              selectedCategorySlug === cat.slug ||
              selectedCategorySlug === cat.id;

            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-brand-green text-white font-bold shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 font-medium'
                  }`}
                >
                  <span className="leading-snug">{locCat.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      isSelected
                        ? 'bg-brand-green-dark text-brand-gold font-bold'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 3. Price Range Filter (UZS) */}
      <div className="pt-5 border-t border-gray-200">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
            {t('catalog.priceRange')}
          </h3>
          {(minPrice || maxPrice) && (
            <button
              type="button"
              onClick={() => {
                setMinPrice('');
                setMaxPrice('');
              }}
              className="text-xs font-semibold text-brand-green hover:underline"
            >
              {t('catalog.clear')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              {t('catalog.minFrom')}
            </label>
            <input
              type="number"
              min={0}
              step={5000}
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-brand-green focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-500 mb-1">
              {t('catalog.maxTo')}
            </label>
            <input
              type="number"
              min={0}
              step={5000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="500 000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs text-gray-900 focus:border-brand-green focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          {PRICE_PRESETS.map((preset, idx) => {
            const isPresetActive =
              minPrice === preset.min && maxPrice === preset.max;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (isPresetActive) {
                    setMinPrice('');
                    setMaxPrice('');
                  } else {
                    setMinPrice(preset.min);
                    setMaxPrice(preset.max);
                  }
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center justify-between ${
                  isPresetActive
                    ? 'bg-brand-green-light border-brand-green text-brand-green font-bold'
                    : 'bg-surface-page border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{preset.label}</span>
                {isPresetActive && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Discounts & Availability Checkboxes */}
      <div className="pt-5 border-t border-gray-200 space-y-2.5">
        <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
          {t('catalog.discountAndStock')}
        </h3>

        <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-semibold text-gray-800">
            {t('catalog.onlyDiscounted')}
          </span>
          <input
            type="checkbox"
            checked={onlyDiscounted}
            onChange={(e) => {
              const checked = e.target.checked;
              setOnlyDiscounted(checked);
              syncUrlParams({ filter: checked ? 'discounted' : '' });
            }}
            className="w-4 h-4 rounded text-brand-green focus:ring-brand-green border-gray-300 shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-semibold text-gray-800">
            {t('catalog.onlyInStock')}
          </span>
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="w-4 h-4 rounded text-brand-green focus:ring-brand-green border-gray-300 shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <span className="text-xs font-semibold text-gray-800">
            {t('catalog.onlyNew')}
          </span>
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(e) => {
              const checked = e.target.checked;
              setOnlyNew(checked);
              syncUrlParams({ filter: checked ? 'new' : '' });
            }}
            className="w-4 h-4 rounded text-brand-green focus:ring-brand-green border-gray-300 shrink-0"
          />
        </label>
      </div>

      {activeFilterCount > 0 && (
        <div className="pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={handleResetAllFilters}
          >
            {t('catalog.clearAllFilters')}
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Breadcrumb & Unclipped Category Pills Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-5">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mb-2.5"
          >
            <Link to="/" className="hover:text-brand-green font-medium">
              {t('nav.home')}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <Link
              to="/catalog"
              onClick={() => handleSelectCategory('')}
              className={`hover:text-brand-green ${
                !selectedCategoryObj ? 'font-bold text-gray-900' : 'font-medium'
              }`}
            >
              {t('nav.catalog')}
            </Link>
            {localizedSelectedCategory && (
              <>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span className="font-bold text-brand-green">
                  {localizedSelectedCategory.name}
                </span>
              </>
            )}
          </nav>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                  {localizedSelectedCategory
                    ? localizedSelectedCategory.name
                    : searchQuery.trim()
                    ? `«${searchQuery.trim()}» ${t('catalog.searchResultsFor')}`
                    : t('catalog.titleAll')}
                </h1>
                <Badge variant="gold" size="md">
                  {filteredProducts.length} {t('home.productsCount')}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-1 max-w-2xl">
                {localizedSelectedCategory
                  ? localizedSelectedCategory.description
                  : t('catalog.subtitleDefault')}
              </p>
            </div>
          </div>
        </div>

        {/* Wrapping Category Pills Bar */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSelectCategory('')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
              !selectedCategoryObj
                ? 'bg-brand-green text-white shadow-sm'
                : 'bg-surface-subtle text-gray-700 hover:bg-brand-green-light hover:text-brand-green'
            }`}
          >
            {t('nav.allCategories')} ({catalogProducts.length})
          </button>
          {activeCategories.map((cat) => {
            const locCat = getCategoryText(cat);
            const count = catalogProducts.filter(
              (p) => p.categoryId === cat.id
            ).length;
            const isSelected = selectedCategoryObj?.id === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.slug)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-brand-green text-white font-bold shadow-sm'
                    : 'bg-surface-subtle text-gray-700 hover:bg-brand-green-light hover:text-brand-green'
                }`}
              >
                {locCat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Catalog Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <aside className="hidden xl:block xl:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 shadow-card sticky top-32">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
              <SlidersHorizontal className="w-4 h-4 text-brand-green" />
              <span>{t('catalog.filtersAndSort')}</span>
            </div>
            {activeFilterCount > 0 && (
              <Badge variant="green" size="sm">
                {activeFilterCount} {t('catalog.activeCount')}
              </Badge>
            )}
          </div>
          {renderFilterSidebarContent()}
        </aside>

        <div className="xl:col-span-9 space-y-5">
          <QuickFilterBar
            categories={activeCategories}
            selectedCategorySlug={selectedCategorySlug}
            onSelectCategory={handleSelectCategory}
            searchQuery={searchQuery}
            onClearSearch={() => {
              setSearchQuery('');
              syncUrlParams({ q: '' });
            }}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onClearPrice={() => {
              setMinPrice('');
              setMaxPrice('');
            }}
            onlyDiscounted={onlyDiscounted}
            onToggleDiscounted={() => {
              const next = !onlyDiscounted;
              setOnlyDiscounted(next);
              syncUrlParams({ filter: next ? 'discounted' : '' });
            }}
            onlyInStock={onlyInStock}
            onToggleInStock={() => setOnlyInStock((prev) => !prev)}
            onlyNew={onlyNew}
            onToggleNew={() => {
              const next = !onlyNew;
              setOnlyNew(next);
              syncUrlParams({ filter: next ? 'new' : '' });
            }}
            sortBy={sortBy}
            onChangeSort={(nextSort) => {
              setSortBy(nextSort);
              syncUrlParams({ sort: nextSort });
            }}
            totalFilteredCount={filteredProducts.length}
            activeFilterCount={activeFilterCount}
            onResetAll={handleResetAllFilters}
            onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
          />

          {displayedProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-card flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-600">
                  <strong className="text-brand-green">
                    {startIndex + 1}–
                    {Math.min(endIndex, filteredProducts.length)}
                  </strong>{' '}
                  / {filteredProducts.length} {t('catalog.showingCount')}
                </div>

                {hasMoreToLoad && (
                  <Button
                    variant="secondary"
                    size="sm"
                    rightIcon={<ChevronDown className="w-4 h-4" />}
                    onClick={handleShowMore}
                  >
                    {t('catalog.showMore')} (
                    {Math.min(
                      ITEMS_PER_PAGE,
                      filteredProducts.length - endIndex
                    )}
                    )
                  </Button>
                )}

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => handlePageSelect(currentPage - 1)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                      (page) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => handlePageSelect(page)}
                          className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                            currentPage === page
                              ? 'bg-brand-green text-white'
                              : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    )}

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => handlePageSelect(currentPage + 1)}
                      className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <EmptyState
              icon={<PackageSearch className="w-7 h-7" />}
              title={t('catalog.emptyTitle')}
              description={t('catalog.emptyDesc')}
              actionLabel={t('catalog.clearAllFilters')}
              onAction={handleResetAllFilters}
            />
          )}
        </div>
      </div>

      {/* Accessible Slide-Over Filter Drawer */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 z-50 xl:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="fixed inset-0 bg-gray-900/60"
            onClick={() => setIsMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-sm bg-white h-full flex flex-col justify-between z-10 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-brand-green text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-base">
                <SlidersHorizontal className="w-4 h-4 text-brand-gold" />
                <span>{t('catalog.filtersAndSort')}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-emerald-100 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto scrollbar-thin">
              {renderFilterSidebarContent()}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center gap-2.5">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={handleResetAllFilters}
              >
                {t('catalog.clear')}
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => setIsMobileFilterOpen(false)}
              >
                OK ({filteredProducts.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};