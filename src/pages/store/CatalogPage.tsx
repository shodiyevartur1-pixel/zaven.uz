import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  SlidersHorizontal,
  X,
  Check,
  PackageSearch,
  Home,
  Smartphone,
  Zap,
  Gift,
  Compass,
  Tag,
  Sparkles,
  Grid,
  ArrowLeft,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Language } from '../../types';
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

const ITEMS_PER_PAGE = 8;

const PRICE_PRESETS = [
  { label: '≤ 100 000 soʻm', min: '', max: '100000' },
  { label: '100 000 – 150 000 soʻm', min: '100000', max: '150000' },
  { label: '150 000 – 200 000 soʻm', min: '150000', max: '200000' },
  { label: '≥ 200 000 soʻm', min: '200000', max: '' },
];

/**
 * Curated subcategory links per ZAVEN category so tapping a category in the
 * mobile vertical directory expands its subcategories or opens the category's products.
 */
const CATEGORY_SUBCATEGORIES: Record<
  string,
  Array<{
    id: string;
    label: Record<Language, string>;
    query?: string;
  }>
> = {
  'cat-home': [
    {
      id: 'sub-home-kitchen',
      label: {
        uz: 'Oshxona jihozlari va maydalagichlar',
        ru: 'Кухонные приборы и измельчители',
        en: 'Kitchen Helpers & Mini Choppers',
      },
      query: 'oshxona',
    },
    {
      id: 'sub-home-organizers',
      label: {
        uz: 'Aylanuvchi organayzer va patnislar',
        ru: 'Вращающиеся органайзеры и подносы',
        en: 'Rotating Trays & Pantry Organizers',
      },
      query: 'organayzer',
    },
  ],
  'cat-phone': [
    {
      id: 'sub-phone-powerbank',
      label: {
        uz: 'Magnitli va simsiz Powerbanklar',
        ru: 'Магнитные и беспроводные повербанки',
        en: 'Magnetic & Wireless Powerbanks',
      },
      query: 'powerbank',
    },
    {
      id: 'sub-phone-chargers',
      label: {
        uz: 'GaN tezkor quvvatlagich bloklari',
        ru: 'Быстрые зарядные устройства GaN',
        en: 'GaN Fast Chargers & Adapters',
      },
      query: 'gan',
    },
  ],
  'cat-gadgets': [
    {
      id: 'sub-gadgets-lamps',
      label: {
        uz: 'Sensorli LED stol chiroqlari',
        ru: 'Сенсорные настольные LED-лампы',
        en: 'Touch LED Desk Lamps',
      },
      query: 'led',
    },
    {
      id: 'sub-gadgets-humidifiers',
      label: {
        uz: 'Havo namlagich va aromadiffuzorlar',
        ru: 'Увлажнители воздуха и диффузоры',
        en: 'Air Humidifiers & Diffusers',
      },
      query: 'namlagich',
    },
  ],
  'cat-gifts': [
    {
      id: 'sub-gifts-thermos',
      label: {
        uz: 'Aqlli LED ekranli termoslar',
        ru: 'Умные термосы с LED-дисплеем',
        en: 'Smart LED Temperature Thermoses',
      },
      query: 'termos',
    },
  ],
  'cat-auto': [
    {
      id: 'sub-auto-vacuum',
      label: {
        uz: 'Simsiz avto va uy changyutgichlari',
        ru: 'Беспроводные автопылесосы',
        en: 'Cordless Car & Home Vacuums',
      },
      query: 'changyutgich',
    },
  ],
};

export const CatalogPage: React.FC = () => {
  const { products, categories } = useStore();
  const { t, language, getProductText, getCategoryText } = useThemeLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || '';
  const initialQuery = searchParams.get('q') || '';
  const initialFilter = searchParams.get('filter') || '';
  const initialSort = (searchParams.get('sort') as SortOption) || 'popular';
  const viewModeParam = searchParams.get('view') || '';

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

  // Mobile vertical category directory accordion state
  const [expandedMobileCatId, setExpandedMobileCatId] = useState<string | null>(
    null
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [visibleMultiplier, setVisibleMultiplier] = useState<number>(1);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isMobileFilterOpen) return;
    const savedScrollY = window.scrollY;
    const previous = {
      position: document.body.style.position,
      top: document.body.style.top,
      left: document.body.style.left,
      right: document.body.style.right,
      width: document.body.style.width,
      overflow: document.body.style.overflow,
    };
    document.body.style.position = 'fixed';
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    document.body.classList.add('zaven-modal-open');
    return () => {
      Object.assign(document.body.style, previous);
      document.body.classList.remove('zaven-modal-open');
      window.scrollTo(0, savedScrollY);
    };
  }, [isMobileFilterOpen]);

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
    view?: string;
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
    if (updates.view !== undefined) {
      if (updates.view) nextParams.set('view', updates.view);
      else nextParams.delete('view');
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

  // On mobile/tablet (< xl), show the vertical Category Directory when no category/search/filter is active
  const isMobileDirectoryMode =
    activeFilterCount === 0 &&
    viewModeParam !== 'products' &&
    !searchParams.get('sort');

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
    syncUrlParams({
      category: slug,
      q: '',
      view: slug ? 'products' : '',
    });
  };

  const handleOpenSubcategory = (categorySlug: string, subQuery?: string) => {
    setSelectedCategorySlug(categorySlug);
    setSearchQuery(subQuery || '');
    syncUrlParams({
      category: categorySlug,
      q: subQuery || '',
      view: 'products',
    });
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
    setSearchParams({ view: 'products' }, { replace: true });
  };

  const handleReturnToMobileDirectory = () => {
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

  const renderCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Home':
        return <Home className="w-5 h-5 text-brand-green" />;
      case 'Smartphone':
        return <Smartphone className="w-5 h-5 text-brand-green" />;
      case 'Zap':
        return <Zap className="w-5 h-5 text-brand-green" />;
      case 'Gift':
        return <Gift className="w-5 h-5 text-brand-green" />;
      default:
        return <Compass className="w-5 h-5 text-brand-green" />;
    }
  };

  const renderFilterSidebarContent = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
          {t('catalog.searchByName')}
        </h3>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            syncUrlParams({ q: e.target.value, view: 'products' });
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

      <div className="pt-3 border-t border-gray-200 dark:border-[#28453B]">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 mb-1.5">
          {t('nav.categoriesTitle')}
        </h3>
        <ul className="space-y-1">
          <li>
            <button
              type="button"
              onClick={() => handleSelectCategory('')}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                !selectedCategorySlug
                  ? 'bg-[#0F3D2E] text-white font-bold shadow-sm'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1D352D] font-medium'
              }`}
            >
              <span>{t('nav.allCategories')}</span>
              {!selectedCategorySlug && (
                <Check className="w-3.5 h-3.5 shrink-0" />
              )}
            </button>
          </li>

          {activeCategories.map((cat) => {
            const locCat = getCategoryText(cat);
            const isSelected =
              selectedCategorySlug === cat.slug ||
              selectedCategorySlug === cat.id;

            return (
              <li key={cat.id}>
                <button
                  type="button"
                  onClick={() => handleSelectCategory(cat.slug)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                    isSelected
                      ? 'bg-[#0F3D2E] text-white font-bold shadow-sm'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1D352D] font-medium'
                  }`}
                >
                  <span className="leading-snug truncate">{locCat.name}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-[#28453B]">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
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

        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="number"
            min={0}
            step={5000}
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={t('catalog.minFrom')}
            aria-label={t('catalog.minFrom')}
            className="w-full h-9 rounded-xl border border-gray-300 dark:border-[#2F5246] px-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-brand-green focus:outline-none"
          />
          <input
            type="number"
            min={0}
            step={5000}
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={t('catalog.maxTo')}
            aria-label={t('catalog.maxTo')}
            className="w-full h-9 rounded-xl border border-gray-300 dark:border-[#2F5246] px-2.5 text-xs text-gray-900 dark:text-gray-100 focus:border-brand-green focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
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
                className={`text-left px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex items-center justify-between gap-1 ${
                  isPresetActive
                    ? 'bg-brand-green-light border-brand-green text-brand-green font-bold'
                    : 'bg-surface-page dark:bg-[#162923] border-gray-200 dark:border-[#2F5246] text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className="truncate">{preset.label}</span>
                {isPresetActive && <Check className="w-3 h-3 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-gray-200 dark:border-[#28453B] space-y-1.5">
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
          {t('catalog.discountAndStock')}
        </h3>

        <label className="flex items-center justify-between gap-2 cursor-pointer px-3 py-2 rounded-xl border border-gray-200 dark:border-[#2F5246] hover:bg-gray-50 dark:hover:bg-[#1D352D] transition-colors">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {t('catalog.onlyDiscounted')}
          </span>
          <input
            type="checkbox"
            checked={onlyDiscounted}
            onChange={(e) => {
              const checked = e.target.checked;
              setOnlyDiscounted(checked);
              syncUrlParams({
                filter: checked ? 'discounted' : '',
                view: 'products',
              });
            }}
            className="w-4 h-4 rounded text-brand-green border-gray-300 shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer px-3 py-2 rounded-xl border border-gray-200 dark:border-[#2F5246] hover:bg-gray-50 dark:hover:bg-[#1D352D] transition-colors">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {t('catalog.onlyInStock')}
          </span>
          <input
            type="checkbox"
            checked={onlyInStock}
            onChange={(e) => setOnlyInStock(e.target.checked)}
            className="w-4 h-4 rounded text-brand-green border-gray-300 shrink-0"
          />
        </label>

        <label className="flex items-center justify-between gap-2 cursor-pointer px-3 py-2 rounded-xl border border-gray-200 dark:border-[#2F5246] hover:bg-gray-50 dark:hover:bg-[#1D352D] transition-colors">
          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
            {t('catalog.onlyNew')}
          </span>
          <input
            type="checkbox"
            checked={onlyNew}
            onChange={(e) => {
              const checked = e.target.checked;
              setOnlyNew(checked);
              syncUrlParams({
                filter: checked ? 'new' : '',
                view: 'products',
              });
            }}
            className="w-4 h-4 rounded text-brand-green border-gray-300 shrink-0"
          />
        </label>
      </div>
    </div>
  );

  return (
    <>
      <div className="zaven-page-container py-3 sm:py-5 space-y-3.5 sm:space-y-4">
        {/* =================================================================== */}
        {/* MOBILE & TABLET VERTICAL CATEGORY DIRECTORY (< xl)                  */}
        {/* Inspired by Screenshot 1: Clean vertical list with ZAVEN green/gold */}
        {/* icons, subtle dividers, and expandable subcategories.               */}
        {/* =================================================================== */}
        {isMobileDirectoryMode && (
          <div className="xl:hidden space-y-3">
            <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] shadow-card overflow-hidden divide-y divide-gray-100 dark:divide-[#28453B]">
              {/* Special Promotions Row */}
              <button
                type="button"
                onClick={() => {
                  setOnlyDiscounted(true);
                  syncUrlParams({ filter: 'discounted', view: 'products' });
                }}
                className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3.5 text-left hover:bg-brand-gold-light/30 dark:hover:bg-[#162923] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-gold-light dark:bg-[#1D352D] border border-brand-gold-border/60 flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-[#C89D54]" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {t('nav.specialDiscounts')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {/* New Arrivals Row */}
              <button
                type="button"
                onClick={() => {
                  setOnlyNew(true);
                  syncUrlParams({ filter: 'new', view: 'products' });
                }}
                className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#162923] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-brand-green-light/70 dark:bg-[#162923] border border-brand-green/20 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-[#C89D54]" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                    {t('nav.newArrivals')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </button>

              {/* Store Categories with Expandable Subcategories */}
              {activeCategories.map((category) => {
                const locCat = getCategoryText(category);
                const subcategories = CATEGORY_SUBCATEGORIES[category.id] || [];
                const isExpanded = expandedMobileCatId === category.id;

                return (
                  <div key={category.id} className="bg-white dark:bg-[#12211C]">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => {
                        if (subcategories.length > 0) {
                          setExpandedMobileCatId((prev) =>
                            prev === category.id ? null : category.id
                          );
                        } else {
                          handleSelectCategory(category.slug);
                        }
                      }}
                      className="w-full min-h-[58px] px-4 py-3 flex items-center justify-between gap-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#162923] transition-colors"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-brand-green-light/70 dark:bg-[#162923] border border-brand-green/20 flex items-center justify-center shrink-0">
                          {renderCategoryIcon(category.iconName)}
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm font-bold text-gray-900 dark:text-gray-100 block truncate">
                            {locCat.name}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block truncate mt-0.5">
                            {locCat.description}
                          </span>
                        </div>
                      </div>

                      {subcategories.length > 0 ? (
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180 text-brand-green' : ''
                          }`}
                        />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      )}
                    </button>

                    {/* Expanded Subcategory List */}
                    {isExpanded && subcategories.length > 0 && (
                      <div className="bg-[#F8F9FA] dark:bg-[#0D1915] border-t border-gray-100 dark:border-[#28453B] pl-14 pr-4 py-2 space-y-1">
                        <button
                          type="button"
                          onClick={() => handleSelectCategory(category.slug)}
                          className="w-full min-h-[42px] py-2 px-3 rounded-xl text-left text-xs font-extrabold text-brand-green hover:bg-brand-green-light/50 dark:hover:bg-[#162923] flex items-center justify-between gap-2 transition-colors"
                        >
                          <span>{t('catalog.openCategoryProducts')}</span>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        {subcategories.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() =>
                              handleOpenSubcategory(category.slug, sub.query)
                            }
                            className="w-full min-h-[42px] py-2 px-3 rounded-xl text-left text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-[#162923] flex items-center justify-between gap-2 transition-colors"
                          >
                            <span className="truncate">
                              {sub.label[language]}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Browse All Products Row */}
              <button
                type="button"
                onClick={() => syncUrlParams({ view: 'products' })}
                className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between gap-3.5 text-left hover:bg-gray-50 dark:hover:bg-[#162923] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#0F3D2E] text-[#C89D54] flex items-center justify-center shrink-0">
                    <Grid className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-extrabold text-brand-green truncate">
                    {t('nav.allProducts')}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-brand-green shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* PRODUCT LISTING & FILTER VIEW (Always on xl+, or when a category /  */}
        {/* subcategory / search / filter is selected on mobile)                */}
        {/* =================================================================== */}
        <div
          className={
            isMobileDirectoryMode ? 'hidden xl:block space-y-4' : 'space-y-3.5'
          }
        >
          {/* Mobile Back-to-Directory Button + Compact Title */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleReturnToMobileDirectory}
                className="xl:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#28453B] text-xs font-bold text-gray-800 dark:text-gray-100 hover:border-brand-green shadow-sm shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-brand-green" />
                <span>{t('catalog.backToDirectory')}</span>
              </button>

              <h1 className="text-sm sm:text-xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
                {localizedSelectedCategory
                  ? localizedSelectedCategory.name
                  : searchQuery.trim()
                  ? `«${searchQuery.trim()}»`
                  : onlyDiscounted
                  ? t('nav.specialDiscounts')
                  : onlyNew
                  ? t('nav.newArrivals')
                  : t('catalog.titleAll')}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            <aside className="hidden xl:block xl:col-span-3 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card sticky top-24">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-[#28453B]">
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
              {activeFilterCount > 0 && (
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-[#28453B]">
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
            </aside>

            <div className="xl:col-span-9 space-y-3.5 min-w-0">
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
                  syncUrlParams({
                    filter: next ? 'discounted' : '',
                    view: 'products',
                  });
                }}
                onlyInStock={onlyInStock}
                onToggleInStock={() => setOnlyInStock((prev) => !prev)}
                onlyNew={onlyNew}
                onToggleNew={() => {
                  const next = !onlyNew;
                  setOnlyNew(next);
                  syncUrlParams({
                    filter: next ? 'new' : '',
                    view: 'products',
                  });
                }}
                sortBy={sortBy}
                onChangeSort={(nextSort) => {
                  setSortBy(nextSort);
                  syncUrlParams({ sort: nextSort, view: 'products' });
                }}
                activeFilterCount={activeFilterCount}
                onResetAll={handleResetAllFilters}
                onOpenMobileFilters={() => setIsMobileFilterOpen(true)}
              />

              {displayedProducts.length > 0 ? (
                <>
                  <div className="zaven-product-grid">
                    {displayedProducts.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>

                  {(hasMoreToLoad || totalPages > 1) && (
                    <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card flex flex-col sm:flex-row items-center justify-center gap-3">
                      {hasMoreToLoad && (
                        <Button
                          variant="secondary"
                          size="sm"
                          rightIcon={<ChevronDown className="w-4 h-4" />}
                          onClick={handleShowMore}
                        >
                          {t('catalog.showMore')}
                        </Button>
                      )}

                      {totalPages > 1 && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={currentPage <= 1}
                            onClick={() => handlePageSelect(currentPage - 1)}
                            className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            aria-label="Previous page"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          {Array.from(
                            { length: totalPages },
                            (_, idx) => idx + 1
                          ).map((page) => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => handlePageSelect(page)}
                              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                                currentPage === page
                                  ? 'bg-[#0F3D2E] text-white'
                                  : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}

                          <button
                            type="button"
                            disabled={currentPage >= totalPages}
                            onClick={() => handlePageSelect(currentPage + 1)}
                            className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
                            aria-label="Next page"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
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
        </div>
      </div>

      {/* Mobile Slide-Over Filter Drawer Flush at Top Safe Area */}
      {isMobileFilterOpen && (
        <div
          className="fixed inset-0 top-0 left-0 right-0 bottom-0 z-[100] xl:hidden flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={t('catalog.filtersAndSort')}
        >
          <div
            className="fixed inset-0 bg-gray-950/80"
            onClick={() => setIsMobileFilterOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-xs sm:max-w-sm bg-white dark:bg-[#12211C] h-full max-h-[100dvh] flex flex-col justify-between z-10 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] bg-[#0F3D2E] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <SlidersHorizontal className="w-4 h-4 text-[#C89D54]" />
                <span>{t('catalog.filtersAndSort')}</span>
                {activeFilterCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] text-[11px] font-extrabold">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="w-8 h-8 rounded-lg bg-[#09261C]/70 text-emerald-100 hover:text-white flex items-center justify-center"
                aria-label={t('product.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto scrollbar-thin min-h-0">
              {renderFilterSidebarContent()}
            </div>

            <div className="p-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] bg-gray-50 dark:bg-[#162923] border-t border-gray-200 dark:border-[#28453B] grid grid-cols-2 gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                fullWidth
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleResetAllFilters}
              >
                {t('catalog.clear')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => setIsMobileFilterOpen(false)}
              >
                {t('catalog.applyFilters')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
