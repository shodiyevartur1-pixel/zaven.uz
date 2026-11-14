import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
  Send,
  ShieldCheck,
  Copy,
  Check,
  PackageCheck,
  Upload,
  FileText,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  Sparkles,
  Map as MapIcon,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Order, OrderItem, PaymentReceiptAttachment } from '../../types';
import {
  formatUZS,
  formatUzbekPhone,
  isValidUzbekPhone,
  normalizeTelegramUsername,
  isValidTelegramUsername,
} from '../../utils/format';
import {
  UZBEKISTAN_REGIONS,
  resolveRegionTariffRule,
} from '../../utils/uzbekistanLocations';
import { ProductCard } from '../../components/product/ProductCard';
import { DeliveryMapModal } from '../../components/checkout/DeliveryMapModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { SearchableSelectSheet } from '../../components/ui/SearchableSelectSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';

const ALLOWED_RECEIPT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirm';

export const CartCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
  const { t, language, getProductText } = useThemeLanguage();

  const isCheckoutRoute = location.pathname.startsWith('/checkout');
  const [activeStep, setActiveStep] = useState<CheckoutStep>(
    isCheckoutRoute ? 'address' : 'cart'
  );

  useEffect(() => {
    if (location.pathname === '/cart') {
      setActiveStep('cart');
    } else if (
      location.pathname.startsWith('/checkout') &&
      activeStep === 'cart'
    ) {
      setActiveStep('address');
    }
  }, [location.pathname]);

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
    currentCustomer?.emailVerified && currentCustomer?.email
      ? currentCustomer.email
      : ''
  );
  const [customerTelegram, setCustomerTelegram] = useState<string>(
    currentCustomer?.telegramUsername || ''
  );

  const [selectedUzRegionId, setSelectedUzRegionId] = useState<string>(
    UZBEKISTAN_REGIONS[0].id
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    UZBEKISTAN_REGIONS[0].districts[0]
  );
  const [addressLine, setAddressLine] = useState<string>(
    currentCustomer?.addresses.find((a) => a.isDefault)?.addressLine || ''
  );
  const [customerNote, setCustomerNote] = useState<string>('');

  // Map pin coordinates confirmed by the customer (never auto-populated on mount)
  const [sharedCoordinates, setSharedCoordinates] = useState<{
    lat: number;
    lng: number;
    accuracyMeters?: number;
  } | null>(null);

  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  const [selectedPaymentId, setSelectedPaymentId] = useState<string>(
    enabledPayments[0]?.id || 'pay-card'
  );

  useEffect(() => {
    if (
      enabledPayments.length > 0 &&
      !enabledPayments.some((pm) => pm.id === selectedPaymentId)
    ) {
      setSelectedPaymentId(enabledPayments[0].id);
    }
  }, [enabledPayments, selectedPaymentId]);

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
    telegram?: string;
    region?: string;
    district?: string;
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
      if (currentCustomer.emailVerified && currentCustomer.email) {
        setCustomerEmail((prev) => prev || currentCustomer.email || '');
      }
      if (currentCustomer.telegramUsername) {
        setCustomerTelegram(
          (prev) => prev || currentCustomer.telegramUsername || ''
        );
      }
      const defaultAddr =
        currentCustomer.addresses.find((a) => a.isDefault) ||
        currentCustomer.addresses[0];
      if (defaultAddr) {
        const matchedReg = UZBEKISTAN_REGIONS.find(
          (r) =>
            r.nameUz.toLowerCase() === defaultAddr.region.toLowerCase() ||
            defaultAddr.region.toLowerCase().includes(r.nameUz.toLowerCase())
        );
        if (matchedReg) {
          setSelectedUzRegionId(matchedReg.id);
          setSelectedDistrict(
            defaultAddr.district || matchedReg.districts[0] || ''
          );
        }
        setAddressLine((prev) => prev || defaultAddr.addressLine);
      }
    }
  }, [currentCustomer]);

  const currentUzRegionObj = useMemo(
    () =>
      UZBEKISTAN_REGIONS.find((r) => r.id === selectedUzRegionId) ||
      UZBEKISTAN_REGIONS[0],
    [selectedUzRegionId]
  );

  const getRegionDisplayName = (reg: (typeof UZBEKISTAN_REGIONS)[number]) => {
    if (language === 'ru') return reg.nameRu;
    if (language === 'en') return reg.nameEn;
    return reg.nameUz;
  };

  const handleRegionChange = (newRegionId: string) => {
    setSelectedUzRegionId(newRegionId);
    const found = UZBEKISTAN_REGIONS.find((r) => r.id === newRegionId);
    if (found && found.districts.length > 0) {
      setSelectedDistrict(found.districts[0]);
    } else {
      setSelectedDistrict('');
    }
    setErrors((prev) => ({
      ...prev,
      region: undefined,
      district: undefined,
    }));
  };

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

  const cartProductIds = useMemo(
    () => new Set(cart.map((c) => c.productId)),
    [cart]
  );

  const recommendedForCart = useMemo(
    () =>
      products
        .filter((p) => p.status === 'active' && !cartProductIds.has(p.id))
        .slice(0, 4),
    [products, cartProductIds]
  );

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
    return resolveRegionTariffRule(currentUzRegionObj.nameUz, enabledRegions);
  }, [
    storeSettings.delivery.isDeliveryEnabled,
    currentUzRegionObj,
    enabledRegions,
  ]);

  const isDeliveryFeeToBeConfirmed =
    storeSettings.delivery.isDeliveryEnabled && !selectedRegionRule;

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

  const feeToBeConfirmedLabel =
    language === 'ru'
      ? 'Уточняется оператором'
      : language === 'en'
      ? 'Confirmed by operator'
      : 'Operator bilan aniqlashtiriladi';

  const shortStepLabels = {
    uz: {
      cart: 'Savat',
      address: 'Manzil',
      payment: 'Toʻlov',
      confirm: 'Tasdiq',
      clearCartWarn:
        'Savatchadagi barcha tanlangan mahsulotlarni olib tashlamoqchimisiz?',
    },
    ru: {
      cart: 'Корзина',
      address: 'Адрес',
      payment: 'Оплата',
      confirm: 'Готово',
      clearCartWarn: 'Вы действительно хотите удалить все товары из корзины?',
    },
    en: {
      cart: 'Cart',
      address: 'Address',
      payment: 'Payment',
      confirm: 'Confirm',
      clearCartWarn:
        'Are you sure you want to remove all items from your shopping cart?',
    },
  }[language];

  const cartPageTotalAmount = Math.max(
    0,
    productsSubtotal - couponDiscountAmount
  );
  const finalTotalAmount = Math.max(
    0,
    productsSubtotal - couponDiscountAmount + deliveryFee
  );

  const selectedPaymentMethod = useMemo(
    () => enabledPayments.find((pm) => pm.id === selectedPaymentId) || null,
    [enabledPayments, selectedPaymentId]
  );

  const requiresPaymentReceipt = Boolean(
    selectedPaymentMethod &&
      (selectedPaymentMethod.requiresReceipt !== undefined
        ? selectedPaymentMethod.requiresReceipt
        : selectedPaymentMethod.type === 'card_transfer')
  );

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
        addToast({
          type: 'success',
          title: t('transfer.uploadSuccessReady'),
          description: file.name,
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

  const handleDecreaseCartItem = (productId: string, currentQty: number) => {
    if (currentQty <= 1) {
      removeFromCart(productId);
    } else {
      updateCartQuantity(productId, currentQty - 1);
    }
  };

  const goToStep = (targetStep: CheckoutStep) => {
    if (targetStep === 'cart') {
      setActiveStep('cart');
      navigate('/cart');
    } else {
      setActiveStep(targetStep);
      if (!location.pathname.startsWith('/checkout')) {
        navigate('/checkout');
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueFromAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (customerName.trim().length < 3) {
      nextErrors.name = t('cart.fullName');
    }
    if (!isValidUzbekPhone(customerPhone)) {
      nextErrors.phone = '+998 XX XXX-XX-XX';
    }
    if (!isValidTelegramUsername(customerTelegram)) {
      nextErrors.telegram = t('cart.telegramInvalidError');
    }
    if (!currentUzRegionObj) {
      nextErrors.region = t('cart.region');
    }
    if (!selectedDistrict.trim()) {
      nextErrors.district = t('cart.district');
    }
    if (addressLine.trim().length < 5) {
      nextErrors.address = t('cart.address');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      addToast({
        type: 'error',
        title: nextErrors.telegram || t('cart.step2Title'),
      });
      return;
    }
    goToStep('payment');
  };

  const handleContinueFromPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!selectedPaymentMethod) {
      nextErrors.payment = t('cart.step3Title');
    }
    if (requiresPaymentReceipt && !receiptAttachment) {
      nextErrors.receipt = t('transfer.errMissingReceipt');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      addToast({
        type: 'error',
        title: nextErrors.receipt || t('cart.step3Title'),
      });
      return;
    }
    goToStep('confirm');
  };

  const handleFinalSubmitOrder = async () => {
    if (isSubmittingOrder) return;

    const orderItems: OrderItem[] = detailedCartItems.map((entry) => ({
      productId: entry.product.id,
      productName: entry.localized.name,
      sku: entry.product.sku,
      image: entry.product.images[0],
      quantity: entry.quantity,
      unitPrice: entry.unitPrice,
      totalPrice: entry.lineTotal,
    }));

    const normalizedTg = normalizeTelegramUsername(customerTelegram);

    setIsSubmittingOrder(true);
    try {
      const createdOrder = await placeOrder({
        customerId: currentCustomer?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerTelegram: normalizedTg,
        region: currentUzRegionObj.nameUz,
        district: selectedDistrict.trim(),
        address: addressLine.trim(),
        locationCoordinates: sharedCoordinates || undefined,
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
        paymentVerificationStatus: requiresPaymentReceipt
          ? 'pending_verification'
          : 'not_required',
        paymentReceipt: requiresPaymentReceipt
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
      <div className="zaven-page-container py-6 sm:py-12">
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
          <div className="bg-[#0F3D2E] text-white p-6 sm:p-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-[#C89D54] text-[#09261C] flex items-center justify-center mx-auto shadow-md">
              <PackageCheck className="w-9 h-9" />
            </div>
            <Badge variant="gold" size="md">
              {t('cart.orderConfirmedBadge')}
            </Badge>
            <h1 className="text-xl sm:text-3xl font-extrabold text-white">
              {t('cart.thankYou')}, {completedOrder.customerName}!
            </h1>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-[#09261C] border border-[#C89D54]/50">
                <div className="text-left">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-200 block">
                    {t('cart.orderNumberLabel')}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-[#C89D54] font-mono">
                    #{completedOrder.orderNumber}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handleCopyOrderNumber(completedOrder.orderNumber)
                  }
                  className="p-2 rounded-lg bg-[#0F3D2E] hover:bg-[#16533F] text-white"
                  aria-label="Copy order number"
                >
                  {copiedOrderNumber ? (
                    <Check className="w-4 h-4 text-[#C89D54]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-8 space-y-5">
            <div className="p-3.5 rounded-xl bg-brand-green-light/60 border border-brand-green/20 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
              <span className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-green shrink-0" />
                <span>{t('delivery.estimateLabel')}</span>
              </span>
              <Badge variant="gold" size="sm">
                {t('delivery.estimateValue')}
              </Badge>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1.5 text-xs sm:text-sm">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                {t('cart.step2Title')}
              </p>
              <p className="font-bold text-gray-900 dark:text-gray-100">
                {completedOrder.region}
                {completedOrder.district ? `, ${completedOrder.district}` : ''}
              </p>
              <p className="text-gray-700 dark:text-gray-300 break-words">
                {completedOrder.address}
              </p>
              {completedOrder.customerTelegram && (
                <p className="text-xs font-semibold text-brand-green">
                  Telegram: {completedOrder.customerTelegram}
                </p>
              )}
              {completedOrder.locationCoordinates && (
                <p className="text-xs font-mono text-brand-green pt-0.5">
                  Pin: {completedOrder.locationCoordinates.lat},{' '}
                  {completedOrder.locationCoordinates.lng}
                </p>
              )}
            </div>

            {isPendingTransfer && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs sm:text-sm text-amber-900">
                <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <Badge variant="warning" size="md">
                    {t('transfer.statusPending')}
                  </Badge>
                  <p className="text-amber-800 leading-relaxed">
                    {t('transfer.pendingNotice')}
                  </p>
                </div>
              </div>
            )}

            <div className="border border-gray-200 dark:border-[#28453B] rounded-xl divide-y divide-gray-200 dark:divide-[#28453B] overflow-hidden">
              {completedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 bg-white dark:bg-[#12211C]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.quantity} × {formatUZS(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-brand-green whitespace-nowrap shrink-0">
                    {formatUZS(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Requirement #9: Mobile-Friendly Order Summary */}
            <div className="bg-[#F8F9FA] dark:bg-[#162923] rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-[#28453B] space-y-2.5 text-xs sm:text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-gray-700 dark:text-gray-300">
                <span>{t('cart.productsSubtotal')}:</span>
                <span className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatUZS(completedOrder.subtotal)}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-gray-700 dark:text-gray-300">
                <span>
                  {t('cart.deliveryService')} ({completedOrder.region}):
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {isDeliveryFeeToBeConfirmed
                    ? feeToBeConfirmedLabel
                    : completedOrder.deliveryFee === 0
                    ? t('cart.freeDelivery')
                    : formatUZS(completedOrder.deliveryFee)}
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 dark:border-[#28453B] flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100">
                  {t('cart.totalAmount')}
                </span>
                <span className="text-lg sm:text-2xl font-extrabold text-brand-green whitespace-nowrap">
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
      <div className="zaven-page-container py-12">
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyDesc')}
          actionLabel={t('cart.continueShopping')}
          onAction={() => navigate('/catalog')}
        />
      </div>
    );
  }

  const stepIndexMap: Record<CheckoutStep, number> = {
    cart: 1,
    address: 2,
    payment: 3,
    confirm: 4,
  };
  const currentStepNumber = stepIndexMap[activeStep];
  const normalizedPreviewTelegram = normalizeTelegramUsername(customerTelegram);

  return (
    <div className="zaven-page-container py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* 4-Step Sequential Progress Bar */}
      <nav
        aria-label="Checkout progress"
        className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-2.5 sm:p-4 shadow-card"
      >
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {(
            [
              {
                id: 'cart',
                num: 1,
                shortLabel: shortStepLabels.cart,
                fullLabel: t('cart.stepIndicatorCart'),
              },
              {
                id: 'address',
                num: 2,
                shortLabel: shortStepLabels.address,
                fullLabel: t('cart.stepIndicatorAddress'),
              },
              {
                id: 'payment',
                num: 3,
                shortLabel: shortStepLabels.payment,
                fullLabel: t('cart.stepIndicatorPayment'),
              },
              {
                id: 'confirm',
                num: 4,
                shortLabel: shortStepLabels.confirm,
                fullLabel: t('cart.stepIndicatorConfirm'),
              },
            ] as {
              id: CheckoutStep;
              num: number;
              shortLabel: string;
              fullLabel: string;
            }[]
          ).map((step) => {
            const isCurrent = activeStep === step.id;
            const isCompleted = currentStepNumber > step.num;
            return (
              <button
                key={step.id}
                type="button"
                aria-label={step.fullLabel}
                aria-current={isCurrent ? 'step' : undefined}
                disabled={step.num > currentStepNumber}
                onClick={() => {
                  if (step.num <= currentStepNumber) {
                    goToStep(step.id);
                  }
                }}
                className={`min-h-[40px] py-1.5 px-1.5 sm:px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1 min-w-0 ${
                  isCurrent
                    ? 'bg-[#0F3D2E] text-white border-[#0F3D2E] font-extrabold shadow-sm'
                    : isCompleted
                    ? 'bg-brand-green-light text-brand-green border-brand-green/30 font-bold cursor-pointer'
                    : 'bg-surface-page text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <span className="text-[11px] font-extrabold shrink-0">
                    {step.num}.
                  </span>
                )}
                <span className="sm:hidden text-[11px] leading-tight">
                  {step.shortLabel}
                </span>
                <span className="hidden sm:inline text-xs truncate">
                  {step.fullLabel.replace(/^\d+\.\s*/, '')}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ===================================================================== */}
      {/* STEP 1: CART-FOCUSED VIEW (/cart)                                     */}
      {/* ===================================================================== */}
      {activeStep === 'cart' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingBag className="w-4 h-4 text-brand-green shrink-0" />
                  <h1 className="text-sm sm:text-base font-extrabold text-gray-900 truncate">
                    {t('cart.step1Title')} ({totalItemsCount}{' '}
                    {t('product.units')})
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearCartModalOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('cart.clearCart')}</span>
                </button>
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
                        className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <Link
                            to={`/product/${product.slug}`}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0"
                          >
                            <img
                              src={product.images[0]}
                              alt={localized.name}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                          <div className="space-y-1 min-w-0 flex-1">
                            <Link
                              to={`/product/${product.slug}`}
                              className="text-xs sm:text-sm font-bold text-gray-900 hover:text-brand-green line-clamp-2 break-words"
                            >
                              {localized.name}
                            </Link>
                            <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
                              <span className="text-xs sm:text-sm font-extrabold text-brand-green whitespace-nowrap">
                                {formatUZS(unitPrice)}
                              </span>
                              {product.salePrice && (
                                <span className="text-[11px] text-gray-400 line-through whitespace-nowrap">
                                  {formatUZS(regularPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <div className="inline-flex items-center border border-gray-300 dark:border-[#2F5246] rounded-xl bg-white dark:bg-[#0D1915] p-0.5 h-10">
                            <button
                              type="button"
                              onClick={() =>
                                handleDecreaseCartItem(product.id, quantity)
                              }
                              className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-[#162923] flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold transition-colors"
                              aria-label={
                                quantity === 1
                                  ? 'Mahsulotni olib tashlash / Remove item'
                                  : 'Miqdorni kamaytirish / Decrease quantity'
                              }
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-extrabold text-gray-900 dark:text-gray-100">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(product.id, quantity + 1)
                              }
                              disabled={isAtMaxStock}
                              className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-[#162923] disabled:opacity-40 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold transition-colors"
                              aria-label="Miqdorni oshirish / Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <span className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                              {formatUZS(lineTotal)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="w-9 h-9 rounded-xl text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors shrink-0"
                              aria-label="Mahsulotni oʻchirish / Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Order Summary */}
            <aside className="lg:col-span-5 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card space-y-4 lg:sticky lg:top-24">
              <div className="space-y-1.5 border-b border-gray-100 dark:border-[#28453B] pb-3">
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  {t('cart.summaryTitle')}
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <Clock className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                  <span>{t('delivery.estimateLabel')}</span>
                  <strong className="text-brand-green font-bold">
                    {t('delivery.estimateValue')}
                  </strong>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t('cart.promoLabel')}
                </label>
                {appliedCoupon ? (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span className="text-xs font-extrabold text-emerald-900 truncate">
                        {appliedCoupon.code} (-
                        {formatUZS(couponDiscountAmount)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAppliedCouponCode(null)}
                      className="text-xs font-bold text-red-600 hover:underline shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={handleApplyCoupon}
                    className="flex flex-wrap sm:flex-nowrap items-center gap-2"
                  >
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value);
                        setCouponError('');
                      }}
                      placeholder="ZAVEN10"
                      className="flex-1 min-w-[140px] h-10 rounded-xl border border-gray-300 dark:border-[#2F5246] px-3 text-xs font-semibold uppercase"
                    />
                    <Button type="submit" variant="secondary" size="sm">
                      {t('cart.applyBtn')}
                    </Button>
                  </form>
                )}
                {couponError && (
                  <p className="text-xs text-red-600 font-medium">
                    {couponError}
                  </p>
                )}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-[#28453B] text-xs sm:text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-gray-700 dark:text-gray-300">
                  <span>
                    {t('cart.productsSubtotal')} ({totalItemsCount}{' '}
                    {t('product.units')}):
                  </span>
                  <span className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {formatUZS(productsSubtotal)}
                  </span>
                </div>

                {totalProductSaleSavings > 0 && (
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-brand-gold-dark bg-brand-gold-light/70 px-3 py-1.5 rounded-lg border border-brand-gold-border">
                    <span>{t('cart.saleSavings')}</span>
                    <span className="font-bold whitespace-nowrap">
                      {formatUZS(totalProductSaleSavings)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200 dark:border-[#28453B] flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100">
                    {t('cart.totalAmount')}
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-brand-green whitespace-nowrap">
                    {formatUZS(cartPageTotalAmount)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                rightIcon={<ArrowRight className="w-5 h-5" />}
                onClick={() => goToStep('address')}
              >
                {t('cart.proceedToPurchaseBtn')}
              </Button>
            </aside>
          </div>

          {recommendedForCart.length > 0 && (
            <section className="pt-6 border-t border-gray-200 space-y-3.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C89D54]" />
                <h2 className="text-sm sm:text-lg font-extrabold text-gray-900">
                  {t('home.recommendedTitle')}
                </h2>
              </div>
              <div className="zaven-product-grid zaven-product-grid-4">
                {recommendedForCart.map((recProd) => (
                  <ProductCard key={recProd.id} product={recProd} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* STEP 2: SEQUENTIAL DELIVERY ADDRESS & CUSTOM ZAVEN PICKERS            */}
      {/* ===================================================================== */}
      {activeStep === 'address' && (
        <form
          onSubmit={handleContinueFromAddress}
          className="max-w-3xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card"
          noValidate
        >
          <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#0F3D2E] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                2
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-gray-900">
                {t('cart.step2Title')}
              </h1>
            </div>
            <Badge variant="gold" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              <span>{t('delivery.estimateValue')}</span>
            </Badge>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* 1. Full Name & 2. Phone Number */}
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

            {/* 3. Email & 4. Optional Telegram Username */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('cart.emailOptional')}
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="namuna@mail.uz"
                leftIcon={<Mail className="w-4 h-4" />}
                helperText={
                  currentCustomer?.emailVerified &&
                  currentCustomer.email === customerEmail
                    ? t('cart.emailPrefilledHelper')
                    : undefined
                }
              />

              <Input
                label={t('cart.telegramOptional')}
                type="text"
                value={customerTelegram}
                onChange={(e) => {
                  setCustomerTelegram(e.target.value);
                  if (errors.telegram)
                    setErrors((prev) => ({ ...prev, telegram: undefined }));
                }}
                placeholder={t('cart.telegramPlaceholder')}
                leftIcon={<Send className="w-4 h-4" />}
                error={errors.telegram}
                helperText={t('cart.telegramHelper')}
              />
            </div>

            {/* Requirements #11 & #12: Custom ZAVEN Region/District Pickers + Map Picker (No GPS Button) */}
            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-200 dark:border-[#28453B] pb-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-brand-green">
                    {t('cart.region')} & {t('cart.district')}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<MapIcon className="w-4 h-4 text-brand-green" />}
                  onClick={() => setIsMapModalOpen(true)}
                >
                  {t('cart.openMapBtn')}
                </Button>
              </div>

              {sharedCoordinates && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="w-4 h-4 shrink-0" />
                    <span className="truncate font-semibold">
                      {t('cart.mapPinConfirmed')} ({sharedCoordinates.lat},{' '}
                      {sharedCoordinates.lng})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSharedCoordinates(null)}
                    className="text-xs font-extrabold underline shrink-0"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Requirement #11: Custom Searchable Bottom-Sheet/Modal Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SearchableSelectSheet
                  label={t('cart.region')}
                  sheetTitle={t('cart.regionPickerTitle')}
                  searchPlaceholder={t('cart.regionSearchPlaceholder')}
                  noResultsText={t('cart.pickerNoResults')}
                  required
                  value={selectedUzRegionId}
                  onChange={handleRegionChange}
                  options={UZBEKISTAN_REGIONS.map((reg) => {
                    const rule = resolveRegionTariffRule(
                      reg.nameUz,
                      enabledRegions
                    );
                    return {
                      value: reg.id,
                      label: getRegionDisplayName(reg),
                      sublabel: rule?.note,
                      badgeText: rule
                        ? formatUZS(rule.fee)
                        : feeToBeConfirmedLabel,
                    };
                  })}
                  error={errors.region}
                  helperText={
                    selectedRegionRule
                      ? selectedRegionRule.note
                      : feeToBeConfirmedLabel
                  }
                />

                <SearchableSelectSheet
                  label={t('cart.district')}
                  sheetTitle={t('cart.districtPickerTitle')}
                  searchPlaceholder={t('cart.districtSearchPlaceholder')}
                  noResultsText={t('cart.pickerNoResults')}
                  required
                  value={selectedDistrict}
                  onChange={(dist) => {
                    setSelectedDistrict(dist);
                    if (errors.district)
                      setErrors((prev) => ({
                        ...prev,
                        district: undefined,
                      }));
                  }}
                  options={currentUzRegionObj.districts.map((dist) => ({
                    value: dist,
                    label: dist,
                  }))}
                  error={errors.district}
                />
              </div>

              <Input
                label={t('cart.address')}
                required
                value={addressLine}
                onChange={(e) => {
                  setAddressLine(e.target.value);
                  if (errors.address)
                    setErrors((prev) => ({ ...prev, address: undefined }));
                }}
                placeholder={t('cart.addressPlaceholder')}
                leftIcon={<MapPin className="w-4 h-4" />}
                error={errors.address}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                {t('cart.orderNote')}
              </label>
              <textarea
                rows={2}
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
              />
            </div>

            <div className="pt-3 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => goToStep('cart')}
              >
                {t('cart.returnToCartBtn')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('cart.continueToPaymentBtn')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* STEP 3: SEQUENTIAL PAYMENT STEP                                       */}
      {/* ===================================================================== */}
      {activeStep === 'payment' && (
        <form
          onSubmit={handleContinueFromPayment}
          className="max-w-3xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card"
          noValidate
        >
          <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#0F3D2E] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                3
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-gray-900">
                {t('cart.step3Title')}
              </h1>
            </div>
            <Badge variant="gold" size="md">
              {formatUZS(finalTotalAmount)}
            </Badge>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {enabledPayments.map((pm) => {
                const isSelected = selectedPaymentId === pm.id;
                const pmNeedsReceipt =
                  pm.requiresReceipt !== undefined
                    ? pm.requiresReceipt
                    : pm.type === 'card_transfer';

                return (
                  <label
                    key={pm.id}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#C89D54] bg-brand-green-light/50 shadow-sm'
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
                            className="w-4 h-4 text-brand-green shrink-0"
                          />
                          <span className="text-sm font-bold text-gray-900">
                            {pm.name}
                          </span>
                        </div>
                        {pmNeedsReceipt && (
                          <Badge variant="gold" size="sm">
                            Chek
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-2 pl-6 leading-relaxed">
                        {pm.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {requiresPaymentReceipt && (
              <div className="rounded-2xl border-2 border-[#C89D54] bg-brand-gold-light/40 p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-gold-border pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-brand-green" />
                    <h3 className="text-xs sm:text-sm font-extrabold text-gray-900">
                      {t('transfer.boxTitle')}
                    </h3>
                  </div>
                  <Badge variant="gold" size="md">
                    {t('transfer.exactAmountLabel')}{' '}
                    {formatUZS(finalTotalAmount)}
                  </Badge>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">
                  {bankTransferConfig.transferInstructions}
                </p>

                {hasConfiguredTransferCards ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bankTransferConfig.humoCardNumber.trim() && (
                      <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1.5 shadow-sm">
                        <Badge variant="green" size="sm">
                          HUMO
                        </Badge>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-extrabold text-gray-900">
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
                            className="p-1.5 rounded-lg bg-surface-page hover:bg-[#0F3D2E] hover:text-white text-gray-700"
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
                            <strong>{bankTransferConfig.humoCardHolder}</strong>
                          </p>
                        )}
                      </div>
                    )}

                    {bankTransferConfig.uzcardCardNumber.trim() && (
                      <div className="p-3.5 rounded-xl bg-white border border-gray-200 space-y-1.5 shadow-sm">
                        <Badge variant="info" size="sm">
                          UZCARD
                        </Badge>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-sm font-extrabold text-gray-900">
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
                            className="p-1.5 rounded-lg bg-surface-page hover:bg-[#0F3D2E] hover:text-white text-gray-700"
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
                            <strong>
                              {bankTransferConfig.uzcardCardHolder}
                            </strong>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
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

                <div className="space-y-2 pt-2 border-t border-brand-gold-border">
                  <label className="block text-xs font-bold text-gray-900">
                    {t('transfer.uploadLabel')}
                  </label>

                  {receiptAttachment ? (
                    <div className="p-3 rounded-xl bg-white border border-emerald-300 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {receiptAttachment.mimeType.startsWith('image/') ? (
                          <img
                            src={receiptAttachment.dataUrl}
                            alt={receiptAttachment.fileName}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 truncate">
                            {receiptAttachment.fileName}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-semibold">
                            {(receiptAttachment.fileSize / 1024).toFixed(1)} KB •{' '}
                            {t('transfer.uploadSuccessReady')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiptAttachment(null)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full py-4 px-4 rounded-xl border-2 border-dashed border-brand-green/50 bg-white hover:bg-brand-green-light/30 transition-colors flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center">
                      <Upload className="w-5 h-5 text-brand-green" />
                      <span className="text-xs font-bold text-brand-green">
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

            <div className="pt-3 border-t border-gray-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => goToStep('address')}
              >
                {t('cart.returnToAddressBtn')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {t('cart.continueToReviewBtn')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* STEP 4: SEQUENTIAL CONFIRMATION / REVIEW STEP                         */}
      {/* Requirements #9 & #10: Clean mobile summary + unclipped Confirm CTA   */}
      {/* ===================================================================== */}
      {activeStep === 'confirm' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
          <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#0F3D2E] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                4
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-gray-900">
                {t('cart.step4Title')}
              </h1>
            </div>
            <Badge variant="gold" size="sm">
              <Clock className="w-3 h-3 mr-1" />
              <span>{t('delivery.estimateValue')}</span>
            </Badge>
          </div>

          <div className="p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-gray-400">
                    {t('cart.step2Title')}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToStep('address')}
                    className="text-xs font-bold text-brand-green hover:underline"
                  >
                    {t('cart.editStepBtn')}
                  </button>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {customerName}
                </p>
                <p className="text-brand-green font-semibold">
                  {customerPhone}
                </p>
                {customerEmail && (
                  <p className="text-xs text-gray-500">{customerEmail}</p>
                )}
                {normalizedPreviewTelegram && (
                  <p className="text-xs font-semibold text-brand-green">
                    Telegram: {normalizedPreviewTelegram}
                  </p>
                )}
                <p className="text-gray-700 dark:text-gray-300 break-words pt-0.5">
                  {getRegionDisplayName(currentUzRegionObj)}, {selectedDistrict}
                  , {addressLine}
                </p>
                {sharedCoordinates && (
                  <p className="text-[11px] font-mono text-brand-green pt-0.5">
                    Pin: {sharedCoordinates.lat}, {sharedCoordinates.lng}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase text-gray-400">
                    {t('cart.step3Title')}
                  </span>
                  <button
                    type="button"
                    onClick={() => goToStep('payment')}
                    className="text-xs font-bold text-brand-green hover:underline"
                  >
                    {t('cart.editStepBtn')}
                  </button>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {selectedPaymentMethod?.name}
                </p>
                {requiresPaymentReceipt && receiptAttachment && (
                  <p className="text-emerald-700 font-semibold truncate">
                    {t('transfer.uploadSuccessReady')}:{' '}
                    {receiptAttachment.fileName}
                  </p>
                )}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-[#28453B] rounded-xl divide-y divide-gray-200 dark:divide-[#28453B] overflow-hidden">
              {detailedCartItems.map(
                ({ product, localized, quantity, unitPrice, lineTotal }) => (
                  <div
                    key={product.id}
                    className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-[#12211C]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={product.images[0]}
                        alt={localized.name}
                        className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                          {localized.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {quantity} × {formatUZS(unitPrice)}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-brand-green whitespace-nowrap shrink-0">
                      {formatUZS(lineTotal)}
                    </span>
                  </div>
                )
              )}
            </div>

            {/* Requirement #9: Scannable Mobile Order Summary (No awkward word splitting) */}
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-gray-700 dark:text-gray-300">
                <span>
                  {t('cart.productsSubtotal')} ({totalItemsCount}{' '}
                  {t('product.units')}):
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {formatUZS(productsSubtotal)}
                </span>
              </div>

              {couponDiscountAmount > 0 && (
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-emerald-700">
                  <span>Promokod ({appliedCoupon?.code}):</span>
                  <span className="font-bold whitespace-nowrap">
                    -{formatUZS(couponDiscountAmount)}
                  </span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-0.5 sm:gap-2 text-gray-700 dark:text-gray-300">
                <span>
                  {t('cart.deliveryService')} (
                  {getRegionDisplayName(currentUzRegionObj)}):
                </span>
                <span className="font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                  {isDeliveryFeeToBeConfirmed
                    ? feeToBeConfirmedLabel
                    : deliveryFee === 0
                    ? t('cart.freeDelivery')
                    : formatUZS(deliveryFee)}
                </span>
              </div>

              <div className="pt-3 border-t border-gray-200 dark:border-[#28453B] flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100">
                  {t('cart.totalAmount')}
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-brand-green whitespace-nowrap">
                  {formatUZS(finalTotalAmount)}
                </span>
              </div>
            </div>

            {/* Requirement #10: Full-width mobile "Buyurtmani tasdiqlash" button with full visible label (no price appended inside button to prevent 320px clipping) */}
            <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => goToStep('payment')}
              >
                {t('cart.returnToPaymentBtn')}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                isLoading={isSubmittingOrder}
                disabled={isSubmittingOrder}
                leftIcon={
                  <ShieldCheck className="w-5 h-5 text-[#C89D54] shrink-0" />
                }
                onClick={handleFinalSubmitOrder}
                className="w-full sm:w-auto sm:min-w-[240px] text-sm sm:text-base whitespace-nowrap"
              >
                {t('cart.confirmOrderBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Requirement #12: Polished Map-Based Delivery Picker Modal (Updates only coords & address) */}
      <DeliveryMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialCoords={sharedCoordinates || currentUzRegionObj.approxCenter}
        initialAddress={addressLine}
        onConfirmLocation={({ coords, reverseGeocodedAddress }) => {
          setSharedCoordinates(coords);
          if (reverseGeocodedAddress) {
            setAddressLine(reverseGeocodedAddress);
            setErrors((prev) => ({ ...prev, address: undefined }));
          }
          addToast({
            type: 'success',
            title: t('cart.mapPinConfirmed'),
            description: reverseGeocodedAddress || `${coords.lat}, ${coords.lng}`,
          });
        }}
      />

      {/* Clear-Cart Confirmation Dialog */}
      <Modal
        isOpen={isClearCartModalOpen}
        onClose={() => setIsClearCartModalOpen(false)}
        title={t('cart.clearCart')}
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsClearCartModalOpen(false)}
            >
              {t('footer.cancelBtn')}
            </Button>
            <Button
              type="button"
              variant="danger"
              size="md"
              fullWidth
              leftIcon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                clearCart();
                setIsClearCartModalOpen(false);
              }}
            >
              {t('cart.clearCart')}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3.5 py-1">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {t('cart.clearCart')} ({totalItemsCount} {t('product.units')})
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              {shortStepLabels.clearCartWarn}
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};
