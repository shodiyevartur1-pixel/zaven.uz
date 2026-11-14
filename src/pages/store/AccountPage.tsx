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
  Clock,
  CreditCard,
  Send,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { CustomerAddress, Order, OrderStatus } from '../../types';
import {
  formatUZS,
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

type AccountTab = 'orders' | 'addresses' | 'profile';
type AuthMode = 'signin' | 'signup' | 'reset' | 'verify_pending' | 'update_password';

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

export const AccountPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const safeRedirectPath =
    searchParams.get('redirect') === '/checkout' ? '/checkout' : '';
  const {
    currentCustomer,
    orders,
    products,
    storeSettings,
    syncVerifiedCustomerFromAuthUser,
    signOutCustomer,
    updateCustomerProfile,
    addToCart,
    addToast,
  } = useStore();
  const { t } = useThemeLanguage();

  const [activeTab, setActiveTab] = useState<AccountTab>('orders');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');

  // Email Auth Form State
  const [authEmail, setAuthEmail] = useState<string>('');
  const [authPassword, setAuthPassword] = useState<string>('');
  const [authNewPassword, setAuthNewPassword] = useState<string>('');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authPhone, setAuthPhone] = useState<string>('+998 ');
  const [authTelegram, setAuthTelegram] = useState<string>('');
  const [pendingEmail, setPendingEmail] = useState<string>('');

  const [isAuthSubmitting, setIsAuthSubmitting] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authFeedback, setAuthFeedback] = useState<string>('');

  // Profile Edit State
  const [profileName, setProfileName] = useState<string>('');
  const [profilePhone, setProfilePhone] = useState<string>('');
  const [profileTelegram, setProfileTelegram] = useState<string>('');
  const [profileError, setProfileError] = useState<string>('');

  // Saved Addresses Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState<boolean>(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addrTitle, setAddrTitle] = useState<string>('');
  const [addrRegion, setAddrRegion] = useState<string>('Toshkent shahri');
  const [addrLine, setAddrLine] = useState<string>('');
  const [addrDefault, setAddrDefault] = useState<boolean>(false);

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const enabledRegions = useMemo(
    () => storeSettings.delivery.regions.filter((r) => r.isEnabled),
    [storeSettings.delivery.regions]
  );

  // Detect PASSWORD_RECOVERY event or unconfirmed session on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        if (session.user.email_confirmed_at) {
          syncVerifiedCustomerFromAuthUser(session.user);
        } else {
          setPendingEmail(session.user.email || '');
          setAuthMode('verify_pending');
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthError('');
        setAuthFeedback('');
        setAuthMode('update_password');
      } else if (
        (event === 'SIGNED_IN' || event === 'USER_UPDATED') &&
        session?.user
      ) {
        if (session.user.email_confirmed_at) {
          syncVerifiedCustomerFromAuthUser(session.user);
        } else {
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
    if (currentCustomer?.emailVerified && safeRedirectPath) {
      navigate(safeRedirectPath, { replace: true });
    }
  }, [currentCustomer, navigate, safeRedirectPath]);

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
        setAuthError(error.message);
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
    if (!isValidTelegramUsername(authTelegram)) {
      setAuthError(t('cart.telegramInvalidError'));
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthError(t('account.unconfiguredNoticeDesc'));
      return;
    }

    const normalizedTg = normalizeTelegramUsername(authTelegram);

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
            telegram_username: normalizedTg || null,
          },
        },
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      // Always require email confirmation before treating the account as verified
      if (data.user && data.user.email_confirmed_at) {
        await syncVerifiedCustomerFromAuthUser(data.user);
      } else {
        setPendingEmail(cleanEmail);
        setAuthMode('verify_pending');
      }
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
        setAuthError(error.message);
        return;
      }

      setAuthFeedback(t('account.resendSuccess'));
      addToast({
        type: 'success',
        title: t('account.resendSuccess'),
      });
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
          'Email tasdiqlangan boʻlsa, parolingiz bilan tizimga kiring.'
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
        redirectTo: `${window.location.origin}/account`,
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      setAuthFeedback(t('account.resetSentSuccess'));
      addToast({
        type: 'info',
        title: t('account.resetSentSuccess'),
      });
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
        setAuthError(error.message);
        return;
      }

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

  const handleSaveProfile = (e: React.FormEvent) => {
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

    updateCustomerProfile({
      fullName: profileName.trim(),
      phone: profilePhone.trim(),
      telegramUsername: normalizeTelegramUsername(profileTelegram),
    });
  };

  const handleOpenAddressModal = (address?: CustomerAddress) => {
    if (address) {
      setEditingAddressId(address.id);
      setAddrTitle(address.title);
      setAddrRegion(address.region);
      setAddrLine(address.addressLine);
      setAddrDefault(address.isDefault);
    } else {
      setEditingAddressId(null);
      setAddrTitle('');
      setAddrRegion(enabledRegions[0]?.regionName || 'Toshkent shahri');
      setAddrLine('');
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
              addressLine: addrLine.trim(),
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
        addressLine: addrLine.trim(),
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
  if (!currentCustomer || !currentCustomer.emailVerified) {
    return (
      <div className="zaven-page-container py-6 sm:py-12">
        <div className="max-w-xl mx-auto bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
          {/* Top Header */}
          <div className="bg-[#0F3D2E] text-white p-5 sm:p-6 space-y-2">
            <Badge variant="gold" size="sm">
              {t('account.emailAuthBadge')}
            </Badge>
            <h1 className="text-lg sm:text-2xl font-extrabold text-white">
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
            <p className="text-xs text-emerald-100/90 leading-relaxed">
              {authMode === 'signup'
                ? t('account.signUpSub')
                : authMode === 'reset'
                ? t('account.resetSub')
                : authMode === 'verify_pending'
                ? t('account.verifyPendingDesc')
                : t('account.signInSub')}
            </p>
          </div>

          <div className="p-5 sm:p-6 space-y-5">
            {safeRedirectPath && (
              <div className="p-3.5 rounded-xl bg-brand-green-light/70 dark:bg-[#162923] border border-brand-green/30 flex items-start gap-2.5 text-xs font-semibold text-brand-green">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('account.checkoutRedirectNotice')}</span>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            {authMode !== 'verify_pending' &&
              authMode !== 'update_password' && (
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
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
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('reset');
                      setAuthError('');
                      setAuthFeedback('');
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold transition-colors ${
                      authMode === 'reset'
                        ? 'bg-[#0F3D2E] text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                    }`}
                  >
                    {t('account.resetTab')}
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
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs font-semibold text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            {authFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs font-semibold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authFeedback}</span>
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
                  type="password"
                  autoComplete="current-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<KeyRound className="w-4 h-4" />}
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
                  label={t('cart.telegramOptional')}
                  value={authTelegram}
                  onChange={(e) => setAuthTelegram(e.target.value)}
                  placeholder={t('cart.telegramPlaceholder')}
                  leftIcon={<Send className="w-4 h-4" />}
                />

                <Input
                  label={t('account.passwordLabel')}
                  required
                  type="password"
                  autoComplete="new-password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<KeyRound className="w-4 h-4" />}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isAuthSubmitting}
                  leftIcon={<Mail className="w-4 h-4 text-[#C89D54]" />}
                >
                  {t('account.signUpBtn')}
                </Button>
              </form>
            )}

            {/* VIEW C: PASSWORD RESET REQUEST */}
            {authMode === 'reset' && (
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
            )}

            {/* VIEW D: UPDATE PASSWORD AFTER CLICKING RECOVERY LINK */}
            {authMode === 'update_password' && (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <Input
                  label={t('account.newPasswordLabel')}
                  required
                  type="password"
                  autoComplete="new-password"
                  value={authNewPassword}
                  onChange={(e) => setAuthNewPassword(e.target.value)}
                  placeholder="••••••••"
                  leftIcon={<KeyRound className="w-4 h-4" />}
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
              </form>
            )}

            {/* VIEW E: EMAIL VERIFICATION PENDING SCREEN */}
            {authMode === 'verify_pending' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-bold text-brand-green">
                    <Mail className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {pendingEmail || authEmail}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                    {t('account.verifyPendingDesc')}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
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

                <div className="pt-2 border-t border-gray-100 dark:border-[#28453B] flex items-center justify-between text-xs">
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
                  <button
                    type="button"
                    onClick={signOutCustomer}
                    className="text-gray-500 hover:underline"
                  >
                    {t('account.signOut')}
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
  const totalCustomerSpent = customerOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

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
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-surface-page border border-gray-200 text-xs">
            <span className="text-gray-500 block">
              {t('account.totalSpent')}
            </span>
            <strong className="text-sm font-extrabold text-brand-green">
              {formatUZS(totalCustomerSpent)}
            </strong>
          </div>
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

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
              activeTab === 'profile'
                ? 'bg-[#0F3D2E] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4" />
              <span>{t('account.profileInfo')}</span>
            </div>
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
                            #{order.orderNumber}
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
                  variant="primary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => handleOpenAddressModal()}
                >
                  +
                </Button>
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

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card">
              <form
                onSubmit={handleSaveProfile}
                className="max-w-lg space-y-4"
              >
                {profileError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
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

                <Button type="submit" variant="primary" size="md">
                  {t('account.saveChanges')}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Address Modal */}
      <Modal
        isOpen={isAddressModalOpen}
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
            label="Title"
            required
            value={addrTitle}
            onChange={(e) => setAddrTitle(e.target.value)}
          />
          <Select
            label={t('cart.region')}
            required
            value={addrRegion}
            onChange={(e) => setAddrRegion(e.target.value)}
            options={enabledRegions.map((r) => ({
              value: r.regionName,
              label: r.regionName,
            }))}
          />
          <Input
            label={t('cart.address')}
            required
            value={addrLine}
            onChange={(e) => setAddrLine(e.target.value)}
          />
        </form>
      </Modal>

      {/* Structured Order Details Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={
          selectedOrder
            ? `${t('cart.orderNumberLabel')}: #${selectedOrder.orderNumber}`
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
                  #{selectedOrder.orderNumber}
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
