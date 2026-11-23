import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  FolderTree,
  Boxes,
  Plus,
  Search,
  Edit3,
  Trash2,
  Upload,
  AlertTriangle,
  X,
  ArrowUp,
  ArrowDown,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Category, Product, ProductStatus } from '../../types';
import {
  formatDateUz,
  formatUZS,
  getPersistenceErrorMessage,
  slugify,
} from '../../utils/format';
import { ProductImage } from '../../components/ui/ProductImage';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, NumericInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export type AdminProductsSection = 'products' | 'categories' | 'inventory';

interface AdminProductsProps {
  initialSection?: AdminProductsSection;
}

const PRODUCT_STATUS_META: Record<
  ProductStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'neutral' | 'danger';
  }
> = {
  active: { label: 'Sotuvda faol', variant: 'success' },
  out_of_stock: { label: 'Tugagan', variant: 'danger' },
  hidden: { label: 'Yashirilgan', variant: 'warning' },
  archived: { label: 'Arxivlangan', variant: 'neutral' },
};

const ICON_OPTIONS = [
  { value: 'Home', label: 'Uy-roʻzgʻor (Home)' },
  { value: 'Smartphone', label: 'Telefon va Gadjet (Smartphone)' },
  { value: 'Zap', label: 'Texnika va Elektronika (Zap)' },
  { value: 'Gift', label: 'Sovgʻalar (Gift)' },
  { value: 'Compass', label: 'Avto va Sayohat (Compass)' },
];

export const AdminProducts: React.FC<AdminProductsProps> = ({
  initialSection = 'products',
}) => {
  const {
    products,
    categories,
    stockLogs,
    saveProduct,
    deleteProduct,
    adjustProductStock,
    uploadImageFile,
    saveCategory,
    deleteCategory,
    addToast,
  } = useStore();

  const [activeSection, setActiveSection] =
    useState<AdminProductsSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Product Form Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [isNewProductMode, setIsNewProductMode] = useState<boolean>(false);
  const [editingProductId, setEditingProductId] = useState<string>('');
  const [prodName, setProdName] = useState<string>('');
  const [prodSku, setProdSku] = useState<string>('');
  const [prodCategoryId, setProdCategoryId] = useState<string>(
    categories[0]?.id || 'cat-home'
  );
  const [prodPrice, setProdPrice] = useState<number>(0);
  const [prodSalePrice, setProdSalePrice] = useState<number | null>(null);
  const [prodCostPrice, setProdCostPrice] = useState<number>(0);
  const [prodStock, setProdStock] = useState<number>(10);
  const [prodLowStockThreshold, setProdLowStockThreshold] = useState<number>(5);
  const [prodStatus, setProdStatus] = useState<ProductStatus>('active');
  const [prodShortDesc, setProdShortDesc] = useState<string>('');
  const [prodDesc, setProdDesc] = useState<string>('');
  const [prodFeaturesText, setProdFeaturesText] = useState<string>('');
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodIsNew, setProdIsNew] = useState<boolean>(false);
  const [prodIsPopular, setProdIsPopular] = useState<boolean>(false);
  const [prodIsRecommended, setProdIsRecommended] = useState<boolean>(false);
  const [isUploadingProductImages, setIsUploadingProductImages] =
    useState<boolean>(false);
  const [productFormError, setProductFormError] = useState<string>('');
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isSavingStock, setIsSavingStock] = useState(false);

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Category Form Modal State (Local File Upload — Never Requires Raw URL)
  const [isCategoryModalOpen, setIsCategoryModalOpen] =
    useState<boolean>(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [catName, setCatName] = useState<string>('');
  const [catDesc, setCatDesc] = useState<string>('');
  const [catIconName, setCatIconName] = useState<string>('Home');
  const [catImage, setCatImage] = useState<string>('');
  const [catSortOrder, setCatSortOrder] = useState<number>(1);
  const [catIsActive, setCatIsActive] = useState<boolean>(true);
  const [isUploadingCatImage, setIsUploadingCatImage] =
    useState<boolean>(false);
  const [catFormError, setCatFormError] = useState<string>('');

  // Safe Category Delete & Reassignment Modal State
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [reassignTargetCatId, setReassignTargetCatId] = useState<string>('');
  const [catDeleteError, setCatDeleteError] = useState<string>('');
  const [isDeletingCategory, setIsDeletingCategory] = useState<boolean>(false);

  // Inventory Stock Adjustment Modal
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(
    null
  );
  const [newStockValue, setNewStockValue] = useState<number>(0);
  const [newThresholdValue, setNewThresholdValue] = useState<number>(5);
  const [stockReason, setStockReason] = useState<string>('');
  const [stockFormError, setStockFormError] = useState<string>('');

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.categoryId !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && p.status !== statusFilter) {
        return false;
      }
      if (q) {
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }
      return true;
    });
  }, [products, searchQuery, categoryFilter, statusFilter]);

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name || 'Toifa';

  const handleOpenProductModal = (product?: Product) => {
    setProductFormError('');
    if (product) {
      setIsNewProductMode(false);
      setEditingProductId(product.id);
      setProdName(product.name);
      setProdSku(product.sku);
      setProdCategoryId(product.categoryId);
      setProdPrice(product.price);
      setProdSalePrice(product.salePrice ?? null);
      setProdCostPrice(product.costPrice);
      setProdStock(product.stock);
      setProdLowStockThreshold(product.lowStockThreshold);
      setProdStatus(product.status);
      setProdShortDesc(product.shortDescription);
      setProdDesc(product.description);
      setProdFeaturesText(product.features.join('\n'));
      setProdImages(product.images || []);
      setProdIsNew(Boolean(product.isNew));
      setProdIsPopular(Boolean(product.isPopular));
      setProdIsRecommended(Boolean(product.isRecommended));
    } else {
      setIsNewProductMode(true);
      setEditingProductId(`prod-${Date.now()}`);
      setProdName('');
      setProdSku(`ZVN-${Math.floor(100 + Math.random() * 900)}`);
      setProdCategoryId(categories[0]?.id || 'cat-home');
      setProdPrice(0);
      setProdSalePrice(null);
      setProdCostPrice(0);
      setProdStock(15);
      setProdLowStockThreshold(5);
      setProdStatus('active');
      setProdShortDesc('');
      setProdDesc('');
      setProdFeaturesText('');
      setProdImages([]);
      setProdIsNew(true);
      setProdIsPopular(false);
      setProdIsRecommended(false);
    }
    setIsProductModalOpen(true);
  };

  const handleProductImageFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProductFormError('');
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    setIsUploadingProductImages(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const url = await uploadImageFile(file, 'products');
        uploadedUrls.push(url);
      }
      setProdImages((prev) => [...prev, ...uploadedUrls]);
      addToast({
        type: 'success',
        title: `${uploadedUrls.length} ta rasm yuklandi`,
      });
    } catch (err) {
      setProductFormError(
        getPersistenceErrorMessage(err, 'Rasm')
      );
    } finally {
      setIsUploadingProductImages(false);
      e.target.value = '';
    }
  };

  const handleReplaceSingleProductImage = async (
    index: number,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProductFormError('');
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingProductImages(true);
    try {
      const url = await uploadImageFile(file, 'products');
      setProdImages((prev) =>
        prev.map((oldUrl, idx) => (idx === index ? url : oldUrl))
      );
      addToast({
        type: 'success',
        title: `Rasm #${index + 1} almashtirildi`,
      });
    } catch (err) {
      setProductFormError(
        getPersistenceErrorMessage(err, 'Rasm')
      );
    } finally {
      setIsUploadingProductImages(false);
      e.target.value = '';
    }
  };

  const handleMoveProductImage = (index: number, direction: -1 | 1) => {
    setProdImages((prev) => {
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  const handleRemoveProductImage = (index: number) => {
    setProdImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProductFormError('');

    if (prodName.trim().length < 3) {
      setProductFormError('Mahsulot nomini toʻliq kiriting');
      return;
    }
    if (!prodSku.trim()) {
      setProductFormError('SKU kodini kiriting');
      return;
    }
    if (prodPrice < 0) {
      setProductFormError('Asosiy sotuv narxi manfiy boʻlishi mumkin emas');
      return;
    }
    if (
      prodSalePrice !== null &&
      prodSalePrice > 0 &&
      prodSalePrice >= prodPrice
    ) {
      setProductFormError(
        'Chegirma narxi asosiy narxdan kichik boʻlishi kerak'
      );
      return;
    }
    if (prodImages.length === 0) {
      setProductFormError(
        'Kamida bitta mahsulot rasmini qurilmangizdan yuklang'
      );
      return;
    }

    const now = new Date().toISOString();
    const existingProd = products.find((p) => p.id === editingProductId);

    const nextProduct: Product = {
      id: editingProductId,
      slug:
        existingProd?.slug ||
        `${slugify(prodName)}-${Date.now().toString().slice(-4)}`,
      sku: prodSku.trim().toUpperCase(),
      name: prodName.trim(),
      categoryId: prodCategoryId,
      price: Math.round(prodPrice),
      salePrice:
        prodSalePrice && prodSalePrice > 0 ? Math.round(prodSalePrice) : null,
      costPrice: Math.round(prodCostPrice),
      stock: Math.max(0, Math.round(prodStock)),
      lowStockThreshold: Math.max(1, Math.round(prodLowStockThreshold)),
      status:
        prodStock <= 0 && prodStatus === 'active'
          ? 'out_of_stock'
          : prodStatus,
      shortDescription: prodShortDesc.trim() || prodName.trim(),
      description: prodDesc.trim() || prodShortDesc.trim() || prodName.trim(),
      features: prodFeaturesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      specifications: existingProd?.specifications || [],
      translations: existingProd?.translations,
      images: prodImages,
      isNew: prodIsNew,
      isPopular: prodIsPopular,
      isRecommended: prodIsRecommended,
      soldCount: existingProd?.soldCount || 0,
      createdAt: existingProd?.createdAt || now,
      updatedAt: now,
    };

    setIsSavingProduct(true);
    try {
      const result = await saveProduct(nextProduct, isNewProductMode);
      if (result.ok) setIsProductModalOpen(false);
      else setProductFormError(result.error || 'Mahsulot saqlanmadi. Qayta urinib koʻring.');
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleOpenCategoryModal = (cat?: Category) => {
    setCatFormError('');
    if (cat) {
      setEditingCategoryId(cat.id);
      setCatName(cat.name);
      setCatDesc(cat.description);
      setCatIconName(cat.iconName);
      setCatImage(cat.image);
      setCatSortOrder(cat.sortOrder);
      setCatIsActive(cat.isActive);
    } else {
      setEditingCategoryId(null);
      setCatName('');
      setCatDesc('');
      setCatIconName('Home');
      setCatImage('');
      setCatSortOrder(categories.length + 1);
      setCatIsActive(true);
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategoryImageFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCatFormError('');
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCatImage(true);
    try {
      const uploadedUrl = await uploadImageFile(file, 'categories');
      setCatImage(uploadedUrl);
      addToast({
        type: 'success',
        title: 'Toifa rasmi yuklandi',
      });
    } catch (err) {
      setCatFormError(
        err instanceof Error ? err.message : 'Toifa rasmini yuklashda xatolik'
      );
    } finally {
      setIsUploadingCatImage(false);
      e.target.value = '';
    }
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCatFormError('');

    if (catName.trim().length < 2) {
      setCatFormError('Toifa nomini kiriting');
      return;
    }
    if (!catImage.trim()) {
      setCatFormError('Toifa rasmini qurilmangizdan tanlab yuklang');
      return;
    }

    const id = editingCategoryId || `cat-${Date.now()}`;
    const existing = categories.find((c) => c.id === id);

    setIsSavingCategory(true);
    const saved = await saveCategory({
      id,
      slug: existing?.slug || slugify(catName),
      name: catName.trim(),
      description: catDesc.trim(),
      iconName: catIconName,
      image: catImage,
      isActive: catIsActive,
      sortOrder: Math.max(1, catSortOrder),
    });

    if (saved) setIsCategoryModalOpen(false);
    else setCatFormError('Toifa saqlanmadi. Oyna yopilmadi; xatoni tuzatib qayta urinib koʻring.');
    setIsSavingCategory(false);
  };

  const dependentProductsForCatToDelete = useMemo(() => {
    if (!categoryToDelete) return [];
    return products.filter((p) => p.categoryId === categoryToDelete.id);
  }, [categoryToDelete, products]);

  const availableReassignCategories = useMemo(() => {
    if (!categoryToDelete) return [];
    return categories.filter((c) => c.id !== categoryToDelete.id);
  }, [categoryToDelete, categories]);

  const handleOpenDeleteCategoryModal = (cat: Category) => {
    setCatDeleteError('');
    setCategoryToDelete(cat);
    const otherCats = categories.filter((c) => c.id !== cat.id);
    setReassignTargetCatId(otherCats[0]?.id || '');
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    setCatDeleteError('');

    if (
      dependentProductsForCatToDelete.length > 0 &&
      !reassignTargetCatId
    ) {
      setCatDeleteError(
        'Ushbu toifadagi mahsulotlarni oʻtkazish uchun boshqa toifani tanlang.'
      );
      return;
    }

    setIsDeletingCategory(true);
    try {
      const res = await deleteCategory(
        categoryToDelete.id,
        dependentProductsForCatToDelete.length > 0
          ? reassignTargetCatId
          : undefined
      );
      if (!res.ok) {
        setCatDeleteError(res.error || 'Toifani oʻchirib boʻlmadi');
        return;
      }
      setCategoryToDelete(null);
    } finally {
      setIsDeletingCategory(false);
    }
  };

  const handleSaveStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct || isSavingStock) return;

    setStockFormError('');
    setIsSavingStock(true);
    try {
      const result = await adjustProductStock(
        stockModalProduct.id,
        Math.max(0, Math.round(newStockValue)),
        stockReason,
        Math.max(1, Math.round(newThresholdValue))
      );
      if (result.ok) setStockModalProduct(null);
      else setStockFormError(result.error || 'Zaxira saqlanmadi. Kiritilgan qiymatlarni tekshirib qayta urinib koʻring.');
    } catch (error) {
      const message = getPersistenceErrorMessage(error, 'Zaxira');
      setStockFormError(message);
      addToast({ type: 'error', title: 'Zaxira saqlanmadi', description: message });
    } finally {
      setIsSavingStock(false);
    }
  };

  return (
    <div className="admin-products-page space-y-6">
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Mahsulotlar, Toifalar va Ombor Zaxirasi
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Qurilmadan rasmlar yuklash, narx va qoldiqlarni boshqarish
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-surface-page dark:bg-[#162923] p-1 border border-gray-200 dark:border-[#28453B]">
            <Link
              to="/admin/products"
              onClick={() => setActiveSection('products')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'products'
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Mahsulotlar ({products.length})</span>
            </Link>

            <button
              type="button"
              onClick={() => setActiveSection('categories')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'categories'
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>Toifalar ({categories.length})</span>
            </button>

            <Link
              to="/admin/inventory"
              onClick={() => setActiveSection('inventory')}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
                activeSection === 'inventory'
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Ombor ({stockLogs.length})</span>
            </Link>
          </div>

          {activeSection === 'products' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
              onClick={() => handleOpenProductModal()}
            >
              Mahsulot qoʻshish
            </Button>
          )}

          {activeSection === 'categories' && (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
              onClick={() => handleOpenCategoryModal()}
            >
              Toifa qoʻshish
            </Button>
          )}
        </div>
      </div>

      {/* SECTION 1: PRODUCTS */}
      {activeSection === 'products' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              placeholder="Mahsulot nomi yoki SKU boʻyicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />

            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Barcha toifalar' },
                ...categories.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />

            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Barcha holatlar' },
                { value: 'active', label: 'Sotuvda faol' },
                { value: 'out_of_stock', label: 'Vaqtincha tugagan' },
                { value: 'hidden', label: 'Yashirilgan' },
                { value: 'archived', label: 'Arxivlangan' },
              ]}
            />
          </div>

          {filteredProducts.length > 0 ? (
            <>
              <div className="md:hidden space-y-3">
                {filteredProducts.map((prod) => {
                  const statusMeta = PRODUCT_STATUS_META[prod.status];
                  return (
                    <article
                      key={prod.id}
                      className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card space-y-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <ProductImage
                          src={prod.images[0]}
                          alt={prod.name}
                          className="w-16 h-16 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <span className="font-mono text-[11px] font-bold text-gray-500">
                              {prod.sku} • {prod.images.length} rasm
                            </span>
                            <Badge variant={statusMeta.variant} size="sm">
                              {statusMeta.label}
                            </Badge>
                          </div>
                          <p className="font-extrabold text-gray-900 dark:text-gray-100 text-sm leading-snug break-words">
                            {prod.name}
                          </p>
                          <p className="text-[11px] font-semibold text-brand-green">
                            {getCategoryName(prod.categoryId)}
                          </p>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-extrabold text-brand-green block">
                            {formatUZS(prod.salePrice ?? prod.price)}
                          </span>
                          {prod.salePrice && (
                            <span className="text-[11px] text-gray-400 line-through">
                              {formatUZS(prod.price)}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-gray-900 dark:text-gray-100 block">
                            Omborda: {prod.stock} dona
                          </span>
                          <span className="text-[11px] text-gray-500">
                            Sotilgan: {prod.soldCount} dona
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          fullWidth
                          leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenProductModal(prod)}
                        >
                          Tahrir
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          fullWidth
                          onClick={() => {
                            setStockModalProduct(prod);
                            setNewStockValue(prod.stock);
                            setNewThresholdValue(prod.lowStockThreshold);
                            setStockReason('');
                            setStockFormError('');
                          }}
                        >
                          Zaxira
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          fullWidth
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setProductToDelete(prod)}
                        >
                          Oʻchirish
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="hidden md:block bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                        <th className="py-3.5 px-4">Mahsulot / SKU</th>
                        <th className="py-3.5 px-4">Toifa</th>
                        <th className="py-3.5 px-4">Narx</th>
                        <th className="py-3.5 px-4">Zaxira</th>
                        <th className="py-3.5 px-4">Holati</th>
                        <th className="py-3.5 px-4 text-right">Amallar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#28453B] text-xs sm:text-sm">
                      {filteredProducts.map((prod) => {
                        const statusMeta = PRODUCT_STATUS_META[prod.status];
                        return (
                          <tr
                            key={prod.id}
                            className="hover:bg-gray-50/80 dark:hover:bg-[#162923]/60"
                          >
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <ProductImage
                                  src={prod.images[0]}
                                  alt={prod.name}
                                  className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                                />
                                <div className="min-w-0">
                                  <p className="font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                                    {prod.name}
                                  </p>
                                  <p className="text-xs text-gray-500 font-mono">
                                    {prod.sku} • {prod.images.length} rasm
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-semibold text-gray-700 dark:text-gray-200">
                              {getCategoryName(prod.categoryId)}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-extrabold text-brand-green block">
                                {formatUZS(prod.salePrice ?? prod.price)}
                              </span>
                              {prod.salePrice && (
                                <span className="text-xs text-gray-400 line-through">
                                  {formatUZS(prod.price)}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-bold">
                                {prod.stock} dona
                              </span>
                              <span className="block text-[11px] text-gray-500">
                                Chegara: {prod.lowStockThreshold} dona
                              </span>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Badge variant={statusMeta.variant} size="sm">
                                {statusMeta.label}
                              </Badge>
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                                  onClick={() => handleOpenProductModal(prod)}
                                >
                                  Tahrirlash
                                </Button>
                                <button
                                  type="button"
                                  onClick={() => setProductToDelete(prod)}
                                  title="Mahsulotni oʻchirish"
                                  className="w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
            </>
          ) : (
            <EmptyState
              title="Mahsulotlar topilmadi"
              description="Qidiruv yoki filtrni oʻzgartirib koʻring."
              actionLabel="Yangi mahsulot qoʻshish"
              onAction={() => handleOpenProductModal()}
            />
          )}
        </div>
      )}

      {/* SECTION 2: CATEGORIES */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((cat) => {
              const prodCount = products.filter(
                (p) => p.categoryId === cat.id
              ).length;
              return (
                <div
                  key={cat.id}
                  className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card flex flex-col justify-between"
                >
                  <div>
                    <div className="h-36 bg-gray-100 dark:bg-[#1A3028] relative">
                      <ProductImage
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5">
                        <Badge
                          variant={cat.isActive ? 'success' : 'neutral'}
                          size="sm"
                        >
                          {cat.isActive ? 'Faol' : 'Yashirin'}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100">
                          {cat.name}
                        </h3>
                        <Badge variant="gold" size="sm">
                          {prodCount} mahsulot
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                        {cat.description}
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-gray-50 dark:bg-[#162923] border-t border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenCategoryModal(cat)}
                    >
                      Tahrirlash
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenDeleteCategoryModal(cat)}
                    >
                      Oʻchirish
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* SECTION 3: INVENTORY & STOCK LOGS */}
      {activeSection === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => {
              const isLow = prod.stock <= prod.lowStockThreshold;
              return (
                <div
                  key={prod.id}
                  className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card flex flex-col justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <ProductImage
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-14 h-14 rounded-xl object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-mono text-gray-500">
                        {prod.sku}
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug break-words">
                        {prod.name}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-gray-500 block">Joriy qoldiq:</span>
                      <strong
                        className={`text-sm font-extrabold ${
                          prod.stock <= 0
                            ? 'text-red-600'
                            : isLow
                            ? 'text-amber-600'
                            : 'text-brand-green'
                        }`}
                      >
                        {prod.stock} dona
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-500 block">
                        Minimal chegara:
                      </span>
                      <strong className="text-gray-900 dark:text-gray-100">
                        {prod.lowStockThreshold} dona
                      </strong>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={() => {
                      setStockModalProduct(prod);
                      setNewStockValue(prod.stock);
                      setNewThresholdValue(prod.lowStockThreshold);
                      setStockReason('');
                      setStockFormError('');
                    }}
                  >
                    Qoldiq va chegarani yangilash
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-5 shadow-card space-y-3">
            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
              Ombor harakatlari tarixi
            </h2>
            <div className="divide-y divide-gray-200 dark:divide-[#28453B] text-xs">
              {stockLogs.slice(0, 15).map((log) => (
                <div
                  key={log.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {log.productName} ({log.sku})
                    </p>
                    <p className="text-gray-500">{log.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`font-extrabold ${
                        log.changeAmount >= 0
                          ? 'text-emerald-600'
                          : 'text-red-600'
                      }`}
                    >
                      {log.previousStock} → {log.newStock} (
                      {log.changeAmount >= 0
                        ? `+${log.changeAmount}`
                        : log.changeAmount}
                      )
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      {formatDateUz(log.createdAt, true)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={
          isNewProductMode
            ? 'Yangi mahsulot qoʻshish'
            : 'Mahsulotni tahrirlash'
        }
        maxWidth="2xl"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsProductModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="admin-product-form"
              variant="primary"
              size="md"
              fullWidth
              disabled={isUploadingProductImages || isSavingProduct}
              isLoading={isSavingProduct}
            >
              Saqlash
            </Button>
          </div>
        }
      >
        <form
          id="admin-product-form"
          onSubmit={handleSaveProductSubmit}
          className="min-w-0 space-y-5 text-xs sm:text-sm [&_input]:text-base sm:[&_input]:text-sm"
        >
          {productFormError && (
            <div role="alert" className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs font-semibold leading-relaxed text-red-700 break-words">
              {productFormError}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Mahsulot nomi (Majburiy)"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
            />
            <Input
              label="SKU artikul kodi (Majburiy)"
              required
              value={prodSku}
              onChange={(e) => setProdSku(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Toifa"
              value={prodCategoryId}
              onChange={(e) => setProdCategoryId(e.target.value)}
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
            <Select
              label="Sotuv holati"
              value={prodStatus}
              onChange={(e) => setProdStatus(e.target.value as ProductStatus)}
              options={[
                { value: 'active', label: 'Sotuvda faol' },
                { value: 'out_of_stock', label: 'Vaqtincha tugagan' },
                { value: 'hidden', label: 'Yashirilgan' },
                { value: 'archived', label: 'Arxivlangan' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <NumericInput
              label="Asosiy narx (soʻm)"
              required
              value={prodPrice}
              onChange={(val) => setProdPrice(val ?? 0)}
              showCurrencyPreview
            />
            <NumericInput
              label="Chegirma narxi (ixtiyoriy)"
              allowEmpty
              value={prodSalePrice}
              onChange={(val) => setProdSalePrice(val)}
              placeholder="Chegirma yoʻq"
              showCurrencyPreview
            />
            <NumericInput
              label="Tannarx (ichki hisob)"
              value={prodCostPrice}
              onChange={(val) => setProdCostPrice(val ?? 0)}
              showCurrencyPreview
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <NumericInput
              label="Ombordagi zaxira soni (dona)"
              required
              value={prodStock}
              onChange={(val) => setProdStock(val ?? 0)}
            />
            <NumericInput
              label="Kam qolganlik ogohlantirish chegarasi (dona)"
              required
              min={1}
              value={prodLowStockThreshold}
              onChange={(val) => setProdLowStockThreshold(val ?? 5)}
            />
          </div>

          {/* Local Device Multi-Image Uploader with Replace, Reorder & Remove */}
          <div className="min-w-0 space-y-4 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-3 dark:border-[#28453B] dark:bg-[#162923] sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100 block">
                  Mahsulot rasmlari ({prodImages.length} ta) *
                </span>
                <span className="text-[11px] text-gray-500">
                  Birinchi rasm asosiy muqova sifatida koʻrsatiladi (JPG, PNG,
                  WEBP ≤ 4 MB)
                </span>
              </div>

              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#16533F] text-white text-xs font-extrabold cursor-pointer shadow-sm">
                {isUploadingProductImages ? (
                  <RefreshCw className="w-3.5 h-3.5 text-[#C89D54] animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-[#C89D54]" />
                )}
                <span>Qurilmadan rasm yuklash</span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleProductImageFilesSelected}
                  className="hidden"
                />
              </label>
            </div>

            {prodImages.length > 0 && (
              <div className="grid grid-cols-1 gap-3 pt-1 min-[400px]:grid-cols-2 sm:grid-cols-4">
                {prodImages.map((imgUrl, idx) => (
                  <div
                    key={`${idx}-${imgUrl.slice(0, 24)}`}
                    className="relative min-w-0 space-y-2 rounded-xl border border-gray-200 bg-white p-2 dark:border-[#28453B] dark:bg-[#12211C]"
                  >
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <ProductImage
                        src={imgUrl}
                        alt={`Rasm ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                      <label className="text-[10px] font-bold text-brand-green hover:underline px-1 cursor-pointer">
                        <span>{idx === 0 ? 'Asosiy' : `#${idx + 1}`} (Almash.)</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={(e) =>
                            handleReplaceSingleProductImage(idx, e)
                          }
                          className="hidden"
                        />
                      </label>
                      <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveProductImage(idx, -1)}
                          className="w-10 h-10 min-w-10 rounded-lg bg-gray-100 dark:bg-[#162923] disabled:opacity-30 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                          aria-label="Oldinga surish"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === prodImages.length - 1}
                          onClick={() => handleMoveProductImage(idx, 1)}
                          className="w-10 h-10 min-w-10 rounded-lg bg-gray-100 dark:bg-[#162923] disabled:opacity-30 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
                          aria-label="Orqaga surish"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductImage(idx)}
                          className="w-10 h-10 min-w-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          aria-label="Rasmni olib tashlash"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Input
            label="Qisqa tavsif"
            value={prodShortDesc}
            onChange={(e) => setProdShortDesc(e.target.value)}
          />

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
              Batafsil tavsif
            </label>
            <textarea
              rows={3}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
              className="w-full min-h-[8rem] min-w-0 resize-none rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base leading-relaxed dark:border-[#2F5246] dark:bg-[#0D1915] sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
              Asosiy afzalliklari (har bir qatorda bittadan)
            </label>
            <textarea
              rows={3}
              value={prodFeaturesText}
              onChange={(e) => setProdFeaturesText(e.target.value)}
              className="w-full min-h-[8rem] min-w-0 resize-none rounded-xl border border-gray-300 bg-white px-3.5 py-3 text-base leading-relaxed dark:border-[#2F5246] dark:bg-[#0D1915] sm:text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={prodIsNew}
                onChange={(e) => setProdIsNew(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>«Yangi» belgisi</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={prodIsPopular}
                onChange={(e) => setProdIsPopular(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>«Ommabop» belgisi</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={prodIsRecommended}
                onChange={(e) => setProdIsRecommended(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span>Tavsiya etilgan</span>
            </label>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(productToDelete)}
        onClose={() => setProductToDelete(null)}
        title="Mahsulotni oʻchirish"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setProductToDelete(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              disabled={isDeletingProduct}
              isLoading={isDeletingProduct}
              onClick={async () => {
                if (!productToDelete || isDeletingProduct) return;
                setIsDeletingProduct(true);
                try {
                  const deleted = await deleteProduct(productToDelete.id);
                  if (deleted) setProductToDelete(null);
                } finally {
                  setIsDeletingProduct(false);
                }
              }}
            >
              Oʻchirish
            </Button>
          </div>
        }
      >
        {productToDelete && (
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200">
            <strong>{productToDelete.name}</strong> ({productToDelete.sku})
            mahsulotini oʻchirishni tasdiqlaysizmi?
          </p>
        )}
      </Modal>

      {/* CATEGORY CREATE / EDIT MODAL */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={
          editingCategoryId ? 'Toifani tahrirlash' : 'Yangi toifa qoʻshish'
        }
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsCategoryModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="admin-category-form"
              variant="primary"
              size="md"
              fullWidth
              disabled={isUploadingCatImage || isSavingCategory}
              isLoading={isSavingCategory}
            >
              Saqlash
            </Button>
          </div>
        }
      >
        <form
          id="admin-category-form"
          onSubmit={handleSaveCategorySubmit}
          className="space-y-4 text-xs sm:text-sm"
        >
          {catFormError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
              {catFormError}
            </div>
          )}

          <Input
            label="Toifa nomi (Majburiy)"
            required
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
          />

          <Input
            label="Qisqa tavsif"
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Toifa belgisi (Ikonka)"
              value={catIconName}
              onChange={(e) => setCatIconName(e.target.value)}
              options={ICON_OPTIONS}
            />
            <NumericInput
              label="Tartib raqami"
              min={1}
              value={catSortOrder}
              onChange={(val) => setCatSortOrder(val ?? 1)}
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-3">
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
              Toifa muqova rasmi (Qurilmadan tanlash) *
            </span>

            {catImage ? (
              <div className="flex items-center justify-between gap-3">
                <ProductImage
                  src={catImage}
                  alt={catName}
                  className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
                />
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F3D2E] text-white text-xs font-bold cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#C89D54]" />
                    <span>Boshqa rasm tanlash</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleCategoryImageFileSelected}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setCatImage('')}
                    className="text-xs font-bold text-red-600 hover:underline text-left"
                  >
                    Rasmni olib tashlash
                  </button>
                </div>
              </div>
            ) : (
              <label className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-brand-green/50 bg-white dark:bg-[#12211C] flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                {isUploadingCatImage ? (
                  <RefreshCw className="w-5 h-5 text-brand-green animate-spin" />
                ) : (
                  <Upload className="w-5 h-5 text-brand-green" />
                )}
                <span className="text-xs font-extrabold text-brand-green">
                  Toifa rasmini qurilmadan yuklash
                </span>
                <span className="text-[11px] text-gray-500">
                  JPG, PNG yoki WEBP (≤ 4 MB)
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCategoryImageFileSelected}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={catIsActive}
              onChange={(e) => setCatIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Katalogda faol koʻrsatilsin</span>
          </label>
        </form>
      </Modal>

      {/* Safe Category Delete & Product Reassignment Modal */}
      <Modal
        isOpen={Boolean(categoryToDelete)}
        onClose={() => setCategoryToDelete(null)}
        title="Toifani oʻchirish"
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setCategoryToDelete(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              isLoading={isDeletingCategory}
              disabled={
                dependentProductsForCatToDelete.length > 0 &&
                availableReassignCategories.length === 0
              }
              onClick={handleConfirmDeleteCategory}
            >
              {dependentProductsForCatToDelete.length > 0
                ? 'Mahsulotlarni koʻchirish va oʻchirish'
                : 'Toifani oʻchirish'}
            </Button>
          </div>
        }
      >
        {categoryToDelete && (
          <div className="space-y-3.5 text-xs sm:text-sm">
            {catDeleteError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
                {catDeleteError}
              </div>
            )}

            <p className="text-gray-700 dark:text-gray-200">
              <strong>«{categoryToDelete.name}»</strong> toifasini oʻchirishni
              tasdiqlaysizmi?
            </p>

            {dependentProductsForCatToDelete.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2.5 text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold leading-relaxed">
                    Diqqat: Ushbu toifada hozirda{' '}
                    <strong>
                      {dependentProductsForCatToDelete.length} ta mahsulot
                    </strong>{' '}
                    mavjud. Mahsulotlar oʻchib ketmasligi uchun ularni qaysi
                    toifaga oʻtkazishni tanlang:
                  </p>
                </div>

                <Select
                  label="Mahsulotlar oʻtkaziladigan yangi toifa"
                  value={reassignTargetCatId}
                  onChange={(e) => setReassignTargetCatId(e.target.value)}
                  options={availableReassignCategories.map((c) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Inventory Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(stockModalProduct)}
        onClose={() => {
          if (!isSavingStock) setStockModalProduct(null);
        }}
        title={
          stockModalProduct
            ? `Zaxirani yangilash: ${stockModalProduct.sku}`
            : ''
        }
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              disabled={isSavingStock}
              onClick={() => setStockModalProduct(null)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="stock-adjust-form"
              variant="primary"
              size="sm"
              fullWidth
              disabled={isSavingStock}
              isLoading={isSavingStock}
            >
              Saqlash
            </Button>
          </div>
        }
      >
        {stockModalProduct && (
          <form
            id="stock-adjust-form"
            onSubmit={handleSaveStockAdjustment}
            className="space-y-4 text-xs sm:text-sm"
          >
            {stockFormError && (
              <p role="alert" className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-relaxed text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                {stockFormError}
              </p>
            )}
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {stockModalProduct.name}
            </p>
            <NumericInput
              label="Yangi zaxira soni (dona)"
              required
              min={0}
              value={newStockValue}
              onChange={(val) => setNewStockValue(val ?? 0)}
            />
            <NumericInput
              label="Minimal zaxira chegarasi (dona)"
              required
              min={1}
              value={newThresholdValue}
              onChange={(val) => setNewThresholdValue(val ?? 5)}
            />
            <Input
              label="Oʻzgarish sababi"
              value={stockReason}
              onChange={(e) => setStockReason(e.target.value)}
              placeholder="Masalan: Yangi partiya qabul qilindi"
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
