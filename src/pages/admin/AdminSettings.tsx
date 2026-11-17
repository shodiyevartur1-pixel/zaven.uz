import React, { useState, useEffect } from 'react';
import {
  Store,
  Truck,
  CreditCard,
  Tag,
  Image as ImageIcon,
  ShieldCheck,
  Edit3,
  CheckCircle2,
  Plus,
  Trash2,
  MapPin,
  Clock,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  AdminRole,
  Coupon,
  DeliveryRegionRule,
  HomepageBanner,
  PaymentMethodOption,
  StoreSettings,
} from '../../types';
import { formatUZS } from '../../utils/format';
import { ProductImage } from '../../components/ui/ProductImage';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select, NumericInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

type SettingsTab =
  | 'general'
  | 'delivery'
  | 'payments'
  | 'coupons'
  | 'banners'
  | 'roles';

interface AdminSettingsProps { initialSection?: SettingsTab | 'settings'; }

export const AdminSettings: React.FC<AdminSettingsProps> = ({ initialSection = 'general' }) => {
  const {
    storeSettings,
    coupons,
    banners,
    adminUsers,
    currentAdminRole,
    setCurrentAdminRole,
    updateStoreSettings,
    saveCoupon,
    deleteCoupon,
    saveBanner,
    uploadImageFile,
    addToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialSection === 'settings' ? 'general' : initialSection);

  useEffect(() => {
    setActiveTab(initialSection === 'settings' ? 'general' : initialSection);
  }, [initialSection]);
  const [draft, setDraft] = useState<StoreSettings>(storeSettings);

  // Read-only summary vs. Edit toggles for settings forms
  const [isEditingGeneral, setIsEditingGeneral] = useState<boolean>(false);
  const [isEditingDelivery, setIsEditingDelivery] = useState<boolean>(false);
  const [isEditingBankCards, setIsEditingBankCards] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [lastSavedSection, setLastSavedSection] = useState<string | null>(null);

  // Regional Tariff Modal State
  const [editingRegionRule, setEditingRegionRule] =
    useState<DeliveryRegionRule | null>(null);
  const [isRegionModalOpen, setIsRegionModalOpen] = useState<boolean>(false);
  const [regName, setRegName] = useState<string>('');
  const [regFee, setRegFee] = useState<number>(25000);
  const [regFreeThreshold, setRegFreeThreshold] = useState<number | null>(
    350000
  );
  const [regNote, setRegNote] = useState<string>('');
  const [regEnabled, setRegEnabled] = useState<boolean>(true);

  // Payment Method Modal State (Reuses existing PaymentMethodOption type)
  const [editingPaymentMethod, setEditingPaymentMethod] =
    useState<PaymentMethodOption | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [pmName, setPmName] = useState<string>('');
  const [pmDesc, setPmDesc] = useState<string>('');
  const [pmType, setPmType] =
    useState<PaymentMethodOption['type']>('card_transfer');
  const [pmRequiresReceipt, setPmRequiresReceipt] = useState<boolean>(true);
  const [pmEnabled, setPmEnabled] = useState<boolean>(true);

  // Coupon Modal State
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState<boolean>(false);
  const [cpCode, setCpCode] = useState<string>('');
  const [cpDesc, setCpDesc] = useState<string>('');
  const [cpType, setCpType] = useState<'percentage' | 'fixed'>('percentage');
  const [cpValue, setCpValue] = useState<number>(10);
  const [cpMinOrder, setCpMinOrder] = useState<number>(150000);
  const [cpUsageLimit, setCpUsageLimit] = useState<number>(100);
  const [cpExpiresAt, setCpExpiresAt] = useState<string>('2026-12-31');
  const [cpIsActive, setCpIsActive] = useState<boolean>(true);

  // Banner Modal State (Local File Upload via uploadImageFile)
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(
    null
  );
  const [isBannerModalOpen, setIsBannerModalOpen] = useState<boolean>(false);
  const [bnTitle, setBnTitle] = useState<string>('');
  const [bnBadge, setBnBadge] = useState<string>('');
  const [bnHeadline, setBnHeadline] = useState<string>('');
  const [bnSubheadline, setBnSubheadline] = useState<string>('');
  const [bnCtaText, setBnCtaText] = useState<string>('');
  const [bnCtaLink, setBnCtaLink] = useState<string>('/catalog');
  const [bnImage, setBnImage] = useState<string>('');
  const [bnIsActive, setBnIsActive] = useState<boolean>(true);
  const [isUploadingBannerImage, setIsUploadingBannerImage] =
    useState<boolean>(false);

  useEffect(() => {
    setDraft(storeSettings);
  }, [storeSettings]);

  const persistNextSettings = async (
    nextSettings: StoreSettings,
    sectionKey: string,
    onSuccessCloseEditor?: () => void
  ) => {
    setSaveError('');
    setIsSaving(true);
    try {
      const ok = await updateStoreSettings(nextSettings);
      if (!ok) {
        setSaveError(
          'Maʼlumotlarni saqlashda xatolik yuz berdi. Kiritilgan oʻzgarishlar saqlab qolindi, qayta urinib koʻring.'
        );
        return false;
      }
      setDraft(nextSettings);
      setLastSavedSection(sectionKey);
      onSuccessCloseEditor?.();
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  // Regional Tariff Handlers
  const handleOpenRegionModal = (rule?: DeliveryRegionRule) => {
    if (rule) {
      setEditingRegionRule(rule);
      setRegName(rule.regionName);
      setRegFee(rule.fee);
      setRegFreeThreshold(rule.freeDeliveryThreshold ?? null);
      setRegNote(rule.note);
      setRegEnabled(rule.isEnabled);
    } else {
      setEditingRegionRule(null);
      setRegName('');
      setRegFee(30000);
      setRegFreeThreshold(500000);
      setRegNote('Standart hududiy yetkazib berish');
      setRegEnabled(true);
    }
    setIsRegionModalOpen(true);
  };

  const handleSaveRegionRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) return;

    const ruleObj: DeliveryRegionRule = {
      id: editingRegionRule?.id || `reg-${Date.now()}`,
      regionName: regName.trim(),
      isEnabled: regEnabled,
      fee: Math.max(0, regFee),
      freeDeliveryThreshold:
        regFreeThreshold && regFreeThreshold > 0 ? regFreeThreshold : null,
      note: regNote.trim(),
    };

    const nextRegions = editingRegionRule
      ? draft.delivery.regions.map((r) => (r.id === ruleObj.id ? ruleObj : r))
      : [...draft.delivery.regions, ruleObj];

    await persistNextSettings(
      {
        ...draft,
        delivery: { ...draft.delivery, regions: nextRegions },
      },
      'regions',
      () => setIsRegionModalOpen(false)
    );
  };

  const handleDeleteRegionRule = async (ruleId: string) => {
    const nextRegions = draft.delivery.regions.filter((r) => r.id !== ruleId);
    await persistNextSettings(
      {
        ...draft,
        delivery: { ...draft.delivery, regions: nextRegions },
      },
      'regions'
    );
  };

  // Payment Method Handlers
  const handleOpenPaymentModal = (pm?: PaymentMethodOption) => {
    if (pm) {
      setEditingPaymentMethod(pm);
      setPmName(pm.name);
      setPmDesc(pm.description);
      setPmType(pm.type);
      setPmRequiresReceipt(
        pm.requiresReceipt !== undefined
          ? pm.requiresReceipt
          : pm.type === 'card_transfer'
      );
      setPmEnabled(pm.isEnabled);
    } else {
      setEditingPaymentMethod(null);
      setPmName('');
      setPmDesc('');
      setPmType('card_transfer');
      setPmRequiresReceipt(true);
      setPmEnabled(true);
    }
    setIsPaymentModalOpen(true);
  };

  const handleSavePaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmName.trim()) return;

    const pmObj: PaymentMethodOption = {
      id: editingPaymentMethod?.id || `pay-${Date.now()}`,
      name: pmName.trim(),
      description: pmDesc.trim(),
      type: pmType,
      requiresReceipt: pmRequiresReceipt,
      isEnabled: pmEnabled,
      isDemoMode: editingPaymentMethod?.isDemoMode ?? false,
      configurationNote: editingPaymentMethod?.configurationNote ?? '',
    };

    const nextMethods = editingPaymentMethod
      ? draft.paymentMethods.map((m) => (m.id === pmObj.id ? pmObj : m))
      : [...draft.paymentMethods, pmObj];

    await persistNextSettings(
      {
        ...draft,
        paymentMethods: nextMethods,
      },
      'payments',
      () => setIsPaymentModalOpen(false)
    );
  };

  const handleTogglePaymentMethodEnabled = async (pmId: string) => {
    const nextMethods = draft.paymentMethods.map((m) =>
      m.id === pmId ? { ...m, isEnabled: !m.isEnabled } : m
    );
    await persistNextSettings(
      {
        ...draft,
        paymentMethods: nextMethods,
      },
      'payments'
    );
  };

  const handleDeletePaymentMethod = async (pmId: string) => {
    const nextMethods = draft.paymentMethods.filter((m) => m.id !== pmId);
    await persistNextSettings(
      {
        ...draft,
        paymentMethods: nextMethods,
      },
      'payments'
    );
  };

  // Coupon Handlers
  const handleOpenCouponModal = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCpCode(coupon.code);
      setCpDesc(coupon.description);
      setCpType(coupon.discountType);
      setCpValue(coupon.discountValue);
      setCpMinOrder(coupon.minOrderAmount);
      setCpUsageLimit(coupon.usageLimit);
      setCpExpiresAt((coupon.expiresAt || coupon.endDate || '2026-12-31').slice(0, 10));
      setCpIsActive(coupon.isActive);
    } else {
      setEditingCoupon(null);
      setCpCode('');
      setCpDesc('');
      setCpType('percentage');
      setCpValue(10);
      setCpMinOrder(150000);
      setCpUsageLimit(100);
      setCpExpiresAt('2026-12-31');
      setCpIsActive(true);
    }
    setIsCouponModalOpen(true);
  };

  const handleSaveCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpCode.trim()) return;

    const saved = await saveCoupon({
      id: editingCoupon?.id || `coup-${Date.now()}`,
      code: cpCode.trim().toUpperCase(),
      description: cpDesc.trim() || `${cpCode.toUpperCase()} promokodi`,
      discountType: cpType,
      discountValue: Math.max(1, cpValue),
      minOrderAmount: Math.max(0, cpMinOrder),
      usageLimit: Math.max(1, cpUsageLimit),
      usedCount: editingCoupon?.usedCount || 0,
      startDate: editingCoupon?.startDate || new Date().toISOString().slice(0, 10),
      endDate: cpExpiresAt || '2026-12-31',
      expiresAt: cpExpiresAt || '2026-12-31',
      isActive: cpIsActive,
    });
    if (saved) setIsCouponModalOpen(false);
  };

  // Banner Handlers
  const handleOpenBannerModal = (banner?: HomepageBanner) => {
    if (banner) {
      setEditingBanner(banner);
      setBnTitle(banner.title || banner.headline);
      setBnBadge(banner.badgeText);
      setBnHeadline(banner.headline);
      setBnSubheadline(banner.subheadline);
      setBnCtaText(banner.ctaText);
      setBnCtaLink(banner.ctaLink);
      setBnImage(banner.image);
      setBnIsActive(banner.isActive);
    } else {
      setEditingBanner(null);
      setBnTitle('');
      setBnBadge('ZAVEN AKSIYA');
      setBnHeadline('');
      setBnSubheadline('');
      setBnCtaText('Katalogga oʻtish');
      setBnCtaLink('/catalog');
      setBnImage('');
      setBnIsActive(true);
    }
    setIsBannerModalOpen(true);
  };

  const handleBannerImageFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBannerImage(true);
    try {
      const url = await uploadImageFile(file, 'banners');
      setBnImage(url);
      addToast({ type: 'success', title: 'Banner rasmi yuklandi' });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Banner rasmini yuklashda xatolik',
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsUploadingBannerImage(false);
      e.target.value = '';
    }
  };

  const handleSaveBannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bnTitle.trim() || !bnHeadline.trim() || !bnImage.trim()) return;

    const saved = await saveBanner({
      id: editingBanner?.id || `bn-${Date.now()}`,
      title: bnTitle.trim(),
      badgeText: bnBadge.trim() || 'ZAVEN',
      headline: bnHeadline.trim(),
      subheadline: bnSubheadline.trim(),
      offerText: editingBanner?.offerText || '',
      ctaText: bnCtaText.trim() || 'Koʻrish',
      ctaLink: bnCtaLink.trim() || '/catalog',
      image: bnImage,
      isActive: bnIsActive,
      translations: editingBanner?.translations,
    });
    if (saved) setIsBannerModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & All 6 Section Tabs */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card space-y-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Doʻkon, Yetkazib berish, Toʻlov, Promokod va Rollarni Boshqarish
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Barcha 6 ta boʻlim oʻzgarishlari bazaga tasdiqlab saqlanadi va
            vitrinada darhol aks etadi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-page dark:bg-[#162923] p-1.5 border border-gray-200 dark:border-[#28453B]">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'general'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Umumiy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('delivery')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'delivery'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Yetkazib berish ({draft.delivery.regions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'payments'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Toʻlov va Karta ({draft.paymentMethods.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('coupons')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'coupons'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Promokodlar ({coupons.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('banners')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'banners'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Bannerlar ({banners.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'roles'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin rollari ({adminUsers.length})</span>
          </button>
        </div>
      </div>

      {saveError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">
          {saveError}
        </div>
      )}

      {/* TAB 1: GENERAL SETTINGS */}
      {activeTab === 'general' && (
        <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#28453B]">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                Umumiy doʻkon va aloqa maʼlumotlari
              </h2>
              <p className="text-xs text-gray-500">
                Aloqa raqami faqat shu yerda kiritilgandagina vitrinada
                koʻrsatiladi
              </p>
            </div>
            {!isEditingGeneral && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                onClick={() => setIsEditingGeneral(true)}
              >
                Tahrirlash
              </Button>
            )}
          </div>

          {lastSavedSection === 'general' && !isEditingGeneral && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Umumiy sozlamalar saqlandi va vitrinada yangilandi.</span>
            </div>
          )}

          {!isEditingGeneral ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  Doʻkon nomi va shiori
                </span>
                <p className="font-extrabold text-gray-900 dark:text-gray-100 mt-1">
                  {storeSettings.storeName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  {storeSettings.tagline}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  Qoʻllab-quvvatlash telefoni va Telegram
                </span>
                <p className="font-extrabold text-brand-green mt-1">
                  {storeSettings.supportPhone ||
                    'Kiritilmagan (Vitrinada yashirin)'}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  Telegram: {storeSettings.supportTelegram}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  Ish vaqti va Manzil
                </span>
                <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {storeSettings.workingHours}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  {storeSettings.cityLocation}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                <span className="text-[11px] font-bold uppercase text-gray-400 block">
                  Instagram sahifa
                </span>
                <p className="font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {storeSettings.instagramHandle}
                </p>
                <p className="text-xs text-gray-500 truncate mt-0.5">
                  {storeSettings.instagramUrl}
                </p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await persistNextSettings(draft, 'general', () =>
                  setIsEditingGeneral(false)
                );
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Doʻkon nomi"
                  required
                  value={draft.storeName}
                  onChange={(e) =>
                    setDraft({ ...draft, storeName: e.target.value })
                  }
                />
                <Input
                  label="Qoʻllab-quvvatlash telefon raqami (Ixtiyoriy)"
                  value={draft.supportPhone}
                  onChange={(e) =>
                    setDraft({ ...draft, supportPhone: e.target.value })
                  }
                  placeholder="+998 90 123-45-67 (boʻsh qoldirilsa koʻrinmaydi)"
                />
              </div>

              <Input
                label="Doʻkon shiori (Tagline)"
                value={draft.tagline}
                onChange={(e) =>
                  setDraft({ ...draft, tagline: e.target.value })
                }
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Telegram qoʻllab-quvvatlash profili"
                  value={draft.supportTelegram}
                  onChange={(e) =>
                    setDraft({ ...draft, supportTelegram: e.target.value })
                  }
                />
                <Input
                  label="Ish vaqti"
                  value={draft.workingHours}
                  onChange={(e) =>
                    setDraft({ ...draft, workingHours: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Instagram profil (@zaven.uz)"
                  value={draft.instagramHandle}
                  onChange={(e) =>
                    setDraft({ ...draft, instagramHandle: e.target.value })
                  }
                />
                <Input
                  label="Instagram havola (URL)"
                  value={draft.instagramUrl}
                  onChange={(e) =>
                    setDraft({ ...draft, instagramUrl: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isSaving}
                >
                  Saqlash
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setDraft(storeSettings);
                    setIsEditingGeneral(false);
                  }}
                >
                  Bekor qilish
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: DELIVERY DAYS & REGIONAL TARIFFS */}
      {activeTab === 'delivery' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#28453B]">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  Yetkazib berish muddati va umumiy qoidalar
                </h2>
              </div>
              {!isEditingDelivery && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => setIsEditingDelivery(true)}
                >
                  Tahrirlash
                </Button>
              )}
            </div>

            {lastSavedSection === 'delivery' && !isEditingDelivery && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Yetkazib berish muddati va qoidalari saqlandi.</span>
              </div>
            )}

            {!isEditingDelivery ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                  <span className="text-[11px] font-bold uppercase text-gray-400 block">
                    Taxminiy yetkazib berish muddati (kun)
                  </span>
                  <p className="font-extrabold text-brand-green text-sm mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#C89D54]" />
                    <span>
                      {storeSettings.delivery.estimatedDeliveryDays ||
                        'Taxminan 10–25 kun'}
                    </span>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B]">
                  <span className="text-[11px] font-bold uppercase text-gray-400 block">
                    Umumiy yetkazib berish izohi
                  </span>
                  <p className="text-xs text-gray-700 dark:text-gray-200 mt-1 leading-relaxed">
                    {storeSettings.delivery.generalDeliveryNote}
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await persistNextSettings(draft, 'delivery', () =>
                    setIsEditingDelivery(false)
                  );
                }}
                className="space-y-4"
              >
                <Input
                  label="Taxminiy yetkazib berish muddati (Masalan: Taxminan 10–25 kun)"
                  required
                  value={
                    draft.delivery.estimatedDeliveryDays ||
                    'Taxminan 10–25 kun'
                  }
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      delivery: {
                        ...draft.delivery,
                        estimatedDeliveryDays: e.target.value,
                      },
                    })
                  }
                />

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                    Umumiy yetkazib berish shartlari izohi
                  </label>
                  <textarea
                    rows={3}
                    value={draft.delivery.generalDeliveryNote}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        delivery: {
                          ...draft.delivery,
                          generalDeliveryNote: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] px-3.5 py-2 text-xs sm:text-sm"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                  >
                    Saqlash
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setDraft(storeSettings);
                      setIsEditingDelivery(false);
                    }}
                  >
                    Bekor qilish
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  Hududiy yetkazib berish tariflari
                </h2>
                <p className="text-xs text-gray-500">
                  Har bir hudud narxi, bepul yetkazish chegarasi va izohi
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
                onClick={() => handleOpenRegionModal()}
              >
                Hudud qoʻshish
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {draft.delivery.regions.map((reg) => (
                <div
                  key={reg.id}
                  className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-gray-900 dark:text-gray-100 text-sm flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-brand-green shrink-0" />
                        <span>{reg.regionName}</span>
                      </span>
                      <Badge
                        variant={reg.isEnabled ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {reg.isEnabled ? 'Faol' : 'Oʻchiq'}
                      </Badge>
                    </div>

                    <p className="text-base font-extrabold text-brand-green">
                      {formatUZS(reg.fee)}
                    </p>

                    {reg.freeDeliveryThreshold && (
                      <p className="text-[11px] font-semibold text-brand-gold-dark">
                        {formatUZS(reg.freeDeliveryThreshold)} dan yuqori
                        xaridlar uchun bepul
                      </p>
                    )}

                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed break-words">
                      {reg.note}
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-gray-200/70 dark:border-[#28453B]">
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => handleOpenRegionModal(reg)}
                    >
                      Tahrirlash
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRegionRule(reg.id)}
                      aria-label="Hududni oʻchirish"
                      className="w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT METHODS & HUMO / UZCARD RECIPIENT CARDS */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-[#28453B]">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  Humo va Uzcard qabul qiluvchi karta rekvizitlari
                </h2>
                <p className="text-xs text-gray-500">
                  Faqat oʻtkazma qabul qiluvchi karta raqami va egasining ismi
                  (PIN/CVV hech qachon soʻralmaydi)
                </p>
              </div>
              {!isEditingBankCards && (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                  onClick={() => setIsEditingBankCards(true)}
                >
                  Tahrirlash
                </Button>
              )}
            </div>

            {lastSavedSection === 'bankTransfer' && !isEditingBankCards && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  Karta rekvizitlari saqlandi va Checkout sahifasida yangilandi.
                </span>
              </div>
            )}

            {!isEditingBankCards ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                  <Badge variant="green" size="sm">
                    HUMO
                  </Badge>
                  <p className="font-mono font-extrabold text-gray-900 dark:text-gray-100 text-sm pt-1">
                    {storeSettings.bankTransfer.humoCardNumber ||
                      'Kiritilmagan'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Qabul qiluvchi:{' '}
                    <strong>
                      {storeSettings.bankTransfer.humoCardHolder || '—'}
                    </strong>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                  <Badge variant="info" size="sm">
                    UZCARD
                  </Badge>
                  <p className="font-mono font-extrabold text-gray-900 dark:text-gray-100 text-sm pt-1">
                    {storeSettings.bankTransfer.uzcardCardNumber ||
                      'Kiritilmagan'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    Qabul qiluvchi:{' '}
                    <strong>
                      {storeSettings.bankTransfer.uzcardCardHolder || '—'}
                    </strong>
                  </p>
                </div>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await persistNextSettings(draft, 'bankTransfer', () =>
                    setIsEditingBankCards(false)
                  );
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="HUMO karta raqami"
                    value={draft.bankTransfer.humoCardNumber}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bankTransfer: {
                          ...draft.bankTransfer,
                          humoCardNumber: e.target.value,
                        },
                      })
                    }
                    placeholder="9860 0000 0000 0000"
                  />
                  <Input
                    label="HUMO karta egasi (Ism Familiya)"
                    value={draft.bankTransfer.humoCardHolder}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bankTransfer: {
                          ...draft.bankTransfer,
                          humoCardHolder: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="UZCARD karta raqami"
                    value={draft.bankTransfer.uzcardCardNumber}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bankTransfer: {
                          ...draft.bankTransfer,
                          uzcardCardNumber: e.target.value,
                        },
                      })
                    }
                    placeholder="8600 0000 0000 0000"
                  />
                  <Input
                    label="UZCARD karta egasi (Ism Familiya)"
                    value={draft.bankTransfer.uzcardCardHolder}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bankTransfer: {
                          ...draft.bankTransfer,
                          uzcardCardHolder: e.target.value,
                        },
                      })
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                    Toʻlov va chek yuklash boʻyicha koʻrsatma
                  </label>
                  <textarea
                    rows={2}
                    value={draft.bankTransfer.transferInstructions}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        bankTransfer: {
                          ...draft.bankTransfer,
                          transferInstructions: e.target.value,
                        },
                      })
                    }
                    className="w-full rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] px-3.5 py-2 text-xs sm:text-sm"
                  />
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSaving}
                  >
                    Saqlash
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    onClick={() => {
                      setDraft(storeSettings);
                      setIsEditingBankCards(false);
                    }}
                  >
                    Bekor qilish
                  </Button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                  Toʻlov usullari (Checkoutda koʻrsatiladigan)
                </h2>
                <p className="text-xs text-gray-500">
                  Oʻchirilgan toʻlov usuli Checkoutdan darhol olib tashlanadi
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
                onClick={() => handleOpenPaymentModal()}
              >
                Toʻlov usuli qoʻshish
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draft.paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex flex-col justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-extrabold text-gray-900 dark:text-gray-100 text-sm">
                        {pm.name}
                      </span>
                      <Badge
                        variant={pm.isEnabled ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {pm.isEnabled ? 'Faol' : 'Oʻchirilgan'}
                      </Badge>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {pm.description}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-gray-200/70 dark:border-[#28453B]">
                    <button
                      type="button"
                      onClick={() => handleTogglePaymentMethodEnabled(pm.id)}
                      className="text-xs font-extrabold text-brand-green hover:underline"
                    >
                      {pm.isEnabled ? 'Oʻchirib qoʻyish' : 'Yoqish'}
                    </button>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenPaymentModal(pm)}
                      >
                        Tahrirlash
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleDeletePaymentMethod(pm.id)}
                        className="w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COUPONS / PROMOKODLAR */}
      {activeTab === 'coupons' && (
        <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                Promokodlar va Kuponlar
              </h2>
              <p className="text-xs text-gray-500">
                Savatchada qoʻllanadigan chegirma kodlarini boshqarish
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
              onClick={() => handleOpenCouponModal()}
            >
              Promokod qoʻshish
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((cp) => (
              <div
                key={cp.id}
                className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex flex-col justify-between gap-3 text-xs"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-extrabold text-brand-green text-sm px-2.5 py-1 rounded-lg bg-brand-green-light dark:bg-[#0F3D2E]">
                      {cp.code}
                    </span>
                    <Badge
                      variant={cp.isActive ? 'success' : 'neutral'}
                      size="sm"
                    >
                      {cp.isActive ? 'Faol' : 'Noaniq'}
                    </Badge>
                  </div>
                  <p className="font-extrabold text-gray-900 dark:text-gray-100 text-sm pt-1">
                    {cp.discountType === 'percentage'
                      ? `${cp.discountValue}% chegirma`
                      : `${formatUZS(cp.discountValue)} chegirma`}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">
                    {cp.description}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Min. buyurtma: {formatUZS(cp.minOrderAmount)} • Ishlatildi:{' '}
                    {cp.usedCount} / {cp.usageLimit}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2.5 border-t border-gray-200/70 dark:border-[#28453B]">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenCouponModal(cp)}
                  >
                    Tahrirlash
                  </Button>
                  <button
                    type="button"
                    onClick={() => deleteCoupon(cp.id)}
                    className="w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: BANNERS */}
      {activeTab === 'banners' && (
        <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
                Reklama va aksiya bannerlari
              </h2>
              <p className="text-xs text-gray-500">
                Banner rasmini qurilmadan yuklash va matnlarini yangilash
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
              onClick={() => handleOpenBannerModal()}
            >
              Banner qoʻshish
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {banners.map((bn) => (
              <div
                key={bn.id}
                className="rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] overflow-hidden flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="h-36 bg-gray-100 relative">
                    <ProductImage
                      src={bn.image}
                      alt={bn.headline}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <Badge
                        variant={bn.isActive ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {bn.isActive ? 'Faol' : 'Yashirin'}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <Badge variant="gold" size="sm">
                      {bn.badgeText}
                    </Badge>
                    <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100 pt-1">
                      {bn.headline}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {bn.subheadline}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-gray-200/70 dark:border-[#28453B] flex items-center justify-between">
                  <span className="text-[11px] font-mono text-gray-500">
                    {bn.ctaLink}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    onClick={() => handleOpenBannerModal(bn)}
                  >
                    Tahrirlash
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 6: ADMIN ROLES */}
      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-5 sm:p-6 shadow-card space-y-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
              Admin rollari va ruxsatlar
            </h2>
            <p className="text-xs text-gray-500">
              Joriy faol rol: <strong>{currentAdminRole.toUpperCase()}</strong>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminUsers.map((admin) => {
              const isCurrentRole = currentAdminRole === admin.role;
              return (
                <div
                  key={admin.id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 text-xs ${
                    isCurrentRole
                      ? 'border-[#C89D54] bg-brand-green-light/40 dark:bg-[#162923]'
                      : 'border-gray-200 dark:border-[#28453B] bg-[#F8F9FA] dark:bg-[#162923]'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                          {admin.name}
                        </p>
                        <p className="text-brand-green font-semibold">
                          {admin.roleLabel || admin.title}
                        </p>
                      </div>
                      <Badge
                        variant={isCurrentRole ? 'gold' : 'neutral'}
                        size="sm"
                      >
                        {admin.role}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(admin.permissions || []).map((perm, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#28453B] text-[11px] font-semibold"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200/70 dark:border-[#28453B] flex justify-end">
                    <Button
                      variant={isCurrentRole ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={() =>
                        setCurrentAdminRole(admin.role as AdminRole)
                      }
                    >
                      {isCurrentRole ? 'Faol rol' : 'Ushbu rolga oʻtish'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Region Rule Modal */}
      <Modal
        isOpen={isRegionModalOpen}
        onClose={() => setIsRegionModalOpen(false)}
        title={
          editingRegionRule
            ? 'Hududiy tarifni tahrirlash'
            : 'Yangi hududiy tarif'
        }
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsRegionModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="region-rule-form"
              variant="primary"
              size="md"
              fullWidth
              isLoading={isSaving}
            >
              Saqlash
            </Button>
          </div>
        }
      >
        <form
          id="region-rule-form"
          onSubmit={handleSaveRegionRule}
          className="space-y-4 text-xs sm:text-sm"
        >
          <Input
            label="Hudud nomi (Masalan: Toshkent shahri)"
            required
            value={regName}
            onChange={(e) => setRegName(e.target.value)}
          />
          <NumericInput
            label="Yetkazib berish narxi (soʻm)"
            required
            value={regFee}
            onChange={(val) => setRegFee(val ?? 0)}
            showCurrencyPreview
          />
          <NumericInput
            label="Bepul yetkazish chegarasi (ixtiyoriy, soʻm)"
            allowEmpty
            value={regFreeThreshold}
            onChange={(val) => setRegFreeThreshold(val)}
            showCurrencyPreview
          />
          <Input
            label="Qoʻshimcha izoh"
            value={regNote}
            onChange={(e) => setRegNote(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={regEnabled}
              onChange={(e) => setRegEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Ushbu hudud faol boʻlsin</span>
          </label>
        </form>
      </Modal>

      {/* Payment Method Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={
          editingPaymentMethod
            ? 'Toʻlov usulini tahrirlash'
            : 'Yangi toʻlov usuli'
        }
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="payment-method-form"
              variant="primary"
              size="md"
              fullWidth
              isLoading={isSaving}
            >
              Saqlash
            </Button>
          </div>
        }
      >
        <form
          id="payment-method-form"
          onSubmit={handleSavePaymentMethod}
          className="space-y-4 text-xs sm:text-sm"
        >
          <Input
            label="Toʻlov usuli nomi"
            required
            value={pmName}
            onChange={(e) => setPmName(e.target.value)}
          />
          <Select
            label="Toʻlov turi"
            value={pmType}
            onChange={(e) =>
              setPmType(e.target.value as PaymentMethodOption['type'])
            }
            options={[
              {
                value: 'card_transfer',
                label: 'Humo / Uzcard kartaga oʻtkazma (Chek bilan)',
              },
              {
                value: 'cod_cash',
                label: 'Qabul qilganda naqd toʻlov',
              },
              {
                value: 'cod_card',
                label: 'Qabul qilganda terminal orqali',
              },
            ]}
          />
          <Input
            label="Tavsif va koʻrsatma"
            value={pmDesc}
            onChange={(e) => setPmDesc(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={pmRequiresReceipt}
              onChange={(e) => setPmRequiresReceipt(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Xaridordan toʻlov cheki (skrinshot/PDF) talab qilinsin</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={pmEnabled}
              onChange={(e) => setPmEnabled(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Checkoutda faol koʻrsatilsin</span>
          </label>
        </form>
      </Modal>

      {/* Coupon Modal */}
      <Modal
        isOpen={isCouponModalOpen}
        onClose={() => setIsCouponModalOpen(false)}
        title={
          editingCoupon ? 'Promokodni tahrirlash' : 'Yangi promokod qoʻshish'
        }
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsCouponModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="coupon-form"
              variant="primary"
              size="md"
              fullWidth
            >
              Saqlash
            </Button>
          </div>
        }
      >
        <form
          id="coupon-form"
          onSubmit={handleSaveCouponSubmit}
          className="space-y-4 text-xs sm:text-sm"
        >
          <Input
            label="Promokod kodi (Masalan: ZAVEN10)"
            required
            value={cpCode}
            onChange={(e) => setCpCode(e.target.value.toUpperCase())}
          />
          <Input
            label="Tavsif"
            value={cpDesc}
            onChange={(e) => setCpDesc(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              label="Chegirma turi"
              value={cpType}
              onChange={(e) =>
                setCpType(e.target.value as 'percentage' | 'fixed')
              }
              options={[
                { value: 'percentage', label: 'Foizli (%)' },
                { value: 'fixed', label: 'Aniq summa (soʻm)' },
              ]}
            />
            <NumericInput
              label={
                cpType === 'percentage'
                  ? 'Chegirma foizi (%)'
                  : 'Chegirma summasi (soʻm)'
              }
              required
              min={1}
              value={cpValue}
              onChange={(val) => setCpValue(val ?? 10)}
              showCurrencyPreview={cpType === 'fixed'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <NumericInput
              label="Minimal buyurtma summasi (soʻm)"
              value={cpMinOrder}
              onChange={(val) => setCpMinOrder(val ?? 0)}
              showCurrencyPreview
            />
            <NumericInput
              label="Maksimal ishlatish soni"
              min={1}
              value={cpUsageLimit}
              onChange={(val) => setCpUsageLimit(val ?? 100)}
            />
          </div>
          <Input
            label="Amal qilish muddati"
            type="date"
            value={cpExpiresAt}
            onChange={(e) => setCpExpiresAt(e.target.value)}
          />
          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={cpIsActive}
              onChange={(e) => setCpIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Promokod faol</span>
          </label>
        </form>
      </Modal>

      {/* Banner Modal */}
      <Modal
        isOpen={isBannerModalOpen}
        onClose={() => setIsBannerModalOpen(false)}
        title={
          editingBanner ? 'Bannerni tahrirlash' : 'Yangi banner qoʻshish'
        }
        maxWidth="md"
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsBannerModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="banner-form"
              variant="primary"
              size="md"
              fullWidth
              disabled={isUploadingBannerImage}
            >
              Saqlash
            </Button>
          </div>
        }
      >
        <form
          id="banner-form"
          onSubmit={handleSaveBannerSubmit}
          className="space-y-4 text-xs sm:text-sm"
        >
          <Input
            label="Ichki nom"
            required
            value={bnTitle}
            onChange={(e) => setBnTitle(e.target.value)}
          />
          <Input
            label="Yuqori yorliq (Badge)"
            value={bnBadge}
            onChange={(e) => setBnBadge(e.target.value)}
          />
          <Input
            label="Asosiy sarlavha"
            required
            value={bnHeadline}
            onChange={(e) => setBnHeadline(e.target.value)}
          />
          <Input
            label="Qoʻshimcha matn"
            value={bnSubheadline}
            onChange={(e) => setBnSubheadline(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              label="Tugma matni"
              value={bnCtaText}
              onChange={(e) => setBnCtaText(e.target.value)}
            />
            <Input
              label="Tugma manzili (Link)"
              value={bnCtaLink}
              onChange={(e) => setBnCtaLink(e.target.value)}
            />
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-2.5">
            <span className="text-xs font-bold block">Banner rasmi *</span>
            {bnImage && (
              <ProductImage
                src={bnImage}
                alt={bnHeadline}
                className="w-full h-32 rounded-xl object-cover border border-gray-200"
              />
            )}
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D2E] text-white text-xs font-bold cursor-pointer">
              {isUploadingBannerImage ? (
                <RefreshCw className="w-3.5 h-3.5 text-[#C89D54] animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-[#C89D54]" />
              )}
              <span>Qurilmadan banner rasmini tanlash</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleBannerImageFileSelected}
                className="hidden"
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={bnIsActive}
              onChange={(e) => setBnIsActive(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Banner faol</span>
          </label>
        </form>
      </Modal>
    </div>
  );
};
