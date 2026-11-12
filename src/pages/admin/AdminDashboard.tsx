import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Calculator,
  Package,
  AlertTriangle,
  Calendar,
  Filter,
  ArrowRight,
  Eye,
  PlusCircle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Info,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Order, OrderStatus } from '../../types';
import { formatUZS, formatDateUz } from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

type DateRangePreset = 'today' | '7d' | '30d' | 'all';

const STATUS_BADGE_MAP: Record<
  OrderStatus,
  {
    label: string;
    variant: 'info' | 'gold' | 'warning' | 'success' | 'danger' | 'neutral';
    barColor: string;
  }
> = {
  new: {
    label: 'Yangi',
    variant: 'info',
    barColor: 'bg-sky-500',
  },
  confirmed: {
    label: 'Tasdiqlangan',
    variant: 'gold',
    barColor: 'bg-brand-gold',
  },
  preparing: {
    label: 'Tayyorlanmoqda',
    variant: 'warning',
    barColor: 'bg-amber-500',
  },
  shipped: {
    label: 'Yoʻlda',
    variant: 'info',
    barColor: 'bg-indigo-500',
  },
  delivered: {
    label: 'Yetkazilgan',
    variant: 'success',
    barColor: 'bg-brand-green',
  },
  cancelled: {
    label: 'Bekor qilingan',
    variant: 'danger',
    barColor: 'bg-red-500',
  },
};

export const AdminDashboard: React.FC<{ isReportsView?: boolean }> = ({
  isReportsView = false,
}) => {
  const {
    orders,
    products,
    categories,
    updateOrderStatus,
    adjustProductStock,
  } = useStore();

  // Dashboard Filters
  const [dateRange, setDateRange] = useState<DateRangePreset>('30d');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Quick Order Inspect & Quick Stock Adjust Modals
  const [inspectedOrder, setInspectedOrder] = useState<Order | null>(null);
  const [quickRestockProductId, setQuickRestockProductId] = useState<
    string | null
  >(null);
  const [restockAddQty, setRestockAddQty] = useState<number>(15);

  // Valid (non-cancelled) orders
  const validOrders = useMemo(
    () => orders.filter((o) => o.status !== 'cancelled'),
    [orders]
  );

  // Calculate Today's, Weekly, and Monthly Revenue (Blending live orders + clearly labeled demo baselines)
  const revenueMetrics = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();

    const liveTodayOrders = validOrders.filter(
      (o) => new Date(o.createdAt).getTime() >= startOfToday
    );
    const liveTotalRevenue = validOrders.reduce(
      (sum, o) => sum + o.totalAmount,
      0
    );

    // Ensure realistic Today / Weekly / Monthly figures utilizing live store orders + demo historical baseline
    const todayRevenue =
      liveTodayOrders.length > 0
        ? liveTodayOrders.reduce((s, o) => s + o.totalAmount, 0)
        : validOrders[0]?.totalAmount || 332000;

    const weeklyRevenue = liveTotalRevenue + 1480000;
    const monthlyRevenue = liveTotalRevenue + 6850000;

    const avgOrderValue =
      validOrders.length > 0
        ? Math.round(liveTotalRevenue / validOrders.length)
        : 0;

    return {
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      liveTotalRevenue,
      avgOrderValue,
    };
  }, [validOrders]);

  // Order Status Breakdown
  const statusBreakdown = useMemo(() => {
    const statuses: OrderStatus[] = [
      'new',
      'confirmed',
      'preparing',
      'shipped',
      'delivered',
      'cancelled',
    ];
    return statuses.map((st) => {
      const count = orders.filter((o) => o.status === st).length;
      const percentage =
        orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
      return {
        status: st,
        count,
        percentage,
        meta: STATUS_BADGE_MAP[st],
      };
    });
  }, [orders]);

  // Filtered Products for Best Sellers & Low Stock
  const filteredCatalogProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status === 'archived') return false;
      if (
        selectedCategoryId !== 'all' &&
        p.categoryId !== selectedCategoryId
      ) {
        return false;
      }
      return true;
    });
  }, [products, selectedCategoryId]);

  const bestSellingProducts = useMemo(() => {
    return [...filteredCatalogProducts]
      .sort((a, b) => b.soldCount - a.soldCount)
      .slice(0, 5);
  }, [filteredCatalogProducts]);

  const lowStockProducts = useMemo(() => {
    return filteredCatalogProducts
      .filter((p) => p.stock === 0 || p.stock <= p.lowStockThreshold)
      .sort((a, b) => a.stock - b.stock);
  }, [filteredCatalogProducts]);

  // Filtered Recent Orders Table
  const filteredRecentOrders = useMemo(() => {
    return orders
      .filter((ord) => {
        if (statusFilter !== 'all' && ord.status !== statusFilter) {
          return false;
        }
        if (selectedCategoryId !== 'all') {
          const hasCatItem = ord.items.some((item) => {
            const prod = products.find((p) => p.id === item.productId);
            return prod?.categoryId === selectedCategoryId;
          });
          if (!hasCatItem) return false;
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders, statusFilter, selectedCategoryId, products]);

  // Clearly Labeled Demo Revenue Chart Data (Adapts to selected DateRangePreset)
  const chartSeries = useMemo(() => {
    if (dateRange === 'today') {
      return [
        { label: '09:00', revenue: 129000, orders: 1 },
        { label: '12:00', revenue: 245000, orders: 1 },
        { label: '15:00', revenue: 332000, orders: 2 },
        { label: '18:00', revenue: 199000, orders: 1 },
        { label: '21:00', revenue: 170000, orders: 1 },
      ];
    }
    if (dateRange === '7d') {
      return [
        { label: 'Dush', revenue: 420000, orders: 2 },
        { label: 'Sesh', revenue: 315000, orders: 1 },
        { label: 'Chor', revenue: 580000, orders: 3 },
        { label: 'Pay', revenue: 290000, orders: 1 },
        { label: 'Jum', revenue: 695000, orders: 3 },
        { label: 'Shan', revenue: 810000, orders: 4 },
        {
          label: 'Yak (Joriy)',
          revenue: revenueMetrics.todayRevenue,
          orders: Math.max(1, validOrders.length),
        },
      ];
    }
    return [
      { label: '1-hafta', revenue: 1650000, orders: 7 },
      { label: '2-hafta', revenue: 2120000, orders: 9 },
      { label: '3-hafta', revenue: 1890000, orders: 8 },
      {
        label: '4-hafta (Joriy)',
        revenue: revenueMetrics.weeklyRevenue,
        orders: 6 + validOrders.length,
      },
    ];
  }, [dateRange, revenueMetrics, validOrders.length]);

  const maxChartRevenue = Math.max(
    ...chartSeries.map((item) => item.revenue),
    100000
  );

  // Category Revenue Breakdown for Reports
  const categorySalesBreakdown = useMemo(() => {
    return categories
      .filter((c) => c.isActive)
      .map((cat) => {
        const catProducts = products.filter((p) => p.categoryId === cat.id);
        const unitsSold = catProducts.reduce((s, p) => s + p.soldCount, 0);
        const estimatedRevenue = catProducts.reduce(
          (s, p) => s + p.soldCount * (p.salePrice ?? p.price),
          0
        );
        return {
          id: cat.id,
          name: cat.name,
          unitsSold,
          estimatedRevenue,
        };
      })
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);
  }, [categories, products]);

  const maxCategoryRevenue = Math.max(
    ...categorySalesBreakdown.map((c) => c.estimatedRevenue),
    100000
  );

  const quickRestockProduct = products.find(
    (p) => p.id === quickRestockProductId
  );

  const handleConfirmQuickRestock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickRestockProduct || restockAddQty <= 0) return;
    adjustProductStock(
      quickRestockProduct.id,
      quickRestockProduct.stock + restockAddQty,
      'Dashboard tezkor zaxira toʻldirish'
    );
    setQuickRestockProductId(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Top Header & Date Range / Category Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              {isReportsView
                ? 'Hisobotlar va savdo tahlili (Analytics)'
                : 'ZAVEN Boshqaruv Paneli (Dashboard)'}
            </h1>
            <Badge variant="gold" size="sm">
              Demo + Jonli maʼlumotlar
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Savdo tushumlari, buyurtmalar holati, eng koʻp sotilgan mahsulotlar va ombor qoldigʻi nazorati
          </p>
        </div>

        {/* Date Range & Category Data Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-surface-page p-1 border border-gray-200">
            {[
              { id: 'today', label: 'Bugun' },
              { id: '7d', label: '7 kun' },
              { id: '30d', label: '30 kun' },
              { id: 'all', label: 'Barchasi' },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => setDateRange(preset.id as DateRangePreset)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  dateRange === preset.id
                    ? 'bg-brand-green text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 hidden sm:inline" />
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 focus:border-brand-green focus:outline-none"
              aria-label="Toifa boʻyicha filtrlash"
            >
              <option value="all">Barcha toifalar</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. Primary Revenue & Order KPI Cards (Today, Weekly, Monthly, AOV, Orders) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Today's Revenue */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Bugungi tushum
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-green-light text-brand-green flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">
              {formatUZS(revenueMetrics.todayRevenue)}
            </p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1">
              Joriy kunlik savdo koʻrsatkichi
            </p>
          </div>
        </div>

        {/* Weekly Revenue */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Haftalik tushum
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-gold-light text-brand-gold-dark flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">
              {formatUZS(revenueMetrics.weeklyRevenue)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Soʻnggi 7 kun (Demo + Jonli)
            </p>
          </div>
        </div>

        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Oylik tushum
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-green text-brand-gold flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-extrabold text-brand-green">
              {formatUZS(revenueMetrics.monthlyRevenue)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Soʻnggi 30 kun (Demo + Jonli)
            </p>
          </div>
        </div>

        {/* Total Orders Count */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Jami buyurtmalar
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <p className="text-xl font-extrabold text-gray-900">
                {orders.length} ta
              </p>
              <span className="text-xs font-bold text-brand-gold-dark">
                ({orders.filter((o) => o.status === 'new').length} yangi)
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Faol tizimdagi buyurtmalar
            </p>
          </div>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Oʻrtacha chek (AOV)
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-lg sm:text-xl font-extrabold text-gray-900">
              {formatUZS(revenueMetrics.avgOrderValue)}
            </p>
            <p className="text-[11px] text-gray-500 mt-1">
              Har bir faol buyurtma boʻyicha
            </p>
          </div>
        </div>
      </div>

      {/* 2. Readable Revenue Chart + Order Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (7 cols): Revenue Bar Chart */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">
                  Savdo tushumlari dinamikasi (soʻmda)
                </h2>
                <Badge variant="neutral" size="sm">
                  Demo grafik maʼlumotlari
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Tanlangan davr boʻyicha tushum va buyurtmalar soni taqqoslanmasi
              </p>
            </div>
            <span className="text-xs font-bold text-brand-green">
              Faol buyurtmalar jami: {formatUZS(revenueMetrics.liveTotalRevenue)}
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 items-end h-52 pt-6 px-2 border-b border-gray-200">
              {chartSeries.map((point, idx) => {
                const heightPercent = Math.max(
                  14,
                  Math.round((point.revenue / maxChartRevenue) * 100)
                );
                const isLast = idx === chartSeries.length - 1;

                return (
                  <div
                    key={point.label}
                    className="h-full flex flex-col justify-end items-center group"
                  >
                    <div className="text-[10px] font-bold text-gray-700 mb-1.5 text-center truncate w-full">
                      {Math.round(point.revenue / 1000)}k
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full max-w-[44px] rounded-t-lg transition-all ${
                        isLast
                          ? 'bg-brand-gold hover:bg-brand-gold-hover'
                          : 'bg-brand-green hover:bg-brand-green-hover'
                      }`}
                      title={`${point.label}: ${formatUZS(point.revenue)} (${point.orders} ta buyurtma)`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Labels */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 pt-2.5 px-2 text-center">
              {chartSeries.map((point) => (
                <div key={point.label}>
                  <p className="text-xs font-bold text-gray-800 truncate">
                    {point.label}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    {point.orders} ta buyurtma
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface-page border border-gray-200 flex items-center justify-between text-xs text-gray-600">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-brand-green shrink-0" />
              <span>
                Veb-saytdan yangi buyurtma berilganda joriy kun/hafta ustuni avtomatik yangilanadi.
              </span>
            </span>
          </div>
        </section>

        {/* Right (5 cols): Order Status Breakdown */}
        <section className="lg:col-span-5 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col justify-between space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Buyurtmalar holati taqsimoti
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Jami {orders.length} ta buyurtmaning bosqichlar boʻyicha ulushi
              </p>
            </div>
            <Link
              to="/admin/orders"
              className="text-xs font-bold text-brand-green hover:underline"
            >
              Barchasi →
            </Link>
          </div>

          <div className="space-y-3.5">
            {statusBreakdown.map(({ status, count, percentage, meta }) => (
              <div key={status} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant={meta.variant} size="sm">
                      {meta.label}
                    </Badge>
                  </div>
                  <span className="font-bold text-gray-900">
                    {count} ta ({percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${meta.barColor}`}
                    style={{ width: `${Math.max(count > 0 ? 8 : 0, percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Muvaffaqiyatli yetkazilganlar:
            </span>
            <strong className="text-emerald-700 font-extrabold">
              {orders.filter((o) => o.status === 'delivered').length} ta buyurtma
            </strong>
          </div>
        </section>
      </div>

      {/* Category Performance Breakdown (Shown prominently when viewing Reports & Analytics or Dashboard) */}
      <section className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3.5">
          <div>
            <h2 className="text-base font-extrabold text-gray-900">
              Toifalar boʻyicha savdo hajmi (Demo + Jonli hisobot)
            </h2>
            <p className="text-xs text-gray-500">
              Har bir mahsulot toifasi boʻyicha sotilgan donalar va umumiy aylanma
            </p>
          </div>
          <Badge variant="green" size="sm">
            {categorySalesBreakdown.length} ta faol toifa
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {categorySalesBreakdown.map((cat) => {
            const pct = Math.round(
              (cat.estimatedRevenue / maxCategoryRevenue) * 100
            );
            return (
              <div
                key={cat.id}
                className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-2"
              >
                <p className="text-xs font-bold text-gray-900 line-clamp-1">
                  {cat.name}
                </p>
                <p className="text-sm font-extrabold text-brand-green">
                  {formatUZS(cat.estimatedRevenue)}
                </p>
                <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className="h-full bg-brand-gold rounded-full"
                    style={{ width: `${Math.max(10, pct)}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-500">
                  Sotilgan: <strong>{cat.unitsSold} dona</strong>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Best-Selling Products & Low-Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Best-Selling Products (6 cols) */}
        <section className="lg:col-span-6 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">
                Eng koʻp sotilgan mahsulotlar (Top 5)
              </h2>
              <p className="text-xs text-gray-500">
                Sotilgan donalar soni va joriy savdo narxi boʻyicha
              </p>
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-bold text-brand-green hover:underline"
            >
              Mahsulotlar →
            </Link>
          </div>

          <div className="divide-y divide-gray-100">
            {bestSellingProducts.map((prod, idx) => {
              const unitPrice = prod.salePrice ?? prod.price;
              return (
                <div
                  key={prod.id}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-brand-green-light text-brand-green font-extrabold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
                    />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                        {prod.name}
                      </p>
                      <p className="text-[11px] text-gray-500">
                        SKU: {prod.sku} • Narx: {formatUZS(unitPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-brand-green block">
                      {prod.soldCount} dona sotilgan
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Zaxira: {prod.stock} dona
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Low-Stock Products Alert Table (6 cols) */}
        <section className="lg:col-span-6 bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-gray-900">
                  Kam qolgan va tugagan mahsulotlar
                </h2>
                {lowStockProducts.length > 0 && (
                  <Badge variant="danger" size="sm">
                    {lowStockProducts.length} ta ogohlantirish
                  </Badge>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Minimal chegara (`lowStockThreshold`) dan pastga tushgan mahsulotlar
              </p>
            </div>
            <Link
              to="/admin/inventory"
              className="text-xs font-bold text-brand-green hover:underline"
            >
              Omborxona →
            </Link>
          </div>

          {lowStockProducts.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {lowStockProducts.map((prod) => {
                const isZero = prod.stock <= 0;
                return (
                  <div
                    key={prod.id}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={prod.images[0]}
                        alt={prod.name}
                        className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-50"
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {prod.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-gray-500">
                            SKU: {prod.sku}
                          </span>
                          {isZero ? (
                            <Badge variant="danger" size="sm">
                              Tugagan (0 dona)
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              Kam qoldi: {prod.stock} dona
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<PlusCircle className="w-3.5 h-3.5 text-brand-green" />}
                      onClick={() => {
                        setQuickRestockProductId(prod.id);
                        setRestockAddQty(15);
                      }}
                    >
                      Toʻldirish
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-gray-500">
              Barcha mahsulotlar zaxirasi yetarli darajada.
            </div>
          )}
        </section>
      </div>

      {/* 4. Practical Recent Orders Table with Status Filter & Quick Status Update */}
      <section className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
        <div className="p-5 sm:p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-extrabold text-gray-900">
              Soʻnggi buyurtmalar jadvali
            </h2>
            <p className="text-xs text-gray-500">
              Yangi buyurtmalar alohida belgilangan; holatni toʻgʻridan-toʻgʻri jadvaldan yangilashingiz mumkin
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-xl border border-gray-300 bg-white px-3 text-xs font-bold text-gray-800 focus:border-brand-green focus:outline-none"
              aria-label="Buyurtma holati boʻyicha filtrlash"
            >
              <option value="all">Barcha holatlar ({orders.length})</option>
              <option value="new">Yangi ({orders.filter((o) => o.status === 'new').length})</option>
              <option value="confirmed">Tasdiqlangan</option>
              <option value="preparing">Tayyorlanmoqda</option>
              <option value="shipped">Yoʻlda</option>
              <option value="delivered">Yetkazilgan</option>
              <option value="cancelled">Bekor qilingan</option>
            </select>

            <Link to="/admin/orders">
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Barcha buyurtmalar
              </Button>
            </Link>
          </div>
        </div>

        {/* Desktop Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                <th className="py-3.5 px-4">Buyurtma #</th>
                <th className="py-3.5 px-4">Xaridor va telefon</th>
                <th className="py-3.5 px-4">Hudud</th>
                <th className="py-3.5 px-4">Sana</th>
                <th className="py-3.5 px-4">Jami summa</th>
                <th className="py-3.5 px-4">Holati</th>
                <th className="py-3.5 px-4 text-right">Tezkor amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
              {filteredRecentOrders.map((ord) => {
                const isNew = ord.status === 'new';
                const statusInfo = STATUS_BADGE_MAP[ord.status];

                return (
                  <tr
                    key={ord.id}
                    className={`transition-colors ${
                      isNew
                        ? 'bg-brand-gold-light/40 hover:bg-brand-gold-light/70'
                        : 'hover:bg-surface-page'
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isNew && (
                          <span
                            className="w-2 h-2 rounded-full bg-brand-gold-dark shrink-0"
                            title="Yangi buyurtma"
                          />
                        )}
                        <span className="font-mono font-extrabold text-brand-green">
                          #{ord.orderNumber}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <p className="font-bold text-gray-900">
                        {ord.customerName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {ord.customerPhone}
                      </p>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-gray-600 max-w-[180px] truncate">
                      {ord.region}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {formatDateUz(ord.createdAt, true)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-gray-900">
                      {formatUZS(ord.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={statusInfo.variant} size="sm">
                        {statusInfo.label}
                      </Badge>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <select
                          value={ord.status}
                          onChange={(e) =>
                            updateOrderStatus(
                              ord.id,
                              e.target.value as OrderStatus,
                              `Dashboard orqali holat ${e.target.value} ga oʻzgartirildi`
                            )
                          }
                          className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-xs font-semibold text-gray-800 focus:border-brand-green focus:outline-none"
                          aria-label={`Buyurtma ${ord.orderNumber} holatini oʻzgartirish`}
                        >
                          <option value="new">Yangi</option>
                          <option value="confirmed">Tasdiqlandi</option>
                          <option value="preparing">Tayyorlanmoqda</option>
                          <option value="shipped">Yoʻlda</option>
                          <option value="delivered">Yetkazildi</option>
                          <option value="cancelled">Bekor qilish</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => setInspectedOrder(ord)}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-brand-green hover:text-white transition-colors"
                          title="Buyurtma tafsilotlarini koʻrish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Order Inspection Modal */}
      <Modal
        isOpen={Boolean(inspectedOrder)}
        onClose={() => setInspectedOrder(null)}
        title={
          inspectedOrder
            ? `Buyurtma #${inspectedOrder.orderNumber}`
            : 'Buyurtma'
        }
        maxWidth="lg"
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInspectedOrder(null)}
          >
            Yopish
          </Button>
        }
      >
        {inspectedOrder && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-surface-page border border-gray-200 space-y-1">
              <p className="font-bold text-gray-900">
                {inspectedOrder.customerName} — {inspectedOrder.customerPhone}
              </p>
              <p className="text-gray-600">
                {inspectedOrder.region}, {inspectedOrder.address}
              </p>
              <p className="text-xs text-gray-500">
                Toʻlov usuli: {inspectedOrder.paymentMethodLabel}
              </p>
            </div>

            <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
              {inspectedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="font-bold text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-500">
                      SKU: {item.sku} • {item.quantity} dona ×{' '}
                      {formatUZS(item.unitPrice)}
                    </p>
                  </div>
                  <span className="font-extrabold text-brand-green">
                    {formatUZS(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between font-extrabold text-base pt-2 border-t border-gray-200">
              <span>Jami buyurtma summasi:</span>
              <span className="text-brand-green">
                {formatUZS(inspectedOrder.totalAmount)}
              </span>
            </div>
          </div>
        )}
      </Modal>

      {/* Quick Stock Replenishment Modal */}
      <Modal
        isOpen={Boolean(quickRestockProduct)}
        onClose={() => setQuickRestockProductId(null)}
        title="Ombor zaxirasini tezkor toʻldirish"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickRestockProductId(null)}
            >
              Bekor qilish
            </Button>
            <Button
              type="submit"
              form="quick-restock-form"
              variant="primary"
              size="sm"
            >
              Zaxirani yangilash
            </Button>
          </>
        }
      >
        {quickRestockProduct && (
          <form
            id="quick-restock-form"
            onSubmit={handleConfirmQuickRestock}
            className="space-y-4 text-xs sm:text-sm"
          >
            <div>
              <p className="font-bold text-gray-900">
                {quickRestockProduct.name}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                SKU: {quickRestockProduct.sku} • Hozirgi qoldiq:{' '}
                <strong className="text-red-600">
                  {quickRestockProduct.stock} dona
                </strong>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Qoʻshiladigan miqdor (dona):
              </label>
              <input
                type="number"
                min={1}
                max={1000}
                value={restockAddQty}
                onChange={(e) => setRestockAddQty(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold text-gray-900 focus:border-brand-green focus:outline-none"
              />
              <p className="text-xs text-emerald-700 font-semibold mt-1.5">
                Yangi zaxira qoldigʻi:{' '}
                {quickRestockProduct.stock + (restockAddQty || 0)} dona
              </p>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
