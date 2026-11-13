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
  Eye,
  RotateCcw,
  Mail,
  ChevronRight,
  Clock,
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

        <div className="lg:col-span-9">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {customerOrders.length > 0 ? (
                customerOrders.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status];
                  return (
                    <div
                      key={order.id}
                      className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card"
                    >
                      <div className="px-4 py-3.5 sm:px-5 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-brand-green">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateUz(order.createdAt, true)}
                          </span>
                          <Badge variant={statusMeta.badgeVariant} size="md">
                            {statusMeta.label}
                          </Badge>

                          {order.paymentVerificationStatus ===
                            'pending_verification' && (
                            <Badge variant="warning" size="md">
                              <Clock className="w-3.5 h-3.5 mr-1" />
                              {t('transfer.statusPending')}
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'verified' && (
                            <Badge variant="success" size="md">
                              {t('transfer.statusVerified')}
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'rejected' && (
                            <Badge variant="danger" size="md">
                              {t('transfer.statusRejected')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-base font-extrabold text-gray-900">
                          {formatUZS(order.totalAmount)}
                        </span>
                      </div>

                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {order.items.map((item) => (
                            <img
                              key={item.productId}
                              src={item.image}
                              alt={item.productName}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2.5">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Eye className="w-4 h-4" />}
                            onClick={() => setSelectedOrder(order)}
                          >
                            {t('product.quickView')}
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RotateCcw className="w-4 h-4" />}
                            onClick={() => handleReorder(order)}
                          >
                            {t('product.addToCart')}
                          </Button>
                        </div>
                      </div>
                    </div>
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
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddressModalOpen(false)}
            >
              {t('footer.cancelBtn')}
            </Button>
            <Button
              type="submit"
              form="customer-address-form"
              variant="primary"
              size="sm"
            >
              {t('account.saveChanges')}
            </Button>
          </>
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

      {/* Order Details Modal */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        title={selectedOrder ? `#${selectedOrder.orderNumber}` : ''}
        maxWidth="xl"
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedOrder(null)}
          >
            {t('product.close')}
          </Button>
        }
      >
        {selectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm">
            {selectedOrder.paymentVerificationStatus ===
              'pending_verification' && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold">
                {t('transfer.statusPending')} — {t('transfer.pendingNotice')}
              </div>
            )}

            {selectedOrder.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between py-2 border-b border-gray-100"
              >
                <span>
                  {item.productName} ({item.quantity} ×{' '}
                  {formatUZS(item.unitPrice)})
                </span>
                <strong className="text-brand-green">
                  {formatUZS(item.totalPrice)}
                </strong>
              </div>
            ))}
            <div className="flex justify-between font-extrabold text-base pt-2">
              <span>{t('cart.totalAmount')}</span>
              <span className="text-brand-green">
                {formatUZS(selectedOrder.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
