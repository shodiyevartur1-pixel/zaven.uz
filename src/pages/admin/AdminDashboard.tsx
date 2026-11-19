import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  CheckCircle2,
  Eye,
  Plus,
  RotateCcw,
  Filter,
  BarChart3,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { OrderStatus, Product } from '../../types';
import { formatUZS, formatDateUz } from '../../utils/format';
import { ProductImage } from '../../components/ui/ProductImage';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, NumericInput } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';

export interface AdminDashboardProps {
  isReportsView?: boolean;
}

type DateRangeFilter = 'all' | 'today' | '7d' | '30d';

const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    variant: 'info' | 'gold' | 'warning' | 'success' | 'danger' | 'neutral';
  }
> = {
  new: { label: 'Yangi', variant: 'info' },
  confirmed: { label: 'Tasdiqlangan', variant: 'gold' },
  preparing: { label: 'Tayyorlanmoqda', variant: 'warning' },
  shipped: { label: 'Yoʻlda', variant: 'info' },
  delivered: { label: 'Yetkazildi', variant: 'success' },
  cancelled: { label: 'Bekor qilingan', variant: 'danger' },
};

const DASHBOARD_FILTER_STORAGE_KEY = 'zaven_admin_dashboard_filters_v1';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isReportsView = false,
}) => {
  const {
    orders,
    products,
    categories,
    inquiries,
    storeSettings,
    adjustProductStock,
    saveProduct,
    resetOrderStatsBaseline,
  } = useStore();

  const savedFilters = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(DASHBOARD_FILTER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [dateRange, setDateRange] = useState<DateRangeFilter>(
    savedFilters?.dateRange || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    savedFilters?.categoryFilter || 'all'
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    savedFilters?.statusFilter || 'all'
  );

  useEffect(() => {
    try {
      sessionStorage.setItem(
        DASHBOARD_FILTER_STORAGE_KEY,
        JSON.stringify({ dateRange, categoryFilter, statusFilter })
      );
    } catch {
      // Ignore storage error
    }
  }, [dateRange, categoryFilter, statusFilter]);

  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isResettingStats, setIsResettingStats] = useState(false);
  const [resetError, setResetError] = useState('');

  // Quick Stock Adjustment Modal State (Preserved on Dashboard)
  const [quickStockProduct, setQuickStockProduct] = useState<Product | null>(
    null
  );
  const [quickStockVal, setQuickStockVal] = useState<number>(0);
  const [quickThresholdVal, setQuickThresholdVal] = useState<number>(5);
  const [quickStockReason, setQuickStockReason] = useState<string>('');

  const resetTimestampMs = useMemo(() => {
    if (!storeSettings.statsResetAt) return 0;
    const parsed = new Date(storeSettings.statsResetAt).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }, [storeSettings.statsResetAt]);

  const allowedProductIdsForCategory = useMemo(() => {
    if (categoryFilter === 'all') return null;
    return new Set(
      products.filter((p) => p.categoryId === categoryFilter).map((p) => p.id)
    );
  }, [products, categoryFilter]);

  // All order-derived metrics respect:
  // 1. !o.isDeleted
  // 2. o.createdAt > storeSettings.statsResetAt
  // 3. Date range, category, and order status filters
  const filteredBaselineOrders = useMemo(() => {
    const nowMs = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    return orders.filter((o) => {
      if (o.isDeleted) return false;
      const createdMs = new Date(o.createdAt).getTime();

      if (resetTimestampMs > 0 && createdMs <= resetTimestampMs) {
        return false;
      }

      if (dateRange === 'today') {
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        if (createdMs < startOfToday.getTime()) return false;
      } else if (dateRange === '7d') {
        if (nowMs - createdMs > 7 * dayMs) return false;
      } else if (dateRange === '30d') {
        if (nowMs - createdMs > 30 * dayMs) return false;
      }

      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }

      if (allowedProductIdsForCategory) {
        const hasMatchingItem = o.items.some((i) =>
          allowedProductIdsForCategory.has(i.productId)
        );
        if (!hasMatchingItem) return false;
      }

      return true;
    });
  }, [
    orders,
    resetTimestampMs,
    dateRange,
    statusFilter,
    allowedProductIdsForCategory,
  ]);

  const nonCancelledOrders = useMemo(
    () => filteredBaselineOrders.filter((o) => o.status !== 'cancelled'),
    [filteredBaselineOrders]
  );

  // Strictly derived from real non-cancelled orders after statsResetAt (no fabricated/demo revenue)
  const totalRevenue = useMemo(
    () =>
      nonCancelledOrders.reduce((sum, o) => {
        if (!allowedProductIdsForCategory) return sum + o.totalAmount;
        const catLinesTotal = o.items
          .filter((i) => allowedProductIdsForCategory.has(i.productId))
          .reduce((s, i) => s + i.totalPrice, 0);
        return sum + catLinesTotal;
      }, 0),
    [nonCancelledOrders, allowedProductIdsForCategory]
  );

  const pendingReceiptsCount = useMemo(
    () =>
      filteredBaselineOrders.filter(
        (o) => o.paymentVerificationStatus === 'pending_verification'
      ).length,
    [filteredBaselineOrders]
  );

  const newOrdersCount = useMemo(
    () => filteredBaselineOrders.filter((o) => o.status === 'new').length,
    [filteredBaselineOrders]
  );

  const statusBreakdown = useMemo(() => {
    const counts: Record<OrderStatus, number> = {
      new: 0,
      confirmed: 0,
      preparing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of filteredBaselineOrders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return counts;
  }, [filteredBaselineOrders]);

  const lowStockProducts = useMemo(
    () =>
      products
        .filter(
          (p) =>
            p.status !== 'archived' &&
            (categoryFilter === 'all' || p.categoryId === categoryFilter) &&
            p.stock <= p.lowStockThreshold
        )
        .sort((a, b) => a.stock - b.stock),
    [products, categoryFilter]
  );

  // Top products sold count derived strictly from nonCancelledOrders after statsResetAt
  const topSellingProducts = useMemo(() => {
    const soldByProduct = new Map<string, number>();
    for (const ord of nonCancelledOrders) {
      for (const item of ord.items) {
        soldByProduct.set(
          item.productId,
          (soldByProduct.get(item.productId) || 0) + item.quantity
        );
      }
    }

    return [...products]
      .filter(
        (p) =>
          p.status !== 'archived' &&
          (categoryFilter === 'all' || p.categoryId === categoryFilter)
      )
      .map((p) => ({
        product: p,
        periodSoldCount: soldByProduct.get(p.id) || 0,
      }))
      .sort((a, b) => b.periodSoldCount - a.periodSoldCount)
      .slice(0, isReportsView ? 10 : 5);
  }, [products, nonCancelledOrders, categoryFilter, isReportsView]);

  const recentOrders = useMemo(
    () =>
      [...filteredBaselineOrders]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, isReportsView ? 12 : 6),
    [filteredBaselineOrders, isReportsView]
  );

  const unreadInquiriesCount = useMemo(
    () => inquiries.filter((i) => i.status === 'unread').length,
    [inquiries]
  );

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.id === categoryId)?.name || 'Toifa';

  const handleConfirmResetStats = async () => {
    setResetError('');
    setIsResettingStats(true);
    try {
      const ok = await resetOrderStatsBaseline();
      if (ok) setIsResetModalOpen(false);
      else setResetError('Statistikani bazaga saqlab boʻlmadi. Ulanish yoki Supabase sozlamalarini tekshiring.');
    } catch {
      setResetError('Statistikani saqlashda xatolik yuz berdi. Qayta urinib koʻring.');
    } finally {
      setIsResettingStats(false);
    }
  };

  const handleSaveQuickStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStockProduct) return;

    const nextThreshold = Math.max(1, quickThresholdVal);
    if (nextThreshold !== quickStockProduct.lowStockThreshold) {
      saveProduct({
        ...quickStockProduct,
        lowStockThreshold: nextThreshold,
        stock: Math.max(0, quickStockVal),
        updatedAt: new Date().toISOString(),
      });
    }
    adjustProductStock(
      quickStockProduct.id,
      Math.max(0, quickStockVal),
      quickStockReason.trim() || 'Boshqaruv panelidan tezkor zaxira yangilandi'
    );
    setQuickStockProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold" size="sm">
              {isReportsView ? (
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>MOLIYAVIY HISOBOTLAR</span>
                </span>
              ) : (
                'ZAVEN ADMIN BOSHQARUV'
              )}
            </Badge>
            {storeSettings.statsResetAt && (
              <span className="text-[11px] font-bold text-brand-green">
                Statistika boshi:{' '}
                {formatDateUz(storeSettings.statsResetAt, true)}
              </span>
            )}
          </div>
          <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            {isReportsView
              ? 'Savdo tahlili va batafsil hisobotlar'
              : 'Doʻkon koʻrsatkichlari va tezkor nazorat'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Barcha hisoblagichlar faqat haqiqiy buyurtmalardan hisoblanadi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => setIsResetModalOpen(true)}
          >
            Statistikani 0 ga tushirish
          </Button>
          <Link to="/admin/products">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4 text-[#C89D54]" />}
            >
              Mahsulot qoʻshish
            </Button>
          </Link>
        </div>
      </div>

      {/* Report Filters Bar */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Select
          label="Vaqt oraligʻi"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
          options={[
            { value: 'all', label: 'Barcha vaqt (Baseline boʻyicha)' },
            { value: 'today', label: 'Bugun' },
            { value: '7d', label: 'Oxirgi 7 kun' },
            { value: '30d', label: 'Oxirgi 30 kun' },
          ]}
        />

        <Select
          label="Toifa boʻyicha filtr"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Barcha toifalar' },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />

        <Select
          label="Buyurtma holati"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Barcha holatlar' },
            { value: 'new', label: 'Yangi' },
            { value: 'confirmed', label: 'Tasdiqlangan' },
            { value: 'preparing', label: 'Tayyorlanmoqda' },
            { value: 'shipped', label: 'Yoʻlda' },
            { value: 'delivered', label: 'Yetkazildi' },
            { value: 'cancelled', label: 'Bekor qilingan' },
          ]}
        />
      </div>

      {/* KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-5 shadow-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Haqiqiy tushum
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-green-light dark:bg-[#162923] text-brand-green flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-brand-green">
            {formatUZS(totalRevenue)}
          </p>
          <p className="text-[11px] text-gray-500">
            {nonCancelledOrders.length} ta faol buyurtma
          </p>
        </div>

        <Link
          to="/admin/orders"
          className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] hover:border-brand-green p-4 sm:p-5 shadow-card space-y-2 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Yangi buyurtmalar
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-[#162923] text-sky-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-gray-100">
            {newOrdersCount} ta
          </p>
          <p className="text-[11px] text-brand-green font-semibold">
            Tanlangan davrda: {filteredBaselineOrders.length} ta →
          </p>
        </Link>

        <Link
          to="/admin/orders"
          className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] hover:border-[#C89D54] p-4 sm:p-5 shadow-card space-y-2 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Tekshirilayotgan cheklar
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#162923] text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-amber-700">
            {pendingReceiptsCount} ta
          </p>
          <p className="text-[11px] text-gray-500">
            {unreadInquiriesCount} ta yangi mijoz murojaati
          </p>
        </Link>

        <Link
          to="/admin/inventory"
          className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] hover:border-red-400 p-4 sm:p-5 shadow-card space-y-2 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Kam qolgan zaxira
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-[#162923] text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-red-600">
            {lowStockProducts.length} ta mahsulot
          </p>
          <p className="text-[11px] text-gray-500">
            Ombor qoldigʻini boshqarish →
          </p>
        </Link>
      </div>

      {/* Status Breakdown Bar */}
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card">
        <div className="flex items-center gap-2 mb-3 text-xs font-extrabold uppercase tracking-wider text-gray-500">
          <Filter className="w-3.5 h-3.5 text-brand-green" />
          <span>Buyurtmalar holati boʻyicha taqsimot (Tanlangan davr)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
          {(Object.keys(ORDER_STATUS_META) as OrderStatus[]).map((st) => (
            <div
              key={st}
              className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2"
            >
              <span className="font-semibold text-gray-700 dark:text-gray-200 truncate">
                {ORDER_STATUS_META[st].label}
              </span>
              <Badge variant={ORDER_STATUS_META[st].variant} size="sm">
                {statusBreakdown[st]}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Orders Section (Mobile Cards + Desktop Table) */}
      <section className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] shadow-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#28453B] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-gray-100">
              Soʻnggi buyurtmalar
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Barcha tarixiy buyurtmalar «Buyurtmalar» boʻlimida saqlanadi
            </p>
          </div>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-green hover:underline"
          >
            <span>Barchasini koʻrish</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <>
            <div className="md:hidden divide-y divide-gray-200 dark:divide-[#28453B]">
              {recentOrders.map((order) => {
                const statusMeta = ORDER_STATUS_META[order.status];
                return (
                  <div key={order.id} className="p-4 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-extrabold text-brand-green text-sm">
                        #{order.orderNumber}
                      </span>
                      <Badge variant={statusMeta.variant} size="sm">
                        {statusMeta.label}
                      </Badge>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                        {order.customerName}
                      </p>
                      <p className="text-gray-600 dark:text-gray-300 font-semibold">
                        {order.customerPhone} • {order.region}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        {formatDateUz(order.createdAt, true)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#28453B]">
                      <div>
                        <span className="text-[11px] text-gray-500 block">
                          {order.paymentMethodLabel}
                        </span>
                        <strong className="text-sm font-extrabold text-brand-green">
                          {formatUZS(order.totalAmount)}
                        </strong>
                      </div>
                      <Link to={`/admin/orders?q=${order.orderNumber}`}>
                        <Button
                          variant="secondary"
                          size="sm"
                          leftIcon={<Eye className="w-3.5 h-3.5" />}
                        >
                          Tafsilotlar
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3 px-4">Buyurtma #</th>
                    <th className="py-3 px-4">Mijoz va Telefon</th>
                    <th className="py-3 px-4">Hudud</th>
                    <th className="py-3 px-4">Toʻlov va Chek</th>
                    <th className="py-3 px-4">Summa</th>
                    <th className="py-3 px-4">Holati</th>
                    <th className="py-3 px-4 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#28453B] text-xs sm:text-sm">
                  {recentOrders.map((order) => {
                    const statusMeta = ORDER_STATUS_META[order.status];
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50/80 dark:hover:bg-[#162923]/60 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono font-extrabold text-brand-green block">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDateUz(order.createdAt, true)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900 dark:text-gray-100">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {order.customerPhone}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-gray-800 dark:text-gray-200">
                          {order.region}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs text-gray-700 dark:text-gray-300 block mb-1">
                            {order.paymentMethodLabel}
                          </span>
                          {order.paymentVerificationStatus ===
                            'pending_verification' && (
                            <Badge variant="warning" size="sm">
                              Toʻlov tekshirilmoqda
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'verified' && (
                            <Badge variant="success" size="sm">
                              Tasdiqlangan
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 font-extrabold text-brand-green whitespace-nowrap">
                          {formatUZS(order.totalAmount)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={statusMeta.variant} size="sm">
                            {statusMeta.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link to={`/admin/orders?q=${order.orderNumber}`}>
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              Koʻrish
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-xs sm:text-sm text-gray-500">
            Tanlangan hisob davrida yangi buyurtmalar yoʻq. Barcha tarixiy
            buyurtmalar «Buyurtmalar» boʻlimida saqlanmoqda.
          </div>
        )}
      </section>

      {/* Top Selling Products & Low-Stock Alerts with Quick Stock Adjust */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <section className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] shadow-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                Top mahsulotlar (Davr boʻyicha)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Toʻliq mahsulot nomi, SKU, narx va sotilgan soni
              </p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-extrabold text-brand-green hover:underline shrink-0"
            >
              Barchasi →
            </Link>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-[#28453B]">
            {topSellingProducts.map(({ product: prod, periodSoldCount }) => (
              <div
                key={prod.id}
                className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <ProductImage
                    src={prod.images[0]}
                    alt={prod.name}
                    className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 break-words leading-snug">
                      {prod.name}
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      SKU: {prod.sku} • {getCategoryName(prod.categoryId)}
                    </p>
                    <p className="text-xs font-extrabold text-brand-green">
                      {formatUZS(prod.salePrice ?? prod.price)}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <Badge variant="gold" size="sm">
                    Sotilgan: {periodSoldCount} dona
                  </Badge>
                  <span className="block text-[11px] text-gray-500">
                    Omborda: {prod.stock} dona
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] shadow-card overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                Kam qolgan va tugagan mahsulotlar
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Belgilangan minimal zaxira chegarasidan kam qolgan buyumlar
              </p>
            </div>
            <Link
              to="/admin/inventory"
              className="text-xs font-extrabold text-brand-green hover:underline shrink-0"
            >
              Ombor →
            </Link>
          </div>

          {lowStockProducts.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-[#28453B]">
              {lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="p-3.5 sm:p-4 flex items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <ProductImage
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 break-words leading-snug">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-gray-500 font-mono">
                        SKU: {prod.sku}
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                        Minimal zaxira chegarasi: {prod.lowStockThreshold} dona
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1.5">
                    <Badge
                      variant={prod.stock <= 0 ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {prod.stock <= 0
                        ? 'Tugagan (0 dona)'
                        : `Qoldiq: ${prod.stock} dona`}
                    </Badge>
                    <div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickStockProduct(prod);
                          setQuickStockVal(prod.stock);
                          setQuickThresholdVal(prod.lowStockThreshold);
                          setQuickStockReason('');
                        }}
                        className="text-[11px] font-extrabold text-brand-green hover:underline"
                      >
                        Tezkor toʻldirish
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                Barcha mahsulotlar zaxirasi yetarli
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Confirm Reset Statistics Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Statistika hisoblagichlarini 0 ga tushirish"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setIsResetModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              isLoading={isResettingStats}
              onClick={handleConfirmResetStats}
            >
              0 ga tushirish
            </Button>
          </div>
        }
      >
        {resetError && (
          <div role="alert" className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/30 px-3 py-2.5 text-xs font-semibold text-red-300">
            <span>{resetError}</span>
            <button type="button" aria-label="Xatolikni yopish" onClick={() => setResetError('')} className="shrink-0 rounded p-0.5 hover:bg-red-900/50">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
          Boshqaruv panelidagi buyurtma, tushum, holat taqsimoti va top
          mahsulotlar sotuv hisoblagichlari hozirgi vaqtdan boshlab{' '}
          <strong>0</strong> dan hisoblanadi. Hech qanday buyurtma, mijoz,
          mahsulot yoki ombor zaxirasi oʻchirilmaydi.
        </p>
      </Modal>

      {/* Quick Stock Adjustment Modal */}
      <Modal
        isOpen={Boolean(quickStockProduct)}
        onClose={() => setQuickStockProduct(null)}
        title={
          quickStockProduct
            ? `Zaxirani yangilash: ${quickStockProduct.sku}`
            : ''
        }
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setQuickStockProduct(null)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="dashboard-quick-stock-form"
              variant="primary"
              size="sm"
              fullWidth
            >
              Saqlash
            </Button>
          </div>
        }
      >
        {quickStockProduct && (
          <form
            id="dashboard-quick-stock-form"
            onSubmit={handleSaveQuickStock}
            className="space-y-4 text-xs sm:text-sm"
          >
            <p className="font-bold text-gray-900 dark:text-gray-100">
              {quickStockProduct.name}
            </p>
            <NumericInput
              label="Yangi zaxira soni (dona)"
              required
              min={0}
              value={quickStockVal}
              onChange={(val) => setQuickStockVal(val ?? 0)}
            />
            <NumericInput
              label="Minimal zaxira chegarasi (dona)"
              required
              min={1}
              value={quickThresholdVal}
              onChange={(val) => setQuickThresholdVal(val ?? 5)}
            />
            <Input
              label="Oʻzgarish sababi"
              value={quickStockReason}
              onChange={(e) => setQuickStockReason(e.target.value)}
              placeholder="Masalan: Yangi partiya qabul qilindi"
            />
          </form>
        )}
      </Modal>
    </div>
  );
};
