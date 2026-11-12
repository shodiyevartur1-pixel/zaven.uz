import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
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
  // Store Data
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

  // Active Customer & Cart
  cart: CartItem[];
  recentlyViewedIds: string[];
  currentCustomer: Customer | null;

  // Active Admin Role
  currentAdminRole: AdminRole;
  setCurrentAdminRole: (role: AdminRole) => void;

  // Cart Actions
  addToCart: (productId: string, quantity?: number) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  recordRecentlyViewed: (productId: string) => void;

  // Customer Auth & Profile Actions
  signInCustomerDemo: (phone: string, fullName?: string) => void;
  signOutCustomer: () => void;
  updateCustomerProfile: (updated: Partial<Customer>) => void;

  // Customer Inquiry Submission
  submitCustomerInquiry: (data: {
    customerName: string;
    phone: string;
    subject: string;
    message: string;
  }) => void;

  // Order Placement, Receipt Verification & Telegram Retry Actions
  placeOrder: (
    orderData: Omit<
      Order,
      | 'id'
      | 'orderNumber'
      | 'createdAt'
      | 'updatedAt'
      | 'status'
      | 'internalNotes'
    >
  ) => Promise<Order>;
  updateOrderStatus: (
    orderId: string,
    status: OrderStatus,
    note?: string
  ) => void;
  addOrderInternalNote: (orderId: string, note: string) => void;
  reviewOrderReceipt: (
    orderId: string,
    decision: 'verified' | 'rejected',
    reviewerEmail: string,
    reviewNote?: string
  ) => void;
  retryOrderTelegramNotification: (orderId: string) => Promise<void>;

  // Admin Product & Inventory Actions
  saveProduct: (product: Product, isNewProduct?: boolean) => void;
  deleteProduct: (productId: string) => void;
  adjustProductStock: (
    productId: string,
    newStock: number,
    reason: string
  ) => void;

  // Admin Categories, Coupons, Banners & Settings
  saveCategory: (category: Category) => void;
  saveCoupon: (coupon: Coupon) => void;
  deleteCoupon: (couponId: string) => void;
  saveBanner: (banner: HomepageBanner) => void;
  updateStoreSettings: (settings: StoreSettings) => void;
  updateInquiryStatus: (
    inquiryId: string,
    status: CustomerInquiry['status']
  ) => void;
  refreshFromSupabase: () => Promise<void>;

  // Notifications & Reset
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  resetAllDemoData: () => void;
}

const STORAGE_KEY = 'zaven_store_state_v2';

// ============================================================================
// DATABASE ROW <-> TYPESCRIPT MODEL MAPPERS
// ============================================================================

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
    price: Number(row.price || 0),
    salePrice:
      row.sale_price !== null && row.sale_price !== undefined
        ? Number(row.sale_price)
        : null,
    costPrice: Number(row.cost_price || 0),
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

  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    customerName: String(row.customer_name),
    customerPhone: String(row.customer_phone),
    customerEmail: row.customer_email ? String(row.customer_email) : undefined,
    region: String(row.region),
    address: String(row.address),
    customerNote: row.customer_note ? String(row.customer_note) : undefined,
    internalNotes: Array.isArray(row.internal_notes)
      ? (row.internal_notes as string[])
      : [],
    items: Array.isArray(row.items) ? (row.items as Order['items']) : [],
    subtotal: Number(row.subtotal || 0),
    discountAmount: Number(row.discount_amount || 0),
    couponCode: row.coupon_code ? String(row.coupon_code) : undefined,
    deliveryFee: Number(row.delivery_fee || 0),
    totalAmount: Number(row.total_amount || 0),
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
            fileSize: Number(row.payment_receipt_size || 0),
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
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapRowToCustomer(row: Record<string, unknown>): Customer {
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    phone: String(row.phone),
    email: row.email ? String(row.email) : undefined,
    addresses: Array.isArray(row.addresses)
      ? (row.addresses as Customer['addresses'])
      : [],
    orderCount: Number(row.order_count || 0),
    totalSpent: Number(row.total_spent || 0),
    lastOrderDate: row.last_order_date
      ? String(row.last_order_date)
      : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapCustomerToRow(cust: Customer) {
  return {
    id: cust.id,
    full_name: cust.fullName,
    phone: cust.phone,
    email: cust.email || null,
    addresses: cust.addresses,
    order_count: cust.orderCount,
    total_spent: Math.round(cust.totalSpent),
    last_order_date: cust.lastOrderDate || null,
    created_at: cust.createdAt,
  };
}

function mapRowToStockLog(row: Record<string, unknown>): StockLogEntry {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: String(row.product_name),
    sku: String(row.sku),
    previousStock: Number(row.previous_stock || 0),
    newStock: Number(row.new_stock || 0),
    changeAmount: Number(row.change_amount || 0),
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
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

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
        bankTransfer: {
          ...INITIAL_STORE_SETTINGS.bankTransfer,
          ...(savedState.storeSettings.bankTransfer || {}),
        },
      };
    }
    return INITIAL_STORE_SETTINGS;
  });
  const [cart, setCart] = useState<CartItem[]>(
    savedState?.cart || [{ productId: 'prod-1', quantity: 1 }]
  );
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(
    savedState?.recentlyViewedIds || ['prod-1', 'prod-2', 'prod-4']
  );
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(
    savedState?.currentCustomer !== undefined
      ? savedState.currentCustomer
      : INITIAL_CUSTOMERS[0]
  );
  const [currentAdminRole, setCurrentAdminRole] = useState<AdminRole>('owner');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isSyncingSupabase, setIsSyncingSupabase] = useState<boolean>(false);

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Helper to persist `store_settings` singleton payload (including coupons & banners)
  const syncStoreSettingsPayloadToSupabase = useCallback(
    async (
      nextSettings: StoreSettings,
      nextCoupons: Coupon[],
      nextBanners: HomepageBanner[]
    ) => {
      if (!isSupabaseConfigured || !supabase) return;
      try {
        await supabase.from('store_settings').upsert({
          id: 1,
          payload: {
            ...nextSettings,
            coupons: nextCoupons,
            banners: nextBanners,
          },
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Failed to sync store_settings to Supabase:', err);
      }
    },
    []
  );

  // ============================================================================
  // LIVE SUPABASE FETCH & HYDRATION (Public Catalog + Owner-Protected Tables)
  // ============================================================================
  const refreshFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setIsSyncingSupabase(true);

    try {
      // 1. Fetch Public Storefront Tables (Categories, Products, Store Settings)
      const [catRes, prodRes, settingsRes] = await Promise.all([
        supabase
          .from('categories')
          .select('*')
          .order('sort_order', { ascending: true }),
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase.from('store_settings').select('*').eq('id', 1).maybeSingle(),
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
          bankTransfer: {
            ...INITIAL_STORE_SETTINGS.bankTransfer,
            ...((restSettings.bankTransfer as StoreSettings['bankTransfer']) ||
              {}),
          },
        }));

        if (Array.isArray(savedCoupons) && savedCoupons.length > 0) {
          setCoupons(savedCoupons as Coupon[]);
        }
        if (Array.isArray(savedBanners) && savedBanners.length > 0) {
          setBanners(savedBanners as HomepageBanner[]);
        }
      }

      // 2. If an authenticated Owner session is active, fetch Owner-Only RLS tables
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
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
          // Resolve private signed URLs for orders that have a receipt in `payment-receipts`
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
            setOrders(mappedOrders);
          }
        }

        if (!custRes.error && custRes.data && custRes.data.length > 0) {
          setCustomers(custRes.data.map(mapRowToCustomer));
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
  }, []);

  // Run initial fetch on mount and re-sync whenever Supabase Auth session changes
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    refreshFromSupabase();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refreshFromSupabase();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshFromSupabase]);

  // Owner-only live order updates. RLS ensures only the authenticated owner
  // receives order rows from Supabase Realtime.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const supabaseClient = supabase;
    let orderChannel: ReturnType<typeof supabaseClient.channel> | null = null;
    let disposed = false;

    const subscribeToOwnerOrders = (hasSession: boolean) => {
      if (disposed || !hasSession || orderChannel) return;

      orderChannel = supabaseClient
        .channel('zaven-owner-orders')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            const row = payload.new as Record<string, unknown>;
            const orderNumber =
              typeof row.order_number === 'string' ? row.order_number : '';
            addToast({
              type: 'info',
              title: 'Yangi buyurtma keldi',
              description: orderNumber ? `Buyurtma #${orderNumber}` : undefined,
            });
            void refreshFromSupabase();
          }
        )
        .subscribe();
    };

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Defer Supabase work until after its auth callback completes.
        setTimeout(() => subscribeToOwnerOrders(true), 0);
      } else if (orderChannel) {
        void supabaseClient.removeChannel(orderChannel);
        orderChannel = null;
      }
    });

    void supabaseClient.auth.getSession().then(({ data }) => {
      subscribeToOwnerOrders(Boolean(data.session?.user));
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
      if (orderChannel) void supabaseClient.removeChannel(orderChannel);
    };
  }, [addToast, refreshFromSupabase]);

  // Keep localStorage cache synchronized as a fast local cache
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
    recentlyViewedIds,
    currentCustomer,
    currentAdminRole,
  ]);

  // ============================================================================
  // CART & CUSTOMER ACTIONS
  // ============================================================================
  const addToCart = (productId: string, quantity = 1) => {
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
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
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
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
    addToast({
      type: 'info',
      title: 'Mahsulot savatchadan olib tashlandi',
    });
  };

  const clearCart = () => setCart([]);

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

  const signOutCustomer = () => {
    setCurrentCustomer(null);
    addToast({
      type: 'info',
      title: 'Hisobdan chiqildi',
    });
  };

  const updateCustomerProfile = (updated: Partial<Customer>) => {
    if (!currentCustomer) return;
    const nextCustomer = { ...currentCustomer, ...updated };
    setCurrentCustomer(nextCustomer);
    setCustomers((prev) =>
      prev.map((c) => (c.id === nextCustomer.id ? nextCustomer : c))
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('customers')
        .upsert(mapCustomerToRow(nextCustomer))
        .then(() => {});
    }

    addToast({
      type: 'success',
      title: 'Profil maʼlumotlari saqlandi',
    });
  };

  // ============================================================================
  // CUSTOMER INQUIRY SUBMISSION (Bi-Directional Sync)
  // ============================================================================
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

      setInquiries((prev) => [newInquiry, ...prev]);

      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase
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

        if (data) {
          const synced = mapRowToInquiry(data);
          setInquiries((prev) =>
            prev.map((item) => (item.id === newInquiry.id ? synced : item))
          );
        }
      }

      addToast({
        type: 'success',
        title: 'Murojaatingiz yuborildi!',
      });
    };

  // ============================================================================
  // ORDER PLACEMENT + RECEIPT UPLOAD + SUPABASE SYNC
  // ============================================================================
  const placeOrder: StoreContextType['placeOrder'] = async (orderData) => {
    const now = new Date().toISOString();
    const orderNumber = `ZVN-2026-${1042 + orders.length}`;

    const initialNotes = [
      orderData.paymentVerificationStatus === 'pending_verification'
        ? `Yangi buyurtma qabul qilindi. Toʻlov cheki yuklandi (${orderData.paymentReceipt?.fileName}) — Holat: Toʻlov tekshirilmoqda.`
        : 'Yangi buyurtma veb-sayt orqali qabul qilindi.',
    ];

    let telegramStatus: Order['telegramNotificationStatus'] = 'not_configured';
    let telegramError: string | undefined = undefined;
    let storedPath: string | undefined = undefined;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.functions.invoke(
          'submit-order-receipt',
          {
            body: {
              order: {
                ...orderData,
                orderNumber,
                internalNotes: initialNotes,
              },
              receiptBase64: orderData.paymentReceipt?.dataUrl || null,
            },
          }
        );

        if (error) {
          telegramStatus = 'failed';
          telegramError = error.message;
          // Fallback direct insert so the order is still stored in `public.orders` even if the Edge Function was not deployed yet
          await supabase.from('orders').insert({
            order_number: orderNumber,
            customer_name: orderData.customerName,
            customer_phone: orderData.customerPhone,
            customer_email: orderData.customerEmail || null,
            region: orderData.region,
            address: orderData.address,
            customer_note: orderData.customerNote || null,
            internal_notes: initialNotes,
            items: orderData.items,
            subtotal: Math.round(orderData.subtotal),
            discount_amount: Math.round(orderData.discountAmount || 0),
            coupon_code: orderData.couponCode || null,
            delivery_fee: Math.round(orderData.deliveryFee || 0),
            total_amount: Math.round(orderData.totalAmount),
            payment_method_id: orderData.paymentMethodId,
            payment_method_label: orderData.paymentMethodLabel,
            payment_receipt_filename:
              orderData.paymentReceipt?.fileName || null,
            payment_receipt_mime: orderData.paymentReceipt?.mimeType || null,
            payment_receipt_size: orderData.paymentReceipt?.fileSize || null,
            payment_verification_status: orderData.paymentVerificationStatus,
            telegram_notification_status: 'failed',
            telegram_notification_error: telegramError,
            status: 'new',
          });
        } else if (data) {
          telegramStatus = data.telegramNotificationStatus || 'not_configured';
          telegramError = data.telegramNotificationError;
          storedPath = data.storedReceiptPath || undefined;
        }
      } catch (err) {
        telegramStatus = 'failed';
        telegramError =
          err instanceof Error ? err.message : 'Edge function unreachable';
      }
    }

    const newOrder: Order = {
      ...orderData,
      id: `ord-${Date.now()}`,
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

    setOrders((prev) => [newOrder, ...prev]);

    // Deduct stock and record stock log
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

    // Sync updated product stock & stock logs to Supabase if owner session is active
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
    setCustomers((prev) => {
      const existing = prev.find(
        (c) =>
          c.id === orderData.customerId ||
          c.phone.replace(/\D/g, '') === cleanPhone
      );
      if (existing) {
        const updatedCustomer: Customer = {
          ...existing,
          email: orderData.customerEmail || existing.email,
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
        addresses: [
          {
            id: `addr-${Date.now()}`,
            title: 'Asosiy manzil',
            region: orderData.region,
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

  // ============================================================================
  // OWNER ADMIN ACTIONS (Bi-Directional Sync with PostgreSQL)
  // ============================================================================
  const reviewOrderReceipt: StoreContextType['reviewOrderReceipt'] = (
    orderId,
    decision,
    reviewerEmail,
    reviewNote
  ) => {
    const now = new Date().toISOString();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const actionLabel =
      decision === 'verified'
        ? 'Toʻlov cheki TASDIQLANDI'
        : 'Toʻlov cheki RAD ETILDI';
    const auditLine = `${actionLabel} — Tekshirdi: ${reviewerEmail} (${new Date(
      now
    ).toLocaleString('uz-UZ')})${reviewNote ? `. Izoh: ${reviewNote}` : ''}`;

    const nextStatus: OrderStatus =
      decision === 'verified' && target.status === 'new'
        ? 'confirmed'
        : target.status;
    const nextNotes = [...target.internalNotes, auditLine];

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentVerificationStatus: decision,
              paymentReviewedBy: reviewerEmail,
              paymentReviewedAt: now,
              paymentReviewNote: reviewNote?.trim() || undefined,
              status: nextStatus,
              internalNotes: nextNotes,
              updatedAt: now,
            }
          : o
      )
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('orders')
        .update({
          payment_verification_status: decision,
          payment_reviewed_by: reviewerEmail,
          payment_reviewed_at: now,
          payment_review_note: reviewNote?.trim() || null,
          status: nextStatus,
          internal_notes: nextNotes,
          updated_at: now,
        })
        .eq('order_number', target.orderNumber)
        .then(() => {});
    }

    addToast({
      type: decision === 'verified' ? 'success' : 'warning',
      title:
        decision === 'verified'
          ? 'Toʻlov cheki tasdiqlandi!'
          : 'Toʻlov cheki rad etildi',
      description: `Tekshiruvchi: ${reviewerEmail}`,
    });
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

  const updateOrderStatus = (
    orderId: string,
    status: OrderStatus,
    note?: string
  ) => {
    const now = new Date().toISOString();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const updatedNotes = note
      ? [
          ...target.internalNotes,
          `${note} (${new Date().toLocaleTimeString('uz-UZ')})`,
        ]
      : target.internalNotes;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status, internalNotes: updatedNotes, updatedAt: now }
          : o
      )
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('orders')
        .update({
          status,
          internal_notes: updatedNotes,
          updated_at: now,
        })
        .eq('order_number', target.orderNumber)
        .then(() => {});
    }

    addToast({
      type: 'success',
      title: 'Buyurtma holati yangilandi',
    });
  };

  const addOrderInternalNote = (orderId: string, note: string) => {
    if (!note.trim()) return;
    const now = new Date().toISOString();
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;

    const nextNotes = [...target.internalNotes, note.trim()];

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              internalNotes: nextNotes,
              updatedAt: now,
            }
          : o
      )
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('orders')
        .update({
          internal_notes: nextNotes,
          updated_at: now,
        })
        .eq('order_number', target.orderNumber)
        .then(() => {});
    }

    addToast({
      type: 'success',
      title: 'Ichki izoh qoʻshildi',
    });
  };

  const saveProduct = (product: Product, isNewProduct = false) => {
    if (isNewProduct) {
      setProducts((prev) => [product, ...prev]);
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
    }

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('products')
        .upsert(mapProductToRow(product))
        .then(({ error }) => {
          if (error) {
            console.error('Supabase saveProduct error:', error.message);
          }
        });
    }

    addToast({
      type: 'success',
      title: isNewProduct
        ? 'Yangi mahsulot qoʻshildi'
        : 'Mahsulot yangilandi',
      description: product.name,
    });
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .then(({ error }) => {
          if (error) {
            console.error('Supabase deleteProduct error:', error.message);
          }
        });
    }

    addToast({ type: 'info', title: 'Mahsulot oʻchirildi' });
  };

  const adjustProductStock = (
    productId: string,
    newStock: number,
    reason: string
  ) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

    const now = new Date().toISOString();
    const nextStatus: ProductStatus =
      newStock === 0 && target.status === 'active'
        ? 'out_of_stock'
        : newStock > 0 && target.status === 'out_of_stock'
        ? 'active'
        : target.status;

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

    setStockLogs((prev) => [logEntry, ...prev]);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: newStock,
              status: nextStatus,
              updatedAt: now,
            }
          : p
      )
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('products')
        .update({
          stock: newStock,
          status: nextStatus,
          updated_at: now,
        })
        .eq('id', productId)
        .then(() => {});

      supabase
        .from('stock_logs')
        .insert(mapStockLogToRow(logEntry))
        .then(() => {});
    }

    addToast({
      type: 'success',
      title: 'Ombor qoldigʻi yangilandi',
      description: `${target.sku}: ${target.stock} -> ${newStock} dona`,
    });
  };

  const saveCategory = (category: Category) => {
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === category.id);
      return exists
        ? prev.map((c) => (c.id === category.id ? category : c))
        : [...prev, category];
    });

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('categories')
        .upsert(mapCategoryToRow(category))
        .then(({ error }) => {
          if (error) {
            console.error('Supabase saveCategory error:', error.message);
          }
        });
    }

    addToast({
      type: 'success',
      title: 'Toifa saqlandi',
      description: category.name,
    });
  };

  const saveCoupon = (coupon: Coupon) => {
    setCoupons((prev) => {
      const exists = prev.some((c) => c.id === coupon.id);
      const nextCoupons = exists
        ? prev.map((c) => (c.id === coupon.id ? coupon : c))
        : [coupon, ...prev];
      syncStoreSettingsPayloadToSupabase(storeSettings, nextCoupons, banners);
      return nextCoupons;
    });

    addToast({
      type: 'success',
      title: 'Promokod saqlandi',
      description: coupon.code,
    });
  };

  const deleteCoupon = (couponId: string) => {
    setCoupons((prev) => {
      const nextCoupons = prev.filter((c) => c.id !== couponId);
      syncStoreSettingsPayloadToSupabase(storeSettings, nextCoupons, banners);
      return nextCoupons;
    });
    addToast({ type: 'info', title: 'Promokod oʻchirildi' });
  };

  const saveBanner = (banner: HomepageBanner) => {
    setBanners((prev) => {
      const exists = prev.some((b) => b.id === banner.id);
      const nextBanners = exists
        ? prev.map((b) => (b.id === banner.id ? banner : b))
        : [banner, ...prev];
      syncStoreSettingsPayloadToSupabase(storeSettings, coupons, nextBanners);
      return nextBanners;
    });
    addToast({ type: 'success', title: 'Banner saqlandi' });
  };

  const updateStoreSettings = (settings: StoreSettings) => {
    setStoreSettings(settings);
    syncStoreSettingsPayloadToSupabase(settings, coupons, banners);
    addToast({
      type: 'success',
      title: 'Doʻkon sozlamalari yangilandi',
    });
  };

  const updateInquiryStatus = (
    inquiryId: string,
    status: CustomerInquiry['status']
  ) => {
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === inquiryId ? { ...inq, status } : inq))
    );

    if (isSupabaseConfigured && supabase) {
      supabase
        .from('inquiries')
        .update({ status })
        .eq('id', inquiryId)
        .then(() => {});
    }

    addToast({ type: 'success', title: 'Murojaat holati yangilandi' });
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
    setCurrentCustomer(INITIAL_CUSTOMERS[0]);
    setCurrentAdminRole('owner');
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
        adminUsers: ADMIN_USERS,
        isSyncingSupabase,
        cart,
        recentlyViewedIds,
        currentCustomer,
        currentAdminRole,
        setCurrentAdminRole,
        addToCart,
        updateCartQuantity,
        removeFromCart,
        clearCart,
        recordRecentlyViewed,
        signInCustomerDemo,
        signOutCustomer,
        updateCustomerProfile,
        submitCustomerInquiry,
        placeOrder,
        updateOrderStatus,
        addOrderInternalNote,
        reviewOrderReceipt,
        retryOrderTelegramNotification,
        saveProduct,
        deleteProduct,
        adjustProductStock,
        saveCategory,
        saveCoupon,
        deleteCoupon,
        saveBanner,
        updateStoreSettings,
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
