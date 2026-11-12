import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  MessageSquare,
  Search,
  Eye,
  Phone,
  Send,
  Copy,
  Check,
  XCircle,
  CheckCircle2,
  FileText,
  ShieldCheck,
  X,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { Customer, CustomerInquiry, Order, OrderStatus } from '../../types';
import { formatUZS, formatDateUz } from '../../utils/format';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export type AdminOrdersSection = 'orders' | 'customers' | 'inquiries';

interface AdminOrdersProps {
  initialSection?: AdminOrdersSection;
}

const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  {
    label: string;
    variant: 'info' | 'gold' | 'warning' | 'success' | 'danger' | 'neutral';
  }
> = {
  new: { label: 'Yangi buyurtma', variant: 'gold' },
  confirmed: { label: 'Tasdiqlangan', variant: 'info' },
  preparing: { label: 'Tayyorlanmoqda', variant: 'warning' },
  shipped: { label: 'Yoʻlda (Kuryerda)', variant: 'info' },
  delivered: { label: 'Yetkazib berildi', variant: 'success' },
  cancelled: { label: 'Bekor qilindi', variant: 'danger' },
};

export const AdminOrders: React.FC<AdminOrdersProps> = ({
  initialSection = 'orders',
}) => {
  const [searchParams] = useSearchParams();
  const {
    orders,
    customers,
    inquiries,
    updateOrderStatus,
    addOrderInternalNote,
    reviewOrderReceipt,
    retryOrderTelegramNotification,
    updateInquiryStatus,
    addToast,
  } = useStore();
  const { ownerEmail } = useOwnerAuth();

  const [activeSection, setActiveSection] =
    useState<AdminOrdersSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [orderSearchQuery, setOrderSearchQuery] = useState<string>(
    searchParams.get('q') || ''
  );
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>(
    searchParams.get('status') || 'all'
  );
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newInternalNote, setNewInternalNote] = useState<string>('');
  const [receiptReviewNote, setReceiptReviewNote] = useState<string>('');
  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);
  const [isRetryingTelegram, setIsRetryingTelegram] = useState<boolean>(false);

  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState<string>(
    'Mijoz soʻroviga binoan bekor qilindi'
  );

  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>(
    searchParams.get('q') || ''
  );
  const [customerSortBy, setCustomerSortBy] = useState<
    'spent_desc' | 'orders_desc' | 'recent'
  >('spent_desc');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  const [inquiryFilter, setInquiryFilter] = useState<
    'all' | 'unread' | 'read' | 'replied'
  >('all');
  const [selectedInquiry, setSelectedInquiry] =
    useState<CustomerInquiry | null>(null);
  const [replyDraft, setReplyDraft] = useState<string>('');

  useEffect(() => {
    const qParam = searchParams.get('q');
    const statusParam = searchParams.get('status');
    if (qParam !== null) {
      setOrderSearchQuery(qParam);
      setCustomerSearchQuery(qParam);
    }
    if (statusParam !== null) {
      setOrderStatusFilter(statusParam);
    }
  }, [searchParams]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const filteredOrders = useMemo(() => {
    const q = orderSearchQuery.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return orders
      .filter((ord) => {
        if (orderStatusFilter === 'pending_receipt') {
          if (ord.paymentVerificationStatus !== 'pending_verification') {
            return false;
          }
        } else if (
          orderStatusFilter !== 'all' &&
          ord.status !== orderStatusFilter
        ) {
          return false;
        }

        const createdTime = new Date(ord.createdAt).getTime();
        if (fromTime && !Number.isNaN(fromTime) && createdTime < fromTime) {
          return false;
        }
        if (toTime && !Number.isNaN(toTime) && createdTime > toTime) {
          return false;
        }

        if (q) {
          const matchNumber = ord.orderNumber.toLowerCase().includes(q);
          const matchName = ord.customerName.toLowerCase().includes(q);
          const matchPhone = ord.customerPhone.toLowerCase().includes(q);
          if (!matchNumber && !matchName && !matchPhone) {
            return false;
          }
        }
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders, orderSearchQuery, orderStatusFilter, dateFrom, dateTo]);

  const enrichedCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    const list = customers.map((cust) => {
      const cleanPhone = cust.phone.replace(/\D/g, '');
      const matchingOrders = orders.filter(
        (o) =>
          o.customerId === cust.id ||
          o.customerPhone.replace(/\D/g, '') === cleanPhone
      );
      const validOrders = matchingOrders.filter(
        (o) => o.status !== 'cancelled'
      );

      return {
        ...cust,
        orderCount: Math.max(cust.orderCount, matchingOrders.length),
        totalSpent: Math.max(
          cust.totalSpent,
          validOrders.reduce((s, o) => s + o.totalAmount, 0)
        ),
        lastOrderDate:
          matchingOrders.length > 0
            ? matchingOrders[0].createdAt
            : cust.lastOrderDate,
      };
    });

    return list
      .filter((c) => {
        if (!q) return true;
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (customerSortBy === 'orders_desc')
          return b.orderCount - a.orderCount;
        return b.totalSpent - a.totalSpent;
      });
  }, [customers, orders, customerSearchQuery, customerSortBy]);

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      if (inquiryFilter === 'all') return true;
      return inq.status === inquiryFilter;
    });
  }, [inquiries, inquiryFilter]);

  const pendingReceiptsCount = orders.filter(
    (o) => o.paymentVerificationStatus === 'pending_verification'
  ).length;
  const unreadInquiriesCount = inquiries.filter(
    (i) => i.status === 'unread'
  ).length;

  const handleStatusChangeRequest = (
    order: Order,
    nextStatus: OrderStatus
  ) => {
    if (nextStatus === 'cancelled') {
      setOrderToCancel(order);
      setCancelReason('Mijoz soʻroviga binoan bekor qilindi');
      return;
    }
    updateOrderStatus(
      order.id,
      nextStatus,
      `Holat «${ORDER_STATUS_CONFIG[nextStatus].label}» ga oʻzgartirildi`
    );
  };

  const handleConfirmCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToCancel) return;
    updateOrderStatus(
      orderToCancel.id,
      'cancelled',
      `Buyurtma bekor qilindi. Sabab: ${cancelReason.trim()}`
    );
    setOrderToCancel(null);
  };

  const handleAddNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newInternalNote.trim()) return;
    addOrderInternalNote(selectedOrder.id, newInternalNote.trim());
    setNewInternalNote('');
  };

  const handleCopyPhone = (phone: string, id: string) => {
    navigator.clipboard?.writeText(phone).catch(() => {});
    setCopiedPhoneId(id);
    addToast({ type: 'info', title: phone });
    setTimeout(() => setCopiedPhoneId(null), 2500);
  };

  const handleSendInquiryReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry) return;
    updateInquiryStatus(selectedInquiry.id, 'replied');
    setReplyDraft('');
    setSelectedInquiry(null);
  };

  const handleReceiptDecision = (decision: 'verified' | 'rejected') => {
    if (!selectedOrder) return;
    reviewOrderReceipt(
      selectedOrder.id,
      decision,
      ownerEmail || 'owner@zaven.uz',
      receiptReviewNote
    );
    setReceiptReviewNote('');
  };

  const handleRetryTelegram = async (orderId: string) => {
    setIsRetryingTelegram(true);
    try {
      await retryOrderTelegramNotification(orderId);
    } finally {
      setIsRetryingTelegram(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Workspace Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
              Buyurtmalar, Toʻlov Cheklari va Mijozlar Boshqaruvi
            </h1>
            {pendingReceiptsCount > 0 && (
              <Badge variant="warning" size="md">
                {pendingReceiptsCount} ta chek tekshirishni kutmoqda
              </Badge>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Humo / Uzcard toʻlov cheklarini koʻrish va tasdiqlash, Telegram xabarnomalar holati hamda mijozlar bazasi
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-surface-page p-1 border border-gray-200 self-start lg:self-auto">
          <Link
            to="/admin/orders"
            onClick={() => setActiveSection('orders')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'orders'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buyurtmalar ({orders.length})</span>
          </Link>

          <Link
            to="/admin/customers"
            onClick={() => setActiveSection('customers')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'customers'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Mijozlar ({customers.length})</span>
          </Link>

          <Link
            to="/admin/inquiries"
            onClick={() => setActiveSection('inquiries')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'inquiries'
                ? 'bg-brand-green text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>
              Murojaatlar ({inquiries.length}
              {unreadInquiriesCount > 0 ? ` / ${unreadInquiriesCount}` : ''})
            </span>
          </Link>
        </div>
      </div>

      {/* SECTION 1: ORDERS & RECEIPT VERIFICATION */}
      {activeSection === 'orders' && (
        <div className="space-y-5">
          {/* Status & Pending Receipt Quick Pills */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
            {[
              { id: 'all', label: 'Barcha buyurtmalar', count: orders.length },
              {
                id: 'pending_receipt',
                label: '⏳ Toʻlov tekshirilmoqda (Cheklar)',
                count: pendingReceiptsCount,
              },
              {
                id: 'new',
                label: 'Yangi',
                count: orders.filter((o) => o.status === 'new').length,
              },
              {
                id: 'confirmed',
                label: 'Tasdiqlangan',
                count: orders.filter((o) => o.status === 'confirmed').length,
              },
              {
                id: 'preparing',
                label: 'Tayyorlanmoqda',
                count: orders.filter((o) => o.status === 'preparing').length,
              },
              {
                id: 'shipped',
                label: 'Yoʻlda',
                count: orders.filter((o) => o.status === 'shipped').length,
              },
              {
                id: 'delivered',
                label: 'Yetkazilgan',
                count: orders.filter((o) => o.status === 'delivered').length,
              },
              {
                id: 'cancelled',
                label: 'Bekor qilingan',
                count: orders.filter((o) => o.status === 'cancelled').length,
              },
            ].map((pill) => {
              const isSelected = orderStatusFilter === pill.id;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setOrderStatusFilter(pill.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-brand-green text-white border-brand-green shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-brand-green'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      isSelected
                        ? 'bg-brand-gold text-brand-green-dark'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {pill.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Date Filter Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <Input
              label="Buyurtma #, mijoz ismi yoki telefon"
              value={orderSearchQuery}
              onChange={(e) => setOrderSearchQuery(e.target.value)}
              placeholder="ZVN-2026-1040..."
              leftIcon={<Search className="w-4 h-4" />}
              rightElement={
                orderSearchQuery ? (
                  <button
                    type="button"
                    onClick={() => setOrderSearchQuery('')}
                    className="text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                ) : undefined
              }
            />

            <Input
              label="Dan"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />

            <Input
              label="Gacha"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />

            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => {
                setOrderSearchQuery('');
                setOrderStatusFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Filtrlarni tozalash
            </Button>
          </div>

          {/* Orders Data Table */}
          {filteredOrders.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4">Buyurtma # va Sana</th>
                      <th className="py-3.5 px-4">Xaridor va Aloqa</th>
                      <th className="py-3.5 px-4">Toʻlov va Chek holati</th>
                      <th className="py-3.5 px-4">Telegram Bot</th>
                      <th className="py-3.5 px-4">Jami summa</th>
                      <th className="py-3.5 px-4">Buyurtma holati</th>
                      <th className="py-3.5 px-4 text-right">Boshqarish</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                    {filteredOrders.map((order) => {
                      const isNewOrder = order.status === 'new';
                      const statusMeta = ORDER_STATUS_CONFIG[order.status];

                      return (
                        <tr
                          key={order.id}
                          className={`transition-colors ${
                            isNewOrder
                              ? 'bg-brand-gold-light/40 hover:bg-brand-gold-light/70'
                              : 'hover:bg-surface-page/70'
                          }`}
                        >
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isNewOrder && (
                                <span className="px-1.5 py-0.5 rounded bg-brand-gold text-brand-green-dark text-[10px] font-extrabold">
                                  YANGI
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedOrderId(order.id)}
                                className="font-mono font-extrabold text-brand-green hover:underline"
                              >
                                #{order.orderNumber}
                              </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDateUz(order.createdAt, true)}
                            </p>
                          </td>

                          <td className="py-4 px-4">
                            <p className="font-bold text-gray-900">
                              {order.customerName}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <a
                                href={`tel:${order.customerPhone.replace(/\s+/g, '')}`}
                                className="text-xs font-semibold text-brand-green hover:underline flex items-center gap-1"
                              >
                                <Phone className="w-3 h-3" />
                                <span>{order.customerPhone}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() =>
                                  handleCopyPhone(order.customerPhone, order.id)
                                }
                                className="text-gray-400 hover:text-gray-700"
                              >
                                {copiedPhoneId === order.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Payment & Receipt Verification Column */}
                          <td className="py-4 px-4">
                            <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">
                              {order.paymentMethodLabel}
                            </p>
                            <div className="mt-1">
                              {order.paymentVerificationStatus ===
                                'pending_verification' && (
                                <Badge variant="warning" size="sm">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Toʻlov tekshirilmoqda
                                </Badge>
                              )}
                              {order.paymentVerificationStatus ===
                                'verified' && (
                                <Badge variant="success" size="sm">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Chek tasdiqlangan
                                </Badge>
                              )}
                              {order.paymentVerificationStatus ===
                                'rejected' && (
                                <Badge variant="danger" size="sm">
                                  <XCircle className="w-3 h-3 mr-1" />
                                  Chek rad etilgan
                                </Badge>
                              )}
                              {order.paymentVerificationStatus ===
                                'not_required' && (
                                <Badge variant="neutral" size="sm">
                                  Joyida toʻlov
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Telegram Notification Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {order.telegramNotificationStatus === 'sent' ? (
                              <Badge variant="success" size="sm">
                                Yuborilgan
                              </Badge>
                            ) : order.telegramNotificationStatus ===
                              'failed' ? (
                              <Badge variant="danger" size="sm">
                                Xatolik (Qayta urinish)
                              </Badge>
                            ) : (
                              <Badge variant="neutral" size="sm">
                                Sozlanmagan (Saytda saqlandi)
                              </Badge>
                            )}
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap font-extrabold text-gray-900">
                            {formatUZS(order.totalAmount)}
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <Badge variant={statusMeta.variant} size="sm">
                              {statusMeta.label}
                            </Badge>
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                variant={
                                  order.paymentVerificationStatus ===
                                  'pending_verification'
                                    ? 'gold'
                                    : 'secondary'
                                }
                                size="sm"
                                leftIcon={<Eye className="w-3.5 h-3.5" />}
                                onClick={() => setSelectedOrderId(order.id)}
                              >
                                {order.paymentVerificationStatus ===
                                'pending_verification'
                                  ? 'Chekni tekshirish'
                                  : 'Koʻrish'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Buyurtmalar topilmadi"
              description="Tanlangan holat yoki qidiruv soʻroviga mos buyurtmalar mavjud emas."
              actionLabel="Filtrlarni tozalash"
              onAction={() => {
                setOrderSearchQuery('');
                setOrderStatusFilter('all');
                setDateFrom('');
                setDateTo('');
              }}
            />
          )}
        </div>
      )}

      {/* SECTION 2: CUSTOMERS */}
      {activeSection === 'customers' && (
        <div className="space-y-5">
          <div className="bg-brand-green-light/70 border border-brand-green/20 rounded-xl p-4 flex items-center gap-2.5 text-xs text-brand-green">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>
              <strong>Maxfiylik nazorati:</strong> Mijozlar shaxsiy maʼlumotlari faqat tasdiqlangan doʻkon egasi (Owner) uchun ochiq.
            </span>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Mijoz ismi yoki telefon raqami..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3.5 px-4">Mijoz F.I.Sh.</th>
                    <th className="py-3.5 px-4">Telefon va Email</th>
                    <th className="py-3.5 px-4">Buyurtmalar soni</th>
                    <th className="py-3.5 px-4">Jami xarid summasi</th>
                    <th className="py-3.5 px-4 text-right">Profil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                  {enrichedCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-surface-page/70">
                      <td className="py-4 px-4 font-bold text-gray-900">
                        {cust.fullName}
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-brand-green block">
                          {cust.phone}
                        </span>
                        {cust.email && (
                          <span className="text-xs text-gray-500">
                            {cust.email}
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <Badge variant="green" size="sm">
                          {cust.orderCount} ta
                        </Badge>
                      </td>
                      <td className="py-4 px-4 font-extrabold text-brand-green">
                        {formatUZS(cust.totalSpent)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedCustomer(cust)}
                        >
                          Tarixni koʻrish
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: INQUIRIES */}
      {activeSection === 'inquiries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredInquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-900">
                      {inq.subject}
                    </h3>
                    <p className="text-xs text-gray-600">
                      {inq.customerName} • {inq.phone}
                    </p>
                  </div>
                  <Badge
                    variant={inq.status === 'unread' ? 'gold' : 'success'}
                    size="sm"
                  >
                    {inq.status}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-gray-700 bg-surface-page p-3.5 rounded-xl border border-gray-200">
                  «{inq.message}»
                </p>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setSelectedInquiry(inq);
                    setReplyDraft('');
                  }}
                >
                  Javob yozish
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: OWNER ORDER & BANK RECEIPT VERIFICATION MODAL                */}
      {/* ===================================================================== */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        title={
          selectedOrder
            ? `Buyurtma #${selectedOrder.orderNumber} va Toʻlov Cheki Tekshiruvi`
            : 'Buyurtma'
        }
        maxWidth="2xl"
        footer={
          selectedOrder && (
            <div className="w-full flex flex-wrap items-center justify-between gap-3">
              {selectedOrder.status !== 'cancelled' ? (
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<XCircle className="w-4 h-4" />}
                  onClick={() => {
                    setOrderToCancel(selectedOrder);
                    setCancelReason('Mijoz soʻroviga binoan bekor qilindi');
                  }}
                >
                  Buyurtmani bekor qilish
                </Button>
              ) : (
                <span className="text-xs font-bold text-red-600">
                  Buyurtma bekor qilingan
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrderId(null)}
              >
                Yopish
              </Button>
            </div>
          )
        }
      >
        {selectedOrder && (
          <div className="space-y-6 text-xs sm:text-sm">
            {/* Top Order Status & Telegram Status Bar */}
            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">
                    Buyurtma holati:
                  </span>
                  <Badge
                    variant={
                      ORDER_STATUS_CONFIG[selectedOrder.status].variant
                    }
                    size="md"
                  >
                    {ORDER_STATUS_CONFIG[selectedOrder.status].label}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500">
                  Sana: {formatDateUz(selectedOrder.createdAt, true)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedOrder.status}
                  onChange={(e) =>
                    handleStatusChangeRequest(
                      selectedOrder,
                      e.target.value as OrderStatus
                    )
                  }
                  className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-xs font-extrabold text-gray-900"
                >
                  <option value="new">Yangi buyurtma</option>
                  <option value="confirmed">Tasdiqlandi</option>
                  <option value="preparing">Tayyorlanmoqda</option>
                  <option value="shipped">Yoʻlda (Kuryerda)</option>
                  <option value="delivered">Yetkazib berildi</option>
                  <option value="cancelled">Bekor qilish</option>
                </select>

                <Button
                  variant="outline"
                  size="sm"
                  isLoading={isRetryingTelegram}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={() => handleRetryTelegram(selectedOrder.id)}
                >
                  Telegramga qayta yuborish
                </Button>
              </div>
            </div>

            {/* PHASE 4: BANK TRANSFER RECEIPT PREVIEW, DOWNLOAD & OWNER CONFIRM/REJECT */}
            {(selectedOrder.paymentReceipt ||
              selectedOrder.paymentVerificationStatus !== 'not_required') && (
              <div className="p-5 rounded-2xl border-2 border-brand-gold bg-brand-gold-light/30 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-brand-gold-border pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-gray-900">
                      Humo / Uzcard Toʻlov Cheki Tekshiruvi
                    </h4>
                    <p className="text-xs text-gray-600">
                      Toʻlanishi lozim boʻlgan summa:{' '}
                      <strong className="text-brand-green">
                        {formatUZS(selectedOrder.totalAmount)}
                      </strong>
                    </p>
                  </div>

                  <div>
                    {selectedOrder.paymentVerificationStatus ===
                      'pending_verification' && (
                      <Badge variant="warning" size="md">
                        Toʻlov tekshirilmoqda
                      </Badge>
                    )}
                    {selectedOrder.paymentVerificationStatus === 'verified' && (
                      <Badge variant="success" size="md">
                        Tasdiqlangan
                      </Badge>
                    )}
                    {selectedOrder.paymentVerificationStatus === 'rejected' && (
                      <Badge variant="danger" size="md">
                        Rad etilgan
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Receipt Preview & Download */}
                {selectedOrder.paymentReceipt ? (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                    <div className="md:col-span-5 rounded-xl overflow-hidden bg-white border border-gray-200 p-2 flex flex-col items-center">
                      {selectedOrder.paymentReceipt.mimeType.startsWith(
                        'image/'
                      ) ? (
                        <img
                          src={selectedOrder.paymentReceipt.dataUrl}
                          alt="Payment Receipt"
                          className="max-h-56 w-auto object-contain rounded-lg"
                        />
                      ) : (
                        <div className="py-10 px-4 text-center space-y-2">
                          <FileText className="w-10 h-10 text-red-600 mx-auto" />
                          <p className="text-xs font-bold text-gray-800">
                            PDF Toʻlov Cheki
                          </p>
                        </div>
                      )}

                      <a
                        href={selectedOrder.paymentReceipt.dataUrl}
                        download={selectedOrder.paymentReceipt.fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 w-full py-2 px-3 rounded-lg bg-brand-green text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-brand-green-hover"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>
                          Chekni yuklab olish ({selectedOrder.paymentReceipt.fileName})
                        </span>
                      </a>
                    </div>

                    <div className="md:col-span-7 space-y-3">
                      {selectedOrder.paymentReviewedBy && (
                        <div className="p-3 rounded-xl bg-white border border-gray-200 text-xs space-y-1">
                          <p className="font-bold text-gray-900">
                            Tekshiruv tarixi (Audit Log):
                          </p>
                          <p className="text-gray-600">
                            Tekshirdi:{' '}
                            <strong>{selectedOrder.paymentReviewedBy}</strong>
                          </p>
                          <p className="text-gray-600">
                            Vaqt:{' '}
                            <strong>
                              {selectedOrder.paymentReviewedAt
                                ? formatDateUz(
                                    selectedOrder.paymentReviewedAt,
                                    true
                                  )
                                : '—'}
                            </strong>
                          </p>
                          {selectedOrder.paymentReviewNote && (
                            <p className="text-gray-700 italic">
                              Izoh: «{selectedOrder.paymentReviewNote}»
                            </p>
                          )}
                        </div>
                      )}

                      <Input
                        label="Tekshiruv izohi (ixtiyoriy)"
                        value={receiptReviewNote}
                        onChange={(e) => setReceiptReviewNote(e.target.value)}
                        placeholder="Masalan: Humo kartaga 224 000 soʻm tushgani tasdiqlandi"
                      />

                      <div className="flex flex-wrap items-center gap-2.5 pt-1">
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          leftIcon={<CheckCircle2 className="w-4 h-4" />}
                          onClick={() => handleReceiptDecision('verified')}
                        >
                          Chekni tasdiqlash (Toʻlov qabul qilindi)
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => handleReceiptDecision('rejected')}
                        >
                          Chekni rad etish
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">
                    Chek fayli biriktirilmagan.
                  </p>
                )}
              </div>
            )}

            {/* Customer Contact & Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  Xaridor
                </h4>
                <p className="text-sm font-extrabold text-gray-900">
                  {selectedOrder.customerName}
                </p>
                <p className="text-xs font-bold text-brand-green">
                  {selectedOrder.customerPhone}
                </p>
                {selectedOrder.customerEmail && (
                  <p className="text-xs text-gray-500">
                    {selectedOrder.customerEmail}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400">
                  Yetkazib berish manzili
                </h4>
                <p className="text-xs font-bold text-gray-900">
                  {selectedOrder.region}
                </p>
                <p className="text-xs text-gray-700">{selectedOrder.address}</p>
              </div>
            </div>

            {/* Ordered Items */}
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3.5 flex items-center justify-between gap-4 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        SKU: {item.sku} • {item.quantity} ×{' '}
                        {formatUZS(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <span className="font-extrabold text-brand-green shrink-0">
                    {formatUZS(item.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Internal Admin Notes */}
            <div className="space-y-3 pt-2 border-t border-gray-200">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                Ichki maʼmuriy va audit izohlari
              </h4>
              <ul className="space-y-2">
                {selectedOrder.internalNotes.map((note, idx) => (
                  <li
                    key={idx}
                    className="p-2.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 flex items-start gap-2"
                  >
                    <FileText className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleAddNoteSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={newInternalNote}
                  onChange={(e) => setNewInternalNote(e.target.value)}
                  placeholder="Yangi ichki izoh yozing..."
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Qoʻshish
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Order Modal */}
      <Modal
        isOpen={Boolean(orderToCancel)}
        onClose={() => setOrderToCancel(null)}
        title="Buyurtmani bekor qilish"
        maxWidth="sm"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOrderToCancel(null)}
            >
              Orqaga
            </Button>
            <Button
              type="submit"
              form="cancel-order-form"
              variant="danger"
              size="sm"
            >
              Bekor qilish
            </Button>
          </>
        }
      >
        {orderToCancel && (
          <form
            id="cancel-order-form"
            onSubmit={handleConfirmCancelOrder}
            className="space-y-4 text-xs sm:text-sm"
          >
            <Input
              label="Sabab"
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </form>
        )}
      </Modal>

      {/* Customer History Modal */}
      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer ? selectedCustomer.fullName : ''}
        maxWidth="xl"
        footer={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCustomer(null)}
          >
            Yopish
          </Button>
        }
      >
        {selectedCustomer && (
          <div className="space-y-4 text-xs sm:text-sm">
            <p className="font-bold text-gray-900">
              {selectedCustomer.phone} — Jami:{' '}
              {formatUZS(selectedCustomer.totalSpent)}
            </p>
          </div>
        )}
      </Modal>

      {/* Reply Inquiry Modal */}
      <Modal
        isOpen={Boolean(selectedInquiry)}
        onClose={() => setSelectedInquiry(null)}
        title="Murojaatga javob"
        maxWidth="md"
        footer={
          <Button
            type="submit"
            form="inquiry-reply-form"
            variant="primary"
            size="sm"
          >
            Saqlash
          </Button>
        }
      >
        {selectedInquiry && (
          <form
            id="inquiry-reply-form"
            onSubmit={handleSendInquiryReply}
            className="space-y-4 text-xs sm:text-sm"
          >
            <textarea
              rows={3}
              required
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              className="w-full rounded-lg border border-gray-300 p-3 text-xs"
            />
          </form>
        )}
      </Modal>
    </div>
  );
};