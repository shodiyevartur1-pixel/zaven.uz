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
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { Customer, Order, OrderStatus } from '../../types';
import { formatUZS, formatDateUz } from '../../utils/format';
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
  } = useStore();
  const { ownerEmail } = useOwnerAuth();

  const [activeSection, setActiveSection] =
    useState<AdminOrdersSection>(initialSection);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  const [searchQuery, setSearchQuery] = useState<string>(
    searchParams.get('q') || ''
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [verificationFilter, setVerificationFilter] = useState<string>('all');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newInternalNote, setNewInternalNote] = useState<string>('');
  const [receiptReviewNote, setReceiptReviewNote] = useState<string>('');
  const [isRetryingTelegram, setIsRetryingTelegram] = useState<boolean>(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

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

  const pendingReceiptsCount = useMemo(
    () =>
      orders.filter(
        (o) => o.paymentVerificationStatus === 'pending_verification'
      ).length,
    [orders]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
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
  }, [orders, searchQuery, statusFilter, verificationFilter]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.telegramUsername && c.telegramUsername.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newInternalNote.trim()) return;
    addOrderInternalNote(selectedOrder.id, newInternalNote.trim());
    setNewInternalNote('');
  };

  const handleReceiptDecision = (decision: 'verified' | 'rejected') => {
    if (!selectedOrder) return;
    reviewOrderReceipt(
      selectedOrder.id,
      decision,
      ownerEmail || 'owner@zaven.uz',
      receiptReviewNote.trim() || undefined
    );
    setReceiptReviewNote('');
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

  return (
    <div className="space-y-6">
      {/* Workspace Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">
            Buyurtmalar, Toʻlov Cheklari, Mijozlar va Murojaatlar
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Humo / Uzcard toʻlov cheklarini tekshirish, Telegram bildirishnomalar va mijozlar bazasi
          </p>
        </div>

        <div className="inline-flex rounded-xl bg-surface-page p-1 border border-gray-200 self-start">
          <Link
            to="/admin/orders"
            onClick={() => setActiveSection('orders')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'orders'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Buyurtmalar ({orders.length})</span>
            {pendingReceiptsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[#C89D54] text-[#09261C] text-[10px] font-extrabold">
                {pendingReceiptsCount} chek
              </span>
            )}
          </Link>

          <Link
            to="/admin/customers"
            onClick={() => setActiveSection('customers')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors ${
              activeSection === 'customers'
                ? 'bg-[#0F3D2E] text-white shadow-sm'
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
                ? 'bg-[#0F3D2E] text-white shadow-sm'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Murojaatlar ({inquiries.length})</span>
          </Link>
        </div>
      </div>

      {/* SECTION 1: ORDERS LIST & RECEIPT VERIFICATION */}
      {activeSection === 'orders' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-card grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {filteredOrders.length > 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4">Buyurtma # / Sana</th>
                      <th className="py-3.5 px-4">Mijoz va Aloqa</th>
                      <th className="py-3.5 px-4">Hudud</th>
                      <th className="py-3.5 px-4">Toʻlov va Chek holati</th>
                      <th className="py-3.5 px-4">Jami summa</th>
                      <th className="py-3.5 px-4">Holati</th>
                      <th className="py-3.5 px-4 text-right">Boshqaruv</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                    {filteredOrders.map((order) => {
                      const statusMeta = ORDER_STATUS_META[order.status];
                      return (
                        <tr
                          key={order.id}
                          className="hover:bg-surface-page/70 transition-colors"
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
                            <p className="font-bold text-gray-900">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-gray-600">
                              {order.customerPhone}
                            </p>
                            {/* Shown ONLY when customer supplied a Telegram username */}
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
                            <p className="font-semibold text-gray-900">
                              {order.region}
                            </p>
                            {order.district && (
                              <p className="text-xs text-gray-500">
                                {order.district}
                              </p>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="text-xs font-semibold text-gray-800 mb-1">
                              {order.paymentMethodLabel}
                            </p>
                            {order.paymentVerificationStatus ===
                              'pending_verification' && (
                              <Badge variant="warning" size="sm">
                                <Clock className="w-3 h-3 mr-1" />
                                Toʻlov tekshirilmoqda
                              </Badge>
                            )}
                            {order.paymentVerificationStatus === 'verified' && (
                              <Badge variant="success" size="sm">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Chek tasdiqlangan
                              </Badge>
                            )}
                            {order.paymentVerificationStatus === 'rejected' && (
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
                            <Button
                              variant="secondary"
                              size="sm"
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              onClick={() => setSelectedOrderId(order.id)}
                            >
                              Koʻrish
                            </Button>
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

      {/* SECTION 2: CUSTOMERS TABLE */}
      {activeSection === 'customers' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Mijoz</th>
                  <th className="py-3.5 px-4">Telefon / Email / Telegram</th>
                  <th className="py-3.5 px-4">Buyurtmalar</th>
                  <th className="py-3.5 px-4">Jami xarid</th>
                  <th className="py-3.5 px-4 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-xs sm:text-sm">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-surface-page/70">
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{cust.fullName}</span>
                        {cust.emailVerified && (
                          <Badge variant="success" size="sm">
                            Tasdiqlangan
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <p className="text-gray-800 font-semibold">
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
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedCustomer(cust)}
                      >
                        Profil
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 3: INQUIRIES */}
      {activeSection === 'inquiries' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-card space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">
                    {inq.customerName} ({inq.phone})
                  </h3>
                  <p className="text-xs text-gray-500">
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
                  {inq.status}
                </Badge>
              </div>
              <p className="text-xs font-bold text-brand-green">
                {inq.subject}
              </p>
              <p className="text-xs text-gray-700 leading-relaxed">
                {inq.message}
              </p>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => updateInquiryStatus(inq.id, 'replied')}
                >
                  Javob berildi deb belgilash
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADMIN ORDER DETAILS MODAL (Shows customerTelegram only when supplied) */}
      {/* ===================================================================== */}
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedOrderId(null)}
          >
            Yopish
          </Button>
        }
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs sm:text-sm">
            {/* Customer Contact & Delivery Address Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Mijoz va Aloqa
                </span>
                <p className="font-bold text-gray-900 text-sm">
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
                  <p className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>{selectedOrder.customerEmail}</span>
                  </p>
                )}
                {/* Displayed ONLY when supplied at checkout */}
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

              <div className="p-4 rounded-xl bg-surface-page border border-gray-200 space-y-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                  Yetkazib berish manzili
                </span>
                <p className="font-bold text-gray-900">
                  {selectedOrder.region}
                  {selectedOrder.district ? `, ${selectedOrder.district}` : ''}
                </p>
                <p className="text-xs text-gray-700 break-words">
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

            {/* Order Status Selector & Telegram Notification Status */}
            <div className="p-4 rounded-xl bg-surface-page border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 max-w-xs">
                <Select
                  label="Buyurtma holatini oʻzgartirish"
                  value={selectedOrder.status}
                  onChange={(e) =>
                    updateOrderStatus(
                      selectedOrder.id,
                      e.target.value as OrderStatus,
                      `Holat oʻzgartirildi: ${e.target.value}`
                    )
                  }
                  options={[
                    { value: 'new', label: 'Yangi' },
                    { value: 'confirmed', label: 'Tasdiqlangan' },
                    { value: 'preparing', label: 'Tayyorlanmoqda' },
                    { value: 'shipped', label: 'Yoʻlda' },
                    { value: 'delivered', label: 'Yetkazib berildi' },
                    { value: 'cancelled', label: 'Bekor qilingan' },
                  ]}
                />
              </div>

              <div className="flex items-center gap-2">
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

            {/* Payment Receipt Verification Panel */}
            {selectedOrder.paymentReceipt && (
              <div className="p-4 rounded-2xl border-2 border-[#C89D54] bg-brand-gold-light/30 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-brand-green" />
                    <span className="font-extrabold text-gray-900">
                      Yuklangan toʻlov cheki ({selectedOrder.paymentReceipt.fileName})
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
                    {selectedOrder.paymentVerificationStatus}
                  </Badge>
                </div>

                {selectedOrder.paymentReceipt.dataUrl && (
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
                    onClick={() => handleReceiptDecision('verified')}
                  >
                    Tasdiqlash
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    leftIcon={<XCircle className="w-4 h-4" />}
                    onClick={() => handleReceiptDecision('rejected')}
                  >
                    Rad etish
                  </Button>
                </div>
              </div>
            )}

            {/* Order Items */}
            <div className="border border-gray-200 rounded-xl divide-y divide-gray-200 overflow-hidden">
              {selectedOrder.items.map((item) => (
                <div
                  key={item.productId}
                  className="p-3 flex items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.productName}
                      className="w-11 h-11 rounded-lg object-cover border border-gray-200 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">
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

            {/* Internal Notes */}
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
        )}
      </Modal>

      {/* Customer Profile Modal */}
      <Modal
        isOpen={Boolean(selectedCustomer)}
        onClose={() => setSelectedCustomer(null)}
        title={selectedCustomer ? selectedCustomer.fullName : ''}
        maxWidth="md"
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
          <div className="space-y-3 text-xs sm:text-sm">
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
        )}
      </Modal>
    </div>
  );
};

