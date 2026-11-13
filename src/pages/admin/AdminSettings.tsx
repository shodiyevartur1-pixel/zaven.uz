import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  TicketPercent,
  Image,
  Truck,
  CreditCard,
  Shield,
  Settings,
  Plus,
  Edit3,
  Trash2,
  Lock,
  Globe,
  Instagram,
  Phone,
  MapPin,
  Clock,
  Upload,
  Database,
  Send,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import {
  BankTransferConfig,
  Coupon,
  DeliveryRegionRule,
  HomepageBanner,
  PaymentMethodOption,
  StoreSettings,
  TrustItem,
} from '../../types';
import { formatUZS, formatUzbekPhone } from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export type AdminSettingsSection =
  | 'coupons'
  | 'banners'
  | 'delivery'
  | 'payments'
  | 'roles'
  | 'settings';

interface AdminSettingsProps {
  initialSection?: AdminSettingsSection;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  initialSection = 'coupons',
}) => {
  const {
    coupons,
    banners,
    storeSettings,
    saveCoupon,
    deleteCoupon,
    saveBanner,
    updateStoreSettings,
    addToast,
  } = useStore();
  const { ownerEmail, authMode, isSupabaseReady } = useOwnerAuth();

  const [activeSection, setActiveSection] =
    useState<AdminSettingsSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  // 1. Coupons state
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [couponFormError, setCouponFormError] = useState<string>('');
  const [couponToDelete, setCouponToDelete] = useState<Coupon | null>(null);

  const handleOpenCouponModal = (coupon?: Coupon) => {
    setCouponFormError('');
    if (coupon) {
      setEditingCoupon({ ...coupon });
    } else {
      setEditingCoupon({
        id: `coup-${Date.now()}`,
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 150000,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        usageLimit: 100,
        usedCount: 0,
        isActive: true,
      });
    }
    setIsCouponModalOpen(true);
  };

  const handleSaveCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCoupon) return;

    const cleanCode = editingCoupon.code
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
    if (cleanCode.length < 3) {
      setCouponFormError(
        'Kupon kodi kamida 3 ta harf/raqamdan iborat boʻlishi zarur'
      );
      return;
    }

    saveCoupon({
      ...editingCoupon,
      code: cleanCode,
      description:
        editingCoupon.description.trim() ||
        `${cleanCode} promokodi orqali maxsus chegirma`,
    });
    setIsCouponModalOpen(false);
  };

  // 2. Banners & Trust Items state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(
    null
  );
  const [trustItemsDraft, setTrustItemsDraft] = useState<TrustItem[]>(
    storeSettings.trustItems
  );

  useEffect(() => {
    setTrustItemsDraft(storeSettings.trustItems);
  }, [storeSettings.trustItems]);

  const handleOpenBannerModal = (banner?: HomepageBanner) => {
    if (banner) {
      setEditingBanner({ ...banner });
    } else {
      setEditingBanner({
        id: `banner-${Date.now()}`,
        badgeText: 'MAXSUS TAKLIF',
        headline: '',
        subheadline: '',
        offerText: '',
        ctaText: 'Xaridni boshlash',
        ctaLink: '/catalog',
        image:
          'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=1200&q=80',
        isActive: true,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      });
    }
    setIsBannerModalOpen(true);
  };

  const handleBannerImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingBanner) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingBanner((prev) =>
          prev ? { ...prev, image: reader.result as string } : prev
        );
        addToast({ type: 'success', title: 'Banner rasmi yuklandi' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveBannerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || editingBanner.headline.trim().length < 3) return;
    saveBanner({
      ...editingBanner,
      headline: editingBanner.headline.trim(),
      subheadline: editingBanner.subheadline.trim(),
      offerText: editingBanner.offerText.trim(),
      ctaText: editingBanner.ctaText.trim() || 'Xaridni boshlash',
    });
    setIsBannerModalOpen(false);
  };

  const handleSaveTrustItems = () => {
    updateStoreSettings({
      ...storeSettings,
      trustItems: trustItemsDraft,
    });
  };

  // 3. Delivery Settings state
  const [deliveryDraft, setDeliveryDraft] = useState(storeSettings.delivery);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState<boolean>(false);
  const [editingRegion, setEditingRegion] = useState<DeliveryRegionRule | null>(
    null
  );

  useEffect(() => {
    setDeliveryDraft(storeSettings.delivery);
  }, [storeSettings.delivery]);

  const handleSaveDeliverySettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings({
      ...storeSettings,
      delivery: deliveryDraft,
    });
  };

  const handleOpenRegionModal = (region?: DeliveryRegionRule) => {
    if (region) {
      setEditingRegion({ ...region });
    } else {
      setEditingRegion({
        id: `reg-${Date.now()}`,
        regionName: '',
        fee: 35000,
        freeDeliveryThreshold: 500000,
        note: 'Taxminiy yetkazib berish muddati: Taxminan 10–25 kun.',
        isEnabled: true,
      });
    }
    setIsRegionModalOpen(true);
  };

  const handleSaveRegionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRegion || editingRegion.regionName.trim().length < 2) return;

    const exists = deliveryDraft.regions.some((r) => r.id === editingRegion.id);
    const updatedRegions = exists
      ? deliveryDraft.regions.map((r) =>
          r.id === editingRegion.id ? editingRegion : r
        )
      : [...deliveryDraft.regions, editingRegion];

    const nextDelivery = {
      ...deliveryDraft,
      regions: updatedRegions,
    };
    setDeliveryDraft(nextDelivery);
    updateStoreSettings({
      ...storeSettings,
      delivery: nextDelivery,
    });
    setIsRegionModalOpen(false);
  };

  const handleDeleteRegion = (regionId: string) => {
    const nextDelivery = {
      ...deliveryDraft,
      regions: deliveryDraft.regions.filter((r) => r.id !== regionId),
    };
    setDeliveryDraft(nextDelivery);
    updateStoreSettings({
      ...storeSettings,
      delivery: nextDelivery,
    });
  };

  // ===========================================================================
  // 4. REQUIREMENT 3: FULL PAYMENT METHODS CRUD (Add, Edit, Enable/Disable, Remove)
  // ===========================================================================
  const [paymentsDraft, setPaymentsDraft] = useState<PaymentMethodOption[]>(
    storeSettings.paymentMethods
  );
  const [bankTransferDraft, setBankTransferDraft] =
    useState<BankTransferConfig>(storeSettings.bankTransfer);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<PaymentMethodOption | null>(null);
  const [paymentModalError, setPaymentModalError] = useState<string>('');
  const [paymentToDelete, setPaymentToDelete] =
    useState<PaymentMethodOption | null>(null);

  useEffect(() => {
    setPaymentsDraft(storeSettings.paymentMethods);
    setBankTransferDraft(storeSettings.bankTransfer);
  }, [storeSettings.paymentMethods, storeSettings.bankTransfer]);

  const handleSavePaymentSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentsDraft.some((pm) => pm.isEnabled)) {
      addToast({
        type: 'error',
        title: 'Kamida bitta toʻlov usuli faol boʻlishi shart',
      });
      return;
    }
    updateStoreSettings({
      ...storeSettings,
      paymentMethods: paymentsDraft,
      bankTransfer: bankTransferDraft,
    });
  };

  // Toggle Enable/Disable on a Payment Method and Persist Immediately
  const handleTogglePaymentMethodEnabled = (pmId: string) => {
    const target = paymentsDraft.find((pm) => pm.id === pmId);
    if (!target) return;

    const nextEnabled = !target.isEnabled;
    const enabledCountAfter = paymentsDraft.filter((pm) =>
      pm.id === pmId ? nextEnabled : pm.isEnabled
    ).length;

    if (enabledCountAfter === 0) {
      addToast({
        type: 'error',
        title: 'Kamida bitta toʻlov usuli faol qolishi shart',
      });
      return;
    }

    const updatedList = paymentsDraft.map((pm) =>
      pm.id === pmId ? { ...pm, isEnabled: nextEnabled } : pm
    );
    setPaymentsDraft(updatedList);
    updateStoreSettings({
      ...storeSettings,
      paymentMethods: updatedList,
      bankTransfer: bankTransferDraft,
    });
  };

  // Open Modal to Add or Edit a Payment Method
  const handleOpenPaymentModal = (pm?: PaymentMethodOption) => {
    setPaymentModalError('');
    if (pm) {
      setEditingPaymentMethod({
        ...pm,
        requiresReceipt:
          pm.requiresReceipt !== undefined
            ? pm.requiresReceipt
            : pm.type === 'card_transfer',
      });
    } else {
      setEditingPaymentMethod({
        id: `pay-${Date.now()}`,
        name: '',
        description: '',
        type: 'card_transfer',
        requiresReceipt: true,
        isEnabled: true,
        isDemoMode: false,
        configurationNote: 'Doʻkon egasi tomonidan qoʻshilgan toʻlov usuli.',
      });
    }
    setIsPaymentModalOpen(true);
  };

  // Save Added or Edited Payment Method and Persist Immediately
  const handleSavePaymentModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentMethod) return;

    if (editingPaymentMethod.name.trim().length < 2) {
      setPaymentModalError('Toʻlov usuli nomini kiriting');
      return;
    }

    const normalizedMethod: PaymentMethodOption = {
      ...editingPaymentMethod,
      name: editingPaymentMethod.name.trim(),
      description:
        editingPaymentMethod.description.trim() ||
        editingPaymentMethod.name.trim(),
      requiresReceipt: Boolean(editingPaymentMethod.requiresReceipt),
    };

    const exists = paymentsDraft.some((p) => p.id === normalizedMethod.id);
    const updatedList = exists
      ? paymentsDraft.map((p) =>
          p.id === normalizedMethod.id ? normalizedMethod : p
        )
      : [...paymentsDraft, normalizedMethod];

    if (!updatedList.some((p) => p.isEnabled)) {
      setPaymentModalError('Kamida bitta toʻlov usuli faol boʻlishi shart');
      return;
    }

    setPaymentsDraft(updatedList);
    updateStoreSettings({
      ...storeSettings,
      paymentMethods: updatedList,
      bankTransfer: bankTransferDraft,
    });
    setIsPaymentModalOpen(false);
  };

  // Delete Payment Method with Confirmation (Never corrupts historical orders)
  const handleConfirmDeletePaymentMethod = () => {
    if (!paymentToDelete) return;
    const remaining = paymentsDraft.filter(
      (pm) => pm.id !== paymentToDelete.id
    );
    if (!remaining.some((pm) => pm.isEnabled)) {
      addToast({
        type: 'error',
        title: 'Yagona faol toʻlov usulini oʻchirib boʻlmaydi',
      });
      setPaymentToDelete(null);
      return;
    }

    setPaymentsDraft(remaining);
    updateStoreSettings({
      ...storeSettings,
      paymentMethods: remaining,
      bankTransfer: bankTransferDraft,
    });
    setPaymentToDelete(null);
  };

  // 5. General & SEO Settings state
  const [generalDraft, setGeneralDraft] = useState<StoreSettings>(storeSettings);

  useEffect(() => {
    setGeneralDraft(storeSettings);
  }, [storeSettings]);

  const handleSaveGeneralSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateStoreSettings(generalDraft);
    document.title = generalDraft.seoTitle || generalDraft.storeName;
  };

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
            Aksiyalar, Kontent, Yetkazib berish, Toʻlov va Owner Xavfsizligi
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Humo / Uzcard qabul qiluvchi rekvizitlari, toʻlov usullari boshqaruvi, promokodlar va bannerlar
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-surface-page p-1.5 rounded-xl border border-gray-200">
          {[
            {
              id: 'coupons',
              path: '/admin/coupons',
              label: 'Kuponlar',
              icon: <TicketPercent className="w-3.5 h-3.5" />,
            },
            {
              id: 'banners',
              path: '/admin/banners',
              label: 'Banner va Kontent',
              icon: <Image className="w-3.5 h-3.5" />,
            },
            {
              id: 'delivery',
              path: '/admin/delivery',
              label: 'Yetkazib berish',
              icon: <Truck className="w-3.5 h-3.5" />,
            },
            {
              id: 'payments',
              path: '/admin/payments',
              label: 'Toʻlov va Karta',
              icon: <CreditCard className="w-3.5 h-3.5" />,
            },
            {
              id: 'roles',
              path: '/admin/roles',
              label: 'Owner Xavfsizligi',
              icon: <Shield className="w-3.5 h-3.5" />,
            },
            {
              id: 'settings',
              path: '/admin/settings',
              label: 'Doʻkon va SEO',
              icon: <Settings className="w-3.5 h-3.5" />,
            },
          ].map((tab) => (
            <Link
              key={tab.id}
              to={tab.path}
              onClick={() =>
                setActiveSection(tab.id as AdminSettingsSection)
              }
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                activeSection === tab.id
                  ? 'bg-[#0F3D2E] text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* SECTION 1: COUPONS */}
      {activeSection === 'coupons' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">
              Promokodlar va kuponlar boshqaruvi
            </h2>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenCouponModal()}
            >
              Yangi kupon yaratish
            </Button>
          </div>

          {coupons.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <span className="px-3 py-1 rounded-lg bg-[#0F3D2E] text-[#C89D54] font-mono font-extrabold text-sm">
                        {coupon.code}
                      </span>
                      <span className="text-sm font-extrabold text-brand-green">
                        {coupon.discountType === 'percentage'
                          ? `-${coupon.discountValue}%`
                          : `-${formatUZS(coupon.discountValue)}`}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800">
                      {coupon.description}
                    </p>
                  </div>
                  <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCouponModal(coupon)}
                    >
                      Tahrirlash
                    </Button>
                    <button
                      type="button"
                      onClick={() => setCouponToDelete(coupon)}
                      className="p-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Faol kuponlar yoʻq"
              description=""
              actionLabel="Yaratish"
              onAction={() => handleOpenCouponModal()}
            />
          )}
        </div>
      )}

      {/* SECTION 2: BANNERS */}
      {activeSection === 'banners' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-card flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900">
              Bosh sahifa promo-bannerlari
            </h2>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => handleOpenBannerModal()}
            >
              Yangi banner
            </Button>
          </div>

          {banners.map((banner) => (
            <div
              key={banner.id}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card grid grid-cols-1 lg:grid-cols-12"
            >
              <div className="lg:col-span-4 h-48 lg:h-auto bg-gray-100">
                <img
                  src={banner.image}
                  alt={banner.headline}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="lg:col-span-8 p-5 flex flex-col justify-between">
                <div>
                  <Badge variant="gold" size="sm">
                    {banner.badgeText}
                  </Badge>
                  <h3 className="text-lg font-extrabold text-gray-900 mt-1">
                    {banner.headline}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    {banner.subheadline}
                  </p>
                </div>
                <div className="pt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenBannerModal(banner)}
                  >
                    Tahrirlash
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
                Ishonch bloklari (Trust Badges)
              </h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveTrustItems}
              >
                Saqlash
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trustItemsDraft.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-3"
                >
                  <Input
                    label="Sarlavha"
                    value={item.title}
                    onChange={(e) => {
                      const next = [...trustItemsDraft];
                      next[idx] = { ...item, title: e.target.value };
                      setTrustItemsDraft(next);
                    }}
                  />
                  <Input
                    label="Izoh"
                    value={item.description}
                    onChange={(e) => {
                      const next = [...trustItemsDraft];
                      next[idx] = { ...item, description: e.target.value };
                      setTrustItemsDraft(next);
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* SECTION 3: DELIVERY SETTINGS */}
      {activeSection === 'delivery' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveDeliverySettings}
            className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-5"
          >
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-extrabold text-gray-900">
                Yetkazib berish qoidalari (Taxminan 10–25 kun)
              </h2>
              <Button type="submit" variant="primary" size="sm">
                Saqlash
              </Button>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1.5">
                Umumiy yetkazib berish eslatmasi
              </label>
              <textarea
                rows={2}
                value={deliveryDraft.generalDeliveryNote}
                onChange={(e) =>
                  setDeliveryDraft({
                    ...deliveryDraft,
                    generalDeliveryNote: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-extrabold text-gray-900">
                Hududiy tariflar
              </h3>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenRegionModal()}
              >
                Hudud qoʻshish
              </Button>
            </div>
            <div className="divide-y divide-gray-200">
              {deliveryDraft.regions.map((region) => (
                <div
                  key={region.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-sm font-extrabold text-gray-900">
                      {region.regionName}
                    </span>
                    <p className="text-xs text-gray-600">{region.note}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-extrabold text-brand-green">
                      {formatUZS(region.fee)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenRegionModal(region)}
                    >
                      Tahrirlash
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRegion(region.id)}
                      className="p-2 text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 4: PAYMENT METHODS CRUD & HUMO/UZCARD RECIPIENT SETTINGS       */}
      {/* ===================================================================== */}
      {activeSection === 'payments' && (
        <div className="space-y-6">
          {/* Header & Add New Payment Method Button */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Toʻlov Usullari va Humo / Uzcard Karta Sozlamalari
              </h2>
              <p className="text-xs text-gray-600 mt-0.5">
                Yangi toʻlov usuli qoʻshish, tahrirlash, yoqish/oʻchirish va oʻchirish. Faqat faol usullar rasmiylashtirishda koʻrinadi.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenPaymentModal()}
              >
                Yangi toʻlov usuli qoʻshish
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSavePaymentSettings}
              >
                Barcha oʻzgarishlarni saqlash
              </Button>
            </div>
          </div>

          {/* Payment Methods List (Add, Edit, Enable/Disable, Remove) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {paymentsDraft.map((pm) => {
              const requiresReceipt =
                pm.requiresReceipt !== undefined
                  ? pm.requiresReceipt
                  : pm.type === 'card_transfer';

              return (
                <div
                  key={pm.id}
                  className={`bg-white rounded-2xl border-2 p-5 shadow-card flex flex-col justify-between gap-4 transition-all ${
                    pm.isEnabled
                      ? 'border-brand-green/60'
                      : 'border-gray-200 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base font-extrabold text-gray-900">
                          {pm.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={pm.isEnabled ? 'success' : 'neutral'}
                            size="sm"
                          >
                            {pm.isEnabled ? 'Faol (Checkoutda koʻrinadi)' : 'Oʻchirilgan'}
                          </Badge>
                          {requiresReceipt ? (
                            <Badge variant="gold" size="sm">
                              Chek yuklash majburiy
                            </Badge>
                          ) : (
                            <Badge variant="info" size="sm">
                              Chek talab qilinmaydi
                            </Badge>
                          )}
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800 shrink-0">
                        <input
                          type="checkbox"
                          checked={pm.isEnabled}
                          onChange={() =>
                            handleTogglePaymentMethodEnabled(pm.id)
                          }
                          className="w-5 h-5 rounded text-brand-green"
                        />
                        <span>{pm.isEnabled ? 'Yoqilgan' : 'Oʻchiq'}</span>
                      </label>
                    </div>

                    <p className="text-xs text-gray-600 leading-relaxed">
                      {pm.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-gray-400">
                      ID: {pm.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenPaymentModal(pm)}
                      >
                        Tahrirlash
                      </Button>
                      <button
                        type="button"
                        onClick={() => setPaymentToDelete(pm)}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title="Toʻlov usulini oʻchirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Protected Owner Humo & Uzcard Recipient Configuration Box */}
          <form
            onSubmit={handleSavePaymentSettings}
            className="bg-white rounded-2xl border-2 border-[#C89D54] p-5 sm:p-6 shadow-card space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-brand-green" />
                <h3 className="text-base font-extrabold text-gray-900">
                  Oʻtkazma uchun Humo va Uzcard karta rekvizitlari (Owner tomonidan kiritiladi)
                </h3>
              </div>
              <Button type="submit" variant="primary" size="sm">
                Rekvizitlarni saqlash
              </Button>
            </div>

            <p className="text-xs text-gray-600">
              Hech qachon karta PIN-kodi, CVV yoki bank parollarini kiritmang. Bu yerda faqat xaridorga koʻrinadigan qabul qiluvchi karta raqami va F.I.Sh. saqlanadi.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="HUMO karta raqami (16 ta raqam)"
                value={bankTransferDraft.humoCardNumber}
                onChange={(e) =>
                  setBankTransferDraft({
                    ...bankTransferDraft,
                    humoCardNumber: e.target.value,
                  })
                }
                placeholder="9860 •••• •••• ••••"
              />

              <Input
                label="HUMO karta egasi F.I.Sh."
                value={bankTransferDraft.humoCardHolder}
                onChange={(e) =>
                  setBankTransferDraft({
                    ...bankTransferDraft,
                    humoCardHolder: e.target.value,
                  })
                }
                placeholder="Masalan: SHODIYEV ARTUR"
              />

              <Input
                label="UZCARD karta raqami (16 ta raqam)"
                value={bankTransferDraft.uzcardCardNumber}
                onChange={(e) =>
                  setBankTransferDraft({
                    ...bankTransferDraft,
                    uzcardCardNumber: e.target.value,
                  })
                }
                placeholder="8600 •••• •••• ••••"
              />

              <Input
                label="UZCARD karta egasi F.I.Sh."
                value={bankTransferDraft.uzcardCardHolder}
                onChange={(e) =>
                  setBankTransferDraft({
                    ...bankTransferDraft,
                    uzcardCardHolder: e.target.value,
                  })
                }
                placeholder="Masalan: SHODIYEV ARTUR"
              />

              <Input
                label="Bank nomi (ixtiyoriy)"
                value={bankTransferDraft.bankName}
                onChange={(e) =>
                  setBankTransferDraft({
                    ...bankTransferDraft,
                    bankName: e.target.value,
                  })
                }
                placeholder="Masalan: Kapitalbank"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                Xaridorga koʻrinadigan oʻtkazma yoʻriqnomasi
              </label>
              <textarea
                rows={2}
                value={bankTransferDraft.transferInstructions}
                onChange={(e) =>
                  setBankTransferDraft({
                    ...bankTransferDraft,
                    transferInstructions: e.target.value,
                  })
                }
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm"
              />
            </div>
          </form>

          {/* Server-Side Telegram Bot Configuration Status Notice */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card space-y-2 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-gray-900 text-sm">
              <Send className="w-4 h-4 text-brand-green" />
              <span>
                Telegram Bot Server-Side Xabarnomalar (`submit-order-receipt` Edge Function)
              </span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Xavfsizlik qoidasiga koʻra <code>Telegram bot kaliti</code> va{' '}
              <code>admin chat raqami</code> hech qachon brauzer kodida saqlanmaydi. Ularni Supabase Edge Function Secrets muhitiga kiriting.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 5: SINGLE-OWNER SECURITY */}
      {activeSection === 'roles' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-gray-900">
                Yagona Doʻkon Egasi (Single-Owner) Xavfsizlik Arxitekturasi
              </h2>
            </div>
            <Badge
              variant={authMode === 'supabase' ? 'success' : 'gold'}
              size="md"
            >
              Session: {authMode.toUpperCase()}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-green">
                <Shield className="w-4 h-4" />
                <span>Tasdiqlangan Owner hisobi</span>
              </div>
              <p className="text-sm font-extrabold text-gray-900">
                {ownerEmail || '—'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-green">
                <Database className="w-4 h-4" />
                <span>Supabase Auth & Private Storage</span>
              </div>
              <p className="text-sm font-extrabold text-gray-900">
                {isSupabaseReady
                  ? 'Ulangan va faol'
                  : '.env.local konfiguratsiyasi kutilmoqda'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-brand-green">
                <Lock className="w-4 h-4" />
                <span>Server-Side Edge Functions</span>
              </div>
              <p className="text-sm font-extrabold text-gray-900">
                admin-owner-guard + submit-order-receipt
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: GENERAL STORE & SEO */}
      {activeSection === 'settings' && (
        <form onSubmit={handleSaveGeneralSettings} className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-lg font-extrabold text-gray-900">
                Doʻkon aloqa maʼlumotlari, Instagram va SEO sozlamalari
              </h2>
              <Button type="submit" variant="primary" size="sm">
                Sozlamalarni saqlash
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Doʻkon brend nomi"
                required
                value={generalDraft.storeName}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    storeName: e.target.value,
                  })
                }
              />
              <Input
                label="Shior (Tagline)"
                required
                value={generalDraft.tagline}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    tagline: e.target.value,
                  })
                }
              />
              <Input
                label="Qoʻllab-quvvatlash telefoni"
                required
                value={generalDraft.supportPhone}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    supportPhone: formatUzbekPhone(e.target.value),
                  })
                }
                leftIcon={<Phone className="w-4 h-4" />}
              />
              <Input
                label="Telegram qoʻllab-quvvatlash profili"
                required
                value={generalDraft.supportTelegram}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    supportTelegram: e.target.value,
                  })
                }
              />
              <Input
                label="Instagram URL"
                required
                value={generalDraft.instagramUrl}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    instagramUrl: e.target.value,
                  })
                }
                leftIcon={<Instagram className="w-4 h-4" />}
              />
              <Input
                label="Instagram (@handle)"
                required
                value={generalDraft.instagramHandle}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    instagramHandle: e.target.value,
                  })
                }
              />
              <Input
                label="Ish vaqti"
                required
                value={generalDraft.workingHours}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    workingHours: e.target.value,
                  })
                }
                leftIcon={<Clock className="w-4 h-4" />}
              />
              <Input
                label="Shahar / Joylashuv"
                required
                value={generalDraft.cityLocation}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    cityLocation: e.target.value,
                  })
                }
                leftIcon={<MapPin className="w-4 h-4" />}
              />
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-4">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                <Globe className="w-4 h-4 text-brand-green" />
                <span>SEO va OpenGraph</span>
              </h3>
              <Input
                label="Page Title"
                required
                value={generalDraft.seoTitle}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    seoTitle: e.target.value,
                  })
                }
              />
              <Input
                label="Meta Description"
                value={generalDraft.seoDescription}
                onChange={(e) =>
                  setGeneralDraft({
                    ...generalDraft,
                    seoDescription: e.target.value,
                  })
                }
              />
            </div>
          </div>
        </form>
      )}

      {/* ===================================================================== */}
      {/* MODAL: ADD / EDIT PAYMENT METHOD (Requirement 3)                      */}
      {/* ===================================================================== */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Toʻlov usulini sozlash"
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="payment-method-admin-form"
              variant="primary"
              size="sm"
            >
              Saqlash
            </Button>
          </>
        }
      >
        {editingPaymentMethod && (
          <form
            id="payment-method-admin-form"
            onSubmit={handleSavePaymentModalSubmit}
            className="space-y-4 text-xs sm:text-sm"
          >
            {paymentModalError && (
              <p className="text-xs font-bold text-red-600">
                {paymentModalError}
              </p>
            )}

            <Input
              label="Toʻlov usuli nomi"
              required
              value={editingPaymentMethod.name}
              onChange={(e) =>
                setEditingPaymentMethod({
                  ...editingPaymentMethod,
                  name: e.target.value,
                })
              }
              placeholder="Masalan: Humo / Uzcard kartaga oʻtkazma"
            />

            <Input
              label="Xaridorga koʻrinadigan qisqa tavsif"
              required
              value={editingPaymentMethod.description}
              onChange={(e) =>
                setEditingPaymentMethod({
                  ...editingPaymentMethod,
                  description: e.target.value,
                })
              }
              placeholder="Masalan: Kartaga oʻtkazib chek skrinshotini yuklang"
            />

            <Select
              label="Toʻlov turi toifasi"
              value={editingPaymentMethod.type}
              onChange={(e) => {
                const nextType = e.target.value as PaymentMethodOption['type'];
                setEditingPaymentMethod({
                  ...editingPaymentMethod,
                  type: nextType,
                  requiresReceipt: nextType === 'card_transfer',
                });
              }}
              options={[
                {
                  value: 'card_transfer',
                  label: 'Kartaga oʻtkazma (Bank Transfer)',
                },
                {
                  value: 'cash',
                  label: 'Yetkazib berilganda naqd yoki terminal (COD)',
                },
                {
                  value: 'gateway_demo',
                  label: 'Onlayn toʻlov tizimi (Click / Payme / Uzum)',
                },
              ]}
            />

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-gray-900 block">
                  Xaridordan toʻlov cheki (rasm/PDF) yuklashni talab qilish
                </span>
                <span className="text-[11px] text-gray-500">
                  Yoqilsa, buyurtma «Toʻlov tekshirilmoqda» holatida tushadi
                </span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(editingPaymentMethod.requiresReceipt)}
                onChange={(e) =>
                  setEditingPaymentMethod({
                    ...editingPaymentMethod,
                    requiresReceipt: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-brand-green"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-gray-200 cursor-pointer">
              <span className="text-xs font-bold text-gray-900">
                Rasmiylashtirish sahifasida (Checkout) faol koʻrsatish
              </span>
              <input
                type="checkbox"
                checked={editingPaymentMethod.isEnabled}
                onChange={(e) =>
                  setEditingPaymentMethod({
                    ...editingPaymentMethod,
                    isEnabled: e.target.checked,
                  })
                }
                className="w-4 h-4 rounded text-brand-green"
              />
            </label>
          </form>
        )}
      </Modal>

      {/* Confirm Delete Payment Method Modal */}
      <Modal
        isOpen={Boolean(paymentToDelete)}
        onClose={() => setPaymentToDelete(null)}
        title="Toʻlov usulini oʻchirish"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaymentToDelete(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmDeletePaymentMethod}
            >
              Oʻchirish
            </Button>
          </>
        }
      >
        {paymentToDelete && (
          <p className="text-xs sm:text-sm text-gray-700">
            <strong>«{paymentToDelete.name}»</strong> usulini oʻchirmoqchimisiz? Avvalgi buyurtmalar tarixidagi toʻlov nomi oʻzgarishsiz saqlanib qoladi.
          </p>
        )}
      </Modal>

      {/* Coupon Modal */}
      <Modal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        title="Promokod sozlamalari"
        maxWidth="md"
        footer={
          <Button
            type="submit"
            form="coupon-admin-form"
            variant="primary"
            size="sm"
          >
            Saqlash
          </Button>
        }
      >
        {editingCoupon && (
          <form
            id="coupon-admin-form"
            onSubmit={handleSaveCouponSubmit}
            className="space-y-4 text-xs sm:text-sm"
          >
            {couponFormError && (
              <p className="text-xs font-bold text-red-600">{couponFormError}</p>
            )}
            <Input
              label="Promokod"
              required
              value={editingCoupon.code}
              onChange={(e) =>
                setEditingCoupon({
                  ...editingCoupon,
                  code: e.target.value.toUpperCase(),
                })
              }
            />
            <Input
              label="Tavsif"
              required
              value={editingCoupon.description}
              onChange={(e) =>
                setEditingCoupon({
                  ...editingCoupon,
                  description: e.target.value,
                })
              }
            />
          </form>
        )}
      </Modal>

      {/* Delete Coupon Modal */}
      <Modal
        isOpen={Boolean(couponToDelete)}
        onClose={() => setCouponToDelete(null)}
        title="Promokodni oʻchirish"
        maxWidth="sm"
        footer={
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (couponToDelete) {
                deleteCoupon(couponToDelete.id);
                setCouponToDelete(null);
              }
            }}
          >
            Oʻchirish
          </Button>
        }
      >
        {couponToDelete && <p>{couponToDelete.code}?</p>}
      </Modal>

      {/* Banner Modal */}
      <Modal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        title="Bannerni tahrirlash"
        maxWidth="lg"
        footer={
          <Button
            type="submit"
            form="banner-admin-form"
            variant="primary"
            size="sm"
          >
            Saqlash
          </Button>
        }
      >
        {editingBanner && (
          <form
            id="banner-admin-form"
            onSubmit={handleSaveBannerSubmit}
            className="space-y-4 text-xs sm:text-sm"
          >
            <Input
              label="Sarlavha"
              required
              value={editingBanner.headline}
              onChange={(e) =>
                setEditingBanner({
                  ...editingBanner,
                  headline: e.target.value,
                })
              }
            />
            <div className="space-y-2">
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-brand-green-light text-brand-green text-xs font-bold cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Rasm yuklash</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerImageUpload}
                  className="hidden"
                />
              </label>
              <Input
                value={editingBanner.image}
                onChange={(e) =>
                  setEditingBanner({
                    ...editingBanner,
                    image: e.target.value,
                  })
                }
              />
            </div>
          </form>
        )}
      </Modal>

      {/* Region Modal */}
      <Modal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        title="Hududiy tarif"
        maxWidth="md"
        footer={
          <Button
            type="submit"
            form="region-admin-form"
            variant="primary"
            size="sm"
          >
            Saqlash
          </Button>
        }
      >
        {editingRegion && (
          <form
            id="region-admin-form"
            onSubmit={handleSaveRegionModal}
            className="space-y-4 text-xs sm:text-sm"
          >
            <Input
              label="Hudud nomi"
              required
              value={editingRegion.regionName}
              onChange={(e) =>
                setEditingRegion({
                  ...editingRegion,
                  regionName: e.target.value,
                })
              }
            />
            <Input
              label="Yetkazish narxi (soʻm)"
              type="number"
              required
              value={editingRegion.fee}
              onChange={(e) =>
                setEditingRegion({
                  ...editingRegion,
                  fee: Number(e.target.value),
                })
              }
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
