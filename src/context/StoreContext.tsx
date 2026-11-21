import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { RealtimeChannel, User as SupabaseUser } from '@supabase/supabase-js';
import {
  ADMIN_USERS,
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_COUPONS,
  INITIAL_CUSTOMERS,
  INITIAL_INQUIRIES,
  INITIAL_ORDERS,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_LOGS,
  INITIAL_STORE_SETTINGS,
} from '../data/mockData';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { formatUZS, normalizeTelegramUsername } from '../utils/format';
import {
  AdminRole,
  AdminUser,
  CartItem,
  Category,
  Coupon,
  Customer,
  CustomerInquiry,
  HomepageBanner,
  Order,
  OrderStatus,
  PaymentVerificationStatus,
  Product,
  ProductStatus,
  StockLogEntry,
  StoreSettings,
  TelegramNotificationStatus,
  ToastMessage,
} from '../types';

interface StoreContextType {
  products: Product[];
  categories: Category[];
  banners: HomepageBanner[];
  orders: Order[];
  customers: Customer[];
  coupons: Coupon[];
  stockLogs: StockLogEntry[];
  inquiries: CustomerInquiry[];
  storeSettings: StoreSettings;
  adminUsers: AdminUser[];
  isSyncingSupabase: boolean;

  cart: CartItem[];
  favoriteIds: string[];
  recentlyViewedIds: string[];
  currentCustomer: Customer | null;

  currentAdminRole: AdminRole;
  setCurrentAdminRole: (role: AdminRole) => void;
  saveAdminAssignment: (admin: AdminUser) => Promise<boolean>;
  removeAdminAssignment: (adminId: string) => Promise<boolean>;

  addToCart: (productId: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleFavorite: (productId: string) => void;
  clearFavorites: () => void;
  recordRecentlyViewed: (productId: string) => void;

  syncVerifiedCustomerFromAuthUser: (user: SupabaseUser) => Promise<void>;
  signInCustomerDemo: (phone: string, fullName?: string) => void;
  signOutCustomer: () => Promise<void>;
  updateCustomerProfile: (updated: Partial<Customer>) => Promise<boolean>;
  toggleBlockCustomer: (customerId: string, isBlocked: boolean, reason?: string) => Promise<boolean>;
  deleteCustomer: (customerId: string) => Promise<boolean>;
  restoreCustomer: (customerId: string) => Promise<boolean>;
  replyToInquiry: (params: { inquiryId: string; replyMessage: string; repliedBy: string; deliveryMethod: 'telegram' | 'manual_confirmed' }) => Promise<boolean>;

  submitCustomerInquiry: (data: {
    customerName: string;
    phone: string;
    subject: string;
    message: string;
  }) => void;

  placeOrder: (
    orderData: Omit<
      Order,
      | 'id'
      | 'orderNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'status'
      | 'internalNotes'
    > & { idempotencyKey: string }
  ) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    note?: string
  ) => Promise<boolean>;
  addOrderInternalNote: (orderId: string, note: string) => Promise<boolean>;
  reviewOrderReceipt: (
    orderId: string,
    decision: 'verified' | 'rejected',
    reviewerEmail: string,
    reviewNote?: string
  ) => Promise<boolean>;
  retryOrderTelegramNotification: (orderId: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<boolean>;
  restoreOrder: (orderId: string) => Promise<boolean>;

  saveProduct: (product: Product, isNewProduct?: boolean) => Promise<boolean>;
  deleteProduct: (productId: string) => Promise<boolean>;
  adjustProductStock: (
    productId: string,
    newStock: number,
    reason: string
  ) => Promise<boolean>;

  saveCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (categoryId: string, reassignToCategoryId?: string) => Promise<{ ok: boolean; error?: string }>;
  uploadImageFile: (file: File, folder?: string) => Promise<string>;
  saveCoupon: (coupon: Coupon) => Promise<boolean>;
  deleteCoupon: (couponId: string) => Promise<boolean>;
  saveBanner: (banner: HomepageBanner) => Promise<boolean>;
  updateStoreSettings: (settings: StoreSettings) => Promise<boolean>;
  resetOrderStatsBaseline: () => Promise<boolean>;
  updateInquiryStatus: (
    inquiryId: string,
    status: CustomerInquiry['status']
  ) => Promise<boolean>;
  refreshFromSupabase: () => Promise<void>;

  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  resetAllDemoData: () => void;
}

const STORAGE_KEY = 'zaven_store_state_v2';
const FAVORITES_STORAGE_PREFIX = 'zaven_favorites_v1:';
const CART_STORAGE_PREFIX = 'zaven_cart_v1:';
const PASSWORD_RECOVERY_SESSION_KEY = 'zaven_password_recovery_active';

const isPasswordRecoveryActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const queryType = new URLSearchParams(window.location.search).get('type');
  const hashType = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');
  if (queryType === 'recovery' || hashType === 'recovery') {
    try {
      window.sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, '1');
    } catch {
      // The URL still identifies the recovery flow if storage is unavailable.
    }
    return true;
  }
  try {
    return window.sessionStorage.getItem(PASSWORD_RECOVERY_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const getFavoritesStorageKey = (customer: Customer | null | undefined) =>
  `${FAVORITES_STORAGE_PREFIX}${customer?.authUserId || customer?.id || 'guest'}`;
const getCartStorageKey = (customer: Customer | null | undefined) =>
  `${CART_STORAGE_PREFIX}${customer?.authUserId || customer?.id || 'guest'}`;

const loadFavoritesForKey = (key: string): string[] => {
  try {
    const saved = localStorage.getItem(key);
    const parsed: unknown = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
};

const saveFavoritesForCustomer = (
  customer: Customer | null | undefined,
  favoriteIds: string[]
) => {
  try {
    localStorage.setItem(
      getFavoritesStorageKey(customer),
      JSON.stringify(favoriteIds)
    );
  } catch {
    // Keep favorites available in memory if browser storage is unavailable.
  }
};

const loadCartForKey = (key: string, fallback: CartItem[] = []): CartItem[] => {
  try {
    const saved = localStorage.getItem(key);
    if (saved === null) return fallback;
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return fallback;
    return parsed.filter((item): item is CartItem => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<CartItem>;
      return (
        typeof candidate.productId === 'string' &&
        typeof candidate.quantity === 'number' &&
        Number.isFinite(candidate.quantity) &&
        candidate.quantity > 0
      );
    });
  } catch {
    return fallback;
  }
};

const saveCartForKey = (key: string, cart: CartItem[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(cart));
  } catch {
    // Keep the cart available in memory if browser storage is unavailable.
  }
};

function mapRowToCategory(row: Record<string, unknown>): Category {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    description: String(row.description || ''),
    iconName: String(row.icon_name || 'Home'),
    image: String(row.image || ''),
    isActive: Boolean(row.is_active ?? true),
    sortOrder: Number(row.sort_order ?? 1),
  };
}

function mapCategoryToRow(cat: Category) {
  return {
    id: cat.id,
    slug: cat.slug,
    name: cat.name,
    description: cat.description,
    icon_name: cat.iconName,
    image: cat.image,
    is_active: cat.isActive,
    sort_order: cat.sortOrder,
    updated_at: new Date().toISOString(),
  };
}

function mapRowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    slug: String(row.slug),
    sku: String(row.sku),
    name: String(row.name),
    categoryId: String(row.category_id || 'cat-home'),
    price: Number(row.price ?? 0),
    salePrice:
      row.sale_price !== null && row.sale_price !== undefined
        ? Number(row.sale_price)
        : null,
    costPrice: Number(row.cost_price ?? 0),
    stock: Number(row.stock ?? 0),
    lowStockThreshold: Number(row.low_stock_threshold ?? 5),
    status: (row.status as ProductStatus) || 'active',
    shortDescription: String(row.short_description || ''),
    description: String(row.description || ''),
    features: Array.isArray(row.features) ? (row.features as string[]) : [],
    specifications: Array.isArray(row.specifications)
      ? (row.specifications as Product['specifications'])
      : [],
    translations:
      row.translations && typeof row.translations === 'object'
        ? (row.translations as Product['translations'])
        : undefined,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    isNew: Boolean(row.is_new),
    isPopular: Boolean(row.is_popular),
    isRecommended: Boolean(row.is_recommended),
    soldCount: Number(row.sold_count ?? 0),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapProductToRow(product: Product) {
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    category_id: product.categoryId,
    price: Math.round(product.price),
    sale_price:
      product.salePrice !== null && product.salePrice !== undefined
        ? Math.round(product.salePrice)
        : null,
    cost_price: Math.round(product.costPrice),
    stock: product.stock,
    low_stock_threshold: product.lowStockThreshold,
    status: product.status,
    short_description: product.shortDescription,
    description: product.description,
    features: product.features,
    specifications: product.specifications,
    translations: product.translations || {},
    images: product.images,
    is_new: Boolean(product.isNew),
    is_popular: Boolean(product.isPopular),
    is_recommended: Boolean(product.isRecommended),
    sold_count: product.soldCount,
    created_at: product.createdAt,
    updated_at: product.updatedAt,
  };
}

function mapRowToOrder(
  row: Record<string, unknown>,
  signedReceiptUrl?: string
): Order {
  const storagePath = row.payment_receipt_path
    ? String(row.payment_receipt_path)
    : undefined;
  const fileName = row.payment_receipt_filename
    ? String(row.payment_receipt_filename)
    : storagePath
    ? storagePath.split('/').pop() || 'receipt'
    : undefined;

  const rawCoords = row.location_coordinates as
    | { lat?: number; lng?: number; accuracyMeters?: number }
    | null
    | undefined;

  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerId: row.customer_id ? String(row.customer_id) : undefined,
    customerName: String(row.customer_name),
    customerPhone: String(row.customer_phone),
    customerEmail: row.customer_email ? String(row.customer_email) : undefined,
    customerTelegram: row.customer_telegram
      ? String(row.customer_telegram)
      : undefined,
    region: String(row.region),
    district: row.district ? String(row.district) : undefined,
    address: String(row.address),
    locationCoordinates:
      rawCoords &&
      typeof rawCoords.lat === 'number' &&
      typeof rawCoords.lng === 'number'
        ? {
            lat: rawCoords.lat,
            lng: rawCoords.lng,
            accuracyMeters: rawCoords.accuracyMeters,
          }
        : undefined,
    customerNote: row.customer_note ? String(row.customer_note) : undefined,
    internalNotes: Array.isArray(row.internal_notes)
      ? (row.internal_notes as string[])
      : [],
    items: Array.isArray(row.items) ? (row.items as Order['items']) : [],
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    couponCode: row.coupon_code ? String(row.coupon_code) : undefined,
    deliveryFee: Number(row.delivery_fee ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    paymentMethodId: String(row.payment_method_id || 'pay-cod'),
    paymentMethodLabel: String(row.payment_method_label || ''),
    paymentVerificationStatus:
      (row.payment_verification_status as PaymentVerificationStatus) ||
      'not_required',
    paymentReceipt:
      storagePath || fileName
        ? {
            fileName: fileName || 'receipt',
            mimeType: String(row.payment_receipt_mime || 'image/jpeg'),
            fileSize: Number(row.payment_receipt_size ?? 0),
            dataUrl: signedReceiptUrl || '',
            storagePath,
            uploadedAt: String(row.created_at || new Date().toISOString()),
          }
        : undefined,
    paymentReviewedBy: row.payment_reviewed_by
      ? String(row.payment_reviewed_by)
      : undefined,
    paymentReviewedAt: row.payment_reviewed_at
      ? String(row.payment_reviewed_at)
      : undefined,
    paymentReviewNote: row.payment_review_note
      ? String(row.payment_review_note)
      : undefined,
    telegramNotificationStatus:
      (row.telegram_notification_status as TelegramNotificationStatus) ||
      'not_configured',
    telegramNotificationError: row.telegram_notification_error
      ? String(row.telegram_notification_error)
      : undefined,
    status: (row.status as OrderStatus) || 'new',
    isDeleted: Boolean(row.is_deleted ?? false),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapRowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    authUserId: row.auth_user_id ? String(row.auth_user_id) : undefined,
    fullName: String(row.full_name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : undefined,
    emailVerified: Boolean(row.email_verified ?? false),
    telegramUsername: row.telegram_username
      ? String(row.telegram_username)
      : undefined,
    addresses: Array.isArray(row.addresses)
      ? (row.addresses as Customer['addresses'])
      : [],
    orderCount: Number(row.order_count ?? 0),
    totalSpent: Number(row.total_spent ?? 0),
    lastOrderDate: row.last_order_date
      ? String(row.last_order_date)
      : undefined,
    isBlocked: Boolean(row.is_blocked ?? false),
    blockedReason: row.blocked_reason ? String(row.blocked_reason) : undefined,
    isDeleted: Boolean(row.is_deleted ?? false),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapCustomerToRow(cust: Customer) {
  return {
    id: cust.id,
    auth_user_id: cust.authUserId || null,
    full_name: cust.fullName,
    phone: cust.phone,
    email: cust.email || null,
    email_verified: Boolean(cust.emailVerified),
    telegram_username: cust.telegramUsername || null,
    addresses: cust.addresses,
    order_count: cust.orderCount,
    total_spent: Math.round(cust.totalSpent),
    last_order_date: cust.lastOrderDate || null,
    is_blocked: Boolean(cust.isBlocked ?? false),
    blocked_reason: cust.blockedReason || null,
    is_deleted: Boolean(cust.isDeleted ?? false),
    deleted_at: cust.deletedAt || null,
    created_at: cust.createdAt,
  };
}

function mapRowToStockLog(row: Record<string, unknown>): StockLogEntry {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    sku: String(row.sku),
    previousStock: Number(row.previous_stock ?? 0),
    newStock: Number(row.new_stock ?? 0),
    changeAmount: Number(row.change_amount ?? 0),
    reason: String(row.reason || ''),
    updatedBy: String(row.updated_by || 'Store Owner'),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapStockLogToRow(log: StockLogEntry) {
  return {
    id: log.id,
    product_id: log.productId,
    product_name: log.productName,
    sku: log.sku,
    previous_stock: log.previousStock,
    new_stock: log.newStock,
    change_amount: log.changeAmount,
    reason: log.reason,
    updated_by: log.updatedBy,
    created_at: log.createdAt,
  };
}

function mapRowToInquiry(row: Record<string, unknown>): CustomerInquiry {
  return {
    id: String(row.id),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    subject: String(row.subject || ''),
    message: String(row.message || ''),
    status: (row.status as CustomerInquiry['status']) || 'unread',
    replyMessage: row.reply_message ? String(row.reply_message) : undefined,
    repliedAt: row.replied_at ? String(row.replied_at) : undefined,
    repliedBy: row.replied_by ? String(row.replied_by) : undefined,
    replyDeliveryMethod: row.reply_delivery_method
      ? (row.reply_delivery_method as CustomerInquiry['replyDeliveryMethod'])
      : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);
const LEGACY_DEMO_SUPPORT_PHONE = '+998 78 113-45-67';

const normalizeSupportPhone = (phone: unknown): string =>
  typeof phone === 'string' && phone.trim() !== LEGACY_DEMO_SUPPORT_PHONE
    ? phone
    : '';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const loadInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to read localStorage state:', e);
    }
    return null;
  };

  const savedState = loadInitialState();

  const [products, setProducts] = useState<Product[]>(
    savedState?.products || INITIAL_PRODUCTS
  );
  const [categories, setCategories] = useState<Category[]>(
    savedState?.categories || INITIAL_CATEGORIES
  );
  const [banners, setBanners] = useState<HomepageBanner[]>(
    savedState?.banners || INITIAL_BANNERS
  );
  const [orders, setOrders] = useState<Order[]>(
    savedState?.orders || INITIAL_ORDERS
  );
  const [customers, setCustomers] = useState<Customer[]>(
    savedState?.customers || INITIAL_CUSTOMERS
  );
  const [coupons, setCoupons] = useState<Coupon[]>(
    savedState?.coupons || INITIAL_COUPONS
  );
  const [stockLogs, setStockLogs] = useState<StockLogEntry[]>(
    savedState?.stockLogs || INITIAL_STOCK_LOGS
  );
  const [inquiries, setInquiries] = useState<CustomerInquiry[]>(
    savedState?.inquiries || INITIAL_INQUIRIES
  );
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => {
    if (savedState?.storeSettings) {
      return {
        ...INITIAL_STORE_SETTINGS,
        ...savedState.storeSettings,
        supportPhone: normalizeSupportPhone(savedState.storeSettings.supportPhone),
        bankTransfer: {
          ...INITIAL_STORE_SETTINGS.bankTransfer,
          ...(savedState.storeSettings.bankTransfer || {}),
        },
      };
    }
    return INITIAL_STORE_SETTINGS;
  });
  const initialFavoriteOwner = savedState?.currentCustomer || null;
  const initialCartOwnerKey = getCartStorageKey(initialFavoriteOwner);
  const [cart, setCart] = useState<CartItem[]>(() =>
    loadCartForKey(
      initialCartOwnerKey,
      initialFavoriteOwner
        ? []
        : savedState?.cart || [{ productId: 'prod-1', quantity: 1 }]
    )
  );
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() =>
    loadFavoritesForKey(getFavoritesStorageKey(initialFavoriteOwner))
  );
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(
    Array.isArray(savedState?.recentlyViewedIds)
      ? savedState.recentlyViewedIds
      : []
  );
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(
    savedState?.currentCustomer !== undefined
      ? savedState.currentCustomer
      : null
  );
  const favoriteOwnerKey = getFavoritesStorageKey(currentCustomer);
  const cartOwnerKey = getCartStorageKey(currentCustomer);
  const favoriteOwnerKeyRef = useRef(
    getFavoritesStorageKey(initialFavoriteOwner)
  );
  const cartOwnerKeyRef = useRef(initialCartOwnerKey);
  const skipCartSaveRef = useRef(false);

  useEffect(() => {
    if (favoriteOwnerKeyRef.current === favoriteOwnerKey) return;
    favoriteOwnerKeyRef.current = favoriteOwnerKey;
    setFavoriteIds(loadFavoritesForKey(favoriteOwnerKey));
  }, [favoriteOwnerKey]);

  useEffect(() => {
    if (cartOwnerKeyRef.current === cartOwnerKey) return;
    cartOwnerKeyRef.current = cartOwnerKey;
    skipCartSaveRef.current = true;
    setCart(loadCartForKey(cartOwnerKey));
  }, [cartOwnerKey]);

  useEffect(() => {
    if (skipCartSaveRef.current) {
      skipCartSaveRef.current = false;
      return;
    }
    saveCartForKey(cartOwnerKey, cart);
  }, [cartOwnerKey, cart]);
  const [currentAdminRole, setCurrentAdminRole] = useState<AdminRole>('owner');
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);

  // Requirement #8: Deduplicate toasts so one user action creates strictly one notification
  const lastToastRef = useRef<{
    signature: string;
    timestamp: number;
  }>({ signature: '', timestamp: 0 });

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const now = Date.now();
    const signature = `${toast.type}|${toast.title}|${toast.description || ''}`;
    if (
      lastToastRef.current.signature === signature &&
      now - lastToastRef.current.timestamp < 1200
    ) {
      return;
    }
    lastToastRef.current = { signature, timestamp: now };

    const id = `toast-${now}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => {
      // Replace any active toast with the exact same title so they never stack duplicates
      const withoutSameTitle = prev.filter((t) => t.title !== toast.title);
      return [...withoutSameTitle, { ...toast, id }];
    });

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const syncStoreSettingsPayloadToSupabase = useCallback(
    async (
      nextSettings: StoreSettings,
      nextCoupons: Coupon[],
      nextBanners: HomepageBanner[]
    ): Promise<boolean> => {
      if (!isSupabaseConfigured || !supabase) return true;
      try {
        const { data, error } = await supabase.from('store_settings').upsert({
          id: 1,
          payload: {
            ...nextSettings,
            coupons: nextCoupons,
            banners: nextBanners,
          },
          updated_at: new Date().toISOString(),
        }).select('id').maybeSingle();
        if (error || !data?.id) {
          const reason = error?.message || 'Bazadan tasdiq javobi kelmadi. Jadval yoki RLS ruxsatini tekshiring.';
          addToast({ type: 'error', title: 'Sozlamalarni bazaga yozib boʻlmadi', description: reason });
          return false;
        }
        return true;
      } catch (err) {
        addToast({ type: 'error', title: 'Sozlamalarni saqlashda xatolik', description: err instanceof Error ? err.message : 'Nomaʼlum xatolik' });
        return false;
      }
    },
    [addToast]
  );

  const syncVerifiedCustomerFromAuthUser = useCallback(
    async (user: SupabaseUser) => {
      const email = user.email?.trim().toLowerCase();
      const isConfirmed = Boolean(user.email_confirmed_at);

      if (!email || !isConfirmed) {
        return;
      }

      if (isSupabaseConfigured && supabase) {
        let { data: ownRecord, error } = await supabase
          .from('customers')
          .select('is_blocked,is_deleted,blocked_reason')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        if (!error && !ownRecord) {
          const emailLookup = await supabase
            .from('customers')
            .select('is_blocked,is_deleted,blocked_reason')
            .eq('email', email)
            .maybeSingle();
          ownRecord = emailLookup.data;
          error = emailLookup.error;
        }
        if (!error && (ownRecord?.is_blocked || ownRecord?.is_deleted)) {
          await supabase.auth.signOut().catch(() => {});
          setCurrentCustomer(null);
          addToast({
            type: 'error',
            title: 'Hisobingizga kirish cheklangan',
            description: ownRecord.blocked_reason || 'Doʻkon maʼmuriyatiga murojaat qiling.',
          });
          return;
        }
      }

      const metaFullName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name.trim()
          : '';
      const metaPhone =
        typeof user.user_metadata?.phone === 'string'
          ? user.user_metadata.phone.trim()
          : '';
      const metaTelegram = normalizeTelegramUsername(
        typeof user.user_metadata?.telegram_username === 'string'
          ? user.user_metadata.telegram_username
          : undefined
      );

      setCustomers((prev) => {
        const cleanMetaPhone = metaPhone.replace(/\D/g, '');
        const existing = prev.find(
          (c) =>
            c.authUserId === user.id ||
            (c.email && c.email.toLowerCase() === email) ||
            (cleanMetaPhone.length >= 9 &&
              c.phone.replace(/\D/g, '') === cleanMetaPhone)
        );

        if (existing) {
          const merged: Customer = {
            ...existing,
            authUserId: user.id,
            email,
            emailVerified: true,
            fullName: metaFullName || existing.fullName,
            phone: metaPhone || existing.phone,
            telegramUsername: metaTelegram || existing.telegramUsername,
          };
          setCurrentCustomer(merged);
          if (isSupabaseConfigured && supabase) {
            supabase
              .from('customers')
              .upsert(mapCustomerToRow(merged))
              .then(() => {});
          }
          return prev.map((c) => (c.id === existing.id ? merged : c));
        }

        const created: Customer = {
          id: `cust-${user.id.slice(0, 8)}`,
          authUserId: user.id,
          fullName: metaFullName || email.split('@')[0] || 'Xaridor',
          phone: metaPhone || '+998 90 000-00-00',
          email,
          emailVerified: true,
          telegramUsername: metaTelegram,
          addresses: [],
          orderCount: 0,
          totalSpent: 0,
          createdAt: new Date().toISOString(),
        };
        setCurrentCustomer(created);
        if (isSupabaseConfigured && supabase) {
          supabase
            .from('customers')
            .upsert(mapCustomerToRow(created))
            .then(() => {});
        }
        return [created, ...prev];
      });
    },
    [addToast]
  );

  useEffect(() => {
    if (!currentCustomer) return;
    const ownRecord = customers.find((customer) =>
      customer.id === currentCustomer.id ||
      Boolean(customer.authUserId && customer.authUserId === currentCustomer.authUserId) ||
      Boolean(customer.email && currentCustomer.email && customer.email.toLowerCase() === currentCustomer.email.toLowerCase())
    );
    if (!ownRecord || (!ownRecord.isBlocked && !ownRecord.isDeleted)) return;
    if (isSupabaseConfigured && supabase) supabase.auth.signOut().catch(() => {});
    setCurrentCustomer(null);
    addToast({
      type: 'error',
      title: 'Hisobingiz bloklangan',
      description: ownRecord.blockedReason || 'Doʻkon maʼmuriyatiga murojaat qiling.',
    });
  }, [customers, currentCustomer, addToast]);

  const refreshFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncingSupabase(true);

    try {
      const [catRes, prodRes, settingsRes, adminRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
        supabase
          .from('admin_assignments')
          .select('*')
          .order('created_at', { ascending: true }),
      ]);

      if (!catRes.error && catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data.map(mapRowToCategory));
      }

      if (!prodRes.error && prodRes.data && prodRes.data.length > 0) {
        setProducts(prodRes.data.map(mapRowToProduct));
      }

      if (!settingsRes.error && settingsRes.data?.payload) {
        const rawPayload = settingsRes.data.payload as Record<string, unknown>;
        const {
          coupons: savedCoupons,
          banners: savedBanners,
          ...restSettings
        } = rawPayload;

        setStoreSettings((prev) => ({
          ...INITIAL_STORE_SETTINGS,
          ...prev,
          ...(restSettings as Partial<StoreSettings>),
          supportPhone: normalizeSupportPhone(
            restSettings.supportPhone ?? prev.supportPhone
          ),
          bankTransfer: {
            ...INITIAL_STORE_SETTINGS.bankTransfer,
            ...((restSettings.bankTransfer as StoreSettings['bankTransfer']) ||
              {}),
          },
        }));

        if (Array.isArray(savedCoupons)) {
          setCoupons(savedCoupons as Coupon[]);
        }
        if (Array.isArray(savedBanners)) {
          setBanners(savedBanners as HomepageBanner[]);
        }
      }

      if (!adminRes.error && adminRes.data) {
        setAdminUsers(
          adminRes.data.map((row: Record<string, unknown>) => ({
            id: String(row.id),
            name: String(row.name || row.email || 'Admin'),
            role: (String(row.role || 'admin') as AdminRole),
            title: String(row.role === 'owner' ? 'Owner' : row.role === 'order_manager' ? 'Buyurtmalar menejeri' : row.role === 'content_manager' ? 'Kontent menejeri' : 'Admin'),
            lastActive: row.updated_at ? String(row.updated_at) : '',
            roleLabel: String(row.role || 'manager'),
            permissions: Array.isArray(row.permissions)
              ? row.permissions.filter((item): item is string => typeof item === 'string')
              : [],
          }))
        );
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user && !isPasswordRecoveryActive()) {
        if (session.user.email_confirmed_at) {
          await syncVerifiedCustomerFromAuthUser(session.user);
        }

        const [ordersRes, custRes, logsRes, inqRes] = await Promise.all([
          supabase
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('customers')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('stock_logs')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('inquiries')
            .select('*')
            .order('created_at', { ascending: false }),
        ]);

        if (!ordersRes.error && ordersRes.data) {
          const mappedOrders = await Promise.all(
            ordersRes.data.map(async (row) => {
              let signedUrl: string | undefined = undefined;
              if (row.payment_receipt_path && supabase) {
                const { data: urlData } = await supabase.storage
                  .from('payment-receipts')
                  .createSignedUrl(String(row.payment_receipt_path), 3600);
                signedUrl = urlData?.signedUrl;
              }
              return mapRowToOrder(row, signedUrl);
            })
          );
          if (mappedOrders.length > 0) {
            setOrders((prev) => {
              const byOrderNum = new Map(
                prev.map((item) => [item.orderNumber, item])
              );
              for (const mo of mappedOrders) {
                byOrderNum.set(mo.orderNumber, mo);
              }
              return Array.from(byOrderNum.values()).sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              );
            });
          }
        }

        if (!custRes.error && custRes.data && custRes.data.length > 0) {
          const fetchedCustomers = custRes.data.map(mapRowToCustomer);
          setCustomers((prev) => {
            const byId = new Map(prev.map((c) => [c.id, c]));
            for (const fc of fetchedCustomers) {
              byId.set(fc.id, fc);
            }
            return Array.from(byId.values());
          });
        }

        if (!logsRes.error && logsRes.data && logsRes.data.length > 0) {
          setStockLogs(logsRes.data.map(mapRowToStockLog));
        }

        if (!inqRes.error && inqRes.data && inqRes.data.length > 0) {
          setInquiries(inqRes.data.map(mapRowToInquiry));
        }
      }
    } catch (err) {
      console.error('Supabase initial sync error:', err);
    } finally {
      setIsSyncingSupabase(false);
    }
  }, [syncVerifiedCustomerFromAuthUser]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    let realtimeChannel: RealtimeChannel | null = null;
    let isMounted = true;

    const setupRealtimeChannel = async () => {
      if (!supabase) return;

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
      }

      if (!session?.user || !isMounted) return;

      realtimeChannel = supabase
        .channel('zaven-owner-live-feed')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          },
          async (payload) => {
            if (!isMounted || !payload.new) return;
            const rawRow = payload.new as Record<string, unknown>;

            let signedUrl: string | undefined = undefined;
            if (rawRow.payment_receipt_path && supabase) {
              const { data: urlData } = await supabase.storage
                .from('payment-receipts')
                .createSignedUrl(String(rawRow.payment_receipt_path), 3600);
              signedUrl = urlData?.signedUrl;
            }

            const incomingOrder = mapRowToOrder(rawRow, signedUrl);

            let isGenuinelyNew = false;
            setOrders((prev) => {
              const exists = prev.some(
                (o) =>
                  o.orderNumber === incomingOrder.orderNumber ||
                  o.id === incomingOrder.id
              );
              if (exists) {
                return prev.map((o) =>
                  o.orderNumber === incomingOrder.orderNumber
                    ? {
                        ...o,
                        ...incomingOrder,
                        paymentReceipt: incomingOrder.paymentReceipt
                          ? {
                              ...incomingOrder.paymentReceipt,
                              dataUrl:
                                incomingOrder.paymentReceipt.dataUrl ||
                                o.paymentReceipt?.dataUrl ||
                                '',
                            }
                          : o.paymentReceipt,
                      }
                    : o
                );
              }
              isGenuinelyNew = true;
              return [incomingOrder, ...prev];
            });

            if (isGenuinelyNew) {
              addToast({
                type: 'success',
                title: `Yangi buyurtma #${incomingOrder.orderNumber}!`,
                description: `${incomingOrder.customerName} — ${formatUZS(
                  incomingOrder.totalAmount
                )}`,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
          },
          async (payload) => {
            if (!isMounted || !payload.new) return;
            const rawRow = payload.new as Record<string, unknown>;

            let signedUrl: string | undefined = undefined;
            if (rawRow.payment_receipt_path && supabase) {
              const { data: urlData } = await supabase.storage
                .from('payment-receipts')
                .createSignedUrl(String(rawRow.payment_receipt_path), 3600);
              signedUrl = urlData?.signedUrl;
            }

            const updatedOrder = mapRowToOrder(rawRow, signedUrl);

            setOrders((prev) =>
              prev.map((o) =>
                o.orderNumber === updatedOrder.orderNumber ||
                o.id === updatedOrder.id
                  ? {
                      ...o,
                      ...updatedOrder,
                      paymentReceipt: updatedOrder.paymentReceipt
                        ? {
                            ...updatedOrder.paymentReceipt,
                            dataUrl:
                              updatedOrder.paymentReceipt.dataUrl ||
                              o.paymentReceipt?.dataUrl ||
                              '',
                          }
                        : o.paymentReceipt,
                    }
                  : o
              )
            );
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'inquiries',
          },
          (payload) => {
            if (!isMounted || !payload.new) return;
            const incomingInquiry = mapRowToInquiry(
              payload.new as Record<string, unknown>
            );

            let isGenuinelyNew = false;
            setInquiries((prev) => {
              const exists = prev.some(
                (inq) =>
                  inq.id === incomingInquiry.id ||
                  (inq.phone === incomingInquiry.phone &&
                    inq.message === incomingInquiry.message)
              );
              if (exists) return prev;
              isGenuinelyNew = true;
              return [incomingInquiry, ...prev];
            });

            if (isGenuinelyNew) {
              addToast({
                type: 'info',
                title: `Yangi mijoz murojaati: ${incomingInquiry.customerName}`,
                description: `«${incomingInquiry.subject}» (${incomingInquiry.phone})`,
              });
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'inquiries',
          },
          (payload) => {
            if (!isMounted || !payload.new) return;
            const updatedInquiry = mapRowToInquiry(
              payload.new as Record<string, unknown>
            );
            setInquiries((prev) =>
              prev.map((inq) =>
                inq.id === updatedInquiry.id ? updatedInquiry : inq
              )
            );
          }
        )
        .subscribe();
    };

    refreshFromSupabase();
    setupRealtimeChannel();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        try {
          window.sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, '1');
        } catch {
          // AccountPage also receives the event and can still show the form.
        }
        return;
      }
      if (
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED') &&
        session?.user
      ) {
        if (session.user.email_confirmed_at && !isPasswordRecoveryActive()) {
          syncVerifiedCustomerFromAuthUser(session.user);
        }
        refreshFromSupabase();
        setupRealtimeChannel();
      } else if (event === 'SIGNED_OUT') {
        setCurrentCustomer(null);
        if (realtimeChannel && supabase) {
          supabase.removeChannel(realtimeChannel);
          realtimeChannel = null;
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      if (realtimeChannel && supabase) {
        supabase.removeChannel(realtimeChannel);
      }
    };
  }, [refreshFromSupabase, syncVerifiedCustomerFromAuthUser, addToast]);

  useEffect(() => {
    try {
      const stateToSave = {
        products,
        categories,
        banners,
        orders,
        customers,
        coupons,
        stockLogs,
        inquiries,
        storeSettings,
        cart,
        favoriteIds,
        recentlyViewedIds,
        currentCustomer,
        currentAdminRole,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
      console.error('Failed to persist state:', e);
    }
  }, [
    products,
    categories,
    banners,
    orders,
    customers,
    coupons,
    stockLogs,
    inquiries,
    storeSettings,
    cart,
    favoriteIds,
    recentlyViewedIds,
    currentCustomer,
    currentAdminRole,
  ]);

  const removeFromCart = useCallback(
    (productId: string) => {
      setCart((prev) => prev.filter((item) => item.productId !== productId));
      addToast({
        type: 'info',
        title: 'Mahsulot savatchadan olib tashlandi',
      });
    },
    [addToast]
  );

  const addToCart = useCallback(
    (productId: string, quantity = 1) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return;

      if (product.status !== 'active' || product.stock <= 0) {
        addToast({
          type: 'error',
          title: 'Mahsulot vaqtincha tugagan',
          description: `${product.name} hozirda omborda mavjud emas.`,
        });
        return;
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          const nextQty = Math.min(product.stock, existing.quantity + quantity);
          return prev.map((item) =>
            item.productId === productId ? { ...item, quantity: nextQty } : item
          );
        }
        return [
          ...prev,
          { productId, quantity: Math.min(product.stock, quantity) },
        ];
      });

      addToast({
        type: 'success',
        title: 'Savatchaga qoʻshildi',
        description: product.name,
      });
    },
    [products, addToast]
  );

  const updateCartQuantity = useCallback(
    (productId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(productId);
        return;
      }
      const product = products.find((p) => p.id === productId);
      const maxStock = product ? product.stock : quantity;
      setCart((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(maxStock, quantity) }
            : item
        )
      );
    },
    [products, removeFromCart]
  );

  const clearCart = () => setCart([]);

  const toggleFavorite = useCallback((productId: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(productId);
      const next = exists
        ? prev.filter((id) => id !== productId)
        : [productId, ...prev];
      saveFavoritesForCustomer(currentCustomer, next);
      return next;
    });
  }, [currentCustomer]);

  const clearFavorites = useCallback(() => {
    setFavoriteIds([]);
    saveFavoritesForCustomer(currentCustomer, []);
  }, [currentCustomer]);

  const recordRecentlyViewed = (productId: string) => {
    setRecentlyViewedIds((prev) => {
      const filtered = prev.filter((id) => id !== productId);
      return [productId, ...filtered].slice(0, 6);
    });
  };

  const signInCustomerDemo = (phone: string, fullName?: string) => {
    const existing = customers.find(
      (c) => c.phone.replace(/\D/g, '') === phone.replace(/\D/g, '')
    );
    if (existing) {
      setCurrentCustomer(existing);
      addToast({
        type: 'success',
        title: `Xush kelibsiz, ${existing.fullName}!`,
      });
      return;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      fullName: fullName?.trim() || 'Yangi Xaridor',
      phone,
      addresses: [],
      orderCount: 0,
      totalSpent: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);
    setCurrentCustomer(newCustomer);

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('customers')
        .upsert(mapCustomerToRow(newCustomer))
        .then(() => {});
    }

    addToast({
      type: 'success',
      title: 'Roʻyxatdan oʻtish yakunlandi',
      description: newCustomer.fullName,
    });
  };

  const signOutCustomer = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    setCurrentCustomer(null);
    addToast({
      type: 'info',
      title: 'Hisobdan chiqildi',
    });
  };

  const updateCustomerProfile = async (updated: Partial<Customer>): Promise<boolean> => {
    if (!currentCustomer) return false;
    const normalizedTg =
      updated.telegramUsername !== undefined
        ? normalizeTelegramUsername(updated.telegramUsername)
        : currentCustomer.telegramUsername;

    const nextCustomer: Customer = {
      ...currentCustomer,
      ...updated,
      telegramUsername: normalizedTg,
    };
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('customers')
        .upsert(mapCustomerToRow(nextCustomer));
      if (error) {
        addToast({ type: 'error', title: 'Profilni saqlashda xatolik', description: error.message });
        return false;
      }
    }

    setCurrentCustomer(nextCustomer);
    setCustomers((prev) => prev.map((c) => (c.id === nextCustomer.id ? nextCustomer : c)));

    addToast({
      type: 'success',
      title: 'Profil maʼlumotlari saqlandi',
    });
    return true;
  };

  const submitCustomerInquiry: StoreContextType['submitCustomerInquiry'] =
    async ({ customerName, phone, subject, message }) => {
      const now = new Date().toISOString();
      const newInquiry: CustomerInquiry = {
        id: `inq-${Date.now()}`,
        customerName: customerName.trim(),
        phone: phone.trim(),
        subject: subject.trim() || 'Umumiy savol',
        message: message.trim(),
        status: 'unread',
        createdAt: now,
      };

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('inquiries')
          .insert({
            customer_name: newInquiry.customerName,
            phone: newInquiry.phone,
            subject: newInquiry.subject,
            message: newInquiry.message,
            status: 'unread',
          })
          .select('*')
          .maybeSingle();

        if (error || !data) {
          addToast({
            type: 'error',
            title: 'Murojaat saqlanmadi',
            description: error?.message || 'Bazaga murojaatni yozib bo‘lmadi.',
          });
          return;
        }
        if (data) {
          const synced = mapRowToInquiry(data);
          setInquiries((prev) => [synced, ...prev]);
        }
      } else {
        setInquiries((prev) => [newInquiry, ...prev]);
      }

      addToast({
        type: 'success',
        title: 'Murojaatingiz yuborildi!',
      });
    };

  const placeOrder: StoreContextType['placeOrder'] = async (orderData) => {
    const now = new Date().toISOString();
    const key = orderData.idempotencyKey.replace(/-/g, '').toUpperCase();
    if (!/^[A-F0-9]{32}$/.test(key)) {
      throw new Error('Buyurtma so‘rovi identifikatori noto‘g‘ri. Sahifani yangilab qayta urinib ko‘ring.');
    }
    const orderNumber = `ZVN-${key}`;
    const normalizedTelegram = normalizeTelegramUsername(
      orderData.customerTelegram
    );

    const initialNotes = [
      orderData.paymentVerificationStatus === 'pending_verification'
        ? `Yangi buyurtma qabul qilindi. Toʻlov cheki yuklandi (${orderData.paymentReceipt?.fileName}) — Holat: Toʻlov tekshirilmoqda.`
        : 'Yangi buyurtma veb-sayt orqali qabul qilindi.',
    ];

    let telegramStatus: Order['telegramNotificationStatus'] = 'not_configured';
    let telegramError: string | undefined = undefined;
    let storedPath: string | undefined = undefined;
    let persistedOrderId = '';

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke(
          'submit-order-receipt',
          {
            body: {
              order: {
                ...orderData,
                customerTelegram: normalizedTelegram,
                orderNumber,
                internalNotes: initialNotes,
              },
              receiptBase64: orderData.paymentReceipt?.dataUrl || null,
            },
          }
        );

        if (error) {
          let detail = error.message || 'Buyurtmani serverga yuborib boʻlmadi.';
          const response = (error as Error & { context?: unknown }).context;
          if (response instanceof Response) {
            try {
              const body = await response.clone().json() as { error?: unknown; message?: unknown };
              if (typeof body.error === 'string') detail = body.error;
              else if (typeof body.message === 'string') detail = body.message;
            } catch {
              // Keep the SDK error when the response is not JSON.
            }
          }
          throw new Error(detail);
        }
        if (
          !data?.ok ||
          typeof data.orderId !== 'string' ||
          data.orderNumber !== orderNumber ||
          (orderData.paymentReceipt && typeof data.storedReceiptPath !== 'string')
        ) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : 'Buyurtma yoki toʻlov cheki bazada tasdiqlanmagan.'
          );
        }
        if (data) {
          telegramStatus = data.telegramNotificationStatus || 'not_configured';
          telegramError = data.telegramNotificationError;
          storedPath = data.storedReceiptPath || undefined;
          persistedOrderId = data.orderId || undefined;
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Buyurtma saqlanmadi',
          description:
            err instanceof Error
              ? err.message
              : 'Buyurtmani bazaga yozib boʻlmadi.',
        });
        throw err instanceof Error ? err : new Error('Buyurtma saqlanmadi.');
      }
    } else {
      throw new Error('Supabase ulanmagan. Buyurtma bazaga saqlanmadi.');
    }

    const newOrder: Order = {
      ...orderData,
      customerTelegram: normalizedTelegram,
      id: persistedOrderId,
      orderNumber,
      paymentReceipt: orderData.paymentReceipt
        ? {
            ...orderData.paymentReceipt,
            storagePath: storedPath,
          }
        : undefined,
      telegramNotificationStatus: telegramStatus,
      telegramNotificationError: telegramError,
      status: 'new',
      internalNotes: initialNotes,
      createdAt: now,
      updatedAt: now,
    };

    setOrders((prev) => {
      const exists = prev.some((o) => o.orderNumber === orderNumber);
      return exists ? prev : [newOrder, ...prev];
    });

    const updatedProductsList: Product[] = [];
    setProducts((prev) =>
      prev.map((p) => {
        const orderedItem = orderData.items.find((i) => i.productId === p.id);
        if (!orderedItem) return p;
        const nextStock = Math.max(0, p.stock - orderedItem.quantity);
        const updatedProd: Product = {
          ...p,
          stock: nextStock,
          soldCount: p.soldCount + orderedItem.quantity,
          status: nextStock === 0 ? 'out_of_stock' : p.status,
          updatedAt: now,
        };
        updatedProductsList.push(updatedProd);
        return updatedProd;
      })
    );

    const newLogs: StockLogEntry[] = orderData.items
      .map((item) => {
        const prod = products.find((p) => p.id === item.productId);
        if (!prod) return null;
        const nextStock = Math.max(0, prod.stock - item.quantity);
        return {
          id: `log-${Date.now()}-${item.productId}`,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          previousStock: prod.stock,
          newStock: nextStock,
          changeAmount: -item.quantity,
          reason: `Buyurtma #${orderNumber} uchun band qilindi`,
          updatedBy: 'Tizim (Avtomatik)',
          createdAt: now,
        };
      })
      .filter((entry): entry is StockLogEntry => Boolean(entry));

    if (newLogs.length > 0) {
      setStockLogs((prev) => [...newLogs, ...prev]);
    }

    if (isSupabaseConfigured && supabase) {
      for (const up of updatedProductsList) {
        supabase
          .from('products')
          .update({
            stock: up.stock,
            sold_count: up.soldCount,
            status: up.status,
            updated_at: now,
          })
          .eq('id', up.id)
          .then(() => {});
      }
      if (newLogs.length > 0) {
        supabase
          .from('stock_logs')
          .insert(newLogs.map(mapStockLogToRow))
          .then(() => {});
      }
    }

    if (orderData.couponCode) {
      setCoupons((prev) => {
        const nextCoupons = prev.map((c) =>
          c.code.toUpperCase() === orderData.couponCode?.toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        );
        syncStoreSettingsPayloadToSupabase(
          storeSettings,
          nextCoupons,
          banners
        );
        return nextCoupons;
      });
    }

    const cleanPhone = orderData.customerPhone.replace(/\D/g, '');
    const cleanEmail = orderData.customerEmail?.trim().toLowerCase();

    setCustomers((prev) => {
      const existing = prev.find(
        (c) =>
          c.id === orderData.customerId ||
          (cleanEmail && c.email && c.email.toLowerCase() === cleanEmail) ||
          c.phone.replace(/\D/g, '') === cleanPhone
      );
      if (existing) {
        const updatedCustomer: Customer = {
          ...existing,
          email: orderData.customerEmail || existing.email,
          telegramUsername: normalizedTelegram || existing.telegramUsername,
          orderCount: existing.orderCount + 1,
          totalSpent: existing.totalSpent + orderData.totalAmount,
          lastOrderDate: now,
        };
        if (currentCustomer && currentCustomer.id === existing.id) {
          setCurrentCustomer(updatedCustomer);
        }
        if (isSupabaseConfigured && supabase) {
          supabase
            .from('customers')
            .upsert(mapCustomerToRow(updatedCustomer))
            .then(() => {});
        }
        return prev.map((c) => (c.id === existing.id ? updatedCustomer : c));
      }

      const createdCustomer: Customer = {
        id: `cust-${Date.now()}`,
        fullName: orderData.customerName,
        phone: orderData.customerPhone,
        email: orderData.customerEmail,
        telegramUsername: normalizedTelegram,
        addresses: [
          {
            id: `addr-${Date.now()}`,
            title: 'Asosiy manzil',
            region: orderData.region,
            district: orderData.district,
            addressLine: orderData.address,
            isDefault: true,
          },
        ],
        orderCount: 1,
        totalSpent: orderData.totalAmount,
        lastOrderDate: now,
        createdAt: now,
      };
      if (isSupabaseConfigured && supabase) {
        supabase
          .from('customers')
          .upsert(mapCustomerToRow(createdCustomer))
          .then(() => {});
      }
      return [createdCustomer, ...prev];
    });

    await refreshFromSupabase();
    setCart([]);

    addToast({
      type: 'success',
      title: `Buyurtma #${orderNumber} qabul qilindi!`,
      description:
        orderData.paymentVerificationStatus === 'pending_verification'
          ? 'Holat: Toʻlov tekshirilmoqda. Chek admin panelga yuborildi.'
          : 'Tez orada operatorimiz siz bilan bogʻlanadi.',
    });

    return newOrder;
  };

  const reviewOrderReceipt: StoreContextType['reviewOrderReceipt'] = async (
    orderId, decision, reviewerEmail, reviewNote
  ) => {
    const target = orders.find((order) => order.id === orderId);
    if (!target) return false;
    const now = new Date().toISOString();
    const auditLine = `${decision === 'verified' ? 'Toʻlov cheki TASDIQLANDI' : 'Toʻlov cheki RAD ETILDI'} — Tekshirdi: ${reviewerEmail} (${new Date(now).toLocaleString('uz-UZ')})${reviewNote ? `. Izoh: ${reviewNote}` : ''}`;
    const nextStatus: OrderStatus = decision === 'verified' && target.status === 'new' ? 'confirmed' : target.status;
    const nextNotes = [...target.internalNotes, auditLine];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orders').update({
          payment_verification_status: decision,
          payment_reviewed_by: reviewerEmail,
          payment_reviewed_at: now,
          payment_review_note: reviewNote?.trim() || null,
          status: nextStatus,
          internal_notes: nextNotes,
          updated_at: now,
        }).eq('order_number', target.orderNumber).select('order_number').maybeSingle();
        if (error || !data?.order_number) {
          addToast({ type: 'error', title: 'Chek holati saqlanmadi', description: error?.message || 'Buyurtma bazada topilmadi yoki ruxsat yoʻq.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Chekni tekshirishda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }

    setOrders((prev) => prev.map((order) => order.id === orderId ? {
      ...order,
      paymentVerificationStatus: decision,
      paymentReviewedBy: reviewerEmail,
      paymentReviewedAt: now,
      paymentReviewNote: reviewNote?.trim() || undefined,
      status: nextStatus,
      internalNotes: nextNotes,
      updatedAt: now,
    } : order));
    addToast({ type: decision === 'verified' ? 'success' : 'warning', title: decision === 'verified' ? 'Toʻlov cheki tasdiqlandi!' : 'Toʻlov cheki rad etildi', description: `Tekshiruvchi: ${reviewerEmail}` });
    return true;
  };

  const retryOrderTelegramNotification: StoreContextType['retryOrderTelegramNotification'] =
    async (orderId) => {
      const targetOrder = orders.find((o) => o.id === orderId);
      if (!targetOrder) return;

      if (!isSupabaseConfigured || !supabase) {
        addToast({
          type: 'warning',
          title: 'Telegram server funksiyasi ulanmagan',
          description:
            'Haqiqiy Telegram xabarnoma uchun Supabase Edge Function va TELEGRAM_BOT_TOKEN server kalitlarini sozlang. Buyurtma Admin panelda xavfsiz saqlangan.',
        });
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke(
          'submit-order-receipt',
          {
            body: {
              order: targetOrder,
              receiptBase64: null,
            },
          }
        );

        if (error || data?.telegramNotificationStatus !== 'sent') {
          const errMsg =
            error?.message ||
            data?.telegramNotificationError ||
            'TELEGRAM_BOT_TOKEN yoki TELEGRAM_ADMIN_CHAT_ID sozlanmagan';
          setOrders((prev) =>
            prev.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    telegramNotificationStatus:
                      data?.telegramNotificationStatus || 'failed',
                    telegramNotificationError: errMsg,
                  }
                : o
            )
          );
          addToast({
            type: 'warning',
            title: 'Telegram xabarnoma yuborilmadi',
            description: errMsg,
          });
          return;
        }

        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  telegramNotificationStatus: 'sent',
                  telegramNotificationError: undefined,
                }
              : o
          )
        );
        addToast({
          type: 'success',
          title: 'Telegram xabarnoma muvaffaqiyatli yuborildi!',
        });
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Telegram xabarnoma xatoligi',
          description:
            err instanceof Error ? err.message : 'Tarmoq xatoligi yuz berdi',
        });
      }
    };

  const updateOrderStatus: StoreContextType['updateOrderStatus'] = async (orderId, status, note) => {
    const target = orders.find((order) => order.id === orderId);
    if (!target) return false;
    const now = new Date().toISOString();
    const updatedNotes = note ? [...target.internalNotes, `${note} (${new Date().toLocaleTimeString('uz-UZ')})`] : target.internalNotes;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orders').update({ status, internal_notes: updatedNotes, updated_at: now })
          .eq('order_number', target.orderNumber).select('order_number').maybeSingle();
        if (error || !data?.order_number) {
          addToast({ type: 'error', title: 'Buyurtma holati saqlanmadi', description: error?.message || 'Buyurtma bazada topilmadi yoki ruxsat yoʻq.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Buyurtma holatini yangilashda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status, internalNotes: updatedNotes, updatedAt: now } : order));
    addToast({ type: 'success', title: 'Buyurtma holati yangilandi' });
    return true;
  };

  const addOrderInternalNote: StoreContextType['addOrderInternalNote'] = async (orderId, note) => {
    if (!note.trim()) return false;
    const target = orders.find((order) => order.id === orderId);
    if (!target) return false;
    const now = new Date().toISOString();
    const nextNotes = [...target.internalNotes, note.trim()];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('orders').update({ internal_notes: nextNotes, updated_at: now })
          .eq('order_number', target.orderNumber).select('order_number').maybeSingle();
        if (error || !data?.order_number) {
          addToast({ type: 'error', title: 'Ichki izoh saqlanmadi', description: error?.message || 'Buyurtma bazada topilmadi yoki ruxsat yoʻq.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Ichki izohda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, internalNotes: nextNotes, updatedAt: now } : order));
    addToast({ type: 'success', title: 'Ichki izoh qoʻshildi' });
    return true;
  };

  const deleteOrder: StoreContextType['deleteOrder'] = async (orderId) => {
    const target = orders.find((item) => item.id === orderId);
    if (!target) return false;
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('orders').update({ is_deleted: true, deleted_at: now, updated_at: now }).eq('order_number', target.orderNumber).select('order_number').maybeSingle();
      if (error || !data?.order_number) { addToast({ type: 'error', title: 'Buyurtmani arxivlashda xatolik', description: error?.message || 'Buyurtma topilmadi yoki ruxsat yoʻq.' }); return false; }
    }
    setOrders((prev) => prev.map((item) => item.id === orderId ? { ...item, isDeleted: true, deletedAt: now, updatedAt: now } : item));
    addToast({ type: 'info', title: `Buyurtma #${target.orderNumber} arxivlandi` });
    return true;
  };

  const restoreOrder: StoreContextType['restoreOrder'] = async (orderId) => {
    const target = orders.find((item) => item.id === orderId);
    if (!target) return false;
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('orders').update({ is_deleted: false, deleted_at: null, updated_at: now }).eq('order_number', target.orderNumber).select('order_number').maybeSingle();
      if (error || !data?.order_number) { addToast({ type: 'error', title: 'Buyurtmani tiklashda xatolik', description: error?.message || 'Buyurtma topilmadi yoki ruxsat yoʻq.' }); return false; }
    }
    setOrders((prev) => prev.map((item) => item.id === orderId ? { ...item, isDeleted: false, deletedAt: undefined, updatedAt: now } : item));
    addToast({ type: 'success', title: `Buyurtma #${target.orderNumber} tiklandi` });
    return true;
  };

  const toggleBlockCustomer: StoreContextType['toggleBlockCustomer'] = async (customerId, isBlocked, reason) => {
    const target = customers.find((item) => item.id === customerId);
    if (!target) return false;
    const cleanReason = isBlocked ? reason?.trim() || 'Admin tomonidan bloklangan' : undefined;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('customers').update({ is_blocked: isBlocked, blocked_reason: cleanReason || null }).eq('id', customerId).select('id').maybeSingle();
      if (error || !data?.id) { addToast({ type: 'error', title: 'Mijoz holatini yangilashda xatolik', description: error?.message || 'Mijoz topilmadi yoki ruxsat yoʻq.' }); return false; }
      if (target.authUserId) {
        const { data, error: fnError } = await supabase.functions.invoke('admin-owner-guard', { body: { action: 'set_customer_block', authUserId: target.authUserId, isBlocked } });
        if (fnError || data?.ok === false) addToast({ type: 'warning', title: 'Auth sessiyasini bloklash yakunlanmadi', description: fnError?.message || data?.error || 'Edge Function holatini tekshiring.' });
      }
    }
    setCustomers((prev) => prev.map((item) => item.id === customerId ? { ...item, isBlocked, blockedReason: cleanReason } : item));
    if (isBlocked && currentCustomer?.id === customerId) { await signOutCustomer(); }
    addToast({ type: isBlocked ? 'warning' : 'success', title: isBlocked ? 'Mijoz hisobi bloklandi' : 'Mijoz blokdan chiqarildi' });
    return true;
  };

  const setCustomerArchived = async (customerId: string, isDeleted: boolean): Promise<boolean> => {
    const target = customers.find((item) => item.id === customerId);
    if (!target) return false;
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('customers').update({ is_deleted: isDeleted, deleted_at: isDeleted ? now : null }).eq('id', customerId).select('id').maybeSingle();
      if (error || !data?.id) { addToast({ type: 'error', title: isDeleted ? 'Mijozni arxivlashda xatolik' : 'Mijozni tiklashda xatolik', description: error?.message || 'Mijoz topilmadi yoki ruxsat yoʻq.' }); return false; }
    }
    setCustomers((prev) => prev.map((item) => item.id === customerId ? { ...item, isDeleted, deletedAt: isDeleted ? now : undefined } : item));
    addToast({ type: isDeleted ? 'info' : 'success', title: isDeleted ? 'Mijoz profili arxivlandi' : 'Mijoz profili tiklandi' });
    return true;
  };
  const deleteCustomer: StoreContextType['deleteCustomer'] = (id) => setCustomerArchived(id, true);
  const restoreCustomer: StoreContextType['restoreCustomer'] = (id) => setCustomerArchived(id, false);

  const replyToInquiry: StoreContextType['replyToInquiry'] = async ({ inquiryId, replyMessage, repliedBy, deliveryMethod }) => {
    const message = replyMessage.trim();
    if (!message) return false;
    const now = new Date().toISOString();
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('inquiries').update({ status: 'replied', reply_message: message, replied_at: now, replied_by: repliedBy, reply_delivery_method: deliveryMethod }).eq('id', inquiryId).select('id').maybeSingle();
      if (error || !data?.id) { addToast({ type: 'error', title: 'Javobni saqlashda xatolik', description: error?.message || 'Murojaat topilmadi yoki ruxsat yoʻq.' }); return false; }
    }
    setInquiries((prev) => prev.map((item) => item.id === inquiryId ? { ...item, status: 'replied', replyMessage: message, repliedAt: now, repliedBy, replyDeliveryMethod: deliveryMethod } : item));
    addToast({ type: 'success', title: 'Murojaat javobi saqlandi' });
    return true;
  };

  const deleteCategory: StoreContextType['deleteCategory'] = async (categoryId, reassignToCategoryId) => {
    const affected = products.filter((item) => item.categoryId === categoryId);
    if (affected.length && (!reassignToCategoryId || reassignToCategoryId === categoryId || !categories.some((c) => c.id === reassignToCategoryId))) return { ok: false, error: 'Avval mahsulotlarni ko‘chirish uchun boshqa toifani tanlang.' };
    if (isSupabaseConfigured && supabase) {
      if (affected.length) {
        const { data, error } = await supabase.from('products').update({ category_id: reassignToCategoryId, updated_at: new Date().toISOString() }).in('id', affected.map((p) => p.id)).select('id');
        if (error || data?.length !== affected.length) return { ok: false, error: error?.message || 'Mahsulotlarning hammasi boshqa toifaga oʻtkazilmadi.' };
      }
      const { data, error } = await supabase.from('categories').delete().eq('id', categoryId).select('id').maybeSingle();
      if (error || !data?.id) {
        if (affected.length) await supabase.from('products').update({ category_id: categoryId }).in('id', affected.map((p) => p.id));
        return { ok: false, error: error?.message || 'Toifa topilmadi yoki oʻchirishga ruxsat yoʻq.' };
      }
    }
    if (affected.length && reassignToCategoryId) setProducts((prev) => prev.map((p) => p.categoryId === categoryId ? { ...p, categoryId: reassignToCategoryId } : p));
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    addToast({ type: 'success', title: 'Toifa o‘chirildi' });
    return { ok: true };
  };

  const uploadImageFile: StoreContextType['uploadImageFile'] = async (file, folder = 'catalog') => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error('JPG, PNG yoki WEBP rasm tanlang.');
    if (file.size > 4 * 1024 * 1024) throw new Error('Rasm hajmi 4 MB dan oshmasin.');
    if (isSupabaseConfigured && supabase) {
      const path = `${folder}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file, { contentType: file.type, upsert: true });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('product-images').getPublicUrl(path);
      if (!data.publicUrl) throw new Error('Rasm URL manzili olinmadi.');
      return data.publicUrl;
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Rasm faylini oʻqib boʻlmadi.'));
      reader.onload = () => {
        const image = new Image();
        image.onerror = () => resolve(String(reader.result));
        image.onload = () => {
          const ratio = Math.min(1, 1000 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * ratio));
          canvas.height = Math.max(1, Math.round(image.height * ratio));
          const ctx = canvas.getContext('2d');
          if (!ctx) { resolve(String(reader.result)); return; }
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/webp', 0.82));
        };
        image.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  };

  const saveProduct: StoreContextType['saveProduct'] = async (product, isNewProduct = false) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .upsert(mapProductToRow(product))
          .select('id')
          .maybeSingle();
        if (error || !data?.id) {
          addToast({ type: 'error', title: 'Mahsulot saqlanmadi', description: error?.message || 'Bazadan tasdiq javobi kelmadi.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Mahsulotni saqlashda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }

    setProducts((prev) => isNewProduct
      ? [product, ...prev.filter((item) => item.id !== product.id)]
      : prev.map((item) => item.id === product.id ? product : item));
    addToast({
      type: 'success',
      title: isNewProduct ? 'Yangi mahsulot qoʻshildi' : 'Mahsulot yangilandi',
      description: product.name,
    });
    return true;
  };

  const deleteProduct: StoreContextType['deleteProduct'] = async (productId) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId)
          .select('id');
        if (error || !data?.length) {
          addToast({ type: 'error', title: 'Mahsulot oʻchirilmadi', description: error?.message || 'Mahsulot bazada topilmadi yoki ruxsat yoʻq.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Mahsulotni oʻchirishda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }

    setProducts((prev) => prev.filter((item) => item.id !== productId));
    setFavoriteIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      saveFavoritesForCustomer(currentCustomer, next);
      return next;
    });
    addToast({ type: 'success', title: 'Mahsulot oʻchirildi' });
    return true;
  };

  const adjustProductStock: StoreContextType['adjustProductStock'] = async (productId, newStock, reason) => {
    const target = products.find((item) => item.id === productId);
    if (!target || !Number.isFinite(newStock) || newStock < 0) {
      addToast({ type: 'error', title: 'Zaxira miqdorini tekshiring' });
      return false;
    }

    const now = new Date().toISOString();
    const nextStatus: ProductStatus = newStock === 0 && target.status === 'active'
      ? 'out_of_stock'
      : newStock > 0 && target.status === 'out_of_stock' ? 'active' : target.status;
    const logEntry: StockLogEntry = {
      id: `log-${Date.now()}`,
      productId: target.id,
      productName: target.name,
      sku: target.sku,
      previousStock: target.stock,
      newStock,
      changeAmount: newStock - target.stock,
      reason: reason || 'Qoʻlda zaxira yangilandi',
      updatedBy: 'Store Owner',
      createdAt: now,
    };

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('products')
          .update({ stock: newStock, status: nextStatus, updated_at: now })
          .eq('id', productId)
          .select('id')
          .maybeSingle();
        if (error || !data?.id) {
          addToast({ type: 'error', title: 'Zaxira saqlanmadi', description: error?.message || 'Mahsulot bazada topilmadi yoki ruxsat yoʻq.' });
          return false;
        }
        const { error: logError } = await supabase.from('stock_logs').insert(mapStockLogToRow(logEntry));
        if (logError) {
          addToast({ type: 'warning', title: 'Zaxira yangilandi, lekin tarix yozilmadi', description: logError.message });
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Zaxirani yangilashda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }

    setStockLogs((prev) => [logEntry, ...prev]);
    setProducts((prev) => prev.map((item) => item.id === productId
      ? { ...item, stock: newStock, status: nextStatus, updatedAt: now }
      : item));
    addToast({ type: 'success', title: 'Ombor qoldigʻi yangilandi', description: `${target.sku}: ${target.stock} → ${newStock} dona` });
    return true;
  };

  const saveCategory: StoreContextType['saveCategory'] = async (category) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .upsert(mapCategoryToRow(category))
          .select('id')
          .maybeSingle();
        if (error || !data?.id) {
          addToast({ type: 'error', title: 'Toifa saqlanmadi', description: error?.message || 'Bazadan tasdiq javobi kelmadi.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Toifani saqlashda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }

    setCategories((prev) => prev.some((item) => item.id === category.id)
      ? prev.map((item) => item.id === category.id ? category : item)
      : [...prev, category]);
    addToast({ type: 'success', title: 'Toifa saqlandi', description: category.name });
    return true;
  };

  const saveCoupon: StoreContextType['saveCoupon'] = async (coupon) => {
    const nextCoupons = coupons.some((c) => c.id === coupon.id)
      ? coupons.map((c) => (c.id === coupon.id ? coupon : c))
      : [coupon, ...coupons];
    if (!(await syncStoreSettingsPayloadToSupabase(storeSettings, nextCoupons, banners))) return false;
    setCoupons(nextCoupons);
    addToast({
      type: 'success',
      title: 'Promokod saqlandi',
      description: coupon.code,
    });
    return true;
  };

  const deleteCoupon: StoreContextType['deleteCoupon'] = async (couponId) => {
    const nextCoupons = coupons.filter((c) => c.id !== couponId);
    if (!(await syncStoreSettingsPayloadToSupabase(storeSettings, nextCoupons, banners))) return false;
    setCoupons(nextCoupons);
    addToast({ type: 'info', title: 'Promokod oʻchirildi' });
    return true;
  };

  const saveBanner: StoreContextType['saveBanner'] = async (banner) => {
    const nextBanners = banners.some((b) => b.id === banner.id)
      ? banners.map((b) => (b.id === banner.id ? banner : b))
      : [banner, ...banners];
    if (!(await syncStoreSettingsPayloadToSupabase(storeSettings, coupons, nextBanners))) return false;
    setBanners(nextBanners);
    addToast({ type: 'success', title: 'Banner saqlandi' });
    return true;
  };

  const updateStoreSettings: StoreContextType['updateStoreSettings'] = async (settings) => {
    const saved = await syncStoreSettingsPayloadToSupabase(settings, coupons, banners);
    if (!saved) return false;
    setStoreSettings(settings);
    addToast({ type: 'success', title: 'Doʻkon sozlamalari yangilandi' });
    return true;
  };

  const saveAdminAssignment: StoreContextType['saveAdminAssignment'] = async (admin) => {
    if (!admin.name.trim() || !admin.id) return false;
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('admin_assignments')
        .upsert({
          email: admin.id.includes('@') ? admin.id : `${admin.name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}@admin.local`,
          name: admin.name,
          role: admin.role,
          permissions: admin.permissions || [],
          is_active: admin.role !== ('disabled' as AdminRole),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'email' })
        .select('id,email,name,role,permissions,is_active,updated_at')
        .maybeSingle();
      if (error || !data) {
        addToast({ type: 'error', title: 'Admin rolini saqlashda xatolik', description: error?.message || 'Bazaga tasdiq kelmadi.' });
        return false;
      }
    }
    setAdminUsers((prev) => prev.some((item) => item.id === admin.id) ? prev.map((item) => item.id === admin.id ? admin : item) : [admin, ...prev]);
    addToast({ type: 'success', title: 'Admin roli saqlandi' });
    return true;
  };

  const removeAdminAssignment: StoreContextType['removeAdminAssignment'] = async (adminId) => {
    const target = adminUsers.find((item) => item.id === adminId);
    if (!target) return false;
    if (target.role === 'owner') {
      addToast({ type: 'error', title: 'Owner olib tashlanmaydi', description: 'Oxirgi doʻkon egasini demote yoki olib tashlab boʻlmaydi.' });
      return false;
    }
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase
        .from('admin_assignments')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', adminId);
      if (error) {
        addToast({ type: 'error', title: 'Adminni o‘chirishda xatolik', description: error.message });
        return false;
      }
    }
    setAdminUsers((prev) => prev.filter((item) => item.id !== adminId));
    addToast({ type: 'success', title: 'Admin ruxsati o‘chirildi' });
    return true;
  };

  const resetOrderStatsBaseline: StoreContextType['resetOrderStatsBaseline'] = async () => {
    const next = { ...storeSettings, statsResetAt: new Date().toISOString() };
    const saved = await syncStoreSettingsPayloadToSupabase(next, coupons, banners);
    if (!saved) return false;
    setStoreSettings(next);
    addToast({ type: 'success', title: 'Statistika hisoblagichlari nol qilindi', description: 'Tarixiy buyurtmalar saqlab qolindi.' });
    return true;
  };

  const updateInquiryStatus: StoreContextType['updateInquiryStatus'] = async (inquiryId, status) => {
    const target = inquiries.find((inquiry) => inquiry.id === inquiryId);
    if (!target) return false;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('inquiries').update({ status }).eq('id', inquiryId).select('id').maybeSingle();
        if (error || !data?.id) {
          addToast({ type: 'error', title: 'Murojaat holati saqlanmadi', description: error?.message || 'Murojaat bazada topilmadi yoki ruxsat yoʻq.' });
          return false;
        }
      } catch (err) {
        addToast({ type: 'error', title: 'Murojaatni yangilashda xatolik', description: err instanceof Error ? err.message : 'Tarmoq xatoligi' });
        return false;
      }
    }
    setInquiries((prev) => prev.map((inquiry) => inquiry.id === inquiryId ? { ...inquiry, status } : inquiry));
    addToast({ type: 'success', title: 'Murojaat holati yangilandi' });
    return true;
  };

  const resetAllDemoData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setProducts(INITIAL_PRODUCTS);
    setCategories(INITIAL_CATEGORIES);
    setBanners(INITIAL_BANNERS);
    setOrders(INITIAL_ORDERS);
    setCustomers(INITIAL_CUSTOMERS);
    setCoupons(INITIAL_COUPONS);
    setStockLogs(INITIAL_STOCK_LOGS);
    setInquiries(INITIAL_INQUIRIES);
    setStoreSettings(INITIAL_STORE_SETTINGS);
    setCart([{ productId: 'prod-1', quantity: 1 }]);
    setFavoriteIds([]);
    saveFavoritesForCustomer(null, []);
    setCurrentCustomer(null);
    setCurrentAdminRole('owner');
    setAdminUsers(ADMIN_USERS);
    addToast({
      type: 'info',
      title: 'Demo maʼlumotlar dastlabki holatga qaytarildi',
    });
  };

  return (
    <StoreContext.Provider
      value={{
        products,
        categories,
        banners,
        orders,
        customers,
        coupons,
        stockLogs,
        inquiries,
        storeSettings,
        adminUsers,
        isSyncingSupabase,
        cart,
        favoriteIds,
        recentlyViewedIds,
        currentCustomer,
        currentAdminRole,
        setCurrentAdminRole,
        saveAdminAssignment,
        removeAdminAssignment,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        toggleFavorite,
        clearFavorites,
        recordRecentlyViewed,
        syncVerifiedCustomerFromAuthUser,
        signInCustomerDemo,
        signOutCustomer,
        updateCustomerProfile,
        toggleBlockCustomer,
        deleteCustomer,
        restoreCustomer,
        submitCustomerInquiry,
        placeOrder,
        updateOrderStatus,
        addOrderInternalNote,
        reviewOrderReceipt,
        retryOrderTelegramNotification,
        deleteOrder,
        restoreOrder,
        replyToInquiry,
        saveProduct,
        deleteProduct,
        adjustProductStock,
        saveCategory,
        deleteCategory,
        uploadImageFile,
        saveCoupon,
        deleteCoupon,
        saveBanner,
        updateStoreSettings,
        resetOrderStatsBaseline,
        updateInquiryStatus,
        refreshFromSupabase,
        toasts,
        addToast,
        removeToast,
        resetAllDemoData,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
