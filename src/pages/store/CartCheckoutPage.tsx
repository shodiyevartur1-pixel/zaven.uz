import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Tag,
  MapPin,
  Phone,
  User,
  Mail,
  ShieldCheck,
  Copy,
  Check,
  PackageCheck,
  Upload,
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
  Truck,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Order, OrderItem, PaymentReceiptAttachment } from '../../types';
import {
  formatUZS,
  formatUzbekPhone,
  isValidUzbekPhone,
} from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';

const ALLOWED_RECEIPT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const CartCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    products,
    cart,
    coupons,
    currentCustomer,
    storeSettings,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
    addToast,
  } = useStore();
  const { t, getProductText } = useThemeLanguage();

  const enabledRegions = useMemo(
    () => storeSettings.delivery.regions.filter((r) => r.isEnabled),
    [storeSettings.delivery.regions]
  );

  const enabledPayments = useMemo(
    () => storeSettings.paymentMethods.filter((pm) => pm.isEnabled),
    [storeSettings.paymentMethods]
  );

  const [customerName, setCustomerName] = useState<string>(
    currentCustomer?.fullName || ''
  );
  const [customerPhone, setCustomerPhone] = useState<string>(
    currentCustomer?.phone || '+998 '
  );
  const [customerEmail, setCustomerEmail] = useState<string>(
    currentCustomer?.email || ''
  );
  const [selectedRegionName, setSelectedRegionName] = useState<string>(
    currentCustomer?.addresses.find((a) => a.isDefault)?.region ||
      enabledRegions[0]?.regionName ||
      'Toshkent shahri'
  );
  const [addressLine, setAddressLine] = useState<string>(
    currentCustomer?.addresses.find((a) => a.isDefault)?.addressLine || ''
  );
  const [customerNote, setCustomerNote] = useState<string>('');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(
    enabledPayments[0]?.id || 'pay-card'
  );

  const [receiptAttachment, setReceiptAttachment] =
    useState<PaymentReceiptAttachment | null>(null);
  const [receiptError, setReceiptError] = useState<string>('');
  const [copiedCardField, setCopiedCardField] = useState<string | null>(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);

  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(
    null
  );
  const [couponError, setCouponError] = useState<string>('');

  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    region?: string;
    address?: string;
    payment?: string;
    receipt?: string;
  }>({});

  const [isClearCartModalOpen, setIsClearCartModalOpen] =
    useState<boolean>(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<boolean>(false);

  useEffect(() => {
    if (currentCustomer) {
      setCustomerName((prev) => prev || currentCustomer.fullName);
      setCustomerPhone((prev) =>
        prev === '+998 ' || !prev ? currentCustomer.phone : prev
      );
      setCustomerEmail((prev) => prev || currentCustomer.email || '');
      const defaultAddr =
        currentCustomer.addresses.find((a) => a.isDefault) ||
        currentCustomer.addresses[0];
      if (defaultAddr) {
        setSelectedRegionName(defaultAddr.region);
        setAddressLine((prev) => prev || defaultAddr.addressLine);
      }
    }
  }, [currentCustomer]);

  const detailedCartItems = useMemo(() => {
    return cart
      .map((item) => {
        const product = products.find((p) => p.id === item.productId);
        if (!product) return null;
        const unitPrice = product.salePrice ?? product.price;
        const regularPrice = product.price;
        return {
          product,
          localized: getProductText(product),
          quantity: item.quantity,
          unitPrice,
          regularPrice,
          lineTotal: unitPrice * item.quantity,
          lineSavings: (regularPrice - unitPrice) * item.quantity,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [cart, products, getProductText]);

  const productsSubtotal = useMemo(
    () => detailedCartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [detailedCartItems]
  );

  const totalProductSaleSavings = useMemo(
    () => detailedCartItems.reduce((sum, item) => sum + item.lineSavings, 0),
    [detailedCartItems]
  );

  const totalItemsCount = useMemo(
    () => detailedCartItems.reduce((sum, item) => sum + item.quantity, 0),
    [detailedCartItems]
  );

  const appliedCoupon = useMemo(() => {
    if (!appliedCouponCode) return null;
    return (
      coupons.find(
        (c) =>
          c.code.toUpperCase() === appliedCouponCode.toUpperCase() && c.isActive
      ) || null
    );
  }, [appliedCouponCode, coupons]);

  const couponDiscountAmount = useMemo(() => {
    if (!appliedCoupon) return 0;
    if (productsSubtotal < appliedCoupon.minOrderAmount) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return Math.round((productsSubtotal * appliedCoupon.discountValue) / 100);
    }
    return Math.min(productsSubtotal, appliedCoupon.discountValue);
  }, [appliedCoupon, productsSubtotal]);

  const selectedRegionRule = useMemo(() => {
    if (!storeSettings.delivery.isDeliveryEnabled) return null;
    return (
      enabledRegions.find((r) => r.regionName === selectedRegionName) ||
      enabledRegions[0] ||
      null
    );
  }, [
    storeSettings.delivery.isDeliveryEnabled,
    enabledRegions,
    selectedRegionName,
  ]);

  const deliveryFee = useMemo(() => {
    if (!storeSettings.delivery.isDeliveryEnabled || !selectedRegionRule) {
      return 0;
    }
    const subtotalAfterCoupon = Math.max(
      0,
      productsSubtotal - couponDiscountAmount
    );
    if (
      selectedRegionRule.freeDeliveryThreshold &&
      subtotalAfterCoupon >= selectedRegionRule.freeDeliveryThreshold
    ) {
      return 0;
    }
    return selectedRegionRule.fee;
  }, [
    storeSettings.delivery.isDeliveryEnabled,
    selectedRegionRule,
    productsSubtotal,
    couponDiscountAmount,
  ]);

  const finalTotalAmount = Math.max(
    0,
    productsSubtotal - couponDiscountAmount + deliveryFee
  );

  const selectedPaymentMethod = useMemo(
    () => enabledPayments.find((pm) => pm.id === selectedPaymentId) || null,
    [enabledPayments, selectedPaymentId]
  );

  const isCardTransferSelected =
    selectedPaymentMethod?.type === 'card_transfer' ||
    selectedPaymentId === 'pay-card';

  const bankTransferConfig = storeSettings.bankTransfer;
  const hasConfiguredTransferCards = Boolean(
    bankTransferConfig.humoCardNumber.trim() ||
      bankTransferConfig.uzcardCardNumber.trim()
  );

  const handleCopyCardNumber = (cardNumber: string, label: string) => {
    navigator.clipboard
      ?.writeText(cardNumber.replace(/\s+/g, ''))
      .catch(() => {});
    setCopiedCardField(label);
    addToast({
      type: 'info',
      title: `Karta raqami nusxalandi (${label})`,
    });
    setTimeout(() => setCopiedCardField(null), 2500);
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setReceiptError('');
    setErrors((prev) => ({ ...prev, receipt: undefined }));

    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_RECEIPT_MIMES.includes(file.type)) {
      setReceiptError(t('transfer.errFileType'));
      e.target.value = '';
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      setReceiptError(t('transfer.errFileSize'));
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setReceiptAttachment({
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          dataUrl: reader.result,
          uploadedAt: new Date().toISOString(),
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    const found = coupons.find(
      (c) => c.code.toUpperCase() === code && c.isActive
    );
    if (!found || found.usedCount >= found.usageLimit) {
      setCouponError('Promokod topilmadi yoki muddati tugagan');
      return;
    }

    if (productsSubtotal < found.minOrderAmount) {
      setCouponError(`Min: ${formatUZS(found.minOrderAmount)}`);
      return;
    }

    setAppliedCouponCode(found.code);
    setCouponInput('');
    addToast({
      type: 'success',
      title: found.code,
      description: found.description,
    });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: typeof errors = {};
    if (customerName.trim().length < 3) {
      nextErrors.name = t('cart.fullName');
    }
    if (!isValidUzbekPhone(customerPhone)) {
      nextErrors.phone = '+998 XX XXX-XX-XX';
    }
    if (!selectedRegionName.trim()) {
      nextErrors.region = t('cart.region');
    }
    if (addressLine.trim().length < 5) {
      nextErrors.address = t('cart.address');
    }
    if (isCardTransferSelected && !receiptAttachment) {
      nextErrors.receipt = t('transfer.errMissingReceipt');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      addToast({
        type: 'error',
        title: nextErrors.receipt || 'Majburiy maydonlarni toʻldiring',
      });
      return;
    }

    const orderItems: OrderItem[] = detailedCartItems.map((entry) => ({
      productId: entry.product.id,
      productName: entry.localized.name,
      sku: entry.product.sku,
      image: entry.product.images[0],
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      totalPrice: entry.lineTotal,
    }));

    setIsSubmittingOrder(true);
    try {
      const createdOrder = await placeOrder({
        customerId: currentCustomer?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        region: selectedRegionName,
        address: addressLine.trim(),
        customerNote: customerNote.trim() || undefined,
        items: orderItems,
        subtotal: productsSubtotal,
        discountAmount: couponDiscountAmount,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        deliveryFee,
        totalAmount: finalTotalAmount,
        paymentMethodId: selectedPaymentId,
        paymentMethodLabel:
          selectedPaymentMethod?.name || 'Qabul qilganda toʻlov',
        paymentVerificationStatus: isCardTransferSelected
          ? 'pending_verification'
          : 'not_required',
        paymentReceipt: isCardTransferSelected
          ? receiptAttachment || undefined
          : undefined,
      });

      setCompletedOrder(createdOrder);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleCopyOrderNumber = (orderNum: string) => {
    navigator.clipboard?.writeText(orderNum).catch(() => {});
    setCopiedOrderNumber(true);
    setTimeout(() => setCopiedOrderNumber(false), 3000);
  };

  // 1. Order Confirmation Screen
  if (completedOrder) {
    const isPendingTransfer =
      completedOrder.paymentVerificationStatus === 'pending_verification';

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
          <div className="bg-brand-green text-white p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-brand-gold text-brand-green-dark flex items-center justify-center mx-auto shadow-md">
              <PackageCheck className="w-9 h-9" />
            </div>
            <Badge variant="gold" size="md">
              {t('cart.orderConfirmedBadge')}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {t('cart.thankYou')}, {completedOrder.customerName}!
            </h1>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-brand-green-dark border border-brand-gold/40">
                <div className="text-left">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-200 block">
                    {t('cart.orderNumberLabel')}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-brand-gold font-mono">
                    #{completedOrder.orderNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyOrderNumber(completedOrder.orderNumber)
                  }
                  className="p-2 rounded-lg bg-brand-green hover:bg-brand-green-hover text-white"
                >
                  {copiedOrderNumber ? (
                    <Check className="w-4 h-4 text-brand-gold" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Phase 5: Delivery Estimate Callout on Order Confirmation */}
            <div className="p-4 rounded-xl bg-brand-green-light/60 border border-brand-green/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <Truck className="w-5 h-5 text-brand-green shrink-0" />
                <span className="font-bold text-gray-900">
                  {t('delivery.estimateLabel')}
                </span>
              </div>
              <Badge variant="gold" size="md">
                {t('delivery.estimateValue')}
              </Badge>
            </div>

            {isPendingTransfer && (
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-xs sm:text-sm text-amber-900">
                <Clock className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-extrabold">Toʻlov holati:</span>
                    <Badge variant="warning" size="md">
                      {t('transfer.statusPending')}
                    </Badge>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {t('transfer.pendingNotice')}
                  </p>
                  {completedOrder.paymentReceipt && (
                    <p className="text-xs font-semibold text-amber-900 pt-1">
                      Yuklangan chek fayli:{' '}
                      <code>{completedOrder.paymentReceipt.fileName}</code>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
              {completedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-4 bg-white"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        SKU: {item.sku} • {item.quantity} ×{' '}
                        {formatUZS(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-extrabold text-brand-green shrink-0">
                    {formatUZS(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-surface-page rounded-xl p-5 border border-gray-200 space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-700">
                <span>{t('cart.productsSubtotal')}:</span>
                <span className="font-bold">
                  {formatUZS(completedOrder.subtotal)}
                </span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>
                  {t('cart.deliveryService')} ({completedOrder.region}):
                </span>
                <span className="font-bold">
                  {completedOrder.deliveryFee === 0
                    ? t('cart.freeDelivery')
                    : formatUZS(completedOrder.deliveryFee)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline text-base sm:text-lg">
                <span className="font-extrabold text-gray-900">
                  {t('cart.totalAmount')}
                </span>
                <span className="text-xl font-extrabold text-brand-green">
                  {formatUZS(completedOrder.totalAmount)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link to="/account" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" fullWidth>
                  {t('cart.viewOrderHistory')}
                </Button>
              </Link>
              <Link to="/catalog" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth>
                  {t('cart.continueShopping')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Empty Cart View
  if (detailedCartItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyDesc')}
          actionLabel={t('nav.catalog')}
          onAction={() => navigate('/catalog')}
        />
      </div>
    );
  }

  // 3. Active Cart & Checkout Flow
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              {t('cart.title')}
            </h1>
            <Badge variant="gold" size="md">
              {totalItemsCount} {t('product.units')}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">{t('cart.subtitle')}</p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/catalog">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              {t('cart.backToShop')}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsClearCartModalOpen(true)}
            className="text-red-600 hover:bg-red-50"
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            {t('cart.clearCart')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7 space-y-8">
          {/* Step 1: Cart Items */}
          <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-extrabold flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  {t('cart.step1Title')} ({detailedCartItems.length})
                </h2>
              </div>
              <Badge variant="gold" size="sm">
                <Clock className="w-3.5 h-3.5 mr-1" />
                {t('delivery.estimateValue')}
              </Badge>
            </div>

            <div className="divide-y divide-gray-200">
              {detailedCartItems.map(
                ({
                  product,
                  localized,
                  quantity,
                  unitPrice,
                  regularPrice,
                  lineTotal,
                }) => {
                  const isAtMaxStock = quantity >= product.stock;
                  return (
                    <div
                      key={product.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <Link
                          to={`/product/${product.slug}`}
                          className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0"
                        >
                          <img
                            src={product.images[0]}
                            alt={localized.name}
                            className="w-full h-full object-cover"
                          />
                        </Link>
                        <div className="space-y-1 min-w-0">
                          <Link
                            to={`/product/${product.slug}`}
                            className="text-sm font-bold text-gray-900 hover:text-brand-green line-clamp-2"
                          >
                            {localized.name}
                          </Link>
                          <p className="text-xs text-gray-500">
                            SKU: {product.sku}
                          </p>
                          <div className="flex items-baseline gap-2 pt-0.5">
                            <span className="text-sm font-extrabold text-brand-green">
                              {formatUZS(unitPrice)}
                            </span>
                            {product.salePrice && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatUZS(regularPrice)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        <div className="flex items-center border border-gray-300 rounded-lg bg-white p-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(product.id, quantity - 1)
                            }
                            className="w-8 h-8 rounded-md hover:bg-gray-100 flex items-center justify-center text-gray-700 font-bold"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-9 text-center text-xs font-extrabold text-gray-900">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateCartQuantity(product.id, quantity + 1)
                            }
                            disabled={isAtMaxStock}
                            className="w-8 h-8 rounded-md hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center text-gray-700 font-bold"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="text-right min-w-[110px]">
                          <div className="text-sm font-extrabold text-gray-900">
                            {formatUZS(lineTotal)}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromCart(product.id)}
                            className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline mt-1 font-medium"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>

          {/* Step 2 & 3: Checkout Form */}
          <form
            id="checkout-form"
            onSubmit={handlePlaceOrder}
            className="space-y-8"
            noValidate
          >
            {/* Step 2: Customer & Delivery Details + Phase 5 Delivery Estimate Banner */}
            <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-extrabold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-base font-bold text-gray-900">
                    {t('cart.step2Title')}
                  </h2>
                </div>
                <Badge variant="gold" size="sm">
                  <Truck className="w-3.5 h-3.5 mr-1" />
                  {t('delivery.estimateValue')}
                </Badge>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                {/* Phase 5: Clear Delivery Estimate Notice inside Checkout */}
                <div className="p-3.5 rounded-xl bg-brand-green-light/60 border border-brand-green/20 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-gray-800">
                      {t('delivery.estimateLabel')}
                    </span>
                    <strong className="text-brand-green font-extrabold">
                      {t('delivery.estimateValue')}
                    </strong>
                  </div>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    {t('delivery.estimateDisclaimer')}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={t('cart.fullName')}
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (errors.name)
                        setErrors((prev) => ({ ...prev, name: undefined }));
                    }}
                    leftIcon={<User className="w-4 h-4" />}
                    error={errors.name}
                  />

                  <Input
                    label={t('cart.phone')}
                    required
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(formatUzbekPhone(e.target.value));
                      if (errors.phone)
                        setErrors((prev) => ({ ...prev, phone: undefined }));
                    }}
                    placeholder="+998 90 123-45-67"
                    leftIcon={<Phone className="w-4 h-4" />}
                    error={errors.phone}
                    helperText={t('cart.phoneHelper')}
                  />
                </div>

                <Input
                  label={t('cart.emailOptional')}
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="namuna@mail.uz"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <Select
                  label={t('cart.region')}
                  required
                  value={selectedRegionName}
                  onChange={(e) => setSelectedRegionName(e.target.value)}
                  options={
                    enabledRegions.length > 0
                      ? enabledRegions.map((reg) => ({
                          value: reg.regionName,
                          label: `${reg.regionName} — ${formatUZS(reg.fee)}`,
                        }))
                      : [{ value: 'Toshkent shahri', label: 'Toshkent shahri' }]
                  }
                  helperText={selectedRegionRule?.note}
                />

                <Input
                  label={t('cart.address')}
                  required
                  value={addressLine}
                  onChange={(e) => {
                    setAddressLine(e.target.value);
                    if (errors.address)
                      setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  leftIcon={<MapPin className="w-4 h-4" />}
                  error={errors.address}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-800 mb-1.5">
                    {t('cart.orderNote')}
                  </label>
                  <textarea
                    rows={2}
                    value={customerNote}
                    onChange={(e) => setCustomerNote(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
                  />
                </div>
              </div>
            </section>

            {/* Step 3: Payment Methods & Secure Bank Transfer Receipt Upload */}
            <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-green text-white text-xs font-extrabold flex items-center justify-center">
                  3
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  {t('cart.step3Title')}
                </h2>
              </div>

              <div className="p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {enabledPayments.map((pm) => {
                    const isSelected = selectedPaymentId === pm.id;
                    return (
                      <label
                        key={pm.id}
                        className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-brand-green bg-brand-green-light/40 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={pm.id}
                                checked={isSelected}
                                onChange={() => setSelectedPaymentId(pm.id)}
                                className="w-4 h-4 text-brand-green"
                              />
                              <span className="text-sm font-bold text-gray-900">
                                {pm.name}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mt-2 pl-6">
                            {pm.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Humo / Uzcard Bank Transfer Instructions & Receipt Upload Box */}
                {isCardTransferSelected && (
                  <div className="rounded-2xl border-2 border-brand-gold bg-brand-gold-light/40 p-5 space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-gold-border pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="w-5 h-5 text-brand-green" />
                        <h3 className="text-sm sm:text-base font-extrabold text-gray-900">
                          {t('transfer.boxTitle')}
                        </h3>
                      </div>
                      <Badge variant="gold" size="md">
                        {t('transfer.exactAmountLabel')}{' '}
                        {formatUZS(finalTotalAmount)}
                      </Badge>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                      {bankTransferConfig.transferInstructions}
                    </p>

                    {hasConfiguredTransferCards ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {bankTransferConfig.humoCardNumber.trim() && (
                          <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="green" size="sm">
                                HUMO
                              </Badge>
                              {bankTransferConfig.bankName && (
                                <span className="text-[11px] text-gray-500">
                                  {bankTransferConfig.bankName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm sm:text-base font-extrabold text-gray-900 tracking-wider">
                                {bankTransferConfig.humoCardNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyCardNumber(
                                    bankTransferConfig.humoCardNumber,
                                    'HUMO'
                                  )
                                }
                                className="p-1.5 rounded-lg bg-surface-page hover:bg-brand-green hover:text-white text-gray-700 transition-colors"
                              >
                                {copiedCardField === 'HUMO' ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            {bankTransferConfig.humoCardHolder && (
                              <p className="text-xs text-gray-600">
                                {t('transfer.recipientLabel')}{' '}
                                <strong className="text-gray-900">
                                  {bankTransferConfig.humoCardHolder}
                                </strong>
                              </p>
                            )}
                          </div>
                        )}

                        {bankTransferConfig.uzcardCardNumber.trim() && (
                          <div className="p-4 rounded-xl bg-white border border-gray-200 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <Badge variant="info" size="sm">
                                UZCARD
                              </Badge>
                              {bankTransferConfig.bankName && (
                                <span className="text-[11px] text-gray-500">
                                  {bankTransferConfig.bankName}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-sm sm:text-base font-extrabold text-gray-900 tracking-wider">
                                {bankTransferConfig.uzcardCardNumber}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyCardNumber(
                                    bankTransferConfig.uzcardCardNumber,
                                    'UZCARD'
                                  )
                                }
                                className="p-1.5 rounded-lg bg-surface-page hover:bg-brand-green hover:text-white text-gray-700 transition-colors"
                              >
                                {copiedCardField === 'UZCARD' ? (
                                  <Check className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                            {bankTransferConfig.uzcardCardHolder && (
                              <p className="text-xs text-gray-600">
                                {t('transfer.recipientLabel')}{' '}
                                <strong className="text-gray-900">
                                  {bankTransferConfig.uzcardCardHolder}
                                </strong>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            {t('transfer.notConfiguredTitle')}
                          </p>
                          <p className="mt-0.5 text-amber-800">
                            {t('transfer.notConfiguredDesc')}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Validated Receipt File Upload Control */}
                    <div className="space-y-2.5 pt-2 border-t border-brand-gold-border">
                      <label className="block text-xs sm:text-sm font-bold text-gray-900">
                        {t('transfer.uploadLabel')}
                      </label>
                      <p className="text-xs text-gray-600">
                        {t('transfer.uploadHelper')}
                      </p>

                      {receiptAttachment ? (
                        <div className="p-3.5 rounded-xl bg-white border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {receiptAttachment.mimeType.startsWith('image/') ? (
                              <img
                                src={receiptAttachment.dataUrl}
                                alt={receiptAttachment.fileName}
                                className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center justify-center shrink-0">
                                <FileText className="w-6 h-6" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                                {receiptAttachment.fileName}
                              </p>
                              <p className="text-[11px] text-emerald-700 font-semibold">
                                {(receiptAttachment.fileSize / 1024).toFixed(1)}{' '}
                                KB • Yuklashga tayyor
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="px-3 py-1.5 rounded-lg bg-surface-page border border-gray-300 text-xs font-bold text-gray-800 hover:border-brand-green cursor-pointer">
                              <span>{t('transfer.changeFileBtn')}</span>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                onChange={handleReceiptFileChange}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setReceiptAttachment(null)}
                              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-brand-green/50 bg-white hover:bg-brand-green-light/30 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                          <Upload className="w-6 h-6 text-brand-green" />
                          <span className="text-xs sm:text-sm font-bold text-brand-green">
                            {t('transfer.selectFileBtn')}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            JPG, PNG, WEBP, PDF (≤ 5 MB)
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            onChange={handleReceiptFileChange}
                            className="hidden"
                          />
                        </label>
                      )}

                      {(receiptError || errors.receipt) && (
                        <p className="text-xs font-bold text-red-600">
                          {receiptError || errors.receipt}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </form>
        </div>

        {/* Right Column: Order Summary */}
        <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-28">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-6">
            <h2 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3.5">
              {t('cart.summaryTitle')}
            </h2>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
                {t('cart.promoLabel')}
              </label>
              {appliedCoupon ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-extrabold text-emerald-900">
                      {appliedCoupon.code} (-{formatUZS(couponDiscountAmount)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedCouponCode(null)}
                    className="text-xs font-bold text-red-600 hover:underline"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError('');
                    }}
                    placeholder="ZAVEN10"
                    className="flex-1 rounded-lg border border-gray-300 px-3.5 py-2 text-xs font-semibold uppercase"
                  />
                  <Button type="submit" variant="secondary" size="sm">
                    {t('cart.applyBtn')}
                  </Button>
                </form>
              )}
              {couponError && (
                <p className="text-xs text-red-600 font-medium">{couponError}</p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-gray-100 text-sm">
              <div className="flex items-center justify-between text-gray-700">
                <span>
                  {t('cart.productsSubtotal')} ({totalItemsCount}{' '}
                  {t('product.units')}):
                </span>
                <span className="font-bold text-gray-900">
                  {formatUZS(productsSubtotal)}
                </span>
              </div>

              {totalProductSaleSavings > 0 && (
                <div className="flex items-center justify-between text-xs text-brand-gold-dark bg-brand-gold-light/70 px-3 py-1.5 rounded-lg border border-brand-gold-border">
                  <span>{t('cart.saleSavings')}</span>
                  <span className="font-bold">
                    {formatUZS(totalProductSaleSavings)}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between text-gray-700 pt-1">
                <div>
                  <span className="block">{t('cart.deliveryService')}</span>
                  <span className="text-xs text-gray-500">
                    {selectedRegionName}
                  </span>
                  <span className="block text-[11px] font-bold text-brand-green mt-0.5">
                    {t('delivery.estimateValue')}
                  </span>
                </div>
                <span className="font-bold text-gray-900">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-700 font-extrabold">
                      {t('cart.freeDelivery')}
                    </span>
                  ) : (
                    formatUZS(deliveryFee)
                  )}
                </span>
              </div>

              <div className="pt-4 border-t border-gray-200 flex items-baseline justify-between">
                <span className="text-base font-extrabold text-gray-900">
                  {t('cart.totalAmount')}
                </span>
                <span className="text-2xl font-extrabold text-brand-green">
                  {formatUZS(finalTotalAmount)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                type="submit"
                form="checkout-form"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isSubmittingOrder}
                rightIcon={<ArrowRight className="w-5 h-5" />}
              >
                {t('cart.confirmOrderBtn')} — {formatUZS(finalTotalAmount)}
              </Button>
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                {t('cart.noHiddenFeesNote')}
              </p>
            </div>
          </div>

          {storeSettings.delivery.isDeliveryEnabled && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-xs text-gray-600 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-brand-green shrink-0" />
                  <span>{t('delivery.estimateLabel')}</span>
                </span>
                <Badge variant="gold" size="sm">
                  {t('delivery.estimateValue')}
                </Badge>
              </div>
              <p className="leading-relaxed">
                {t('delivery.estimateDisclaimer')}
              </p>
              <p className="leading-relaxed text-gray-500 pt-1 border-t border-gray-100">
                {storeSettings.delivery.generalDeliveryNote}
              </p>
            </div>
          )}
        </aside>
      </div>

      <Modal
        isOpen={isClearCartModalOpen}
        onClose={() => setIsClearCartModalOpen(false)}
        title={t('cart.clearCart')}
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsClearCartModalOpen(false)}
            >
              {t('footer.cancelBtn')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                clearCart();
                setIsClearCartModalOpen(false);
              }}
            >
              {t('cart.clearCart')}
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">{t('cart.clearCart')}?</p>
      </Modal>
    </div>
  );
};