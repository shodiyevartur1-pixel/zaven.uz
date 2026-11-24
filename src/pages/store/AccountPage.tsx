import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  User,
  Phone,
  MapPin,
  Package,
  LogOut,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  KeyRound,
  ShieldCheck,
  Info,
  RotateCcw,
  Mail,
  ChevronRight,
  ArrowLeft,
  Clock,
  CreditCard,
  Send,
  RefreshCw,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { CustomerAddress, Order, OrderStatus } from '../../types';
import {
  formatUZS,
  formatOrderNumber,
  formatUzbekPhone,
  isValidUzbekPhone,
  formatDateUz,
  normalizeTelegramUsername,
  isValidTelegramUsername,
} from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ConfirmedMapLocationPayload,
  DeliveryMapModal,
} from '../../components/checkout/DeliveryMapModal';
import { UZBEKISTAN_REGIONS } from '../../utils/uzbekistanLocations';

type AccountTab = 'orders' | 'addresses';
type AuthMode = 'signin' | 'signup' | 'reset' | 'verify_pending' | 'update_password';
const PASSWORD_RECOVERY_SESSION_KEY = 'zaven_password_recovery_active';

const isPasswordRecoveryActive = (): boolean => {
  if (typeof window === 'undefined') return false;
  const queryType = new URLSearchParams(window.location.search).get('type');
  const hashType = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('type');
  if (queryType === 'recovery' || hashType === 'recovery') {
    try {
      window.sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, '1');
    } catch {
      // Keep relying on the recovery URL if browser storage is unavailable.
    }
    return true;
  }
  try {
    return window.sessionStorage.getItem(PASSWORD_RECOVERY_SESSION_KEY) === '1';
  } catch {
    return false;
  }
};

const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    badgeVariant:
      | 'info'
      | 'gold'
      | 'warning'
      | 'success'
      | 'danger'
      | 'neutral';
    stepIndex: number;
  }
> = {
  new: { label: 'Yangi / Новый / New', badgeVariant: 'info', stepIndex: 1 },
  confirmed: {
    label: 'Tasdiqlandi / Подтвержден / Confirmed',
    badgeVariant: 'gold',
    stepIndex: 2,
  },
  preparing: {
    label: 'Tayyorlanmoqda / Сборка / Preparing',
    badgeVariant: 'warning',
    stepIndex: 3,
  },
  shipped: {
    label: 'Yoʻlda / В пути / Shipped',
    badgeVariant: 'info',
    stepIndex: 4,
  },
  delivered: {
    label: 'Yetkazildi / Доставлен / Delivered',
    badgeVariant: 'success',
    stepIndex: 5,
  },
  cancelled: {
    label: 'Bekor qilindi / Отменен / Cancelled',
    badgeVariant: 'danger',
    stepIndex: 0,
  },
};

const getFriendlyAuthError = (
  error: unknown,
  fallback: string,
  rateLimitMessage = fallback
): string => {
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/email rate limit exceeded|over_email_send_rate_limit|too many requests/i.test(message)) {
    return rateLimitMessage;
  }
  if (/failed to fetch|networkerror|load failed|request cannot be|fetch.*window/i.test(message)) {
    return fallback;
  }
  return message || fallback;
};

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const safeRedirectPath =
    searchParams.get('redirect') === '/checkout' ? '/checkout' : '';
  const {
    currentCustomer,
    isCustomerAuthRestoring,
    customerAuthRestoreFailed,
    orders,
    products,
    storeSettings,
    syncVerifiedCustomerFromAuthUser,
    signOutCustomer,
    updateCustomerProfile,
    updateCustomerPassword,
    addToCart,
    addToast,
  } = useStore();
  const { t } = useThemeLanguage();

  const [activeTab, setActiveTab] = useState<AccountTab>('orders');
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    isPasswordRecoveryActive() ? 'update_password' : 'signin'
  );
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(isPasswordRecoveryActive);

  // Email Auth Form State
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authNewPassword, setAuthNewPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('+998 ');
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authFeedback, setAuthFeedback] = useState<string>('');

  const clearRecoveryState = () => {
    setIsPasswordRecovery(false);
    try {
      window.sessionStorage.removeItem(PASSWORD_RECOVERY_SESSION_KEY);
      window.localStorage.removeItem('zaven_password_recovery_pending');
    } catch {
      // Continue even if browser storage is unavailable.
    }
    const cleanRecoveryUrl = new URL(window.location.href);
    cleanRecoveryUrl.searchParams.delete('type');
    cleanRecoveryUrl.searchParams.delete('code');
    cleanRecoveryUrl.hash = '';
    window.history.replaceState({}, document.title, `${cleanRecoveryUrl.pathname}${cleanRecoveryUrl.search}`);
  };

  // Profile Edit State
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileTelegram, setProfileTelegram] = useState<string>('');
  const [profileNewPassword, setProfileNewPassword] = useState('');
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('');
  const [isProfileEditorOpen, setIsProfileEditorOpen] = useState(false);
  const [profileError, setProfileError] = useState<string>('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  // Saved Addresses Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrTitle, setAddrTitle] = useState<string>('');
  const [addrRegion, setAddrRegion] = useState<string>('Toshkent shahri');
  const [addrDistrict, setAddrDistrict] = useState<string | undefined>();
  const [addrLine, setAddrLine] = useState<string>('');
  const [addrCoordinates, setAddrCoordinates] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isAddressMapOpen, setIsAddressMapOpen] = useState(false);
  const [addrDefault, setAddrDefault] = useState<boolean>(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const enabledRegions = useMemo(
    () => storeSettings.delivery.regions.filter((r) => r.isEnabled),
    [storeSettings.delivery.regions]
  );

  // Detect PASSWORD_RECOVERY event or unconfirmed session on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        try {
          window.sessionStorage.setItem(PASSWORD_RECOVERY_SESSION_KEY, '1');
        } catch {
          // The auth event still lets this page render the recovery form.
        }
        setIsPasswordRecovery(true);
        setAuthError('');
        setAuthFeedback('');
        setAuthMode('update_password');
      } else if (
        (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
        session?.user
      ) {
        if (isPasswordRecoveryActive()) {
          setIsPasswordRecovery(true);
          setAuthMode('update_password');
          return;
        }
        if (!session.user.email_confirmed_at) {
          setPendingEmail(session.user.email || '');
          setAuthMode('verify_pending');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [syncVerifiedCustomerFromAuthUser]);

  useEffect(() => {
    if (currentCustomer) {
      setProfileName(currentCustomer.fullName);
      setProfilePhone(currentCustomer.phone || '+998 ');
      setProfileTelegram(currentCustomer.telegramUsername || '');
    }
  }, [currentCustomer]);

  useEffect(() => {
    if (!isPasswordRecovery && currentCustomer?.emailVerified && safeRedirectPath) {
      navigate(safeRedirectPath, { replace: true });
    }
  }, [currentCustomer, navigate, safeRedirectPath, isPasswordRecovery]);

  // Match orders by customerId, verified email, or phone so existing orders are never detached
  const customerOrders = useMemo(() => {
    if (!currentCustomer) return [];
    const cleanCustomerPhone = currentCustomer.phone.replace(/\D/g, '');
    const cleanCustomerEmail = currentCustomer.email?.trim().toLowerCase();

    return orders
      .filter((o) => {
        if (o.customerId && o.customerId === currentCustomer.id) return true;
        if (
          cleanCustomerEmail &&
          o.customerEmail &&
          o.customerEmail.trim().toLowerCase() === cleanCustomerEmail
        ) {
          return true;
        }
        if (
          cleanCustomerPhone.length >= 9 &&
          o.customerPhone.replace(/\D/g, '') === cleanCustomerPhone
        ) {
          return true;
        }
        return false;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [currentCustomer, orders]);

  useEffect(() => {
    if (!selectedOrder) return;
    const latestOrder = orders.find(
      (order) =>
        order.id === selectedOrder.id ||
        order.orderNumber === selectedOrder.orderNumber
    );
    if (latestOrder && latestOrder !== selectedOrder) {
      setSelectedOrder(latestOrder);
    }
  }, [orders, selectedOrder]);

  if (isCustomerAuthRestoring && !isPasswordRecovery) {
    return (
      <div className="zaven-page-container flex min-h-56 items-center justify-center py-10">
        <div role="status" className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
          <RefreshCw className="h-4 w-4 animate-spin" />
          {t('account.restoringSession')}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 1. EMAIL SIGN-IN HANDLER (Requires email_confirmed_at before treating as verified)
  // ===========================================================================
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthFeedback('');

    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError(t('account.emailLabel'));
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(t('account.passwordLabel'));
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthError(t('account.unconfiguredNoticeDesc'));
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: authPassword,
      });

      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setPendingEmail(cleanEmail);
          setAuthMode('verify_pending');
          setAuthFeedback(t('account.notVerifiedYet'));
          return;
        }
        setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
        return;
      }

      if (data.user) {
        if (!data.user.email_confirmed_at) {
          setPendingEmail(cleanEmail);
          setAuthMode('verify_pending');
          setAuthFeedback(t('account.notVerifiedYet'));
          return;
        }
        await syncVerifiedCustomerFromAuthUser(data.user);
        addToast({
          type: 'success',
          title: t('header.welcome'),
          description: data.user.email,
        });
      }
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // ===========================================================================
  // 2. EMAIL SIGN-UP HANDLER (Sends confirmation link; requires verification)
  // ===========================================================================
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthFeedback('');

    const cleanEmail = authEmail.trim().toLowerCase();
    if (authFullName.trim().length < 2) {
      setAuthError(t('cart.fullName'));
      return;
    }
    if (!isValidUzbekPhone(authPhone)) {
      setAuthError('+998 XX XXX-XX-XX');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError(t('account.emailLabel'));
      return;
    }
    if (authPassword.length < 6) {
      setAuthError(t('account.passwordLabel'));
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      setAuthError(t('account.unconfiguredNoticeDesc'));
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: authPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/account${
            safeRedirectPath
              ? `?redirect=${encodeURIComponent(safeRedirectPath)}`
              : ''
          }`,
          data: {
            full_name: authFullName.trim(),
            phone: authPhone.trim(),
          },
        },
      });

      if (error) {
        setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
        return;
      }

      // Always require email confirmation before treating the account as verified
      if (data.user && data.user.email_confirmed_at) {
        await syncVerifiedCustomerFromAuthUser(data.user);
      } else {
        setPendingEmail(cleanEmail);
        setAuthMode('verify_pending');
      }
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // ===========================================================================
  // 3. RESEND CONFIRMATION EMAIL & CHECK VERIFICATION STATUS
  // ===========================================================================
  const handleResendConfirmationEmail = async () => {
    setAuthError('');
    setAuthFeedback('');

    const targetEmail = (pendingEmail || authEmail).trim().toLowerCase();
    if (!targetEmail || !isSupabaseConfigured || !supabase) return;

    setIsAuthSubmitting(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/account${
            safeRedirectPath
              ? `?redirect=${encodeURIComponent(safeRedirectPath)}`
              : ''
          }`,
        },
      });

      if (error) {
        setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
        return;
      }

      setAuthFeedback(t('account.resendSuccess'));
      addToast({
        type: 'success',
        title: t('account.resendSuccess'),
      });
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleCheckVerificationStatus = async () => {
    setAuthError('');
    setAuthFeedback('');
    if (!isSupabaseConfigured || !supabase) return;

    setIsAuthSubmitting(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        setAuthMode('signin');
        setAuthFeedback(
          t('account.signInAfterVerification')
        );
        return;
      }

      if (data.user.email_confirmed_at) {
        await syncVerifiedCustomerFromAuthUser(data.user);
        addToast({
          type: 'success',
          title: t('account.verifiedBadge'),
          description: data.user.email,
        });
      } else {
        setAuthError(t('account.notVerifiedYet'));
      }
    } catch (error) {
      setAuthError(
        getFriendlyAuthError(
          error,
          t('account.connectionError'),
          t('account.emailRateLimit')
        )
      );
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  // ===========================================================================
  // 4. PASSWORD RESET REQUEST & PASSWORD UPDATE
  // ===========================================================================
  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthFeedback('');

    const cleanEmail = authEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setAuthError(t('account.emailLabel'));
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthError(t('account.unconfiguredNoticeDesc'));
      return;
    }

    setIsAuthSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/account?type=recovery`,
      });

      if (error) {
        setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
        return;
      }

      setAuthFeedback(t('account.resetSentSuccess'));
      addToast({
        type: 'info',
        title: t('account.resetSentSuccess'),
      });
    } catch (error) {
      setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthFeedback('');

    if (authNewPassword.length < 6) {
      setAuthError(t('account.newPasswordLabel'));
      return;
    }

    if (!isSupabaseConfigured || !supabase) return;

    setIsAuthSubmitting(true);
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: authNewPassword,
      });

      if (error) {
        setAuthError(getFriendlyAuthError(error, t('account.connectionError'), t('account.emailRateLimit')));
        return;
      }

      clearRecoveryState();
      if (data.user && data.user.email_confirmed_at) {
        await syncVerifiedCustomerFromAuthUser(data.user);
      }

      addToast({
        type: 'success',
        title: t('account.passwordUpdatedSuccess'),
      });
      setAuthNewPassword('');
      setAuthMode('signin');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');

    if (profileName.trim().length < 2) {
      setProfileError(t('cart.fullName'));
      return;
    }
    if (!isValidUzbekPhone(profilePhone)) {
      setProfileError('+998 XX XXX-XX-XX');
      return;
    }
    if (!isValidTelegramUsername(profileTelegram)) {
      setProfileError(t('cart.telegramInvalidError'));
      return;
    }
    if (
      profileNewPassword &&
      profileNewPassword.length < 8
    ) {
      setProfileError('Yangi parol kamida 8 ta belgidan iborat boʻlishi kerak.');
      return;
    }
    if (profileNewPassword !== profileConfirmPassword) {
      setProfileError('Yangi parollar mos kelmadi.');
      return;
    }

    setIsSavingProfile(true);
    setProfileSaved(false);
    try {
      const profileResult = await updateCustomerProfile({
        fullName: profileName.trim(),
        phone: profilePhone.trim(),
        telegramUsername: normalizeTelegramUsername(profileTelegram),
      }, { suppressSuccessToast: Boolean(profileNewPassword) });
      if (!profileResult.ok) {
        setProfileError(profileResult.error || 'Profilni saqlab boʻlmadi. Qayta urinib koʻring.');
        return;
      }

      if (profileNewPassword) {
        const passwordResult = await updateCustomerPassword(profileNewPassword);
        if (!passwordResult.ok) {
          setProfileError(passwordResult.error || 'Parolni yangilab boʻlmadi. Qayta urinib koʻring.');
          return;
        }
      }

      setProfileNewPassword('');
      setProfileConfirmPassword('');
      setProfileSaved(true);
      setIsProfileEditorOpen(false);
    } catch {
      setProfileError('Profilni saqlashda xatolik yuz berdi. Maʼlumotlar oynada qoldi; qayta urinib koʻring.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenAddressModal = (address?: CustomerAddress) => {
    if (address) {
      setEditingAddressId(address.id);
      setAddrTitle(address.title);
      setAddrRegion(address.region);
      setAddrDistrict(address.district);
      setAddrLine(address.addressLine);
      setAddrCoordinates(address.locationCoordinates || null);
      setAddrDefault(address.isDefault);
    } else {
      setEditingAddressId(null);
      setAddrTitle('');
      setAddrRegion(enabledRegions[0]?.regionName || 'Toshkent shahri');
      setAddrDistrict(undefined);
      setAddrLine('');
      setAddrCoordinates(null);
      setAddrDefault(
        !currentCustomer || currentCustomer.addresses.length === 0
      );
    }
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer || !addrTitle.trim() || !addrLine.trim()) return;

    const existingList = currentCustomer.addresses || [];
    let updatedAddresses: CustomerAddress[];

    if (editingAddressId) {
      updatedAddresses = existingList.map((item) =>
        item.id === editingAddressId
          ? {
              ...item,
              title: addrTitle.trim(),
              region: addrRegion,
              district: addrDistrict,
              addressLine: addrLine.trim(),
              locationCoordinates: addrCoordinates || undefined,
              isDefault: addrDefault,
            }
          : addrDefault
          ? { ...item, isDefault: false }
          : item
      );
    } else {
      const newAddress: CustomerAddress = {
        id: `addr-${Date.now()}`,
        title: addrTitle.trim(),
        region: addrRegion,
        district: addrDistrict,
        addressLine: addrLine.trim(),
        locationCoordinates: addrCoordinates || undefined,
        isDefault: addrDefault || existingList.length === 0,
      };
      updatedAddresses = newAddress.isDefault
        ? [
            newAddress,
            ...existingList.map((item) => ({ ...item, isDefault: false })),
          ]
        : [...existingList, newAddress];
    }

    updateCustomerProfile({ addresses: updatedAddresses });
    setIsAddressModalOpen(false);
    setIsAddressMapOpen(false);
  };

  const handleAddressMapConfirm = ({
    coords,
    reverseGeocodedAddress,
    matchedRegion,
    matchedDistrict,
  }: ConfirmedMapLocationPayload) => {
    setAddrCoordinates(coords);
    if (reverseGeocodedAddress) setAddrLine(reverseGeocodedAddress);
    if (matchedRegion) setAddrRegion(matchedRegion.nameUz);
    setAddrDistrict(matchedDistrict || undefined);
    setIsAddressMapOpen(false);
  };

  const handleDeleteAddress = (addressId: string) => {
    if (!currentCustomer) return;
    const remaining = currentCustomer.addresses.filter(
      (a) => a.id !== addressId
    );
    updateCustomerProfile({ addresses: remaining });
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      const liveProduct = products.find((p) => p.id === item.productId);
      if (
        liveProduct &&
        liveProduct.status === 'active' &&
        liveProduct.stock > 0
      ) {
        addToCart(liveProduct.id, Math.min(liveProduct.stock, item.quantity));
      }
    });
    setSelectedOrder(null);
    navigate('/cart');
  };

  // ===========================================================================
  // UNAUTHENTICATED OR UNVERIFIED VIEW: EMAIL SIGN-IN / SIGN-UP / VERIFY / RESET
  // ===========================================================================
  if (isPasswordRecovery || !currentCustomer || !currentCustomer.emailVerified) {
    return (
      <div className="zaven-page-container py-6 sm:py-12">
        <div className="max-w-xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
          {/* Top Header */}
          <div className="space-y-2 bg-[#0F3D2E] px-4 py-3.5 text-white sm:px-6 sm:py-4">
            <div>
              <button
                type="button"
                onClick={() => {
                  if (window.history.state?.idx > 0) navigate(-1);
                  else navigate('/', { replace: true });
                }}
                className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-emerald-100 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {t('account.goBack')}
              </button>
            </div>
            <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
              {authMode === 'signup'
                ? t('account.signUpTitle')
                : authMode === 'reset'
                ? t('account.resetTitle')
                : authMode === 'verify_pending'
                ? t('account.verifyPendingTitle')
                : authMode === 'update_password'
                ? t('account.updatePasswordTitle')
                : t('account.signInTitle')}
            </h1>
            {(authMode === 'signup' || authMode === 'reset' || (authMode === 'signin' && !safeRedirectPath)) && (
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                {authMode === 'signup'
                  ? t('account.signUpSub')
                  : authMode === 'reset'
                  ? t('account.resetSub')
                  : t('account.signInSub')}
              </p>
            )}
          </div>

          <div className={"space-y-4 p-4 sm:p-6"}>
            {safeRedirectPath && authMode !== 'verify_pending' && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-green-light/70 px-3 py-2 text-xs font-medium leading-normal text-brand-green dark:bg-[#162923] dark:text-emerald-200">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('account.checkoutRedirectNotice')}</span>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            {authMode !== 'reset' &&
              authMode !== 'verify_pending' &&
              authMode !== 'update_password' && (
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError('');
                      setAuthFeedback('');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${
                      authMode === 'signin'
                        ? 'bg-[#0F3D2E] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    {t('account.signInTab')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setAuthError('');
                      setAuthFeedback('');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${
                      authMode === 'signup'
                        ? 'bg-[#0F3D2E] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    {t('account.signUpTab')}
                  </button>
                </div>
              )}

            {!isSupabaseConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {t('account.unconfiguredNoticeTitle')}
                  </p>
                  <p className="mt-0.5 text-amber-800 leading-relaxed">
                    {t('account.unconfiguredNoticeDesc')}
                  </p>
                </div>
              </div>
            )}

            {authError && (
              <div className="min-w-0 p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere] leading-relaxed">{authError}</span>
              </div>
            )}

            {customerAuthRestoreFailed && !currentCustomer && (
              <div role="alert" className="min-w-0 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs font-semibold text-amber-900">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere] leading-relaxed">
                  {t('account.sessionRestoreError')}
                </span>
              </div>
            )}

            {authFeedback && authMode !== 'verify_pending' && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere] leading-relaxed">{authFeedback}</span>
              </div>
            )}

            {/* VIEW A: SIGN IN */}
            {authMode === 'signin' && (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <Input
                  label={t('account.emailLabel')}
                  required
                  type="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="namuna@mail.uz"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label={t('account.passwordLabel')}
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  rightElement={(
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? t('account.hidePassword') : t('account.showPassword')}
                      aria-pressed={showPassword}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-[#2F5246] bg-[#12211C] text-[#C89D54] transition-colors hover:bg-[#1A332A] focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                />

                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('reset');
                      setAuthError('');
                      setAuthFeedback('');
                    }}
                    className="text-xs font-bold text-brand-green hover:underline"
                  >
                    {t('account.forgotPasswordLink')}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isAuthSubmitting}
                  leftIcon={<ShieldCheck className="w-4 h-4 text-[#C89D54]" />}
                >
                  {t('account.signInBtn')}
                </Button>
              </form>
            )}

            {/* VIEW B: SIGN UP */}
            {authMode === 'signup' && (
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <Input
                  label={t('cart.fullName')}
                  required
                  value={authFullName}
                  onChange={(e) => setAuthFullName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                />

                <Input
                  label={t('cart.phone')}
                  required
                  type="tel"
                  value={authPhone}
                  onChange={(e) =>
                    setAuthPhone(formatUzbekPhone(e.target.value))
                  }
                  placeholder="+998 90 123-45-67"
                  leftIcon={<Phone className="w-4 h-4" />}
                />

                <Input
                  label={t('account.emailLabel')}
                  required
                  type="email"
                  autoComplete="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="namuna@mail.uz"
                  leftIcon={<Mail className="w-4 h-4" />}
                />

                <Input
                  label={t('account.passwordLabel')}
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  rightElement={(
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? t('account.hidePassword') : t('account.showPassword')}
                      aria-pressed={showPassword}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-[#2F5246] bg-[#12211C] text-[#C89D54] transition-colors hover:bg-[#1A332A] focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isAuthSubmitting}
                  leftIcon={<Mail className="w-4 h-4 text-[#C89D54]" />}
                  className="min-h-14 gap-2.5 px-3 py-3 text-sm leading-snug sm:px-5 sm:text-base"
                >
                  {t('account.signUpBtn')}
                </Button>
              </form>
            )}

            {/* VIEW C: PASSWORD RESET REQUEST */}
            {authMode === 'reset' && (
              <div className="space-y-3">
                <form onSubmit={handleSendPasswordReset} className="space-y-4">
                  <Input
                    label={t('account.emailLabel')}
                    required
                    type="email"
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="namuna@mail.uz"
                    leftIcon={<Mail className="w-4 h-4" />}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    isLoading={isAuthSubmitting}
                    leftIcon={<Mail className="w-4 h-4 text-[#C89D54]" />}
                  >
                    {t('account.sendResetBtn')}
                  </Button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setAuthError('');
                    setAuthFeedback('');
                  }}
                  className="w-full text-center text-xs font-bold text-brand-green hover:underline"
                >
                  {t('account.signInTab')}
                </button>
              </div>
            )}

            {/* VIEW D: UPDATE PASSWORD AFTER CLICKING RECOVERY LINK */}
            {authMode === 'update_password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <Input
                  label={t('account.newPasswordLabel')}
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={authNewPassword}
                  onChange={(e) => setAuthNewPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  rightElement={(
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? t('account.hidePassword') : t('account.showPassword')}
                      aria-pressed={showPassword}
                      className="flex min-h-9 min-w-9 items-center justify-center rounded-lg border border-[#2F5246] bg-[#12211C] text-[#C89D54] transition-colors hover:bg-[#1A332A] focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isAuthSubmitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-[#C89D54]" />}
                >
                  {t('account.updatePasswordBtn')}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    clearRecoveryState();
                    setAuthNewPassword('');
                    setAuthMode('signin');
                  }}
                  className="w-full text-center text-xs font-bold text-brand-green hover:underline"
                >
                  {t('account.signInTab')}
                </button>
              </form>
            )}

            {/* VIEW E: EMAIL VERIFICATION PENDING SCREEN */}
            {authMode === 'verify_pending' && (
              <div className="space-y-4">
                <div className="space-y-2 text-center">
                  <p className="break-all text-sm font-bold text-brand-green">
                    {pendingEmail || authEmail}
                  </p>
                  <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {t('account.verifyPendingDesc')}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    fullWidth
                    isLoading={isAuthSubmitting}
                    leftIcon={
                      <RefreshCw className="w-4 h-4 text-[#C89D54]" />
                    }
                    onClick={handleCheckVerificationStatus}
                  >
                    {t('account.checkVerificationBtn')}
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    fullWidth
                    isLoading={isAuthSubmitting}
                    leftIcon={<Mail className="w-4 h-4" />}
                    onClick={handleResendConfirmationEmail}
                  >
                    {t('account.resendConfirmationBtn')}
                  </Button>
                </div>

                {authFeedback &&
                  authFeedback !== t('account.notVerifiedYet') && (
                    <p role="status" className="text-center text-xs leading-relaxed text-emerald-700 dark:text-emerald-300">
                      {authFeedback}
                    </p>
                  )}

                <div className="pt-2 border-t border-gray-100 dark:border-[#28453B] text-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setAuthError('');
                      setAuthFeedback('');
                    }}
                    className="font-bold text-brand-green hover:underline"
                  >
                    ← {t('account.signInTab')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // VERIFIED CUSTOMER DASHBOARD
  // ===========================================================================

  return (
    <div className="zaven-page-container py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Verified Customer Header Card */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0F3D2E] text-[#C89D54] flex items-center justify-center font-extrabold text-xl shrink-0">
            {currentCustomer.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 truncate">
                {currentCustomer.fullName}
              </h1>
              <Badge variant="success" size="sm">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                {t('account.verifiedBadge')}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300 mt-0.5">
              {currentCustomer.email && <span>{currentCustomer.email}</span>}
              {currentCustomer.phone && <span>• {currentCustomer.phone}</span>}
              {currentCustomer.telegramUsername && (
                <span className="text-brand-green font-semibold">
                  • {currentCustomer.telegramUsername}
                </span>
              )}
            </div>
            {profileSaved && (
              <p role="status" className="mt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                {t('account.savedSuccess')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            aria-label={t('account.editProfile')}
            title={t('account.editProfile')}
            onClick={() => {
              setProfileName(currentCustomer.fullName);
              setProfilePhone(currentCustomer.phone || '+998 ');
              setProfileTelegram(currentCustomer.telegramUsername || '');
              setProfileNewPassword('');
              setProfileConfirmPassword('');
              setIsProfileEditorOpen(true);
              setProfileError('');
              setProfileSaved(false);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 text-sm font-bold text-gray-700 hover:border-brand-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold dark:border-[#2F5246] dark:text-gray-200"
          >
            <Edit3 className="h-4 w-4" />
            <span>{t('account.editProfile')}</span>
          </button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
            onClick={signOutCustomer}
            className="text-red-600"
          >
            {t('account.signOut')}
          </Button>
        </div>
      </div>

      {isProfileEditorOpen && (
        <section className="mt-4 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card">
          <form onSubmit={handleSaveProfile} className="max-w-lg space-y-4">
            {profileError && (
              <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold leading-relaxed text-red-700 break-words">
                {profileError}
              </div>
            )}

            <Input
              label={t('account.emailLabel')}
              type="email"
              value={currentCustomer.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4" />}
              helperText={t('account.verifiedBadge')}
            />
            <Input
              label={t('cart.fullName')}
              required
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label={t('cart.phone')}
              required
              type="tel"
              value={profilePhone}
              onChange={(e) =>
                setProfilePhone(formatUzbekPhone(e.target.value))
              }
              leftIcon={<Phone className="w-4 h-4" />}
            />
            <Input
              label={t('cart.telegramOptional')}
              value={profileTelegram}
              onChange={(e) => setProfileTelegram(e.target.value)}
              placeholder={t('cart.telegramPlaceholder')}
              leftIcon={<Send className="w-4 h-4" />}
            />

            <div className="border-t border-gray-200 dark:border-[#28453B] pt-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Parolni oʻzgartirish (ixtiyoriy)
              </h3>
              <Input
                label="Yangi parol"
                type="password"
                autoComplete="new-password"
                value={profileNewPassword}
                onChange={(e) => setProfileNewPassword(e.target.value)}
              />
              <Input
                label="Yangi parolni tasdiqlang"
                type="password"
                autoComplete="new-password"
                value={profileConfirmPassword}
                onChange={(e) => setProfileConfirmPassword(e.target.value)}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                className="sm:w-auto"
                disabled={isSavingProfile}
                onClick={() => {
                  setIsProfileEditorOpen(false);
                  setProfileError('');
                }}
              >
                {t('footer.cancelBtn')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                className="sm:w-auto"
                isLoading={isSavingProfile}
              >
                {t('account.saveChanges')}
              </Button>
            </div>
          </form>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <aside className="lg:col-span-3 bg-white dark:bg-[#12211C] rounded-xl border border-gray-200 dark:border-[#28453B] p-3 shadow-card space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#0F3D2E] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4" />
              <span>{t('account.myOrders')}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] font-extrabold">
              {customerOrders.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('addresses')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'addresses'
                ? 'bg-[#0F3D2E] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4" />
              <span>{t('account.savedAddresses')}</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] font-extrabold">
              {currentCustomer.addresses.length}
            </span>
          </button>

        </aside>

        {/* Tappable Order Cards */}
        <div className="lg:col-span-9">
          {activeTab === 'orders' && (
            <div className="space-y-3.5">
              {customerOrders.length > 0 ? (
                customerOrders.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status];
                  const totalUnits = order.items.reduce(
                    (s, i) => s + i.quantity,
                    0
                  );

                  return (
                    <article
                      key={order.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedOrder(order)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedOrder(order);
                        }
                      }}
                      className="group cursor-pointer bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] hover:border-brand-green dark:hover:border-brand-gold overflow-hidden shadow-card transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
                    >
                      <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gray-50 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="font-mono text-sm font-extrabold text-brand-green group-hover:underline">
                            #{formatOrderNumber(order.orderNumber)}
                          </span>
                          <span className="text-xs text-gray-500">
                            • {formatDateUz(order.createdAt, true)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant={statusMeta.badgeVariant} size="sm">
                            {statusMeta.label}
                          </Badge>
                          {order.paymentVerificationStatus ===
                            'pending_verification' && (
                            <Badge variant="warning" size="sm">
                              {t('transfer.statusPending')}
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'verified' && (
                            <Badge variant="success" size="sm">
                              {t('transfer.statusVerified')}
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'rejected' && (
                            <Badge variant="danger" size="sm">
                              {t('transfer.statusRejected')}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex items-center -space-x-2 shrink-0">
                            {order.items.slice(0, 3).map((item) => (
                              <img
                                key={item.productId}
                                src={item.image}
                                alt={item.productName}
                                className="w-11 h-11 rounded-xl object-cover border-2 border-white dark:border-[#12211C] bg-gray-100"
                              />
                            ))}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                              {order.items.map((i) => i.productName).join(', ')}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {totalUnits} {t('product.units')} • {order.region}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-sm sm:text-base font-extrabold text-brand-green block">
                              {formatUZS(order.totalAmount)}
                            </span>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-brand-green group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  title={t('account.myOrders')}
                  description=""
                  actionLabel={t('nav.catalog')}
                  onAction={() => navigate('/catalog')}
                />
              )}
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-gray-900">
                  {t('account.savedAddresses')}
                </h2>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => handleOpenAddressModal()}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentCustomer.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="p-4 rounded-xl border border-gray-200 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {addr.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {addr.region}, {addr.addressLine}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => handleOpenAddressModal(addr)}
                        className="font-semibold text-brand-green"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="font-semibold text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Address Modal */}
      <Modal
        isOpen={isAddressModalOpen && !isAddressMapOpen}
        onClose={() => setIsAddressModalOpen(false)}
        title={t('account.savedAddresses')}
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsAddressModalOpen(false)}
            >
              {t('footer.cancelBtn')}
            </Button>
            <Button
              type="submit"
              form="customer-address-form"
              variant="primary"
              size="md"
              fullWidth
            >
              {t('account.saveChanges')}
            </Button>
          </div>
        }
      >
        <form
          id="customer-address-form"
          onSubmit={handleSaveAddress}
          className="space-y-4"
        >
          <Input
            label={t('account.addressTitle')}
            required
            value={addrTitle}
            onChange={(e) => setAddrTitle(e.target.value)}
          />
          <Select
            label={t('cart.region')}
            required
            value={addrRegion}
            onChange={(e) => {
              setAddrRegion(e.target.value);
              setAddrDistrict(undefined);
              setAddrCoordinates(null);
            }}
            options={enabledRegions.map((r) => ({
              value: r.regionName,
              label: r.regionName,
            }))}
          />
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            leftIcon={<MapPin className="w-4 h-4 text-brand-green" />}
            onClick={() => setIsAddressMapOpen(true)}
          >
            {t('cart.openMapBtn')}
          </Button>
          <Input
            label={t('cart.address')}
            required
            value={addrLine}
            onChange={(e) => setAddrLine(e.target.value)}
          />
        </form>
      </Modal>

      <DeliveryMapModal
        isOpen={isAddressMapOpen}
        onClose={() => setIsAddressMapOpen(false)}
        initialCoords={
          addrCoordinates ||
          UZBEKISTAN_REGIONS.find((region) => region.nameUz === addrRegion)
            ?.approxCenter ||
          UZBEKISTAN_REGIONS[0].approxCenter
        }
        initialAddress={addrLine}
        onConfirmLocation={handleAddressMapConfirm}
      />

      {/* Structured Order Details Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder
            ? `${t('cart.orderNumberLabel')}: #${formatOrderNumber(selectedOrder.orderNumber)}`
            : ''
        }
        maxWidth="xl"
        footer={
          selectedOrder ? (
            <div className="w-full grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setSelectedOrder(null)}
              >
                {t('product.close')}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                leftIcon={<RotateCcw className="w-4 h-4 text-[#C89D54]" />}
                onClick={() => handleReorder(selectedOrder)}
              >
                {t('product.addToCart')}
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm">
            {/* Section 1: Order Status & Date */}
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono font-extrabold text-brand-green text-sm">
                  #{formatOrderNumber(selectedOrder.orderNumber)}
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatDateUz(selectedOrder.createdAt, true)}
                </p>
              </div>
              <Badge
                variant={ORDER_STATUS_META[selectedOrder.status].badgeVariant}
                size="md"
              >
                {ORDER_STATUS_META[selectedOrder.status].label}
              </Badge>
            </div>

            {/* Section 2: Estimated Delivery Time (Strictly separated from Address) */}
            <div className="p-3 rounded-xl bg-brand-green-light/60 border border-brand-green/20 flex items-center justify-between gap-2">
              <span className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-green shrink-0" />
                <span>{t('delivery.estimateLabel')}</span>
              </span>
              <Badge variant="gold" size="sm">
                {t('delivery.estimateValue')}
              </Badge>
            </div>

            {/* Section 3: Delivery Address & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-brand-green" />
                  <span>{t('cart.step2Title')}</span>
                </p>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {selectedOrder.region}
                  {selectedOrder.district ? `, ${selectedOrder.district}` : ''}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 break-words">
                  {selectedOrder.address}
                </p>
                {selectedOrder.locationCoordinates && (
                  <p className="text-[11px] font-mono text-brand-green">
                    Pin: {selectedOrder.locationCoordinates.lat},{' '}
                    {selectedOrder.locationCoordinates.lng}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-brand-green" />
                  <span>{t('cart.step3Title')}</span>
                </p>
                <p className="font-bold text-gray-900 dark:text-gray-100 break-words">
                  {selectedOrder.paymentMethodLabel}
                </p>
                <div className="pt-1">
                  {selectedOrder.paymentVerificationStatus ===
                    'pending_verification' && (
                    <Badge variant="warning" size="sm">
                      {t('transfer.statusPending')}
                    </Badge>
                  )}
                  {selectedOrder.paymentVerificationStatus === 'verified' && (
                    <Badge variant="success" size="sm">
                      {t('transfer.statusVerified')}
                    </Badge>
                  )}
                  {selectedOrder.paymentVerificationStatus === 'rejected' && (
                    <Badge variant="danger" size="sm">
                      {t('transfer.statusRejected')}
                    </Badge>
                  )}
                </div>
                {selectedOrder.paymentVerificationStatus === 'rejected' &&
                  selectedOrder.paymentReviewNote?.trim() && (
                    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium leading-relaxed text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                      <span className="font-bold">
                        {t('transfer.rejectionReason')}:
                      </span>{' '}
                      {selectedOrder.paymentReviewNote}
                    </p>
                  )}
              </div>
            </div>

            {/* Section 4: Itemized Products List */}
            <div className="border border-gray-200 dark:border-[#28453B] rounded-xl divide-y divide-gray-200 dark:divide-[#28453B] overflow-hidden">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-[#12211C]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatUZS(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="font-extrabold text-brand-green shrink-0">
                    {formatUZS(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Section 5: Order Totals Breakdown */}
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-2">
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>{t('cart.productsSubtotal')}:</span>
                <span className="font-bold">
                  {formatUZS(selectedOrder.subtotal)}
                </span>
              </div>
              {selectedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Promokod:</span>
                  <span className="font-bold">
                    -{formatUZS(selectedOrder.discountAmount)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-gray-700 dark:text-gray-300">
                <span>{t('cart.deliveryService')}:</span>
                <span className="font-bold">
                  {selectedOrder.deliveryFee === 0
                    ? t('cart.freeDelivery')
                    : formatUZS(selectedOrder.deliveryFee)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-[#28453B] flex justify-between items-baseline text-base">
                <span className="font-extrabold text-gray-900 dark:text-gray-100">
                  {t('cart.totalAmount')}
                </span>
                <span className="text-lg font-extrabold text-brand-green">
                  {formatUZS(selectedOrder.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
