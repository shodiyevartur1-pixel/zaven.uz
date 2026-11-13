import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { CustomerAddress, Order, OrderStatus } from '../../types';
import {
  formatUZS,
  formatUzbekPhone,
  isValidUzbekPhone,
  formatDateUz,
} from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

type AccountTab = 'orders' | 'addresses' | 'profile';

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
  const {
    currentCustomer,
    customers,
    orders,
    products,
    storeSettings,
    signInCustomerDemo,
    signOutCustomer,
    updateCustomerProfile,
    addToCart,
  } = useStore();
  const { t } = useThemeLanguage();

  const [activeTab, setActiveTab] = useState<AccountTab>('orders');

  const [authPhone, setAuthPhone] = useState<string>('+998 90 912-34-56');
  const [authFullName, setAuthFullName] = useState<string>('');
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState<string>('1234');
  const [authError, setAuthError] = useState<string>('');

  const [profileName, setProfileName] = useState<string>('');
  const [profileEmail, setProfileEmail] = useState<string>('');

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

  useEffect(() => {
    if (currentCustomer) {
      setProfileName(currentCustomer.fullName);
      setProfileEmail(currentCustomer.email || '');
    }
  }, [currentCustomer]);

  const matchedExistingCustomer = useMemo(() => {
    const cleanInput = authPhone.replace(/\D/g, '');
    return customers.find((c) => c.phone.replace(/\D/g, '') === cleanInput);
  }, [authPhone, customers]);

  const customerOrders = useMemo(() => {
    if (!currentCustomer) return [];
    const cleanCustomerPhone = currentCustomer.phone.replace(/\D/g, '');
    return orders
      .filter(
        (o) =>
          o.customerId === currentCustomer.id ||
          o.customerPhone.replace(/\D/g, '') === cleanCustomerPhone
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [currentCustomer, orders]);

  const handleRequestDemoOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (!isValidUzbekPhone(authPhone)) {
      setAuthError('+998 XX XXX-XX-XX');
      return;
    }
    setOtpCode('1234');
    setAuthStep('otp');
  };

  const handleVerifyDemoOtp = (e: React.FormEvent) => {
    e.preventDefault();
    signInCustomerDemo(
      authPhone,
      matchedExistingCustomer
        ? matchedExistingCustomer.fullName
        : authFullName || 'Xaridor'
    );
    setAuthStep('phone');
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (profileName.trim().length < 2) return;
    updateCustomerProfile({
      fullName: profileName.trim(),
      email: profileEmail.trim() || undefined,
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

  if (!currentCustomer) {
    return (
      <div className="zaven-page-container py-6 sm:py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
          <div className="lg:col-span-7 p-5 sm:p-8 space-y-6">
            <div>
              <Badge variant="gold" size="sm">
                {t('account.demoBadge')}
              </Badge>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 mt-2">
                {t('account.signInTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                {t('account.signInSub')}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">{t('account.demoSmsNoticeTitle')}</p>
                <p className="mt-0.5 text-amber-800">
                  {t('account.demoSmsNoticeDesc')}
                </p>
              </div>
            </div>

            {authStep === 'phone' ? (
              <form onSubmit={handleRequestDemoOtp} className="space-y-4">
                <Input
                  label={t('cart.phone')}
                  required
                  type="tel"
                  value={authPhone}
                  onChange={(e) =>
                    setAuthPhone(formatUzbekPhone(e.target.value))
                  }
                  leftIcon={<Phone className="w-4 h-4" />}
                  error={authError}
                />

                {!matchedExistingCustomer && (
                  <Input
                    label={t('cart.fullName')}
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    leftIcon={<User className="w-4 h-4" />}
                  />
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  {t('account.getOtpBtn')}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyDemoOtp} className="space-y-4">
                <Input
                  label="SMS Code (Demo: 1234)"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) =>
                    setOtpCode(e.target.value.replace(/\D/g, ''))
                  }
                  leftIcon={<KeyRound className="w-4 h-4" />}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  fullWidth
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  {t('account.verifyAndSignIn')}
                </Button>
              </form>
            )}
          </div>

          <div className="lg:col-span-5 bg-[#0F3D2E] text-white p-5 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[#C89D54] font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4" />
                <span>Demo Profiles</span>
              </div>
              <div className="space-y-2.5 pt-1">
                {customers.slice(0, 3).map((demoCust) => (
                  <button
                    key={demoCust.id}
                    type="button"
                    onClick={() =>
                      signInCustomerDemo(demoCust.phone, demoCust.fullName)
                    }
                    className="w-full text-left p-3 rounded-xl bg-[#09261C]/80 hover:bg-[#C89D54] hover:text-[#09261C] border border-emerald-700/80 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-[#09261C]">
                        {demoCust.fullName}
                      </p>
                      <p className="text-[11px] text-emerald-200 group-hover:text-[#09261C]/80">
                        {demoCust.phone}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C89D54] group-hover:text-[#09261C] shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalCustomerSpent = customerOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="zaven-page-container py-5 sm:py-8 space-y-6 sm:space-y-8">
      {/* Customer Header Card */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#0F3D2E] text-[#C89D54] flex items-center justify-center font-extrabold text-xl shrink-0">
            {currentCustomer.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900">
              {currentCustomer.fullName}
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">
              {currentCustomer.phone}
            </p>
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

        {/* Tappable Order Cards (No redundant count strip) */}
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
                <Input
                  label={t('cart.fullName')}
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  leftIcon={<User className="w-4 h-4" />}
                />
                <Input
                  label={t('cart.phone')}
                  value={currentCustomer.phone}
                  disabled
                  leftIcon={<Phone className="w-4 h-4" />}
                />
                <Input
                  label="Email"
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  leftIcon={<Mail className="w-4 h-4" />}
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

      {/* ===================================================================== */}
      {/* STRUCTURED ORDER DETAILS MODAL (Distinct Readable Sections)           */}
      {/* ===================================================================== */}
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
