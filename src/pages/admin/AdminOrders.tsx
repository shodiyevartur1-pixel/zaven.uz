import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  MessageSquare,
  Search,
  Eye,
  Phone,
  MapPin,
  CreditCard,
  Send,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  X,
  Mail,
  Trash2,
  RotateCcw,
  Ban,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { Customer, CustomerInquiry, Order, OrderStatus } from '../../types';
import { formatUZS, formatDateUz } from '../../utils/format';
import { ProductImage } from '../../components/ui/ProductImage';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input, Select } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';

export type AdminOrdersSection = 'orders' | 'customers' | 'inquiries';

interface AdminOrdersProps {
  initialSection?: AdminOrdersSection;
}

const ORDER_STATUS_META: Record<
  OrderStatus,
  {
    label: string;
    variant: 'info' | 'gold' | 'warning' | 'success' | 'danger' | 'neutral';
  }
> = {
  new: { label: 'Yangi buyurtma', variant: 'info' },
  confirmed: { label: 'Tasdiqlangan', variant: 'gold' },
  preparing: { label: 'Tayyorlanmoqda', variant: 'warning' },
  shipped: { label: 'Yoʻlda (Yetkazilmoqda)', variant: 'info' },
  delivered: { label: 'Yetkazib berildi', variant: 'success' },
  cancelled: { label: 'Bekor qilingan', variant: 'danger' },
};

const FILTER_STORAGE_KEY = 'zaven_admin_orders_filters_v1';

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
    deleteOrder,
    restoreOrder,
    retryOrderTelegramNotification,
    toggleBlockCustomer,
    deleteCustomer,
    restoreCustomer,
    replyToInquiry,
    updateInquiryStatus,
    addToast,
  } = useStore();
  const { ownerEmail } = useOwnerAuth();

  const savedFilters = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(FILTER_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [activeSection, setActiveSection] =
    useState<AdminOrdersSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('q') || savedFilters?.searchQuery || ''
  );
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [inquirySearchQuery, setInquirySearchQuery] = useState('');
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<'all' | CustomerInquiry['status']>('all');
  const [statusFilter, setStatusFilter] = useState<string>(
    savedFilters?.statusFilter || 'all'
  );
  const [verificationFilter, setVerificationFilter] = useState<string>(
    savedFilters?.verificationFilter || 'all'
  );
  const [showDeletedOrders, setShowDeletedOrders] = useState<boolean>(false);
  const [showDeletedCustomers, setShowDeletedCustomers] =
    useState<boolean>(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        FILTER_STORAGE_KEY,
        JSON.stringify({ searchQuery, statusFilter, verificationFilter })
      );
    } catch {
      // Ignore storage error
    }
  }, [searchQuery, statusFilter, verificationFilter]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newInternalNote, setNewInternalNote] = useState<string>('');
  const [receiptReviewNote, setReceiptReviewNote] = useState<string>('');
  const [isRetryingTelegram, setIsRetryingTelegram] = useState<boolean>(false);

  // Consequential Action Confirmation Modals
  const [pendingReceiptDecision, setPendingReceiptDecision] = useState<{
    order: Order;
    decision: 'verified' | 'rejected';
  } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    order: Order;
    nextStatus: OrderStatus;
  } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isArchivingOrder, setIsArchivingOrder] = useState<boolean>(false);
  const [isSavingOrderAction, setIsSavingOrderAction] = useState(false);

  // Customer Management Modals
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );
  const [customerBlockDraftReason, setCustomerBlockDraftReason] =
    useState<string>('');
  const [customerToConfirmBlock, setCustomerToConfirmBlock] =
    useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );
  const [isUpdatingCustomerAction, setIsUpdatingCustomerAction] =
    useState<boolean>(false);

  // Inquiry Reply Composer State
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingInquiryId, setSubmittingInquiryId] = useState<string | null>(
    null
  );
  const [copiedReplyId, setCopiedReplyId] = useState<string | null>(null);

  useEffect(() => {
    const qParam = searchParams.get('q');
    if (qParam !== null) {
      setSearchQuery(qParam);
    }
  }, [searchParams]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === selectedOrderId) || null,
    [orders, selectedOrderId]
  );

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const activeOrdersList = useMemo(
    () => orders.filter((o) => !o.isDeleted),
    [orders]
  );
  const deletedOrdersList = useMemo(
    () => orders.filter((o) => Boolean(o.isDeleted)),
    [orders]
  );

  const pendingReceiptsCount = useMemo(
    () =>
      activeOrdersList.filter(
        (o) => o.paymentVerificationStatus === 'pending_verification'
      ).length,
    [activeOrdersList]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const sourceList = showDeletedOrders ? deletedOrdersList : activeOrdersList;

    return sourceList.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (
        verificationFilter !== 'all' &&
        o.paymentVerificationStatus !== verificationFilter
      ) {
        return false;
      }
      if (q) {
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchName = o.customerName.toLowerCase().includes(q);
        const matchPhone = o.customerPhone.toLowerCase().includes(q);
        const matchTg =
          o.customerTelegram && o.customerTelegram.toLowerCase().includes(q);
        const matchEmail =
          o.customerEmail && o.customerEmail.toLowerCase().includes(q);
        if (!matchNum && !matchName && !matchPhone && !matchTg && !matchEmail) {
          return false;
        }
      }
      return true;
    });
  }, [
    activeOrdersList,
    deletedOrdersList,
    showDeletedOrders,
    searchQuery,
    statusFilter,
    verificationFilter,
  ]);

  const activeCustomersList = useMemo(
    () => customers.filter((c) => !c.isDeleted),
    [customers]
  );
  const deletedCustomersList = useMemo(
    () => customers.filter((c) => Boolean(c.isDeleted)),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    const base = showDeletedCustomers ? deletedCustomersList : activeCustomersList;
    if (!q) return base;
    return base.filter((c) =>
      c.fullName.toLowerCase().includes(q) || c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q))
    );
  }, [activeCustomersList, deletedCustomersList, showDeletedCustomers, customerSearchQuery]);

  const filteredInquiries = useMemo(() => {
    const q = inquirySearchQuery.trim().toLowerCase();
    return inquiries.filter((inq) => {
      if (inquiryStatusFilter !== 'all' && inq.status !== inquiryStatusFilter) return false;
      if (!q) return true;
      return [inq.customerName, inq.phone, inq.subject, inq.message].some((value) => value.toLowerCase().includes(q));
    });
  }, [inquiries, inquirySearchQuery, inquiryStatusFilter]);

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newInternalNote.trim() || isSavingOrderAction) return;
    setIsSavingOrderAction(true);
    try {
      if (await addOrderInternalNote(selectedOrder.id, newInternalNote.trim())) setNewInternalNote('');
    } finally {
      setIsSavingOrderAction(false);
    }
  };

  const handleConfirmReceiptDecision = async () => {
    if (!pendingReceiptDecision || isSavingOrderAction) return;
    setIsSavingOrderAction(true);
    try {
      const saved = await reviewOrderReceipt(
        pendingReceiptDecision.order.id,
        pendingReceiptDecision.decision,
        ownerEmail || 'owner@zaven.uz',
        receiptReviewNote.trim() || undefined
      );
      if (saved) {
        setReceiptReviewNote('');
        setPendingReceiptDecision(null);
      }
    } finally {
      setIsSavingOrderAction(false);
    }
  };

  const handleRequestStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    if (order.status === nextStatus) return;
    if (
      nextStatus === 'cancelled' ||
      order.status === 'cancelled' ||
      order.status === 'delivered'
    ) {
      setPendingStatusChange({ order, nextStatus });
    } else {
      await updateOrderStatus(
        order.id,
        nextStatus,
        `Holat oʻzgartirildi: ${ORDER_STATUS_META[nextStatus].label}`
      );
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatusChange || isSavingOrderAction) return;
    setIsSavingOrderAction(true);
    try {
      const saved = await updateOrderStatus(
        pendingStatusChange.order.id,
        pendingStatusChange.nextStatus,
        `Holat tasdiq bilan oʻzgartirildi: ${ORDER_STATUS_META[pendingStatusChange.nextStatus].label}`
      );
      if (saved) setPendingStatusChange(null);
    } finally {
      setIsSavingOrderAction(false);
    }
  };

  const handleConfirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    setIsArchivingOrder(true);
    try {
      const deletedId = orderToDelete.id;
      const ok = await deleteOrder(deletedId);
      if (ok) {
        setOrderToDelete(null);
        if (selectedOrderId === deletedId) {
          setSelectedOrderId(null);
        }
      }
    } finally {
      setIsArchivingOrder(false);
    }
  };

  const handleRetryTelegram = async () => {
    if (!selectedOrder) return;
    setIsRetryingTelegram(true);
    try {
      await retryOrderTelegramNotification(selectedOrder.id);
    } finally {
      setIsRetryingTelegram(false);
    }
  };

  const handleSendInquiryReply = async (
    inquiryId: string,
    deliveryMethod: 'telegram' | 'manual_confirmed'
  ) => {
    const text = (replyDrafts[inquiryId] || '').trim();
    if (!text) {
      addToast({
        type: 'error',
        title: 'Javob matnini kiriting',
      });
      return;
    }

    setSubmittingInquiryId(inquiryId);
    try {
      const ok = await replyToInquiry({
        inquiryId,
        replyMessage: text,
        repliedBy: ownerEmail || 'owner@zaven.uz',
        deliveryMethod,
      });
      if (ok) {
        setReplyDrafts((prev) => ({ ...prev, [inquiryId]: '' }));
      }
    } finally {
      setSubmittingInquiryId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100">
            Buyurtmalar, Toʻlov Cheklari, Mijozlar va Murojaatlar
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
            Har bir amal tasdiqlanadi, maʼlumotlar bazasiga saqlanadi va xatolik
            boʻlsa qayta tiklanadi
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface-page dark:bg-[#162923] p-1 border border-gray-200 dark:border-[#28453B] self-start">
          <Link
            to="/admin/orders"
            onClick={() => setActiveSection('orders')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'orders'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>Buyurtmalar ({activeOrdersList.length})</span>
            {pendingReceiptsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] text-[10px] font-extrabold">
                {pendingReceiptsCount}
              </span>
            )}
          </Link>

          <Link
            to="/admin/customers"
            onClick={() => setActiveSection('customers')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'customers'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200 hover:text-gray-900'
            }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>Mijozlar ({activeCustomersList.length})</span>
          </Link>

          <Link
            to="/admin/inquiries"
            onClick={() => setActiveSection('inquiries')}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'inquiries'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 dark:text-gray-200 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Murojaatlar ({inquiries.length})</span>
          </Link>
        </div>
      </div>

      {/* SECTION 1: ORDERS LIST & RECEIPT VERIFICATION */}
      {activeSection === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Buyurtma #, mijoz ismi, tel yoki @telegram..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
                rightElement={
                  searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-gray-400 hover:text-gray-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : undefined
                }
              />

              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Barcha buyurtma holatlari' },
                  { value: 'new', label: 'Yangi buyurtmalar' },
                  { value: 'confirmed', label: 'Tasdiqlangan' },
                  { value: 'preparing', label: 'Tayyorlanmoqda' },
                  { value: 'shipped', label: 'Yoʻlda' },
                  { value: 'delivered', label: 'Yetkazib berildi' },
                  { value: 'cancelled', label: 'Bekor qilingan' },
                ]}
              />

              <Select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'Toʻlov cheki: Barchasi' },
                  {
                    value: 'pending_verification',
                    label: `Toʻlov tekshirilmoqda (${pendingReceiptsCount})`,
                  },
                  { value: 'verified', label: 'Toʻlov tasdiqlangan' },
                  { value: 'rejected', label: 'Toʻlov cheki rad etilgan' },
                  { value: 'not_required', label: 'Qabul qilganda toʻlov' },
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-[#28453B] text-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeletedOrders(false)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                    !showDeletedOrders
                      ? 'bg-[#0F3D2E] text-white'
                      : 'bg-gray-100 dark:bg-[#162923] text-gray-700 dark:text-gray-200'
                  }`}
                >
                  Faol buyurtmalar ({activeOrdersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeletedOrders(true)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors inline-flex items-center gap-1.5 ${
                    showDeletedOrders
                      ? 'bg-red-700 text-white'
                      : 'bg-gray-100 dark:bg-[#162923] text-gray-700 dark:text-gray-200'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Arxiv / Savat ({deletedOrdersList.length})</span>
                </button>
              </div>
            </div>
          </div>

          {filteredOrders.length > 0 ? (
            <>
              {/* Mobile Order Cards (< md) */}
              <div className="md:hidden space-y-3">
                {filteredOrders.map((order) => {
                  const statusMeta = ORDER_STATUS_META[order.status];
                  return (
                    <article
                      key={order.id}
                      className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card space-y-3 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-100 dark:border-[#28453B]">
                        <div>
                          <span className="font-mono font-extrabold text-brand-green text-sm block">
                            #{order.orderNumber}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {formatDateUz(order.createdAt, true)}
                          </span>
                        </div>
                        <Badge variant={statusMeta.variant} size="sm">
                          {statusMeta.label}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="font-extrabold text-gray-900 dark:text-gray-100 text-sm">
                          {order.customerName}
                        </p>
                        <p className="text-brand-green font-semibold">
                          {order.customerPhone}
                        </p>
                        {order.customerTelegram && (
                          <a
                            href={`https://t.me/${order.customerTelegram.replace(
                              /^@/,
                              ''
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-brand-green font-bold hover:underline"
                          >
                            <Send className="w-3 h-3" />
                            <span>{order.customerTelegram}</span>
                          </a>
                        )}
                        <p className="text-gray-600 dark:text-gray-300 break-words">
                          {order.region}
                          {order.district ? `, ${order.district}` : ''} —{' '}
                          {order.address}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] text-gray-500 block">
                            {order.paymentMethodLabel}
                          </span>
                          {order.paymentVerificationStatus ===
                            'pending_verification' && (
                            <Badge variant="warning" size="sm">
                              Chek tekshirilmoqda
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'verified' && (
                            <Badge variant="success" size="sm">
                              Chek tasdiqlangan
                            </Badge>
                          )}
                          {order.paymentVerificationStatus === 'rejected' && (
                            <Badge variant="danger" size="sm">
                              Chek rad etilgan
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm font-extrabold text-brand-green">
                          {formatUZS(order.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          fullWidth
                          leftIcon={
                            <Eye className="w-3.5 h-3.5 text-[#C89D54]" />
                          }
                          onClick={() => setSelectedOrderId(order.id)}
                        >
                          Boshqarish / Tafsilotlar
                        </Button>

                        {order.isDeleted ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                            onClick={() => restoreOrder(order.id)}
                          >
                            Tiklash
                          </Button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(order)}
                            aria-label="Buyurtmani arxivga oʻtkazish"
                            className="w-9 h-9 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Table (md+) */}
              <div className="hidden md:block bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                        <th className="py-3.5 px-4">Buyurtma # / Sana</th>
                        <th className="py-3.5 px-4">Mijoz va Aloqa</th>
                        <th className="py-3.5 px-4">Hudud</th>
                        <th className="py-3.5 px-4">Toʻlov va Chek holati</th>
                        <th className="py-3.5 px-4">Jami summa</th>
                        <th className="py-3.5 px-4">Holati</th>
                        <th className="py-3.5 px-4 text-right">Boshqaruv</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-[#28453B] text-xs sm:text-sm">
                      {filteredOrders.map((order) => {
                        const statusMeta = ORDER_STATUS_META[order.status];
                        return (
                          <tr
                            key={order.id}
                            className="hover:bg-gray-50/80 dark:hover:bg-[#162923]/60 transition-colors"
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-mono font-extrabold text-brand-green block">
                                #{order.orderNumber}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDateUz(order.createdAt, true)}
                              </span>
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="font-bold text-gray-900 dark:text-gray-100">
                                {order.customerName}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300">
                                {order.customerPhone}
                              </p>
                              {order.customerTelegram && (
                                <a
                                  href={`https://t.me/${order.customerTelegram.replace(
                                    /^@/,
                                    ''
                                  )}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-green hover:underline mt-0.5"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>{order.customerTelegram}</span>
                                </a>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-gray-900 dark:text-gray-100">
                                {order.region}
                              </p>
                              {order.district && (
                                <p className="text-xs text-gray-500">
                                  {order.district}
                                </p>
                              )}
                            </td>

                            <td className="py-3.5 px-4">
                              <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">
                                {order.paymentMethodLabel}
                              </p>
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
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap font-extrabold text-brand-green">
                              {formatUZS(order.totalAmount)}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <Badge variant={statusMeta.variant} size="sm">
                                {statusMeta.label}
                              </Badge>
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                                  onClick={() => setSelectedOrderId(order.id)}
                                >
                                  Koʻrish
                                </Button>
                                {order.isDeleted ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={
                                      <RotateCcw className="w-3.5 h-3.5" />
                                    }
                                    onClick={() => restoreOrder(order.id)}
                                  >
                                    Tiklash
                                  </Button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setOrderToDelete(order)}
                                    title="Arxivga oʻtkazish"
                                    className="w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Buyurtmalar topilmadi"
              description="Qidiruv yoki filtr shartlariga mos buyurtmalar yoʻq."
              actionLabel="Filtrlarni tozalash"
              onAction={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setVerificationFilter('all');
              }}
            />
          )}
        </div>
      )}

      {/* SECTION 2: CUSTOMERS MANAGEMENT */}
      {activeSection === 'customers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Mijoz ismi, telefon, email yoki @telegram..."
                value={customerSearchQuery}
                onChange={(e) => setCustomerSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4" />}
              />
            </div>

            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDeletedCustomers(false)}
                className={`px-3 py-1.5 rounded-xl font-bold ${
                  !showDeletedCustomers
                    ? 'bg-[#0F3D2E] text-white'
                    : 'bg-gray-100 dark:bg-[#162923] text-gray-700 dark:text-gray-200'
                }`}
              >
                Faol mijozlar ({activeCustomersList.length})
              </button>
              <button
                type="button"
                onClick={() => setShowDeletedCustomers(true)}
                className={`px-3 py-1.5 rounded-xl font-bold inline-flex items-center gap-1.5 ${
                  showDeletedCustomers
                    ? 'bg-red-700 text-white'
                    : 'bg-gray-100 dark:bg-[#162923] text-gray-700 dark:text-gray-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Oʻchirilganlar ({deletedCustomersList.length})</span>
              </button>
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <EmptyState
              title={customerSearchQuery.trim() ? 'Mos mijoz topilmadi' : showDeletedCustomers ? 'Oʻchirilgan mijozlar yoʻq' : 'Mijozlar yoʻq'}
              description={customerSearchQuery.trim() ? 'Qidiruv yoki faol/arxiv filtri shartlarini oʻzgartiring.' : 'Mijozlar buyurtma yoki profil orqali roʻyxatdan oʻtganda shu yerda koʻrinadi.'}
              actionLabel={customerSearchQuery.trim() || showDeletedCustomers ? 'Filtrlarni tozalash' : undefined}
              onAction={customerSearchQuery.trim() || showDeletedCustomers ? () => {
                setCustomerSearchQuery('');
                setShowDeletedCustomers(false);
              } : undefined}
            />
          ) : (
          <div className="md:hidden space-y-3">
            {filteredCustomers.map((cust) => (
              <div
                key={cust.id}
                className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 shadow-card space-y-3 text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                      {cust.fullName}
                    </p>
                    <p className="text-brand-green font-semibold mt-0.5">
                      {cust.phone}
                    </p>
                    {cust.email && (
                      <p className="text-gray-500 break-all">{cust.email}</p>
                    )}
                    {cust.telegramUsername && (
                      <p className="text-brand-green font-semibold">
                        {cust.telegramUsername}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {cust.isBlocked && (
                      <Badge variant="danger" size="sm">
                        Bloklangan
                      </Badge>
                    )}
                    {cust.emailVerified && (
                      <Badge variant="success" size="sm">
                        Tasdiqlangan
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-[#28453B]">
                  <span>
                    Buyurtmalar: <strong>{cust.orderCount} ta</strong> (
                    {formatUZS(cust.totalSpent)})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setSelectedCustomerId(cust.id)}
                    >
                      Boshqarish
                    </Button>
                    {cust.isDeleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => restoreCustomer(cust.id)}
                      >
                        Tiklash
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}

          {filteredCustomers.length > 0 && (
          <div className="hidden md:block bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] overflow-hidden shadow-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                    <th className="py-3.5 px-4">Mijoz va Holat</th>
                    <th className="py-3.5 px-4">Telefon / Email / Telegram</th>
                    <th className="py-3.5 px-4">Buyurtmalar</th>
                    <th className="py-3.5 px-4">Jami xarid</th>
                    <th className="py-3.5 px-4 text-right">Boshqaruv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#28453B] text-xs sm:text-sm">
                  {filteredCustomers.map((cust) => (
                    <tr
                      key={cust.id}
                      className="hover:bg-gray-50/80 dark:hover:bg-[#162923]/60"
                    >
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{cust.fullName}</span>
                          {cust.emailVerified && (
                            <Badge variant="success" size="sm">
                              Tasdiqlangan
                            </Badge>
                          )}
                          {cust.isBlocked && (
                            <Badge variant="danger" size="sm">
                              Bloklangan
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <p className="text-gray-800 dark:text-gray-200 font-semibold">
                          {cust.phone}
                        </p>
                        {cust.email && (
                          <p className="text-xs text-gray-500">{cust.email}</p>
                        )}
                        {cust.telegramUsername && (
                          <p className="text-xs text-brand-green font-semibold">
                            {cust.telegramUsername}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold">
                        {cust.orderCount} ta
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-brand-green">
                        {formatUZS(cust.totalSpent)}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedCustomerId(cust.id)}
                          >
                            Boshqarish
                          </Button>
                          {cust.isDeleted && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => restoreCustomer(cust.id)}
                            >
                              Tiklash
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}

      {/* SECTION 3: INQUIRIES & REAL REPLY COMPOSER */}
      {activeSection === 'inquiries' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-2xl border border-gray-200 dark:border-[#28453B] bg-white dark:bg-[#12211C] p-4">
            <Input placeholder="Murojaat, mijoz yoki telefon qidirish..." value={inquirySearchQuery} onChange={(e) => setInquirySearchQuery(e.target.value)} leftIcon={<Search className="w-4 h-4" />} />
            <Select value={inquiryStatusFilter} onChange={(e) => setInquiryStatusFilter(e.target.value as 'all' | CustomerInquiry['status'])} options={[{ value: 'all', label: 'Barcha murojaatlar' }, { value: 'unread', label: 'Oʻqilmagan' }, { value: 'read', label: 'Koʻrib chiqilgan' }, { value: 'replied', label: 'Javob berilgan' }]} />
          </div>
          {filteredInquiries.length === 0 ? (
            <EmptyState title={inquirySearchQuery.trim() ? 'Mos murojaat topilmadi' : 'Murojaatlar yoʻq'} description={inquirySearchQuery.trim() ? 'Qidiruv yoki holat filtrini oʻzgartiring.' : 'Mijozlardan yangi murojaat kelganda shu yerda koʻrinadi.'} actionLabel={inquirySearchQuery.trim() || inquiryStatusFilter !== 'all' ? 'Filtrlarni tozalash' : undefined} onAction={inquirySearchQuery.trim() || inquiryStatusFilter !== 'all' ? () => { setInquirySearchQuery(''); setInquiryStatusFilter('all'); } : undefined} />
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredInquiries.map((inq) => {
            const draftText = replyDrafts[inq.id] || '';
            const isSubmittingThis = submittingInquiryId === inq.id;

            return (
              <div
                key={inq.id}
                className="bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#28453B] p-4 sm:p-5 shadow-card space-y-3.5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-extrabold text-gray-900 dark:text-gray-100">
                        {inq.customerName}
                      </h3>
                      <a
                        href={`tel:${inq.phone.replace(/\s+/g, '')}`}
                        className="text-xs font-bold text-brand-green hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{inq.phone}</span>
                      </a>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        {formatDateUz(inq.createdAt, true)}
                      </p>
                    </div>

                    <Badge
                      variant={
                        inq.status === 'unread'
                          ? 'warning'
                          : inq.status === 'replied'
                          ? 'success'
                          : 'neutral'
                      }
                      size="sm"
                    >
                      {inq.status === 'unread'
                        ? 'Oʻqilmagan'
                        : inq.status === 'replied'
                        ? 'Javob yuborilgan'
                        : 'Koʻrib chiqilgan'}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1">
                    <p className="text-xs font-extrabold text-brand-green">
                      Mavzu: {inq.subject}
                    </p>
                    <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed break-words">
                      {inq.message}
                    </p>
                  </div>

                  {inq.replyMessage && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-[#162923] border border-emerald-200 dark:border-emerald-700/60 space-y-1.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-emerald-800 dark:text-emerald-300 font-bold">
                        <span>Admin javobi ({inq.repliedBy || 'owner'}):</span>
                        {inq.repliedAt && (
                          <span>{formatDateUz(inq.repliedAt, true)}</span>
                        )}
                      </div>
                      <p className="text-gray-900 dark:text-gray-100 font-medium leading-relaxed break-words">
                        {inq.replyMessage}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-emerald-700 font-semibold">
                          Usul:{' '}
                          {inq.replyDeliveryMethod === 'telegram'
                            ? 'Telegram / Qoʻngʻiroq'
                            : 'Admin tomonidan tasdiqlangan'}
                        </span>
                        <button
                          type="button"
                          onClick={() => void updateInquiryStatus(inq.id, 'read')}
                          className="text-[11px] font-bold text-amber-700 hover:underline"
                        >
                          Qayta ochish
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 dark:border-[#28453B] space-y-2.5">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    {inq.replyMessage
                      ? 'Qoʻshimcha / yangilangan javob yozish:'
                      : 'Mijozga javob yozish:'}
                  </label>
                  <textarea
                    rows={2}
                    value={draftText}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [inq.id]: e.target.value,
                      }))
                    }
                    placeholder="Mijoz murojaatiga javob matnini kiriting..."
                    className="w-full rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] px-3 py-2 text-xs text-gray-900 dark:text-gray-100 focus:border-brand-green focus:outline-none"
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        isLoading={isSubmittingThis}
                        leftIcon={<Send className="w-3.5 h-3.5 text-[#C89D54]" />}
                        onClick={() =>
                          handleSendInquiryReply(inq.id, 'manual_confirmed')
                        }
                      >
                        Javobni saqlash va tasdiqlash
                      </Button>

                      {draftText.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard
                              ?.writeText(draftText.trim())
                              .catch(() => {});
                            setCopiedReplyId(inq.id);
                            setTimeout(() => setCopiedReplyId(null), 2000);
                          }}
                          className="h-8 px-2.5 rounded-lg border border-gray-200 dark:border-[#2F5246] text-xs font-bold text-gray-700 dark:text-gray-200 inline-flex items-center gap-1"
                        >
                          {copiedReplyId === inq.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>Nusxalash</span>
                        </button>
                      )}
                    </div>

                    {inq.status === 'unread' && (
                      <button
                        type="button"
                        onClick={() => void updateInquiryStatus(inq.id, 'read')}
                        className="text-xs font-semibold text-gray-500 hover:underline"
                      >
                        Oʻqildi deb belgilash
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
          )}
        </div>
      )}

      {/* ADMIN ORDER DETAILS MODAL */}
      <Modal
        isOpen={Boolean(selectedOrder)}
        onClose={() => setSelectedOrderId(null)}
        title={
          selectedOrder
            ? `Buyurtma #${selectedOrder.orderNumber} tafsilotlari`
            : ''
        }
        maxWidth="2xl"
        footer={
          selectedOrder ? (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              {selectedOrder.isDeleted ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => restoreOrder(selectedOrder.id)}
                >
                  Buyurtmani tiklash
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setOrderToDelete(selectedOrder)}
                >
                  Arxivga oʻtkazish (Oʻchirish)
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrderId(null)}
              >
                Yopish
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-page dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Mijoz va Aloqa
                </span>
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                  {selectedOrder.customerName}
                </p>
                <a
                  href={`tel:${selectedOrder.customerPhone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-1.5 font-semibold text-brand-green hover:underline"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedOrder.customerPhone}</span>
                </a>
                {selectedOrder.customerEmail && (
                  <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 break-all">
                    <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{selectedOrder.customerEmail}</span>
                  </p>
                )}
                {selectedOrder.customerTelegram && (
                  <div className="pt-0.5">
                    <a
                      href={`https://t.me/${selectedOrder.customerTelegram.replace(
                        /^@/,
                        ''
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-green-light text-brand-green font-bold text-xs hover:underline"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Telegram: {selectedOrder.customerTelegram}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-surface-page dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Yetkazib berish manzili
                </span>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {selectedOrder.region}
                  {selectedOrder.district ? `, ${selectedOrder.district}` : ''}
                </p>
                <p className="text-xs text-gray-700 dark:text-gray-300 break-words">
                  {selectedOrder.address}
                </p>
                {selectedOrder.locationCoordinates && (
                  <a
                    href={`https://www.google.com/maps?q=${selectedOrder.locationCoordinates.lat},${selectedOrder.locationCoordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-mono font-bold text-brand-green hover:underline pt-0.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>
                      GPS: {selectedOrder.locationCoordinates.lat},{' '}
                      {selectedOrder.locationCoordinates.lng}
                    </span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-page dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                  Buyurtma yetkazib berish holati
                </span>
                <Badge
                  variant={ORDER_STATUS_META[selectedOrder.status].variant}
                  size="md"
                >
                  {ORDER_STATUS_META[selectedOrder.status].label}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    'new',
                    'confirmed',
                    'preparing',
                    'shipped',
                    'delivered',
                    'cancelled',
                  ] as OrderStatus[]
                ).map((st) => {
                  const isCurrent = selectedOrder.status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        handleRequestStatusChange(selectedOrder, st)
                      }
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isCurrent
                          ? 'bg-[#0F3D2E] text-white border-[#C89D54] font-extrabold shadow-sm'
                          : st === 'cancelled'
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-white dark:bg-[#12211C] text-gray-800 dark:text-gray-200 border-gray-200 dark:border-[#2F5246] hover:border-brand-green'
                      }`}
                    >
                      {ORDER_STATUS_META[st].label}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-gray-200/70 dark:border-[#28453B] flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500">
                  Telegram bot xabarnomasi:
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isLoading={isRetryingTelegram}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  onClick={handleRetryTelegram}
                >
                  Telegramga qayta yuborish
                </Button>
              </div>
            </div>

            {(selectedOrder.paymentReceipt ||
              selectedOrder.paymentVerificationStatus !== 'not_required') && (
              <div className="p-4 rounded-2xl border-2 border-[#C89D54] bg-brand-gold-light/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-green" />
                    <span className="font-extrabold text-gray-900 dark:text-gray-100">
                      Toʻlov cheki tekshiruvi
                      {selectedOrder.paymentReceipt?.fileName
                        ? ` (${selectedOrder.paymentReceipt.fileName})`
                        : ''}
                    </span>
                  </div>
                  <Badge
                    variant={
                      selectedOrder.paymentVerificationStatus === 'verified'
                        ? 'success'
                        : selectedOrder.paymentVerificationStatus === 'rejected'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {selectedOrder.paymentVerificationStatus === 'verified'
                      ? 'Chek tasdiqlangan'
                      : selectedOrder.paymentVerificationStatus === 'rejected'
                      ? 'Chek rad etilgan'
                      : 'Tekshirilmoqda'}
                  </Badge>
                </div>

                {selectedOrder.paymentReceipt?.dataUrl && (
                  <div className="rounded-xl overflow-hidden border border-gray-200 bg-white max-h-64 flex items-center justify-center p-2">
                    {selectedOrder.paymentReceipt.mimeType.startsWith(
                      'image/'
                    ) ? (
                      <img
                        src={selectedOrder.paymentReceipt.dataUrl}
                        alt="Receipt"
                        className="max-h-56 w-auto object-contain"
                      />
                    ) : (
                      <a
                        href={selectedOrder.paymentReceipt.dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-brand-green font-bold hover:underline py-4"
                      >
                        <FileText className="w-5 h-5" />
                        <span>PDF chekni ochish</span>
                      </a>
                    )}
                  </div>
                )}

                {selectedOrder.paymentReviewedBy && (
                  <p className="text-[11px] text-gray-600 dark:text-gray-300">
                    Oxirgi qaror:{' '}
                    <strong>{selectedOrder.paymentReviewedBy}</strong> (
                    {formatDateUz(selectedOrder.paymentReviewedAt || '', true)})
                    {selectedOrder.paymentReviewNote
                      ? ` — Izoh: ${selectedOrder.paymentReviewNote}`
                      : ''}
                  </p>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={receiptReviewNote}
                    onChange={(e) => setReceiptReviewNote(e.target.value)}
                    placeholder="Tekshiruv izohi (ixtiyoriy)..."
                    className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs"
                  />
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() =>
                      setPendingReceiptDecision({
                        order: selectedOrder,
                        decision: 'verified',
                      })
                    }
                  >
                    Chekni tasdiqlash
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() =>
                      setPendingReceiptDecision({
                        order: selectedOrder,
                        decision: 'rejected',
                      })
                    }
                  >
                    Rad etish
                  </Button>
                </div>
              </div>
            )}

            <div className="border border-gray-200 dark:border-[#28453B] rounded-xl divide-y divide-gray-200 dark:divide-[#28453B] overflow-hidden">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 flex items-center justify-between gap-3 bg-white dark:bg-[#12211C]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ProductImage
                      src={item.image}
                      alt={item.productName}
                      className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {item.productName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.sku} • {item.quantity} ×{' '}
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

            <div className="space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 block">
                Ichki izohlar va tarix ({selectedOrder.internalNotes.length})
              </span>
              {selectedOrder.internalNotes.length > 0 && (
                <ul className="space-y-1.5 text-xs bg-[#F8F9FA] dark:bg-[#162923] p-3 rounded-xl border border-gray-200 dark:border-[#28453B]">
                  {selectedOrder.internalNotes.map((note, idx) => (
                    <li
                      key={idx}
                      className="text-gray-700 dark:text-gray-300 leading-relaxed"
                    >
                      • {note}
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleAddInternalNote} className="flex gap-2">
                <input
                  type="text"
                  value={newInternalNote}
                  onChange={(e) => setNewInternalNote(e.target.value)}
                  placeholder="Ichki admin izohi qoʻshish..."
                  className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Qoʻshish
                </Button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(pendingReceiptDecision)}
        onClose={() => setPendingReceiptDecision(null)}
        title="Toʻlov cheki qarorini tasdiqlang"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setPendingReceiptDecision(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant={
                pendingReceiptDecision?.decision === 'verified'
                  ? 'primary'
                  : 'danger'
              }
              size="sm"
              fullWidth
              onClick={handleConfirmReceiptDecision}
            >
              {pendingReceiptDecision?.decision === 'verified'
                ? 'Ha, tasdiqlansin'
                : 'Ha, rad etilsin'}
            </Button>
          </div>
        }
      >
        {pendingReceiptDecision && (
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            Buyurtma{' '}
            <strong>#{pendingReceiptDecision.order.orderNumber}</strong> uchun
            toʻlov chekini{' '}
            <strong>
              {pendingReceiptDecision.decision === 'verified'
                ? 'TASDIQLASH'
                : 'RAD ETISH'}
            </strong>{' '}
            qarorini saqlamoqchimisiz?
          </p>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(pendingStatusChange)}
        onClose={() => setPendingStatusChange(null)}
        title="Buyurtma holatini oʻzgartirish"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setPendingStatusChange(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={handleConfirmStatusChange}
            >
              Tasdiqlash
            </Button>
          </div>
        }
      >
        {pendingStatusChange && (
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            Buyurtma <strong>#{pendingStatusChange.order.orderNumber}</strong>{' '}
            holatini{' '}
            <strong>
              «{ORDER_STATUS_META[pendingStatusChange.nextStatus].label}»
            </strong>{' '}
            holatiga oʻzgartirishni tasdiqlaysizmi?
          </p>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(orderToDelete)}
        onClose={() => setOrderToDelete(null)}
        title="Buyurtmani arxivga oʻtkazish"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setOrderToDelete(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              isLoading={isArchivingOrder}
              onClick={handleConfirmDeleteOrder}
            >
              Arxivga oʻtkazish
            </Button>
          </div>
        }
      >
        {orderToDelete && (
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            Buyurtma <strong>#{orderToDelete.orderNumber}</strong> (
            {orderToDelete.customerName}) faol roʻyxatdan olib tashlanib,
            «Arxiv / Savat» boʻlimiga oʻtkaziladi. Buyurtma tarixi yoʻqolmaydi
            va uni istalgan vaqtda tiklashingiz mumkin.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomerId(null)}
        title={selectedCustomer ? selectedCustomer.fullName : ''}
        maxWidth="md"
        footer={
          selectedCustomer ? (
            <div className="w-full flex flex-wrap items-center justify-between gap-2">
              {selectedCustomer.isDeleted ? (
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="w-4 h-4" />}
                  onClick={() => restoreCustomer(selectedCustomer.id)}
                >
                  Profilni tiklash
                </Button>
              ) : (
                <Button
                  variant="danger"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setCustomerToDelete(selectedCustomer)}
                >
                  Oʻchirish (Savatga)
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCustomerId(null)}
              >
                Yopish
              </Button>
            </div>
          ) : undefined
        }
      >
        {selectedCustomer && (
          <div className="space-y-4 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#F8F9FA] dark:bg-[#162923] border border-gray-200 dark:border-[#28453B] space-y-1.5">
              <p>
                <strong>Telefon:</strong> {selectedCustomer.phone}
              </p>
              {selectedCustomer.email && (
                <p>
                  <strong>Email:</strong> {selectedCustomer.email}{' '}
                  {selectedCustomer.emailVerified ? '(Tasdiqlangan)' : ''}
                </p>
              )}
              {selectedCustomer.telegramUsername && (
                <p>
                  <strong>Telegram:</strong> {selectedCustomer.telegramUsername}
                </p>
              )}
              <p>
                <strong>Buyurtmalar soni:</strong> {selectedCustomer.orderCount}{' '}
                ta ({formatUZS(selectedCustomer.totalSpent)})
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-[#162923] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-extrabold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Kirish va buyurtma berish huquqi</span>
                </span>
                <Badge
                  variant={selectedCustomer.isBlocked ? 'danger' : 'success'}
                  size="sm"
                >
                  {selectedCustomer.isBlocked ? 'Bloklangan' : 'Faol'}
                </Badge>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Mijoz bloklanganda u shaxsiy kabinetga kira olmaydi va yangi
                buyurtma yubora olmaydi.
              </p>

              {selectedCustomer.isBlocked ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  isLoading={isUpdatingCustomerAction}
                  onClick={async () => {
                    setIsUpdatingCustomerAction(true);
                    try {
                      await toggleBlockCustomer(selectedCustomer.id, false);
                    } finally {
                      setIsUpdatingCustomerAction(false);
                    }
                  }}
                >
                  Blokdan chiqarish (Faollashtirish)
                </Button>
              ) : (
                <div className="space-y-2 pt-1">
                  <input
                    type="text"
                    value={customerBlockDraftReason}
                    onChange={(e) =>
                      setCustomerBlockDraftReason(e.target.value)
                    }
                    placeholder="Bloklash sababi (ixtiyoriy)..."
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-xs"
                  />
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    fullWidth
                    leftIcon={<Ban className="w-4 h-4" />}
                    onClick={() => setCustomerToConfirmBlock(selectedCustomer)}
                  >
                    Mijozni bloklash
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(customerToConfirmBlock)}
        onClose={() => setCustomerToConfirmBlock(null)}
        title="Mijozni bloklashni tasdiqlang"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setCustomerToConfirmBlock(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              isLoading={isUpdatingCustomerAction}
              onClick={async () => {
                if (!customerToConfirmBlock) return;
                setIsUpdatingCustomerAction(true);
                try {
                  await toggleBlockCustomer(
                    customerToConfirmBlock.id,
                    true,
                    customerBlockDraftReason
                  );
                  setCustomerBlockDraftReason('');
                  setCustomerToConfirmBlock(null);
                } finally {
                  setIsUpdatingCustomerAction(false);
                }
              }}
            >
              Bloklash
            </Button>
          </div>
        }
      >
        {customerToConfirmBlock && (
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            <strong>{customerToConfirmBlock.fullName}</strong> (
            {customerToConfirmBlock.phone}) hisobini bloklamoqchimisiz?
            Bloklangan mijoz tizimga kira olmaydi va buyurtma bera olmaydi.
          </p>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(customerToDelete)}
        onClose={() => setCustomerToDelete(null)}
        title="Mijozni arxivga oʻtkazish"
        maxWidth="sm"
        footer={
          <div className="w-full grid grid-cols-2 gap-2.5">
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => setCustomerToDelete(null)}
            >
              Bekor qilish
            </Button>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              isLoading={isUpdatingCustomerAction}
              onClick={async () => {
                if (!customerToDelete) return;
                setIsUpdatingCustomerAction(true);
                try {
                  const id = customerToDelete.id;
                  const ok = await deleteCustomer(id);
                  if (ok) {
                    setCustomerToDelete(null);
                    if (selectedCustomerId === id) {
                      setSelectedCustomerId(null);
                    }
                  }
                } finally {
                  setIsUpdatingCustomerAction(false);
                }
              }}
            >
              Oʻchirish
            </Button>
          </div>
        }
      >
        {customerToDelete && (
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
            <strong>{customerToDelete.fullName}</strong> profilini
            oʻchirilganlar roʻyxatiga oʻtkazishni tasdiqlaysizmi? Uni keyinchalik
            qayta tiklashingiz mumkin.
          </p>
        )}
      </Modal>
    </div>
  );
};
