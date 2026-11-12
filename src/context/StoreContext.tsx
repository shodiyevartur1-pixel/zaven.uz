import React, { createContext, useContext, useEffect, useState } from 'react';
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
  Product,
  StockLogEntry,
  StoreSettings,
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

  // Order Placement, Receipt Verification & Telegram Retry Actions (Phase 4)
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

  // Notifications & Reset
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  resetAllDemoData: () => void;
}

const STORAGE_KEY = 'zaven_store_state_v2';

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

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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
    addToast({
      type: 'success',
      title: 'Profil maʼlumotlari saqlandi',
    });
  };

  const submitCustomerInquiry: StoreContextType['submitCustomerInquiry'] = ({
    customerName,
    phone,
    subject,
    message,
  }) => {
    const newInquiry: CustomerInquiry = {
      id: `inq-${Date.now()}`,
      customerName: customerName.trim(),
      phone: phone.trim(),
      subject: subject.trim() || 'Umumiy savol',
      message: message.trim(),
      status: 'unread',
      createdAt: new Date().toISOString(),
    };
    setInquiries((prev) => [newInquiry, ...prev]);
    addToast({
      type: 'success',
      title: 'Murojaatingiz yuborildi!',
    });
  };

  // Phase 4: Place Order + Upload Receipt + Trigger Server-Side Telegram Bot Function
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

    // If Supabase is configured, invoke the server-side `submit-order-receipt` Edge Function
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

    // Even if Telegram or Edge Function is not configured or fails, NEVER lose the order:
    // Save immediately into the website's Admin Orders inbox.
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
    setProducts((prev) =>
      prev.map((p) => {
        const orderedItem = orderData.items.find((i) => i.productId === p.id);
        if (!orderedItem) return p;
        const nextStock = Math.max(0, p.stock - orderedItem.quantity);
        return {
          ...p,
          stock: nextStock,
          soldCount: p.soldCount + orderedItem.quantity,
          status: nextStock === 0 ? 'out_of_stock' : p.status,
          updatedAt: now,
        };
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

    if (orderData.couponCode) {
      setCoupons((prev) =>
        prev.map((c) =>
          c.code.toUpperCase() === orderData.couponCode?.toUpperCase()
            ? { ...c, usedCount: c.usedCount + 1 }
            : c
        )
      );
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

  // Phase 4: Owner Confirm or Reject Bank Transfer Receipt (Records reviewer & timestamp)
  const reviewOrderReceipt: StoreContextType['reviewOrderReceipt'] = (
    orderId,
    decision,
    reviewerEmail,
    reviewNote
  ) => {
    const now = new Date().toISOString();
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const actionLabel =
          decision === 'verified'
            ? 'Toʻlov cheki TASDIQLANDI'
            : 'Toʻlov cheki RAD ETILDI';
        const auditLine = `${actionLabel} — Tekshirdi: ${reviewerEmail} (${new Date(
          now
        ).toLocaleString('uz-UZ')})${reviewNote ? `. Izoh: ${reviewNote}` : ''}`;

        return {
          ...o,
          paymentVerificationStatus: decision,
          paymentReviewedBy: reviewerEmail,
          paymentReviewedAt: now,
          paymentReviewNote: reviewNote?.trim() || undefined,
          status:
            decision === 'verified' && o.status === 'new'
              ? 'confirmed'
              : o.status,
          internalNotes: [...o.internalNotes, auditLine],
          updatedAt: now,
        };
      })
    );

    addToast({
      type: decision === 'verified' ? 'success' : 'warning',
      title:
        decision === 'verified'
          ? 'Toʻlov cheki tasdiqlandi!'
          : 'Toʻlov cheki rad etildi',
      description: `Tekshiruvchi: ${reviewerEmail}`,
    });
  };

  // Phase 4: Retry Telegram Notification via Server-Side Edge Function
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
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const updatedNotes = note
          ? [
              ...o.internalNotes,
              `${note} (${new Date().toLocaleTimeString('uz-UZ')})`,
            ]
          : o.internalNotes;
        return { ...o, status, internalNotes: updatedNotes, updatedAt: now };
      })
    );
    addToast({
      type: 'success',
      title: 'Buyurtma holati yangilandi',
    });
  };

  const addOrderInternalNote = (orderId: string, note: string) => {
    if (!note.trim()) return;
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              internalNotes: [...o.internalNotes, note.trim()],
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
    addToast({
      type: 'success',
      title: 'Ichki izoh qoʻshildi',
    });
  };

  const saveProduct = (product: Product, isNewProduct = false) => {
    if (isNewProduct) {
      setProducts((prev) => [product, ...prev]);
      addToast({
        type: 'success',
        title: 'Yangi mahsulot qoʻshildi',
        description: product.name,
      });
    } else {
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? product : p))
      );
      addToast({
        type: 'success',
        title: 'Mahsulot yangilandi',
        description: product.name,
      });
    }
  };

  const deleteProduct = (productId: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    addToast({ type: 'info', title: 'Mahsulot oʻchirildi' });
  };

  const adjustProductStock = (
    productId: string,
    newStock: number,
    reason: string
  ) => {
    const target = products.find((p) => p.id === productId);
    if (!target) return;

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
      createdAt: new Date().toISOString(),
    };

    setStockLogs((prev) => [logEntry, ...prev]);
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? {
              ...p,
              stock: newStock,
              status:
                newStock === 0 && p.status === 'active'
                  ? 'out_of_stock'
                  : newStock > 0 && p.status === 'out_of_stock'
                  ? 'active'
                  : p.status,
              updatedAt: new Date().toISOString(),
            }
          : p
      )
    );

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
    addToast({
      type: 'success',
      title: 'Toifa saqlandi',
      description: category.name,
    });
  };

  const saveCoupon = (coupon: Coupon) => {
    setCoupons((prev) => {
      const exists = prev.some((c) => c.id === coupon.id);
      return exists
        ? prev.map((c) => (c.id === coupon.id ? coupon : c))
        : [coupon, ...prev];
    });
    addToast({
      type: 'success',
      title: 'Promokod saqlandi',
      description: coupon.code,
    });
  };

  const deleteCoupon = (couponId: string) => {
    setCoupons((prev) => prev.filter((c) => c.id !== couponId));
    addToast({ type: 'info', title: 'Promokod oʻchirildi' });
  };

  const saveBanner = (banner: HomepageBanner) => {
    setBanners((prev) => {
      const exists = prev.some((b) => b.id === banner.id);
      return exists
        ? prev.map((b) => (b.id === banner.id ? banner : b))
        : [banner, ...prev];
    });
    addToast({ type: 'success', title: 'Banner saqlandi' });
  };

  const updateStoreSettings = (settings: StoreSettings) => {
    setStoreSettings(settings);
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