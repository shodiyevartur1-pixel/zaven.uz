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
  LocateFixed,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Order, OrderItem, PaymentReceiptAttachment } from '../../types';
import {
  formatUZS,
  formatUzbekPhone,
  isValidUzbekPhone,
} from '../../utils/format';
import {
  UZBEKISTAN_REGIONS,
  detectUzbekistanRegionFromCoords,
  resolveRegionTariffRule,
} from '../../utils/uzbekistanLocations';
import { ProductCard } from '../../components/product/ProductCard';
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
    currentCustomer?.email || ''
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

  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [geoStatusMessage, setGeoStatusMessage] = useState<{
    type: 'success' | 'warning';
    text: string;
  } | null>(null);
  const [sharedCoordinates, setSharedCoordinates] = useState<{
    lat: number;
    lng: number;
    accuracyMeters?: number;
  } | null>(null);

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
      setCustomerEmail((prev) => prev || currentCustomer.email || '');
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

  const handleUseMyLocation = () => {
    setGeoStatusMessage(null);

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatusMessage({
        type: 'warning',
        text: t('cart.locationUnsupported'),
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        const roundedLat = Number(latitude.toFixed(5));
        const roundedLng = Number(longitude.toFixed(5));

        setSharedCoordinates({
          lat: roundedLat,
          lng: roundedLng,
          accuracyMeters: accuracy ? Math.round(accuracy) : undefined,
        });

        const detectedRegion = detectUzbekistanRegionFromCoords(
          roundedLat,
          roundedLng
        );
        if (detectedRegion) {
          setSelectedUzRegionId(detectedRegion.id);
          setSelectedDistrict(detectedRegion.districts[0] || '');
        }

        setGeoStatusMessage({
          type: 'success',
          text: `${t('cart.locationSuccess')} (GPS: ${roundedLat}, ${roundedLng})`,
        });
      },
      () => {
        setIsLocating(false);
        setGeoStatusMessage({
          type: 'warning',
          text: t('cart.locationDenied'),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
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
        title: t('cart.step2Title'),
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

    const fullAddressSummary = `${selectedDistrict.trim()}, ${addressLine.trim()}${
      sharedCoordinates
        ? ` [GPS: ${sharedCoordinates.lat}, ${sharedCoordinates.lng}]`
        : ''
    }`;

    setIsSubmittingOrder(true);
    try {
      const createdOrder = await placeOrder({
        customerId: currentCustomer?.id,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        region: currentUzRegionObj.nameUz,
        district: selectedDistrict.trim(),
        address: fullAddressSummary,
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

          <div className="p-5 sm:p-8 space-y-6">
            <div className="p-4 rounded-xl bg-brand-green-light/60 border border-brand-green/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-gray-900">
                  <Truck className="w-4 h-4 text-brand-green shrink-0" />
                  <span>{t('delivery.estimateLabel')}</span>
                </div>
                <p className="text-xs text-gray-600">
                  <strong>{t('cart.address')}:</strong> {completedOrder.region},{' '}
                  {completedOrder.address}
                </p>
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
                    <Badge variant="warning" size="md">
                      {t('transfer.statusPending')}
                    </Badge>
                  </div>
                  <p className="text-amber-800 leading-relaxed">
                    {t('transfer.pendingNotice')}
                  </p>
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
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {item.quantity} × {formatUZS(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm font-extrabold text-brand-green shrink-0">
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

  return (
    <div className="zaven-page-container py-4 sm:py-8 space-y-6">
      {/* 4-Step Sequential Progress Indicator */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-3.5 sm:p-5 shadow-card">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3">
          {(
            [
              { id: 'cart', num: 1, label: t('cart.stepIndicatorCart') },
              { id: 'address', num: 2, label: t('cart.stepIndicatorAddress') },
              { id: 'payment', num: 3, label: t('cart.stepIndicatorPayment') },
              { id: 'confirm', num: 4, label: t('cart.stepIndicatorConfirm') },
            ] as { id: CheckoutStep; num: number; label: string }[]
          ).map((step) => {
            const isCurrent = activeStep === step.id;
            const isCompleted = currentStepNumber > step.num;
            return (
              <button
                key={step.id}
                type="button"
                disabled={step.num > currentStepNumber}
                onClick={() => {
                  if (step.num <= currentStepNumber) {
                    goToStep(step.id);
                  }
                }}
                className={`min-h-[38px] py-2 px-2 sm:px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1.5 min-w-0 ${
                  isCurrent
                    ? 'bg-[#0F3D2E] text-white border-[#0F3D2E] font-extrabold shadow-sm'
                    : isCompleted
                    ? 'bg-brand-green-light text-brand-green border-brand-green/30 font-bold cursor-pointer'
                    : 'bg-surface-page text-gray-400 border-gray-200 cursor-not-allowed'
                }`}
              >
                {isCompleted && (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 hidden sm:inline" />
                )}
                <span className="text-[11px] sm:text-xs truncate">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* STEP 1: CART-FOCUSED VIEW (/cart)                                     */}
      {/* ===================================================================== */}
      {activeStep === 'cart' && (
        <div className="space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cart Items List */}
            <div className="lg:col-span-7 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand-green" />
                  <h1 className="text-sm sm:text-base font-extrabold text-gray-900">
                    {t('cart.step1Title')} ({totalItemsCount}{' '}
                    {t('product.units')})
                  </h1>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearCartModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline"
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
                            <div className="flex items-baseline gap-2 pt-0.5">
                              <span className="text-xs sm:text-sm font-extrabold text-brand-green">
                                {formatUZS(unitPrice)}
                              </span>
                              {product.salePrice && (
                                <span className="text-[11px] text-gray-400 line-through">
                                  {formatUZS(regularPrice)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                          <div className="flex items-center border border-gray-300 rounded-xl bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(product.id, quantity - 1)
                              }
                              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-700 font-bold"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-extrabold text-gray-900">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(product.id, quantity + 1)
                              }
                              disabled={isAtMaxStock}
                              className="w-8 h-8 rounded-lg hover:bg-gray-100 disabled:opacity-40 flex items-center justify-center text-gray-700 font-bold"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right min-w-[105px]">
                            <div className="text-xs sm:text-sm font-extrabold text-gray-900">
                              {formatUZS(lineTotal)}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(product.id)}
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline mt-0.5 font-medium"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Cart Summary & Prominent "Sotib olish / Proceed to Purchase" Button */}
            <aside className="lg:col-span-5 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card space-y-5 lg:sticky lg:top-24">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">
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
                        {appliedCoupon.code} (-
                        {formatUZS(couponDiscountAmount)})
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
                      className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-semibold uppercase"
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

              <div className="space-y-2.5 pt-2 border-t border-gray-100 text-sm">
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

                <div className="pt-3 border-t border-gray-200 flex items-baseline justify-between">
                  <span className="text-sm sm:text-base font-extrabold text-gray-900">
                    {t('cart.totalAmount')}
                  </span>
                  <span className="text-xl sm:text-2xl font-extrabold text-brand-green">
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

          {/* Secondary Recommendations (Excluding products already in cart) */}
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
      {/* STEP 2: SEQUENTIAL DELIVERY ADDRESS STEP                              */}
      {/* ===================================================================== */}
      {activeStep === 'address' && (
        <form
          onSubmit={handleContinueFromAddress}
          className="max-w-3xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card"
          noValidate
        >
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#0F3D2E] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                2
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-gray-900">
                {t('cart.step2Title')}
              </h1>
            </div>
            <Badge variant="gold" size="sm">
              <Truck className="w-3.5 h-3.5 mr-1" />
              {t('delivery.estimateValue')}
            </Badge>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {/* Non-Guaranteed Delivery Estimate Callout ("Taxminan 10–25 kun") */}
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

            {/* Uzbekistan Region + District Selector + Optional "Use my location" */}
            <div className="p-4 rounded-2xl bg-surface-page border border-gray-200 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-gray-200 pb-3">
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-brand-green">
                    {t('cart.region')} & {t('cart.district')}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {t('cart.locationPrivacyNote')}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={isLocating}
                  leftIcon={<LocateFixed className="w-4 h-4" />}
                  onClick={handleUseMyLocation}
                >
                  {isLocating
                    ? t('cart.locatingBtn')
                    : t('cart.useMyLocationBtn')}
                </Button>
              </div>

              {geoStatusMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    geoStatusMessage.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-800'
                  }`}
                >
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{geoStatusMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label={t('cart.region')}
                  required
                  value={selectedUzRegionId}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  options={UZBEKISTAN_REGIONS.map((reg) => {
                    const rule = resolveRegionTariffRule(
                      reg.nameUz,
                      enabledRegions
                    );
                    return {
                      value: reg.id,
                      label: `${getRegionDisplayName(reg)}${
                        rule ? ` — ${formatUZS(rule.fee)}` : ''
                      }`,
                    };
                  })}
                  error={errors.region}
                  helperText={selectedRegionRule?.note}
                />

                <Select
                  label={t('cart.district')}
                  required
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
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
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
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
      {/* ===================================================================== */}
      {activeStep === 'confirm' && (
        <div className="max-w-3xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-full bg-[#0F3D2E] text-white text-xs font-extrabold flex items-center justify-center shrink-0">
                4
              </span>
              <h1 className="text-sm sm:text-base font-extrabold text-gray-900">
                {t('cart.step4Title')}
              </h1>
            </div>
            <Badge variant="gold" size="sm">
              {t('delivery.estimateValue')}
            </Badge>
          </div>

          <div className="p-4 sm:p-6 space-y-5 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-surface-page border border-gray-200 space-y-1">
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
                <p className="font-bold text-gray-900">{customerName}</p>
                <p className="text-brand-green font-semibold">
                  {customerPhone}
                </p>
                <p className="text-gray-600 break-words">
                  {getRegionDisplayName(currentUzRegionObj)}, {selectedDistrict}
                  , {addressLine}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-page border border-gray-200 space-y-1">
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
                <p className="font-bold text-gray-900">
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

            <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
              {detailedCartItems.map(
                ({ product, localized, quantity, unitPrice, lineTotal }) => (
                  <div
                    key={product.id}
                    className="p-3 flex items-center justify-between gap-3 bg-white"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={product.images[0]}
                        alt={localized.name}
                        className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">
                          {localized.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {quantity} × {formatUZS(unitPrice)}
                        </p>
                      </div>
                    </div>
                    <span className="font-extrabold text-brand-green shrink-0">
                      {formatUZS(lineTotal)}
                    </span>
                  </div>
                )
              )}
            </div>

            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>{t('cart.productsSubtotal')}:</span>
                <span className="font-bold">{formatUZS(productsSubtotal)}</span>
              </div>
              {couponDiscountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promokod ({appliedCoupon?.code}):</span>
                  <span className="font-bold">
                    -{formatUZS(couponDiscountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-700">
                <span>
                  {t('cart.deliveryService')} (
                  {getRegionDisplayName(currentUzRegionObj)}):
                </span>
                <span className="font-bold">
                  {deliveryFee === 0
                    ? t('cart.freeDelivery')
                    : formatUZS(deliveryFee)}
                </span>
              </div>
              <div className="pt-2.5 border-t border-gray-200 flex justify-between items-baseline text-base sm:text-lg">
                <span className="font-extrabold text-gray-900">
                  {t('cart.totalAmount')}
                </span>
                <span className="text-xl font-extrabold text-brand-green">
                  {formatUZS(finalTotalAmount)}
                </span>
              </div>
            </div>

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
                leftIcon={<ShieldCheck className="w-5 h-5 text-[#C89D54]" />}
                onClick={handleFinalSubmitOrder}
              >
                {t('cart.confirmOrderBtn')} — {formatUZS(finalTotalAmount)}
              </Button>
            </div>
          </div>
        </div>
      )}

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
