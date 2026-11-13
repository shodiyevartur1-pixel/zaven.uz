export type Language = 'uz' | 'ru' | 'en';

export type ThemeMode = 'light' | 'dark';

export type AdminRole = 'owner' | 'admin' | 'order_manager' | 'content_manager';

export type ProductStatus = 'active' | 'out_of_stock' | 'hidden' | 'archived';

export type OrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentVerificationStatus =
  | 'not_required'
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export type TelegramNotificationStatus =
  | 'not_configured'
  | 'sent'
  | 'failed';

export interface PaymentReceiptAttachment {
  fileName: string;
  mimeType: string;
  fileSize: number;
  dataUrl: string;
  storagePath?: string;
  uploadedAt: string;
}

export interface BankTransferConfig {
  isEnabled: boolean;
  humoCardNumber: string;
  humoCardHolder: string;
  uzcardCardNumber: string;
  uzcardCardHolder: string;
  bankName: string;
  transferInstructions: string;
}

export interface ProductSpecification {
  label: string;
  value: string;
}

export interface ProductLocalizedFields {
  name?: string;
  shortDescription?: string;
  description?: string;
  features?: string[];
}

export interface StockLogEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  previousStock: number;
  newStock: number;
  changeAmount: number;
  reason: string;
  updatedBy: string;
  createdAt: string;
}

export interface Product {
  id: string;
  slug: string;
  sku: string;
  name: string;
  categoryId: string;
  price: number;
  salePrice?: number | null;
  costPrice: number;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  shortDescription: string;
  description: string;
  features: string[];
  specifications: ProductSpecification[];
  translations?: {
    uz?: ProductLocalizedFields;
    ru?: ProductLocalizedFields;
    en?: ProductLocalizedFields;
  };
  images: string[];
  isNew?: boolean;
  isPopular?: boolean;
  isRecommended?: boolean;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  iconName: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  image: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  region: string;
  district?: string;
  address: string;
  locationCoordinates?: {
    lat: number;
    lng: number;
    accuracyMeters?: number;
  };
  customerNote?: string;
  internalNotes: string[];
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string;
  deliveryFee: number;
  totalAmount: number;
  paymentMethodId: string;
  paymentMethodLabel: string;
  paymentVerificationStatus: PaymentVerificationStatus;
  paymentReceipt?: PaymentReceiptAttachment;
  paymentReviewedBy?: string;
  paymentReviewedAt?: string;
  paymentReviewNote?: string;
  telegramNotificationStatus?: TelegramNotificationStatus;
  telegramNotificationError?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerAddress {
  id: string;
  title: string;
  region: string;
  district?: string;
  addressLine: string;
  isDefault: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  addresses: CustomerAddress[];
  orderCount: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderAmount: number;
  startDate: string;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface HomepageBanner {
  id: string;
  badgeText: string;
  headline: string;
  subheadline: string;
  offerText: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface TrustItem {
  id: string;
  title: string;
  description: string;
  iconName: string;
  isEnabled: boolean;
}

export interface DeliveryRegionRule {
  id: string;
  regionName: string;
  fee: number;
  freeDeliveryThreshold?: number | null;
  note: string;
  isEnabled: boolean;
}

export interface DeliverySettings {
  isDeliveryEnabled: boolean;
  generalDeliveryNote: string;
  showDeliveryInfoOnProductPage: boolean;
  regions: DeliveryRegionRule[];
}

export interface PaymentMethodOption {
  id: string;
  name: string;
  description: string;
  type: 'cash' | 'card_transfer' | 'gateway_demo';
  requiresReceipt?: boolean;
  isEnabled: boolean;
  isDemoMode: boolean;
  configurationNote: string;
}

export interface CustomerInquiry {
  id: string;
  customerName: string;
  phone: string;
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'replied';
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  role: AdminRole;
  title: string;
  lastActive: string;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  supportPhone: string;
  supportTelegram: string;
  instagramUrl: string;
  instagramHandle: string;
  workingHours: string;
  cityLocation: string;
  seoTitle: string;
  seoDescription: string;
  socialShareImage: string;
  trustItems: TrustItem[];
  delivery: DeliverySettings;
  paymentMethods: PaymentMethodOption[];
  bankTransfer: BankTransferConfig;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  description?: string;
}
