import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { CustomerAddress, Order, OrderItem, PaymentReceiptAttachment } from '../../types';
import {
  formatOrderNumber,
  formatUZS,
  formatUzbekPhone,
  isValidUzbekPhone,
  normalizeTelegramUsername,
} from '../../utils/format';
import {
  UZBEKISTAN_REGIONS,
  resolveRegionTariffRule,
} from '../../utils/uzbekistanLocations';
import { ProductCard } from '../../components/product/ProductCard';
import {
  DeliveryMapModal,
  ConfirmedMapLocationPayload,
} from '../../components/checkout/DeliveryMapModal';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { SearchableSelectSheet } from '../../components/ui/SearchableSelectSheet';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { ProductImage } from '../../components/ui/ProductImage';

const ALLOWED_RECEIPT_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];
const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const CHECKOUT_DRAFT_KEY = 'zaven_checkout_draft_v1';
const CHECKOUT_ORDER_ATTEMPT_KEY = 'zaven_checkout_order_attempt_v1';

type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirm';
type CheckoutCoordinates = {
  lat: number;
  lng: number;
  accuracyMeters?: number;
};
type CheckoutAddressSnapshot = {
  selectedSavedAddressId: string | 'new';
  selectedUzRegionId: string;
  selectedDistrict: string;
  addressLine: string;
  sharedCoordinates: CheckoutCoordinates | null;
};

const getSavedAddressRegion = (address?: CustomerAddress) => {
  if (!address) return undefined;
  const savedRegion = address.region.trim().toLocaleLowerCase();
  if (!savedRegion) return undefined;
  return UZBEKISTAN_REGIONS.find((region) =>
    [region.nameUz, region.nameRu, region.nameEn].some((name) => {
      const normalizedName = name.toLocaleLowerCase();
      return (
        normalizedName === savedRegion ||
        savedRegion.includes(normalizedName) ||
        normalizedName.startsWith(savedRegion)
      );
    })
  );
};

export const CartCheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    products,
    cart,
    coupons,
    currentCustomer,
    isCustomerAuthRestoring,
    isCartHydrating,
    storeSettings,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    placeOrder,
    addToast,
  } = useStore();
  const { t, language, getProductText } = useThemeLanguage();

  const continueShopping = () => {
    const historyIndex = window.history.state?.idx;
    if (typeof historyIndex === 'number' && historyIndex > 0) {
      navigate(-1);
    } else {
      navigate('/catalog');
    }
  };

  const isCheckoutRoute = location.pathname.startsWith('/checkout');
  const isCustomerSignedIn = Boolean(currentCustomer?.emailVerified);
  const [activeStep, setActiveStep] = useState<CheckoutStep>(
    isCheckoutRoute && isCustomerSignedIn ? 'address' : 'cart'
  );
  const [isAuthPromptModalOpen, setIsAuthPromptModalOpen] = useState(false);
  const stepScrollPositionsRef = useRef<Record<CheckoutStep, number>>({
    cart: 0,
    address: 0,
    payment: 0,
    confirm: 0,
  });

  useEffect(() => {
    if (location.pathname === '/cart') {
      setActiveStep('cart');
    } else if (location.pathname.startsWith('/checkout')) {
      if (isCustomerAuthRestoring || isCartHydrating) return;
      if (!isCustomerSignedIn) {
        setActiveStep('cart');
        setIsAuthPromptModalOpen(true);
      } else {
        setActiveStep((step) => (step === 'cart' ? 'address' : step));
      }
    }
  }, [
    location.pathname,
    isCustomerSignedIn,
    isCustomerAuthRestoring,
    isCartHydrating,
  ]);

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

  const initialSavedAddress =
    currentCustomer?.addresses.find((address) => address.isDefault) ||
    currentCustomer?.addresses[0];
  const initialSavedRegion = getSavedAddressRegion(initialSavedAddress);
  const [selectedUzRegionId, setSelectedUzRegionId] = useState<string>(
    initialSavedRegion?.id || UZBEKISTAN_REGIONS[0].id
  );
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | 'new'>(() => {
    return initialSavedAddress?.id || 'new';
  });
  const [selectedDistrict, setSelectedDistrict] = useState<string>(
    initialSavedAddress
      ? initialSavedRegion?.districts.find(
          (district) =>
            district.toLocaleLowerCase() ===
            initialSavedAddress.district?.trim().toLocaleLowerCase()
        ) || ''
      : initialSavedRegion?.districts[0] || UZBEKISTAN_REGIONS[0].districts[0]
  );
  const [addressLine, setAddressLine] = useState<string>(
    initialSavedAddress?.addressLine || ''
  );
  const [isAddressEditing, setIsAddressEditing] = useState(
    !initialSavedAddress
  );
  const [isNewAddressMode, setIsNewAddressMode] = useState(false);
  const [isSavedAddressPickerOpen, setIsSavedAddressPickerOpen] =
    useState(false);
  const [customerNote, setCustomerNote] = useState<string>('');

  const [sharedCoordinates, setSharedCoordinates] = useState<{
    lat: number;
    lng: number;
    accuracyMeters?: number;
  } | null>(
    initialSavedAddress?.locationCoordinates
      ? { ...initialSavedAddress.locationCoordinates }
      : null
  );
  const addressEditingSnapshotRef =
    useRef<CheckoutAddressSnapshot | null>(null);
  const addressEditorRef = useRef<HTMLDivElement>(null);
  const focusNewAddressOnRenderRef = useRef(false);
  const [mapSelectionFeedback, setMapSelectionFeedback] = useState<{
    type: 'success' | 'warning';
    text: string;
  } | null>(null);

  const [isMapModalOpen, setIsMapModalOpen] = useState<boolean>(false);

  const savedCustomerAddresses = currentCustomer?.addresses || [];

  const applySavedAddressToCheckout = (address: CustomerAddress) => {
    setSelectedSavedAddressId(address.id);
    const matchedRegion = getSavedAddressRegion(address);
    const matchedDistrict = matchedRegion?.districts.find(
      (district) =>
        district.toLocaleLowerCase() ===
        address.district?.trim().toLocaleLowerCase()
    );
    if (matchedRegion) {
      setSelectedUzRegionId(matchedRegion.id);
      setSelectedDistrict(matchedDistrict || '');
    } else {
      setSelectedUzRegionId(UZBEKISTAN_REGIONS[0].id);
      setSelectedDistrict('');
    }
    setAddressLine(address.addressLine);
    setSharedCoordinates(
      address.locationCoordinates
        ? { ...address.locationCoordinates }
        : null
    );
    setIsAddressEditing(
      !matchedRegion ||
        !matchedDistrict ||
        address.addressLine.trim().length < 5
    );
    setIsNewAddressMode(false);
    setIsSavedAddressPickerOpen(false);
    addressEditingSnapshotRef.current = null;
    setMapSelectionFeedback(null);
    setErrors((previous) => ({ ...previous, region: undefined, district: undefined, address: undefined }));
  };

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
  const [checkoutSubmitError, setCheckoutSubmitError] = useState('');
  const submittingOrderRef = useRef(false);

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
  const [hasRestoredCheckoutDraft, setHasRestoredCheckoutDraft] =
    useState(false);
  const hasSavedCheckoutDraftRef = useRef(false);
  const hasSavedAddressChoiceInDraftRef = useRef(false);
  const hasInitializedSavedAddressRef = useRef(false);
  const orderAttemptIdRef = useRef<string | null>(null);
  const orderAttemptFingerprintRef = useRef<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [copiedOrderNumber, setCopiedOrderNumber] = useState<boolean>(false);

  useEffect(() => {
    try {
      const savedDraft = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft) as Record<string, unknown>;
        hasSavedCheckoutDraftRef.current = true;
        if (typeof parsed.customerName === 'string') setCustomerName(parsed.customerName);
        if (typeof parsed.customerPhone === 'string') setCustomerPhone(parsed.customerPhone);
        if (typeof parsed.customerEmail === 'string') setCustomerEmail(parsed.customerEmail);
        if (typeof parsed.customerTelegram === 'string') setCustomerTelegram(parsed.customerTelegram);
        if (typeof parsed.selectedUzRegionId === 'string') setSelectedUzRegionId(parsed.selectedUzRegionId);
        if (typeof parsed.selectedDistrict === 'string') setSelectedDistrict(parsed.selectedDistrict);
        if (typeof parsed.addressLine === 'string') setAddressLine(parsed.addressLine);
        if (typeof parsed.selectedSavedAddressId === 'string') {
          setSelectedSavedAddressId(parsed.selectedSavedAddressId);
          hasSavedAddressChoiceInDraftRef.current = true;
        } else {
          setSelectedSavedAddressId('new');
          setIsAddressEditing(true);
        }
        const draftCoordinates = parsed.sharedCoordinates;
        if (
          draftCoordinates &&
          typeof draftCoordinates === 'object' &&
          'lat' in draftCoordinates &&
          'lng' in draftCoordinates &&
          typeof draftCoordinates.lat === 'number' &&
          Number.isFinite(draftCoordinates.lat) &&
          typeof draftCoordinates.lng === 'number' &&
          Number.isFinite(draftCoordinates.lng)
        ) {
          setSharedCoordinates({
            lat: draftCoordinates.lat,
            lng: draftCoordinates.lng,
            ...('accuracyMeters' in draftCoordinates &&
            typeof draftCoordinates.accuracyMeters === 'number' &&
            Number.isFinite(draftCoordinates.accuracyMeters)
              ? { accuracyMeters: draftCoordinates.accuracyMeters }
              : {}),
          });
        } else {
          setSharedCoordinates(null);
        }
        if (typeof parsed.isAddressEditing === 'boolean') {
          setIsAddressEditing(parsed.isAddressEditing);
        }
        if (typeof parsed.isNewAddressMode === 'boolean') {
          setIsNewAddressMode(parsed.isNewAddressMode);
        }
        if (typeof parsed.customerNote === 'string') setCustomerNote(parsed.customerNote);
        if (typeof parsed.appliedCouponCode === 'string') setAppliedCouponCode(parsed.appliedCouponCode);
      }
    } catch {
      // Ignore an invalid or unavailable session draft.
    } finally {
      setHasRestoredCheckoutDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasRestoredCheckoutDraft) return;
    try {
      sessionStorage.setItem(
        CHECKOUT_DRAFT_KEY,
        JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          customerTelegram,
          selectedUzRegionId,
          selectedDistrict,
          addressLine,
          selectedSavedAddressId,
          sharedCoordinates,
          isAddressEditing,
          isNewAddressMode,
          customerNote,
          appliedCouponCode,
        })
      );
    } catch {
      // Checkout can continue if session storage is unavailable.
    }
  }, [
    hasRestoredCheckoutDraft,
    customerName,
    customerPhone,
    customerEmail,
    customerTelegram,
    selectedUzRegionId,
    selectedDistrict,
    addressLine,
    selectedSavedAddressId,
    sharedCoordinates,
    isAddressEditing,
    isNewAddressMode,
    customerNote,
    appliedCouponCode,
  ]);

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
      if (!hasRestoredCheckoutDraft || hasInitializedSavedAddressRef.current) {
        return;
      }
      hasInitializedSavedAddressRef.current = true;
      const defaultAddr =
        currentCustomer.addresses.find((a) => a.isDefault) ||
        currentCustomer.addresses[0];
      if (
        defaultAddr &&
        (!hasSavedCheckoutDraftRef.current ||
          !hasSavedAddressChoiceInDraftRef.current)
      ) {
        applySavedAddressToCheckout(defaultAddr);
      }
    }
  }, [currentCustomer, hasRestoredCheckoutDraft]);

  const currentUzRegionObj = useMemo(
    () =>
      UZBEKISTAN_REGIONS.find((r) => r.id === selectedUzRegionId) ||
      UZBEKISTAN_REGIONS[0],
    [selectedUzRegionId]
  );

  // Guard: If selectedDistrict does not belong to currentUzRegionObj, reset it
  useEffect(() => {
    if (
      selectedDistrict &&
      !currentUzRegionObj.districts.includes(selectedDistrict)
    ) {
      setSelectedDistrict(currentUzRegionObj.districts[0] || '');
    }
  }, [currentUzRegionObj, selectedDistrict]);

  const getRegionDisplayName = (reg: (typeof UZBEKISTAN_REGIONS)[number]) => {
    if (language === 'ru') return reg.nameRu;
    if (language === 'en') return reg.nameEn;
    return reg.nameUz;
  };

  const selectedSavedAddress = savedCustomerAddresses.find(
    (address) => address.id === selectedSavedAddressId
  );
  const showAddressEditor =
    savedCustomerAddresses.length === 0 || isAddressEditing;
  useEffect(() => {
    if (
      !focusNewAddressOnRenderRef.current ||
      activeStep !== 'address' ||
      !showAddressEditor
    ) {
      return;
    }

    focusNewAddressOnRenderRef.current = false;
    const addressEditor = addressEditorRef.current;
    if (!addressEditor) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    addressEditor.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
    addressEditor
      .querySelector<HTMLElement>('button[aria-haspopup="dialog"], input, select, textarea')
      ?.focus({ preventScroll: true });
  }, [activeStep, showAddressEditor]);

  const markAddressAsCustom = () => {
    setSelectedSavedAddressId('new');
  };

  const captureAddressSnapshot = (): CheckoutAddressSnapshot => ({
    selectedSavedAddressId,
    selectedUzRegionId,
    selectedDistrict,
    addressLine,
    sharedCoordinates: sharedCoordinates ? { ...sharedCoordinates } : null,
  });

  const startAddressEditing = () => {
    addressEditingSnapshotRef.current = captureAddressSnapshot();
    setIsNewAddressMode(false);
    setIsAddressEditing(true);
  };

  const startNewAddress = () => {
    addressEditingSnapshotRef.current = captureAddressSnapshot();
    focusNewAddressOnRenderRef.current = true;
    setSelectedSavedAddressId('new');
    setSelectedUzRegionId(UZBEKISTAN_REGIONS[0].id);
    setSelectedDistrict(UZBEKISTAN_REGIONS[0].districts[0] || '');
    setAddressLine('');
    setSharedCoordinates(null);
    setMapSelectionFeedback(null);
    setErrors((previous) => ({
      ...previous,
      region: undefined,
      district: undefined,
      address: undefined,
    }));
    setIsSavedAddressPickerOpen(false);
    setIsNewAddressMode(true);
    setIsAddressEditing(true);
    setIsMapModalOpen(true);
  };

  const cancelAddressEditing = () => {
    const snapshot = addressEditingSnapshotRef.current;
    if (snapshot) {
      setSelectedSavedAddressId(snapshot.selectedSavedAddressId);
      setSelectedUzRegionId(snapshot.selectedUzRegionId);
      setSelectedDistrict(snapshot.selectedDistrict);
      setAddressLine(snapshot.addressLine);
      setSharedCoordinates(snapshot.sharedCoordinates);
    }
    setErrors((previous) => ({
      ...previous,
      region: undefined,
      district: undefined,
      address: undefined,
    }));
    addressEditingSnapshotRef.current = null;
    setIsAddressEditing(false);
    setIsSavedAddressPickerOpen(isNewAddressMode);
    setIsNewAddressMode(false);
  };

  const finishAddressEditing = () => {
    const region = UZBEKISTAN_REGIONS.find(
      (item) => item.id === selectedUzRegionId
    );
    const nextAddressErrors = {
      region: region ? undefined : t('cart.region'),
      district:
        region && selectedDistrict && region.districts.includes(selectedDistrict)
          ? undefined
          : t('cart.districtSelectPlaceholder'),
      address:
        addressLine.trim().length >= 5 ? undefined : t('cart.address'),
    };
    setErrors((previous) => ({ ...previous, ...nextAddressErrors }));
    if (
      nextAddressErrors.region ||
      nextAddressErrors.district ||
      nextAddressErrors.address
    ) {
      addToast({
        type: 'error',
        title: t('cart.step2Title'),
        description:
          nextAddressErrors.region ||
          nextAddressErrors.district ||
          nextAddressErrors.address,
      });
      return;
    }
    if (isNewAddressMode) setSelectedSavedAddressId('new');
    addressEditingSnapshotRef.current = null;
    setIsAddressEditing(false);
    setIsSavedAddressPickerOpen(false);
    setIsNewAddressMode(false);
  };

  // Manual region change resets incompatible district immediately
  const handleRegionChange = (newRegionId: string) => {
    markAddressAsCustom();
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

  // Confirming a point in DeliveryMapModal updates address, region, district, delivery fee & total
  const handleConfirmMapLocation = ({
    coords,
    reverseGeocodedAddress,
    matchedRegion,
    matchedDistrict,
  }: ConfirmedMapLocationPayload) => {
    markAddressAsCustom();
    setSharedCoordinates(coords);

    if (reverseGeocodedAddress) {
      setAddressLine(reverseGeocodedAddress);
      setErrors((prev) => ({ ...prev, address: undefined }));
    }

    if (matchedRegion) {
      setSelectedUzRegionId(matchedRegion.id);
      const nextRule = resolveRegionTariffRule(
        matchedRegion.nameUz,
        enabledRegions
      );
      const feeText = nextRule
        ? formatUZS(nextRule.fee)
        : feeToBeConfirmedLabel;

      if (
        matchedDistrict &&
        matchedRegion.districts.includes(matchedDistrict)
      ) {
        setSelectedDistrict(matchedDistrict);
        setErrors((prev) => ({
          ...prev,
          region: undefined,
          district: undefined,
        }));
        setMapSelectionFeedback({
          type: 'success',
          text: `${t('cart.mapRegionMatchedNote')} ${getRegionDisplayName(
            matchedRegion
          )}, ${matchedDistrict} (${feeText})`,
        });
      } else {
        // Region matched, but exact district wasn't confidently identified -> clear incompatible district and ask customer to pick
        setSelectedDistrict('');
        setErrors((prev) => ({ ...prev, region: undefined }));
        setMapSelectionFeedback({
          type: 'warning',
          text: `${getRegionDisplayName(matchedRegion)} (${feeText}) — ${t(
            'cart.mapSelectDistrictPrompt'
          )}`,
        });
      }
    } else {
      // Could not confidently identify region -> do not guess; ask customer to select region & district manually
      setSelectedDistrict('');
      setMapSelectionFeedback({
        type: 'warning',
        text: t('cart.mapSelectRegionDistrictPrompt'),
      });
    }
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

  const recommendedForCart = useMemo(
    () => products.filter(product => product.status === 'active' && product.stock > 0).slice(0, 4),
    [products]
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

  const handleApplyCoupon = (e?: React.FormEvent) => {
    e?.preventDefault();
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
    stepScrollPositionsRef.current[activeStep] = window.scrollY;
    const stepOrder: Record<CheckoutStep, number> = { cart: 1, address: 2, payment: 3, confirm: 4 };
    const movingBack = stepOrder[targetStep] < stepOrder[activeStep];
    if (targetStep === 'cart') {
      setActiveStep('cart');
      navigate('/cart');
      if (movingBack) {
        window.setTimeout(() => window.scrollTo({ top: stepScrollPositionsRef.current.cart, behavior: 'instant' }), 20);
      }
      return;
    }

    if (!isCustomerSignedIn) {
      setIsAuthPromptModalOpen(true);
      return;
    }

    setActiveStep(targetStep);
    if (!location.pathname.startsWith('/checkout')) {
      navigate('/checkout');
    }
    if (movingBack) {
      window.setTimeout(() => window.scrollTo({ top: stepScrollPositionsRef.current[targetStep], behavior: 'instant' }), 20);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleContinueFromAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (savedCustomerAddresses.length > 0 && isAddressEditing) {
      finishAddressEditing();
      return;
    }
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
    if (
      !selectedDistrict.trim() ||
      !currentUzRegionObj.districts.includes(selectedDistrict)
    ) {
      nextErrors.district = t('cart.districtSelectPlaceholder');
    }
    if (addressLine.trim().length < 5) {
      nextErrors.address = t('cart.address');
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (savedCustomerAddresses.length > 0) setIsAddressEditing(true);
      addToast({
        type: 'error',
        title:
          nextErrors.district ||
          nextErrors.address ||
          nextErrors.telegram ||
          t('cart.step2Title'),
      });
      return;
    }
    setIsSavedAddressPickerOpen(false);
    if (savedCustomerAddresses.length > 0) {
      setIsAddressEditing(false);
      setIsNewAddressMode(false);
      addressEditingSnapshotRef.current = null;
    }
    goToStep('payment');
  };

  const handleContinueFromPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!selectedPaymentMethod) {
      nextErrors.payment = t('cart.step3Title');
    }
    if (requiresPaymentReceipt && !hasConfiguredTransferCards) {
      nextErrors.payment = t('transfer.notConfiguredTitle');
    } else if (requiresPaymentReceipt && !receiptAttachment) {
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
    if (submittingOrderRef.current) return;
    if (requiresPaymentReceipt && (!hasConfiguredTransferCards || !receiptAttachment)) {
      const message = !hasConfiguredTransferCards ? t('transfer.notConfiguredTitle') : t('transfer.errMissingReceipt');
      addToast({ type: 'error', title: message });
      setErrors((prev) => ({ ...prev, payment: !hasConfiguredTransferCards ? message : prev.payment, receipt: hasConfiguredTransferCards ? message : prev.receipt }));
      setActiveStep('payment');
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

    const normalizedTg = normalizeTelegramUsername(customerTelegram);
    const requestPayload = {
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
        ? 'pending_verification' as const
        : 'not_required' as const,
      paymentReceipt: requiresPaymentReceipt
        ? receiptAttachment || undefined
        : undefined,
    };

    submittingOrderRef.current = true;
    setIsSubmittingOrder(true);
    setCheckoutSubmitError('');
    try {
      const receiptFingerprint = receiptAttachment
        ? Array.from(
            new Uint8Array(
              await crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(receiptAttachment.dataUrl)
              )
            )
          )
              .map((byte) => byte.toString(16).padStart(2, '0'))
              .join('')
        : null;
      const requestFingerprint = JSON.stringify({
        ...requestPayload,
        paymentReceipt: receiptAttachment
          ? {
              fileName: receiptAttachment.fileName,
              mimeType: receiptAttachment.mimeType,
              fileSize: receiptAttachment.fileSize,
              sha256: receiptFingerprint,
            }
          : null,
      });

      try {
        if (
          orderAttemptIdRef.current &&
          orderAttemptFingerprintRef.current !== requestFingerprint
        ) {
          orderAttemptIdRef.current = crypto.randomUUID();
        }
        if (!orderAttemptIdRef.current) {
          let storedAttempt: string | null = null;
          try {
            storedAttempt = sessionStorage.getItem(
              CHECKOUT_ORDER_ATTEMPT_KEY
            );
          } catch {
            // In-memory idempotency still works when session storage is unavailable.
          }
          let storedId: string | null = null;
          let storedFingerprint: string | null = null;
          if (storedAttempt) {
            try {
              const parsed = JSON.parse(storedAttempt) as {
                id?: unknown;
                fingerprint?: unknown;
              };
              if (typeof parsed.id === 'string') {
                storedId = parsed.id;
                storedFingerprint =
                  typeof parsed.fingerprint === 'string'
                    ? parsed.fingerprint
                    : null;
              }
            } catch {
              storedId = storedAttempt;
            }
          }
          orderAttemptIdRef.current =
            storedId &&
            (!storedFingerprint ||
              storedFingerprint === requestFingerprint)
              ? storedId
              : crypto.randomUUID();
        }
        orderAttemptFingerprintRef.current = requestFingerprint;
        try {
          sessionStorage.setItem(
            CHECKOUT_ORDER_ATTEMPT_KEY,
            JSON.stringify({
              id: orderAttemptIdRef.current,
              fingerprint: requestFingerprint,
            })
          );
        } catch {
          // In-memory idempotency remains active for the current page.
        }
      } catch {
        if (!orderAttemptIdRef.current) {
          orderAttemptIdRef.current = crypto.randomUUID();
        }
        orderAttemptFingerprintRef.current = requestFingerprint;
      }

      const createdOrder = await placeOrder({
        ...requestPayload,
        idempotencyKey: orderAttemptIdRef.current,
      });

      setCompletedOrder(createdOrder);
      setCheckoutSubmitError('');
      try {
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        sessionStorage.removeItem(CHECKOUT_ORDER_ATTEMPT_KEY);
        orderAttemptIdRef.current = null;
        orderAttemptFingerprintRef.current = null;
      } catch {
        // Order confirmation must not depend on session storage availability.
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setCheckoutSubmitError(
        error instanceof Error
          ? error.message
          : 'Buyurtmani serverda tasdiqlab boʻlmadi. Qayta urinib koʻring.'
      );
    } finally {
      submittingOrderRef.current = false;
      setIsSubmittingOrder(false);
    }
  };

  const handleCopyOrderNumber = (orderNum: string) => {
    navigator.clipboard?.writeText(formatOrderNumber(orderNum)).catch(() => {});
    setCopiedOrderNumber(true);
    setTimeout(() => setCopiedOrderNumber(false), 3000);
  };

  if (!completedOrder && (isCustomerAuthRestoring || isCartHydrating)) {
    return (
      <div
        className="zaven-page-container flex min-h-[45vh] items-center justify-center py-10"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-green" />
          <span>Savatcha yuklanmoqda...</span>
        </div>
      </div>
    );
  }

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
                    #{formatOrderNumber(completedOrder.orderNumber)}
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

            <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-gray-200 bg-[#F8F9FA] p-4 text-xs sm:text-sm dark:border-[#28453B] dark:bg-[#162923]">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  {t('cart.step2Title')}
                </p>
                <p className="break-words font-bold text-gray-900 dark:text-gray-100">
                  {completedOrder.customerName}
                </p>
                <p className="mt-0.5 break-words font-semibold text-brand-green">
                  {completedOrder.customerPhone}
                </p>
                <p className="mt-2 break-words leading-relaxed text-gray-700 dark:text-gray-300 [overflow-wrap:anywhere]">
                  {completedOrder.region}
                  {completedOrder.district ? `, ${completedOrder.district}` : ''}
                  {completedOrder.address ? `, ${completedOrder.address}` : ''}
                </p>
              </div>
              <div className="min-w-0 rounded-xl border border-gray-200 bg-[#F8F9FA] p-4 text-xs sm:text-sm dark:border-[#28453B] dark:bg-[#162923]">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  {t('cart.paymentHeading')}
                </p>
                <p className="break-words font-bold leading-relaxed text-gray-900 dark:text-gray-100 [overflow-wrap:anywhere]">
                  {completedOrder.paymentMethodLabel}
                </p>
                {completedOrder.paymentReceipt && (
                  <p className="mt-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
                    {t('transfer.uploadSuccessReady')}
                  </p>
                )}
              </div>
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
                <span className="max-w-full break-words text-lg font-extrabold leading-tight text-brand-green [overflow-wrap:anywhere] sm:text-2xl sm:text-right">
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
      <div className="zaven-page-container space-y-4 py-6 sm:py-12">
        <EmptyState
          icon={<ShoppingBag className="w-7 h-7" />}
          title={t('cart.emptyTitle')}
          description={t('cart.emptyDesc')}
          compact
        />
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={() => navigate('/catalog')}
          >
            {t('cart.continueShoppingBtn')}
          </Button>
        </div>
        <section
          aria-labelledby="empty-cart-recommendations-title"
          className="space-y-3.5 border-t border-gray-200 pt-6 dark:border-[#28453B]"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#C89D54]" />
            <h2
              id="empty-cart-recommendations-title"
              className="text-sm font-extrabold text-gray-900 dark:text-gray-100 sm:text-lg"
            >
              {t('home.recommendedTitle')}
            </h2>
          </div>
          {recommendedForCart.length > 0 ? (
            <div className="zaven-product-grid zaven-product-grid-4">
              {recommendedForCart.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white/60 px-4 py-5 text-center dark:border-[#28453B] dark:bg-[#12211C]">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Hozircha tavsiya uchun mavjud mahsulot yoʻq.
              </p>
              <Link
                to="/catalog"
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#0F6B50] px-4 py-2 text-sm font-bold text-[#0F6B50] dark:border-[#54E1CE] dark:text-[#54E1CE]"
              >
                Katalogni koʻrish
              </Link>
            </div>
          )}
        </section>
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
    <div className="checkout-page zaven-page-container min-w-0 py-4 sm:py-8 space-y-5 sm:space-y-6">
      {/* Show checkout progress only after the customer chooses to continue. */}
      {activeStep !== 'cart' && <nav
        aria-label="Checkout progress"
        className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-2.5 sm:p-4 shadow-card"
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
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
                className={`min-h-[44px] py-1.5 px-1.5 sm:px-3 rounded-xl border text-center transition-all flex items-center justify-center gap-1 min-w-0 ${
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
                <span className="sm:hidden min-w-0 [overflow-wrap:anywhere] text-[11px] leading-tight">
                  {step.shortLabel}
                </span>
                <span className="hidden sm:inline text-xs">
                  {step.fullLabel.replace(/^\d+\.\s*/, '')}
                </span>
              </button>
            );
          })}
        </div>
      </nav>}

      {/* ===================================================================== */}
      {/* STEP 1: CART-FOCUSED VIEW (/cart)                                     */}
      {/* ===================================================================== */}
      {activeStep === 'cart' && (
        <div className="space-y-10">
          <Button
            type="button"
            variant="outline"
            size="md"
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            onClick={continueShopping}
          >
            {t('cart.continueShoppingBtn')}
          </Button>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
              <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingBag className="w-4 h-4 text-brand-green shrink-0" />
                  <h1 className="min-w-0 text-sm sm:text-base font-extrabold text-gray-900 [overflow-wrap:anywhere]">
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
                  <span className="text-xl sm:text-2xl font-extrabold text-brand-green [overflow-wrap:anywhere]">
                    {formatUZS(cartPageTotalAmount)}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                size="lg"
                fullWidth
                className="gap-2 px-3 sm:px-6"
                rightIcon={<ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />}
                onClick={() => goToStep('address')}
              >
                <span className="whitespace-normal text-sm leading-tight sm:text-base">
                  {t('cart.proceedToPurchaseBtn')}
                </span>
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
      {/* STEP 2: SEQUENTIAL DELIVERY ADDRESS & TOUCH MAP PICKER                */}
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

          <div className="p-4 sm:p-6 flex flex-col gap-5">
            {showAddressEditor && (
              <div
                ref={addressEditorRef}
                className="min-w-0 space-y-4 scroll-mt-32 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4 dark:border-[#28453B] dark:bg-[#162923]"
              >
                {savedCustomerAddresses.length > 0 && (
                  <div className="border-b border-gray-200 pb-3 dark:border-[#28453B]">
                    <h2 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                      {isNewAddressMode
                        ? 'Yangi manzil'
                        : 'Manzilni buyurtma uchun tahrirlash'}
                    </h2>
                    <p className="mt-1 break-words text-xs text-gray-600 dark:text-gray-300">
                      O‘zgartirishlar faqat shu buyurtma uchun; saqlangan manzilingiz o‘zgarmaydi.
                    </p>
                  </div>
                )}
                <div className="flex flex-col justify-between gap-2.5 border-b border-gray-200 pb-3 dark:border-[#28453B] sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand-green">
                      {t('cart.region')} & {t('cart.district')}
                    </p>
                    <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                      {t('cart.deliveryService')}{' '}
                      <strong className="text-brand-green">
                        {isDeliveryFeeToBeConfirmed
                          ? feeToBeConfirmedLabel
                          : deliveryFee === 0
                          ? t('cart.freeDelivery')
                          : formatUZS(deliveryFee)}
                      </strong>
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<MapIcon className="h-4 w-4 text-brand-green" />}
                    onClick={() => setIsMapModalOpen(true)}
                  >
                    {t('cart.openMapBtn')}
                  </Button>
                </div>

                {mapSelectionFeedback && (
                  <div
                    className={`flex items-start justify-between gap-2 rounded-xl border p-3 text-xs ${
                      mapSelectionFeedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="break-words font-semibold">
                        {mapSelectionFeedback.text}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setMapSelectionFeedback(null)}
                      className="shrink-0 text-xs font-extrabold underline"
                    >
                      ×
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                      markAddressAsCustom();
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
                    markAddressAsCustom();
                    setAddressLine(e.target.value);
                    if (errors.address)
                      setErrors((prev) => ({ ...prev, address: undefined }));
                  }}
                  placeholder={t('cart.addressPlaceholder')}
                  leftIcon={<MapPin className="h-4 w-4" />}
                  error={errors.address}
                />

                {savedCustomerAddresses.length > 0 && (
                  <div className="flex flex-col-reverse gap-2 border-t border-gray-200 pt-3 dark:border-[#28453B] sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="md"
                      onClick={cancelAddressEditing}
                    >
                      Bekor qilish
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={finishAddressEditing}
                    >
                      Tayyor
                    </Button>
                  </div>
                )}
              </div>
            )}

            {savedCustomerAddresses.length > 0 &&
              (isSavedAddressPickerOpen || !isAddressEditing) && (
              <section className="min-w-0 rounded-2xl border border-gray-200 bg-[#F8F9FA] p-4 dark:border-[#28453B] dark:bg-[#162923]">
                {isSavedAddressPickerOpen ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                        Saqlangan manzillar
                      </h2>
                      <button
                        type="button"
                        onClick={() => setIsSavedAddressPickerOpen(false)}
                        className="min-h-10 rounded-lg px-2 text-xs font-bold text-brand-green hover:underline"
                      >
                        Orqaga
                      </button>
                    </div>
                    <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {savedCustomerAddresses.map((address) => {
                        const selected = selectedSavedAddressId === address.id;
                        return (
                          <button
                            key={address.id}
                            type="button"
                            onClick={() => applySavedAddressToCheckout(address)}
                            aria-pressed={selected}
                            className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? 'border-[#C89D54] bg-[#C89D54]/10'
                                : 'border-gray-200 bg-white dark:border-[#28453B] dark:bg-[#12211C]'
                            }`}
                          >
                            <span className="block break-words text-sm font-bold text-gray-900 dark:text-gray-100">
                              {address.title}
                            </span>
                            <span className="mt-1 block break-words text-xs text-brand-green">
                              {address.region}
                              {address.district ? ` · ${address.district}` : ''}
                            </span>
                            <span className="mt-1 block break-words text-xs text-gray-600 dark:text-gray-300">
                              {address.addressLine}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={startNewAddress}
                      className="min-h-12 w-full min-w-0 break-words rounded-xl border border-[#C89D54]/60 bg-[#0F3D2E] px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-[#16533F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89D54]"
                    >
                      + Xaritadan yangi manzil qoʻshish
                    </button>
                  </div>
                ) : (
                  <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <h2 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                        Yetkazib berish manzili
                      </h2>
                      {selectedSavedAddress && (
                        <p className="break-words text-xs font-semibold text-brand-green">
                          {selectedSavedAddress.title}
                        </p>
                      )}
                      <p className="break-words text-sm text-gray-700 dark:text-gray-200">
                        {getRegionDisplayName(currentUzRegionObj)}
                        {selectedDistrict ? ` · ${selectedDistrict}` : ''}
                      </p>
                      <p className="break-words text-sm text-gray-600 dark:text-gray-300">
                        {addressLine || 'Ko‘cha va uy manzili kiritilmagan'}
                      </p>
                      <p className="break-words text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {t('cart.deliveryService')}:{' '}
                        {isDeliveryFeeToBeConfirmed
                          ? feeToBeConfirmedLabel
                          : deliveryFee === 0
                          ? t('cart.freeDelivery')
                          : formatUZS(deliveryFee)}
                      </p>
                      {sharedCoordinates && (
                        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          Xarita nuqtasi biriktirilgan
                        </p>
                      )}
                    </div>
                    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddressEditing(false);
                          setIsSavedAddressPickerOpen(true);
                        }}
                        className="min-h-10 rounded-xl border border-gray-300 px-3 text-xs font-bold text-gray-700 dark:border-[#365B4D] dark:text-gray-200"
                      >
                        Saqlangan manzillardan tanlash
                      </button>
                      <button
                        type="button"
                        onClick={startAddressEditing}
                        className="min-h-10 rounded-xl bg-brand-green px-4 text-xs font-bold text-white"
                      >
                        Tahrirlash
                      </button>
                    </div>
                  </div>
                )}
                {!isSavedAddressPickerOpen && (
                  <button
                    type="button"
                    onClick={startNewAddress}
                    className="mt-3 min-h-12 w-full min-w-0 break-words rounded-xl border border-[#C89D54]/60 bg-[#0F3D2E] px-4 py-3 text-left text-sm font-bold text-white transition-colors hover:bg-[#16533F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C89D54]"
                  >
                    + Xaritadan yangi manzil qoʻshish
                  </button>
                )}
              </section>
            )}
            <section className="rounded-xl border border-gray-200 dark:border-[#28453B] bg-[#F8F9FA] dark:bg-[#162923] p-3.5 sm:p-4 space-y-2.5">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {t('cart.promoLabel')}
              </label>
              {appliedCoupon ? (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="text-xs font-extrabold text-emerald-900 truncate">
                      {appliedCoupon.code} (-{formatUZS(couponDiscountAmount)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAppliedCouponCode(null)}
                    className="text-xs font-bold text-red-600 hover:underline shrink-0"
                    aria-label={t('catalog.clear')}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder="ZAVEN10"
                    className="flex-1 min-w-[140px] h-10 rounded-xl border border-gray-300 dark:border-[#2F5246] px-3 text-xs font-semibold uppercase bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100"
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={() => handleApplyCoupon()}>
                    {t('cart.applyBtn')}
                  </Button>
                </div>
              )}
              {couponError && <p className="text-xs text-red-600 font-medium">{couponError}</p>}
            </section>

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
              {(savedCustomerAddresses.length === 0 || !isAddressEditing) && (
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {t('cart.continueToPaymentBtn')}
                </Button>
              )}
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
              {enabledPayments
                .filter(
                  (pm) =>
                    !(pm.requiresReceipt ?? pm.type === 'card_transfer')
                )
                .map((pm) => {
                const isSelected = selectedPaymentId === pm.id;

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
                      </div>
                      <p className="text-xs text-gray-600 mt-2 pl-6 leading-relaxed">
                        {pm.description}
                      </p>
                    </div>
                  </label>
                );
                })}
            </div>

            {enabledPayments
              .filter(
                (pm) =>
                  (pm.requiresReceipt ?? pm.type === 'card_transfer') &&
                  pm.id !== selectedPaymentId
              )
              .map((pm) => (
                <label
                  key={pm.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand-green dark:border-[#28453B] dark:bg-[#12211C]"
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={pm.id}
                    checked={false}
                    onChange={() => setSelectedPaymentId(pm.id)}
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-green"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-gray-900 dark:text-gray-100">
                      {pm.name}
                    </span>
                    <span className="mt-1 block break-words text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                      {pm.description}
                    </span>
                  </span>
                </label>
              ))}

            {errors.payment && (
              <p role="alert" className="text-xs font-bold text-red-600">{errors.payment}</p>
            )}
            {requiresPaymentReceipt && (
              <div className="space-y-5 rounded-2xl border-2 border-[#C89D54] bg-[#FBF6EC] p-4 sm:p-5 dark:bg-[#17231D]">
                <div className="flex min-w-0 flex-col gap-4 border-b border-[#E5C992] pb-4 dark:border-[#7B663D] sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-w-0 cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={selectedPaymentMethod?.id}
                      checked
                      onChange={() => undefined}
                      className="h-4 w-4 shrink-0 text-brand-green"
                    />
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F1ED] dark:bg-[#1A332A]">
                      <CreditCard className="h-5 w-5 text-[#0F3D2E] dark:text-[#E5C992]" />
                    </span>
                    <span className="min-w-0 break-words text-sm font-extrabold leading-snug text-[#09261C] dark:text-gray-100">
                      {selectedPaymentMethod?.name}
                    </span>
                  </label>
                  <div className="checkout-transfer-amount-panel w-full min-w-0 rounded-xl border px-4 py-3.5 text-center sm:w-auto sm:min-w-[220px] sm:px-5 sm:py-4">
                    <p className="checkout-transfer-amount-label text-xs font-bold uppercase leading-snug tracking-wide">
                      {t('transfer.exactAmountLabel')}
                    </p>
                    <p className="checkout-transfer-amount-value mt-1 break-words text-xl font-black leading-tight [overflow-wrap:anywhere] sm:text-2xl">
                      {formatUZS(finalTotalAmount)}
                    </p>
                  </div>
                </div>

                {hasConfiguredTransferCards ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {bankTransferConfig.humoCardNumber.trim() && (
                      <div className="min-w-0 space-y-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-[#28453B] dark:bg-[#0D1915]">
                        <Badge variant="green" size="sm">
                          HUMO
                        </Badge>
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 font-mono text-sm font-extrabold leading-relaxed text-gray-900 [overflow-wrap:anywhere] dark:text-gray-100">
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
                            aria-label={`HUMO ${t('transfer.copyCardNumber')}`}
                            className="shrink-0 rounded-lg bg-surface-page p-2 text-gray-700 hover:bg-[#0F3D2E] hover:text-white dark:bg-[#1A332A] dark:text-gray-100"
                          >
                            {copiedCardField === 'HUMO' ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {bankTransferConfig.humoCardHolder && (
                          <p className="text-xs leading-relaxed text-gray-600 [overflow-wrap:anywhere] dark:text-gray-300">
                            {t('transfer.recipientLabel')}{' '}
                            <strong className="text-gray-900 dark:text-gray-100">
                              {bankTransferConfig.humoCardHolder}
                            </strong>
                          </p>
                        )}
                      </div>
                    )}

                    {bankTransferConfig.uzcardCardNumber.trim() && (
                      <div className="min-w-0 space-y-2 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm dark:border-[#28453B] dark:bg-[#0D1915]">
                        <Badge variant="info" size="sm">
                          UZCARD
                        </Badge>
                        <div className="flex min-w-0 items-center justify-between gap-2">
                          <span className="min-w-0 flex-1 font-mono text-sm font-extrabold leading-relaxed text-gray-900 [overflow-wrap:anywhere] dark:text-gray-100">
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
                            aria-label={`UZCARD ${t('transfer.copyCardNumber')}`}
                            className="shrink-0 rounded-lg bg-surface-page p-2 text-gray-700 hover:bg-[#0F3D2E] hover:text-white dark:bg-[#1A332A] dark:text-gray-100"
                          >
                            {copiedCardField === 'UZCARD' ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        {bankTransferConfig.uzcardCardHolder && (
                          <p className="text-xs leading-relaxed text-gray-600 [overflow-wrap:anywhere] dark:text-gray-300">
                            {t('transfer.recipientLabel')}{' '}
                            <strong className="text-gray-900 dark:text-gray-100">
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

                <div className="space-y-2 border-t border-[#E5C992] pt-3 dark:border-[#7B663D]">
                  <label className="block text-sm font-bold text-gray-900 dark:text-gray-100">
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
                          <p className="text-xs font-bold text-gray-900 [overflow-wrap:anywhere]">
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
                        aria-label={t('transfer.removeReceipt')}
                        onClick={() => setReceiptAttachment(null)}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="relative flex w-full cursor-pointer focus-within:ring-2 focus-within:ring-brand-green flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-brand-green/50 bg-white px-4 py-4 text-center transition-colors hover:bg-brand-green-light/30 dark:bg-[#0D1915] dark:hover:bg-[#12211C]">
                      <Upload className="h-5 w-5 text-brand-green dark:text-[#E5C992]" />
                      <span className="text-sm font-bold text-brand-green dark:text-[#E5C992]">
                        {t('transfer.selectFileBtn')}
                      </span>
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        JPG, PNG, WEBP, PDF (≤ 5 MB)
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleReceiptFileChange}
                        className="sr-only"
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

              <div className="mt-1 rounded-xl border border-brand-green/20 bg-brand-green-light/70 px-3 py-3 flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 dark:border-[#28453B] dark:bg-[#1A332A]">
                <span className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100">
                  {t('cart.totalAmount')}
                </span>
                <span className="max-w-full break-words text-xl font-extrabold leading-tight text-brand-green [overflow-wrap:anywhere] sm:text-2xl sm:text-right">
                  {formatUZS(finalTotalAmount)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-gray-500 block">
                    {t('cart.addressHeading')}
                  </span>
                </div>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {customerName}
                </p>
                <p className="text-brand-green font-semibold">
                  {customerPhone}
                </p>
                <p className="text-gray-700 dark:text-gray-300 break-words pt-0.5 [overflow-wrap:anywhere]">
                  {getRegionDisplayName(currentUzRegionObj)}, {selectedDistrict}
                  , {addressLine}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                <div>
                  <span className="text-[11px] font-extrabold uppercase text-gray-500 block">
                    {t('cart.paymentHeading')}
                  </span>
                </div>
                <p className="break-words font-bold text-gray-900 dark:text-gray-100 [overflow-wrap:anywhere]">
                  {selectedPaymentMethod?.name}
                </p>
                {requiresPaymentReceipt && receiptAttachment && (
                  <p className="text-emerald-700 dark:text-emerald-300 font-semibold [overflow-wrap:anywhere]">
                    {t('transfer.uploadSuccessReady')}
                  </p>
                )}
              </div>
            </div>

            {checkoutSubmitError && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold leading-relaxed text-red-700 break-words">
                {checkoutSubmitError}
              </p>
            )}

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
                className="w-full min-w-0 sm:w-auto sm:min-w-[240px] text-sm sm:text-base"
              >
                {t('cart.confirmOrderBtn')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Touch Map Picker Modal */}
      <DeliveryMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        initialCoords={sharedCoordinates || currentUzRegionObj.approxCenter}
        initialAddress={addressLine}
        onConfirmLocation={handleConfirmMapLocation}
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
                try {
                  sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
                } catch {
                  // Clearing the cart should not depend on session storage.
                }
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

      <Modal
        isOpen={isAuthPromptModalOpen && !isCustomerSignedIn}
        onClose={() => {
          setIsAuthPromptModalOpen(false);
          if (location.pathname.startsWith('/checkout')) {
            navigate('/cart', { replace: true });
          }
        }}
        title={t('cart.authRequiredTitle')}
        maxWidth="sm"
        footer={
          <div className="w-full">
            <Button
              type="button"
              variant="primary"
              size="md"
              fullWidth
              leftIcon={<User className="w-4 h-4 text-[#C89D54]" />}
              onClick={() => {
                setIsAuthPromptModalOpen(false);
                navigate('/account?redirect=/checkout');
              }}
            >
              {t('cart.signInToCheckoutBtn')}
            </Button>
          </div>
        }
      >
        <div className="py-1">
          <div className="flex items-start gap-3 rounded-xl border border-[#C89D54]/30 bg-[#C89D54]/5 p-3.5 sm:p-4">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F3D2E] text-[#C89D54]">
              <User className="h-4 w-4" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <p className="text-xs font-extrabold tracking-wide text-[#9A7130] dark:text-[#E5C992]">
                {t('cart.authRequiredBadge')}
              </p>
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-200">
                {t('cart.authRequiredDesc')}
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
