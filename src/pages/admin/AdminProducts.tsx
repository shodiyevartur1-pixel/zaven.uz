import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Package,
  Boxes,
  FolderTree,
  Plus,
  Search,
  Edit3,
  Copy,
  Archive,
  Trash2,
  EyeOff,
  Eye,
  ArrowUp,
  ArrowDown,
  Upload,
  History,
  X,
  Globe,
  Loader2,
  Star,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { PRODUCT_DEFAULT_TRANSLATIONS } from '../../i18n/translations';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import {
  Category,
  Language,
  Product,
  ProductStatus,
} from '../../types';
import {
  formatUZS,
  formatDateUz,
  slugify,
  calculateDiscountPercent,
} from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export type AdminProductsSection = 'products' | 'inventory' | 'categories';

interface AdminProductsProps {
  initialSection?: AdminProductsSection;
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

const PRODUCT_STATUS_META: Record<
  ProductStatus,
  {
    label: string;
    variant: 'success' | 'danger' | 'warning' | 'neutral';
  }
> = {
  active: { label: 'Faol (Sotuvda)', variant: 'success' },
  out_of_stock: { label: 'Vaqtincha tugagan', variant: 'danger' },
  hidden: { label: 'Yashirilgan (Qoralama)', variant: 'warning' },
  archived: { label: 'Arxivlangan', variant: 'neutral' },
};

export const AdminProducts: React.FC<AdminProductsProps> = ({
  initialSection = 'products',
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    products,
    categories,
    stockLogs,
    currentAdminRole,
    saveProduct,
    deleteProduct,
    adjustProductStock,
    saveCategory,
    addToast,
  } = useStore();
  const { getProductText, getCategoryText } = useThemeLanguage();

  const [activeSection, setActiveSection] =
    useState<AdminProductsSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('q') || ''
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');

  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isCreatingNewProduct, setIsCreatingNewProduct] =
    useState<boolean>(true);
  const [formProduct, setFormProduct] = useState<Product | null>(null);
  const [activeTransLang, setActiveTransLang] = useState<Language>('uz');
  const [newImageUrl, setNewImageUrl] = useState<string>('');
  const [isUploadingImages, setIsUploadingImages] = useState<boolean>(false);
  const [imageUploadError, setImageUploadError] = useState<string>('');
  const [productFormError, setProductFormError] = useState<string>('');

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [stockAdjustTarget, setStockAdjustTarget] = useState<Product | null>(
    null
  );
  const [stockAdjustMode, setStockAdjustMode] = useState<'set' | 'add' | 'sub'>(
    'add'
  );
  const [stockAdjustValue, setStockAdjustValue] = useState<number>(10);
  const [stockAdjustReason, setStockAdjustReason] = useState<string>(
    'Yangi partiya qabul qilindi'
  );

  const [isCategoryModalOpen, setIsCategoryModalOpen] =
    useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryFormError, setCategoryFormError] = useState<string>('');

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      setSearchQuery(qParam);
    }
    if (searchParams.get('action') === 'new') {
      handleOpenCreateProduct();
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams]);

  const createBlankProduct = (): Product => {
    const now = new Date().toISOString();
    const randomNum = Math.floor(100 + Math.random() * 900);
    return {
      id: `prod-${Date.now()}`,
      slug: '',
      sku: `ZVN-NEW-${randomNum}`,
      name: '',
      categoryId: categories[0]?.id || 'cat-home',
      price: 125000,
      salePrice: null,
      costPrice: 65000,
      stock: 20,
      lowStockThreshold: 5,
      status: 'active',
      shortDescription: '',
      description: '',
      features: [
        'Yuqori sifatli va mustahkam material',
        'ZAVEN omborida sifat nazoratidan oʻtgan',
      ],
      specifications: [
        {
          label: 'Ishlab chiqarilgan mamlakat',
          value: 'Xitoy (ZAVEN sifat nazorati)',
        },
      ],
      translations: {
        ru: { name: '', shortDescription: '', description: '' },
        en: { name: '', shortDescription: '', description: '' },
      },
      images: [
        'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80',
      ],
      isNew: true,
      isPopular: false,
      isRecommended: true,
      soldCount: 0,
      createdAt: now,
      updatedAt: now,
    };
  };

  const handleOpenCreateProduct = () => {
    setProductFormError('');
    setImageUploadError('');
    setIsCreatingNewProduct(true);
    setActiveTransLang('uz');
    setFormProduct(createBlankProduct());
    setNewImageUrl('');
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setProductFormError('');
    setImageUploadError('');
    setIsCreatingNewProduct(false);
    setActiveTransLang('uz');

    const seedRu = PRODUCT_DEFAULT_TRANSLATIONS[product.id]?.ru;
    const seedEn = PRODUCT_DEFAULT_TRANSLATIONS[product.id]?.en;

    setFormProduct({
      ...product,
      features: [...product.features],
      specifications: product.specifications.map((s) => ({ ...s })),
      images: [...product.images],
      translations: {
        uz: product.translations?.uz || {},
        ru: {
          name: product.translations?.ru?.name ?? seedRu?.name ?? '',
          shortDescription:
            product.translations?.ru?.shortDescription ??
            seedRu?.shortDescription ??
            '',
          description:
            product.translations?.ru?.description ?? seedRu?.description ?? '',
          features:
            product.translations?.ru?.features ?? seedRu?.features ?? [],
        },
        en: {
          name: product.translations?.en?.name ?? seedEn?.name ?? '',
          shortDescription:
            product.translations?.en?.shortDescription ??
            seedEn?.shortDescription ??
            '',
          description:
            product.translations?.en?.description ?? seedEn?.description ?? '',
          features:
            product.translations?.en?.features ?? seedEn?.features ?? [],
        },
      },
    });
    setNewImageUrl('');
    setIsProductModalOpen(true);
  };

  const handleDuplicateProduct = (product: Product) => {
    const now = new Date().toISOString();
    const copySku = `${product.sku}-COPY`;
    const copyName = `${product.name} (Nusxa)`;
    const duplicated: Product = {
      ...product,
      id: `prod-${Date.now()}`,
      sku: copySku,
      name: copyName,
      slug: `${slugify(copyName)}-${Date.now().toString().slice(-4)}`,
      status: 'hidden',
      soldCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    saveProduct(duplicated, true);
  };

  const handleQuickStatusChange = (
    product: Product,
    nextStatus: ProductStatus
  ) => {
    const updated: Product = {
      ...product,
      status: nextStatus,
      stock: nextStatus === 'out_of_stock' ? 0 : product.stock,
      updatedAt: new Date().toISOString(),
    };
    saveProduct(updated, false);
  };

  const handleAddImageByUrl = () => {
    setImageUploadError('');
    if (!formProduct || !newImageUrl.trim()) return;
    if (!newImageUrl.trim().startsWith('http')) {
      setImageUploadError('Toʻgʻri rasm URL manzilini kiriting (https://...)');
      return;
    }
    setFormProduct({
      ...formProduct,
      images: [...formProduct.images, newImageUrl.trim()],
    });
    setNewImageUrl('');
  };

  // Requirement 4: Multi-file upload with validation, Supabase Storage upload (never large base64 in DB), and progress state
  const handleMultiFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setImageUploadError('');
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0 || !formProduct) return;

    const files = Array.from(fileList);

    for (const file of files) {
      if (!ALLOWED_IMAGE_MIMES.includes(file.type)) {
        setImageUploadError(
          `Notoʻgʻri fayl formati (${file.name}). Faqat JPG, PNG yoki WEBP rasm yuklang.`
        );
        e.target.value = '';
        return;
      }
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        setImageUploadError(
          `${file.name} hajmi 4 MB dan katta. Iltimos, kichikroq rasm tanlang.`
        );
        e.target.value = '';
        return;
      }
    }

    setIsUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        if (isSupabaseConfigured && supabase) {
          const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storagePath = `${formProduct.id}/${Date.now()}_${safeName}`;
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (!uploadError) {
            const { data: pubData } = supabase.storage
              .from('product-images')
              .getPublicUrl(storagePath);
            if (pubData?.publicUrl) {
              uploadedUrls.push(pubData.publicUrl);
              continue;
            }
          }
        }

        // Local dev preview fallback using lightweight object URL
        const localObjectUrl = URL.createObjectURL(file);
        uploadedUrls.push(localObjectUrl);
      }

      if (uploadedUrls.length > 0) {
        setFormProduct((prev) =>
          prev
            ? {
                ...prev,
                images: [...prev.images, ...uploadedUrls],
              }
            : prev
        );
        addToast({
          type: 'success',
          title: `${uploadedUrls.length} ta rasm qoʻshildi`,
        });
      }
    } catch (err) {
      setImageUploadError(
        err instanceof Error ? err.message : 'Rasm yuklashda xatolik yuz berdi'
      );
    } finally {
      setIsUploadingImages(false);
      e.target.value = '';
    }
  };

  const handleSetPrimaryImage = (index: number) => {
    if (!formProduct || index === 0) return;
    const nextImages = [...formProduct.images];
    const [chosen] = nextImages.splice(index, 1);
    nextImages.unshift(chosen);
    setFormProduct({ ...formProduct, images: nextImages });
  };

  const handleMoveImage = (index: number, direction: 'up' | 'down') => {
    if (!formProduct) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formProduct.images.length) return;
    const nextImages = [...formProduct.images];
    const [moved] = nextImages.splice(index, 1);
    nextImages.splice(targetIdx, 0, moved);
    setFormProduct({ ...formProduct, images: nextImages });
  };

  const handleRemoveImage = (index: number) => {
    if (!formProduct) return;
    if (formProduct.images.length <= 1) {
      addToast({
        type: 'warning',
        title: 'Kamida 1 ta asosiy rasm boʻlishi zarur',
      });
      return;
    }
    setFormProduct({
      ...formProduct,
      images: formProduct.images.filter((_, idx) => idx !== index),
    });
  };

  const handleSubmitProductForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProduct) return;

    if (formProduct.name.trim().length < 3) {
      setProductFormError(
        'Asosiy (Oʻzbekcha) mahsulot nomini kiriting (kamida 3 ta belgi)'
      );
      setActiveTransLang('uz');
      return;
    }
    if (!formProduct.sku.trim()) {
      setProductFormError('Ichki kod (SKU) kiritilishi shart');
      return;
    }
    if (formProduct.price <= 0) {
      setProductFormError('Asosiy sotuv narxi 0 dan katta boʻlishi kerak');
      return;
    }
    if (
      formProduct.salePrice &&
      formProduct.salePrice >= formProduct.price
    ) {
      setProductFormError(
        'Chegirma narxi asosiy narxdan kichik boʻlishi lozim'
      );
      return;
    }

    const generatedSlug =
      formProduct.slug.trim() ||
      `${slugify(formProduct.name)}-${formProduct.sku.toLowerCase()}`;

    const finalProduct: Product = {
      ...formProduct,
      name: formProduct.name.trim(),
      sku: formProduct.sku.trim().toUpperCase(),
      slug: generatedSlug,
      shortDescription:
        formProduct.shortDescription.trim() || formProduct.name.trim(),
      description:
        formProduct.description.trim() ||
        formProduct.shortDescription.trim() ||
        formProduct.name.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (!isCreatingNewProduct) {
      const original = products.find((p) => p.id === finalProduct.id);
      if (original && original.stock !== finalProduct.stock) {
        adjustProductStock(
          finalProduct.id,
          finalProduct.stock,
          'Mahsulot tahrirlash oynasi orqali zaxira oʻzgartirildi'
        );
      }
    }

    saveProduct(finalProduct, isCreatingNewProduct);
    setIsProductModalOpen(false);
  };

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (stockFilter === 'out' && p.stock > 0) {
        return false;
      }
      if (
        stockFilter === 'low' &&
        (p.stock === 0 || p.stock > p.lowStockThreshold)
      ) {
        return false;
      }
      if (q) {
        const loc = getProductText(p);
        const matchName =
          p.name.toLowerCase().includes(q) ||
          loc.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [
    products,
    searchQuery,
    categoryFilter,
    statusFilter,
    stockFilter,
    getProductText,
  ]);

  const inventoryStats = useMemo(() => {
    const activeItems = products.filter((p) => p.status !== 'archived');
    const totalUnits = activeItems.reduce((s, p) => s + p.stock, 0);
    const totalCostValue = activeItems.reduce(
      (s, p) => s + p.stock * p.costPrice,
      0
    );
    const totalRetailValue = activeItems.reduce(
      (s, p) => s + p.stock * (p.salePrice ?? p.price),
      0
    );
    const lowStockCount = activeItems.filter(
      (p) => p.stock > 0 && p.stock <= p.lowStockThreshold
    ).length;
    const outOfStockCount = activeItems.filter((p) => p.stock <= 0).length;

    return {
      totalUnits,
      totalCostValue,
      totalRetailValue,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  const handleConfirmStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustTarget) return;

    let computedNewStock = stockAdjustTarget.stock;
    if (stockAdjustMode === 'set') {
      computedNewStock = Math.max(0, stockAdjustValue);
    } else if (stockAdjustMode === 'add') {
      computedNewStock = Math.max(
        0,
        stockAdjustTarget.stock + stockAdjustValue
      );
    } else {
      computedNewStock = Math.max(
        0,
        stockAdjustTarget.stock - stockAdjustValue
      );
    }

    adjustProductStock(
      stockAdjustTarget.id,
      computedNewStock,
      stockAdjustReason.trim() || 'Ombor qoldigʻi yangilandi'
    );
    setStockAdjustTarget(null);
  };

  const handleOpenCategoryModal = (cat?: Category) => {
    setCategoryFormError('');
    if (cat) {
      setEditingCategory({ ...cat });
    } else {
      setEditingCategory({
        id: `cat-${Date.now()}`,
        slug: '',
        name: '',
        description: '',
        iconName: 'Home',
        image:
          'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80',
        isActive: true,
        sortOrder: categories.length + 1,
      });
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategoryForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    if (editingCategory.name.trim().length < 2) {
      setCategoryFormError('Toifa nomini kiriting');
      return;
    }

    const finalCat: Category = {
      ...editingCategory,
      name: editingCategory.name.trim(),
      slug:
        editingCategory.slug.trim() || slugify(editingCategory.name.trim()),
      description:
        editingCategory.description.trim() ||
        `${editingCategory.name.trim()} turkumidagi mahsulotlar`,
    };

    saveCategory(finalCat);
    setIsCategoryModalOpen(false);
  };

  const showCostMetrics =
    currentAdminRole === 'owner' || currentAdminRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
            Mahsulotlar, Koʻp Rasmli Galereya va Ombor Zaxirasi
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Mahsulotlarni 3 tilda tahrirlash, koʻp rasmli galereya va asosiy muqovani belgilash
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-surface-page p-1 border border-gray-200">
            <Link
              to="/admin/products"
              onClick={() => setActiveSection('products')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'products'
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Mahsulotlar ({products.length})</span>
            </Link>

            <Link
              to="/admin/inventory"
              onClick={() => setActiveSection('inventory')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'inventory'
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Ombor ({stockLogs.length})</span>
            </Link>

            <Link
              to="/admin/categories"
              onClick={() => setActiveSection('categories')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'categories'
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <FolderTree className="w-4 h-4" />
              <span>Toifalar ({categories.length})</span>
            </Link>
          </div>

          {activeSection === 'categories' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenCategoryModal()}
            >
              Yangi toifa
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenCreateProduct}
            >
              Yangi mahsulot qoʻshish
            </Button>
          )}
        </div>
      </div>

      {/* SECTION 1: PRODUCTS MANAGEMENT TABLE */}
      {activeSection === 'products' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Mahsulot nomi yoki SKU kodi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
              rightElement={
                searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            />

            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Barcha toifalar' },
                ...categories.map((c) => ({
                  value: c.id,
                  label: getCategoryText(c).name,
                })),
              ]}
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Barcha holatlar' },
                { value: 'active', label: 'Faol (Sotuvda)' },
                { value: 'out_of_stock', label: 'Vaqtincha tugagan' },
                { value: 'hidden', label: 'Yashirilgan' },
                { value: 'archived', label: 'Arxivlangan' },
              ]}
            />

            <Select
              value={stockFilter}
              onChange={(e) =>
                setStockFilter(e.target.value as 'all' | 'low' | 'out')
              }
              options={[
                { value: 'all', label: 'Zaxira: Barchasi' },
                { value: 'low', label: 'Kam qolgan zaxiralar' },
                { value: 'out', label: 'Tugagan (0 dona)' },
              ]}
            />
          </div>

          {filteredProducts.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4">Mahsulot va Rasmlar</th>
                      <th className="py-3.5 px-4">Toifa</th>
                      <th className="py-3.5 px-4">Sotuv narxi</th>
                      {showCostMetrics && (
                        <th className="py-3.5 px-4">Tannarx / Foyda</th>
                      )}
                      <th className="py-3.5 px-4">Ombor qoldigʻi</th>
                      <th className="py-3.5 px-4">Holati</th>
                      <th className="py-3.5 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                    {filteredProducts.map((product) => {
                      const locProduct = getProductText(product);
                      const category = categories.find(
                        (c) => c.id === product.categoryId
                      );
                      const effectivePrice = product.salePrice ?? product.price;
                      const profitPerUnit = effectivePrice - product.costPrice;
                      const marginPercent =
                        effectivePrice > 0
                          ? Math.round((profitPerUnit / effectivePrice) * 100)
                          : 0;
                      const isLow =
                        product.stock > 0 &&
                        product.stock <= product.lowStockThreshold;
                      const statusMeta = PRODUCT_STATUS_META[product.status];

                      return (
                        <tr
                          key={product.id}
                          className="hover:bg-surface-page/70 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3 max-w-xs sm:max-w-sm">
                              <img
                                src={product.images[0]}
                                alt={locProduct.name}
                                className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0 bg-gray-50"
                              />
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 line-clamp-1">
                                  {locProduct.name}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                  <span className="font-mono font-semibold text-gray-700">
                                    {product.sku}
                                  </span>
                                  <span>•</span>
                                  <span>{product.images.length} ta rasm</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap text-xs font-semibold text-gray-700">
                            {category ? getCategoryText(category).name : '—'}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-extrabold text-brand-green">
                              {formatUZS(effectivePrice)}
                            </div>
                            {product.salePrice && (
                              <div className="text-[11px] text-gray-400 line-through">
                                {formatUZS(product.price)} (-
                                {calculateDiscountPercent(
                                  product.price,
                                  product.salePrice
                                )}
                                %)
                              </div>
                            )}
                          </td>

                          {showCostMetrics && (
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="text-xs text-gray-700 font-medium">
                                Tannarx: {formatUZS(product.costPrice)}
                              </div>
                              <div className="text-[11px] font-bold text-emerald-700 mt-0.5">
                                +{formatUZS(profitPerUnit)} ({marginPercent}%)
                              </div>
                            </td>
                          )}

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-extrabold ${
                                  product.stock <= 0
                                    ? 'text-red-600'
                                    : isLow
                                    ? 'text-amber-700'
                                    : 'text-gray-900'
                                }`}
                              >
                                {product.stock} dona
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setStockAdjustTarget(product);
                                  setStockAdjustMode('add');
                                  setStockAdjustValue(10);
                                  setStockAdjustReason(
                                    'Yangi partiya qabul qilindi'
                                  );
                                }}
                                className="px-2 py-0.5 rounded bg-brand-green-light text-brand-green text-[11px] font-bold hover:bg-[#0F3D2E] hover:text-white transition-colors"
                              >
                                +/- Zaxira
                              </button>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge variant={statusMeta.variant} size="sm">
                              {statusMeta.label}
                            </Badge>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenEditProduct(product)}
                                className="p-1.5 rounded-lg text-gray-700 hover:bg-brand-green-light hover:text-brand-green transition-colors"
                                title="Tahrirlash (UZ/RU/EN va Rasmlar)"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDuplicateProduct(product)}
                                className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                title="Nusxa olish"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatusChange(
                                    product,
                                    product.status === 'hidden'
                                      ? 'active'
                                      : 'hidden'
                                  )
                                }
                                className="p-1.5 rounded-lg text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                              >
                                {product.status === 'hidden' ? (
                                  <Eye className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <EyeOff className="w-4 h-4" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickStatusChange(
                                    product,
                                    product.status === 'archived'
                                      ? 'active'
                                      : 'archived'
                                  )
                                }
                                className="p-1.5 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                <Archive className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setProductToDelete(product)}
                                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Mahsulot topilmadi"
              description="Qidiruv yoki filtr shartlariga mos mahsulot topilmadi."
              actionLabel="Filtrlarni tozalash"
              onAction={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setStatusFilter('all');
                setStockFilter('all');
              }}
            />
          )}
        </div>
      )}

      {/* SECTION 2: INVENTORY & STOCK CHANGE HISTORY */}
      {activeSection === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Ombordagi jami zaxira
              </span>
              <p className="text-2xl font-extrabold text-brand-green mt-2">
                {inventoryStats.totalUnits} dona
              </p>
            </div>

            {showCostMetrics && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Zaxira tannarxi / Chakana qiymati
                </span>
                <p className="text-lg font-extrabold text-gray-900 mt-2">
                  {formatUZS(inventoryStats.totalCostValue)}
                </p>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Sotuv: {formatUZS(inventoryStats.totalRetailValue)}
                </p>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Kam qolgan mahsulotlar
              </span>
              <p className="text-2xl font-extrabold text-amber-600 mt-2">
                {inventoryStats.lowStockCount} xil
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card">
              <span className="text-xs font-bold uppercase tracking-wider text-red-700">
                Tugagan mahsulotlar
              </span>
              <p className="text-2xl font-extrabold text-red-600 mt-2">
                {inventoryStats.outOfStockCount} xil
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <section className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="p-5 border-b border-gray-200">
                <h2 className="text-base font-extrabold text-gray-900">
                  Mahsulotlar zaxira qoldigʻi boshqaruvi
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-3 px-4">Mahsulot / SKU</th>
                      <th className="py-3 px-4">Joriy zaxira</th>
                      <th className="py-3 px-4 text-right">Amal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                    {products
                      .filter((p) => p.status !== 'archived')
                      .map((prod) => (
                        <tr key={prod.id} className="hover:bg-surface-page">
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900 line-clamp-1">
                              {getProductText(prod).name}
                            </p>
                            <span className="font-mono text-xs text-gray-500">
                              {prod.sku}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-brand-green">
                            {prod.stock} dona
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setStockAdjustTarget(prod);
                                setStockAdjustMode('add');
                                setStockAdjustValue(10);
                              }}
                            >
                              Kirim / Chiqim
                            </Button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-brand-green" />
                  <h2 className="text-base font-extrabold text-gray-900">
                    Zaxira oʻzgarishlari tarixi
                  </h2>
                </div>
                <Badge variant="gold" size="sm">
                  {stockLogs.length}
                </Badge>
              </div>

              <div className="divide-y divide-gray-100 max-h-[540px] overflow-y-auto scrollbar-thin">
                {stockLogs.map((log) => {
                  const isPositive = log.changeAmount >= 0;
                  return (
                    <div key={log.id} className="p-4 space-y-1.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-gray-900 line-clamp-1">
                          {log.productName}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full font-extrabold shrink-0 ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {isPositive
                            ? `+${log.changeAmount}`
                            : log.changeAmount}{' '}
                          dona
                        </span>
                      </div>
                      <p className="text-gray-600">{log.reason}</p>
                      <div className="text-[11px] text-gray-400">
                        {log.sku} ({log.previousStock} → {log.newStock}) •{' '}
                        {formatDateUz(log.createdAt, true)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* SECTION 3: CATEGORIES MANAGEMENT */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => {
              const locCat = getCategoryText(cat);
              const catProductsCount = products.filter(
                (p) => p.categoryId === cat.id
              ).length;
              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="relative h-36 bg-gray-100">
                      <img
                        src={cat.image}
                        alt={locCat.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-1.5">
                      <h3 className="text-base font-extrabold text-gray-900">
                        {locCat.name}
                      </h3>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {locCat.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-brand-green">
                      {catProductsCount} mahsulot
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenCategoryModal(cat)}
                    >
                      Tahrirlash
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD / EDIT PRODUCT WITH MULTI-IMAGE GALLERY & ORDERING       */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={
          isCreatingNewProduct
            ? 'Yangi mahsulot qoʻshish (Koʻp rasmli galereya va 3 til)'
            : `Mahsulotni tahrirlash: ${formProduct?.sku}`
        }
        maxWidth="2xl"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsProductModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="admin-product-form"
              variant="primary"
              size="sm"
              disabled={isUploadingImages}
            >
              Saqlash
            </Button>
          </>
        }
      >
        {formProduct && (
          <form
            id="admin-product-form"
            onSubmit={handleSubmitProductForm}
            className="space-y-6 text-xs sm:text-sm"
          >
            {productFormError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                {productFormError}
              </div>
            )}

            {/* Multi-Language Content Switcher Tabs */}
            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <Globe className="w-4 h-4 text-brand-green" />
                  <span>Mahsulot nomi va tavsifi tarjimalari:</span>
                </div>

                <div className="inline-flex rounded-lg bg-white p-1 border border-gray-200">
                  {(
                    [
                      { code: 'uz', label: 'Oʻzbekcha (Asosiy)' },
                      { code: 'ru', label: 'Русский (RU)' },
                      { code: 'en', label: 'English (EN)' },
                    ] as { code: Language; label: string }[]
                  ).map((langTab) => (
                    <button
                      key={langTab.code}
                      type="button"
                      onClick={() => setActiveTransLang(langTab.code)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                        activeTransLang === langTab.code
                          ? 'bg-[#0F3D2E] text-white'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {langTab.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeTransLang === 'uz' && (
                <div className="space-y-3">
                  <Input
                    label="Mahsulot nomi (Oʻzbek lotin — Majburiy asosiy til)"
                    required
                    value={formProduct.name}
                    onChange={(e) =>
                      setFormProduct({
                        ...formProduct,
                        name: e.target.value,
                        slug: isCreatingNewProduct
                          ? slugify(e.target.value)
                          : formProduct.slug,
                      })
                    }
                    placeholder="Masalan: Sensorli LED stol chirogʻi"
                  />

                  <Input
                    label="Qisqacha tavsif (Tezkor koʻrish oynasida chiqadi)"
                    required
                    value={formProduct.shortDescription}
                    onChange={(e) =>
                      setFormProduct({
                        ...formProduct,
                        shortDescription: e.target.value,
                      })
                    }
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      Batafsil tavsif (Mahsulot sahifasida chiqadi)
                    </label>
                    <textarea
                      rows={3}
                      value={formProduct.description}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTransLang === 'ru' && (
                <div className="space-y-3">
                  <Input
                    label="Название товара (Русский)"
                    value={formProduct.translations?.ru?.name || ''}
                    onChange={(e) =>
                      setFormProduct({
                        ...formProduct,
                        translations: {
                          ...formProduct.translations,
                          ru: {
                            ...formProduct.translations?.ru,
                            name: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder={formProduct.name}
                  />
                  <Input
                    label="Краткое описание (Русский)"
                    value={formProduct.translations?.ru?.shortDescription || ''}
                    onChange={(e) =>
                      setFormProduct({
                        ...formProduct,
                        translations: {
                          ...formProduct.translations,
                          ru: {
                            ...formProduct.translations?.ru,
                            shortDescription: e.target.value,
                          },
                        },
                      })
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      Подробное описание (Русский)
                    </label>
                    <textarea
                      rows={3}
                      value={formProduct.translations?.ru?.description || ''}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          translations: {
                            ...formProduct.translations,
                            ru: {
                              ...formProduct.translations?.ru,
                              description: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {activeTransLang === 'en' && (
                <div className="space-y-3">
                  <Input
                    label="Product Name (English)"
                    value={formProduct.translations?.en?.name || ''}
                    onChange={(e) =>
                      setFormProduct({
                        ...formProduct,
                        translations: {
                          ...formProduct.translations,
                          en: {
                            ...formProduct.translations?.en,
                            name: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder={formProduct.name}
                  />
                  <Input
                    label="Short Description (English)"
                    value={formProduct.translations?.en?.shortDescription || ''}
                    onChange={(e) =>
                      setFormProduct({
                        ...formProduct,
                        translations: {
                          ...formProduct.translations,
                          en: {
                            ...formProduct.translations?.en,
                            shortDescription: e.target.value,
                          },
                        },
                      })
                    }
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1.5">
                      Full Description (English)
                    </label>
                    <textarea
                      rows={3}
                      value={formProduct.translations?.en?.description || ''}
                      onChange={(e) =>
                        setFormProduct({
                          ...formProduct,
                          translations: {
                            ...formProduct.translations,
                            en: {
                              ...formProduct.translations?.en,
                              description: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* SKU, Category & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Ichki kod (SKU)"
                required
                value={formProduct.sku}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    sku: e.target.value.toUpperCase(),
                  })
                }
              />

              <Select
                label="Toifa"
                required
                value={formProduct.categoryId}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    categoryId: e.target.value,
                  })
                }
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />

              <Select
                label="Holati"
                required
                value={formProduct.status}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    status: e.target.value as ProductStatus,
                  })
                }
                options={[
                  { value: 'active', label: 'Faol' },
                  { value: 'out_of_stock', label: 'Vaqtincha tugagan' },
                  { value: 'hidden', label: 'Yashirilgan' },
                  { value: 'archived', label: 'Arxivlangan' },
                ]}
              />
            </div>

            {/* Pricing & Stock */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-xl bg-surface-page border border-gray-200">
              <Input
                label="Narx (soʻm)"
                type="number"
                required
                value={formProduct.price}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    price: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Chegirma narx"
                type="number"
                value={formProduct.salePrice ?? ''}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    salePrice: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
              <Input
                label="Tannarx"
                type="number"
                required
                value={formProduct.costPrice}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    costPrice: Number(e.target.value),
                  })
                }
              />
              <Input
                label="Zaxira (dona)"
                type="number"
                required
                value={formProduct.stock}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    stock: Math.max(0, Number(e.target.value)),
                  })
                }
              />
              <Input
                label="Min chegara"
                type="number"
                required
                value={formProduct.lowStockThreshold}
                onChange={(e) =>
                  setFormProduct({
                    ...formProduct,
                    lowStockThreshold: Math.max(1, Number(e.target.value)),
                  })
                }
              />
            </div>

            {/* Requirement 4: Multi-Image Upload, Primary Cover Badge, Reordering & Removal */}
            <div className="space-y-3.5 pt-3 border-t border-gray-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900">
                    Mahsulot rasmlari galereyasi ({formProduct.images.length} ta)
                  </h4>
                  <p className="text-[11px] text-gray-500">
                    1-rasm katalog va bosh sahifada asosiy muqova sifatida koʻrinadi. Format: JPG, PNG, WEBP (≤ 4 MB).
                  </p>
                </div>

                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#16533F] text-white text-xs font-bold cursor-pointer shadow-sm">
                  {isUploadingImages ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#C89D54]" />
                  ) : (
                    <Upload className="w-4 h-4 text-[#C89D54]" />
                  )}
                  <span>
                    {isUploadingImages
                      ? 'Yuklanmoqda...'
                      : 'Bir nechta rasm yuklash'}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    disabled={isUploadingImages}
                    onChange={handleMultiFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {imageUploadError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-bold text-red-600">
                  {imageUploadError}
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Yoki rasm URL manzilini kiriting (https://...)"
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddImageByUrl}
                >
                  URL qoʻshish
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {formProduct.images.map((img, idx) => {
                  const isPrimary = idx === 0;
                  return (
                    <div
                      key={`${img}-${idx}`}
                      className={`p-2.5 rounded-xl border-2 flex items-center justify-between gap-2.5 ${
                        isPrimary
                          ? 'border-[#C89D54] bg-brand-gold-light/30'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={img}
                          alt={`Rasm ${idx + 1}`}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-extrabold text-gray-900">
                              #{idx + 1}
                            </span>
                            {isPrimary ? (
                              <Badge variant="gold" size="sm">
                                Asosiy muqova
                              </Badge>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryImage(idx)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline"
                              >
                                <Star className="w-3 h-3" />
                                <span>Asosiy qilish</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400 truncate max-w-[140px]">
                            {img}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, 'up')}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                          title="Yuqoriga surish"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === formProduct.images.length - 1}
                          onClick={() => handleMoveImage(idx, 'down')}
                          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
                          title="Pastga surish"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(idx)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                          title="Rasmni oʻchirish"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(stockAdjustTarget)}
        onClose={() => setStockAdjustTarget(null)}
        title="Ombor qoldigʻini oʻzgartirish"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStockAdjustTarget(null)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="stock-adjust-form"
              variant="primary"
              size="sm"
            >
              Saqlash
            </Button>
          </>
        }
      >
        {stockAdjustTarget && (
          <form
            id="stock-adjust-form"
            onSubmit={handleConfirmStockAdjustment}
            className="space-y-4 text-xs sm:text-sm"
          >
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'add', label: '+ Kirim' },
                { id: 'sub', label: '- Chiqim' },
                { id: 'set', label: '= Aniq qiymat' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    setStockAdjustMode(m.id as 'add' | 'sub' | 'set')
                  }
                  className={`py-2 px-3 rounded-lg text-xs font-bold border ${
                    stockAdjustMode === m.id
                      ? 'bg-[#0F3D2E] text-white border-[#0F3D2E]'
                      : 'bg-white text-gray-700 border-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <Input
              label="Miqdor (dona)"
              type="number"
              required
              min={0}
              value={stockAdjustValue}
              onChange={(e) =>
                setStockAdjustValue(Math.max(0, Number(e.target.value)))
              }
            />

            <Input
              label="Sabab"
              required
              value={stockAdjustReason}
              onChange={(e) => setStockAdjustReason(e.target.value)}
            />
          </form>
        )}
      </Modal>

      {/* Delete Product Modal */}
      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Mahsulotni oʻchirish"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProductToDelete(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (productToDelete) {
                  deleteProduct(productToDelete.id);
                  setProductToDelete(null);
                }
              }}
            >
              Oʻchirish
            </Button>
          </>
        }
      >
        {productToDelete && (
          <p className="text-sm text-gray-700">
            <strong>«{productToDelete.name}»</strong> ({productToDelete.sku})?
          </p>
        )}
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Toifa"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="admin-category-form"
              variant="primary"
              size="sm"
            >
              Saqlash
            </Button>
          </>
        }
      >
        {editingCategory && (
          <form
            id="admin-category-form"
            onSubmit={handleSaveCategoryForm}
            className="space-y-4"
          >
            {categoryFormError && (
              <p className="text-xs font-bold text-red-600">
                {categoryFormError}
              </p>
            )}
            <Input
              label="Toifa nomi"
              required
              value={editingCategory.name}
              onChange={(e) =>
                setEditingCategory({
                  ...editingCategory,
                  name: e.target.value,
                  slug: slugify(e.target.value),
                })
              }
            />
            <Input
              label="Tavsif"
              required
              value={editingCategory.description}
              onChange={(e) =>
                setEditingCategory({
                  ...editingCategory,
                  description: e.target.value,
                })
              }
            />
            <Input
              label="Rasm URL"
              required
              value={editingCategory.image}
              onChange={(e) =>
                setEditingCategory({
                  ...editingCategory,
                  image: e.target.value,
                })
              }
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
