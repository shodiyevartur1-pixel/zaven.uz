import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  MapPin,
  Clock,
  Instagram,
  Send,
  MessageSquare,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUzbekPhone, isValidUzbekPhone } from '../../utils/format';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export const StoreFooter: React.FC = () => {
  const { categories, storeSettings, submitCustomerInquiry, currentCustomer } =
    useStore();
  const { t, getCategoryText } = useThemeLanguage();

  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [customerName, setCustomerName] = useState(
    currentCustomer?.fullName || ''
  );
  const [phone, setPhone] = useState(currentCustomer?.phone || '+998 ');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Requirement 8: Collapsible mobile footer link groups (Closed by default on mobile)
  const [openMobileGroup, setOpenMobileGroup] = useState<
    'categories' | 'customer' | 'contact' | null
  >(null);

  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const toggleGroup = (group: 'categories' | 'customer' | 'contact') => {
    setOpenMobileGroup((prev) => (prev === group ? null : group));
  };

  const handleOpenInquiry = () => {
    setCustomerName(currentCustomer?.fullName || '');
    setPhone(currentCustomer?.phone || '+998 ');
    setSubject('');
    setMessage('');
    setError('');
    setIsInquiryModalOpen(true);
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || customerName.trim().length < 2) {
      setError(t('cart.fullName'));
      return;
    }
    if (!isValidUzbekPhone(phone)) {
      setError('+998 XX XXX-XX-XX');
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      setError('Savol matnini kiriting');
      return;
    }

    submitCustomerInquiry({
      customerName,
      phone,
      subject: subject.trim() || 'Veb-sayt orqali savol',
      message,
    });
    setIsInquiryModalOpen(false);
  };

  return (
    <footer className="bg-[#09261C] text-emerald-50 border-t border-emerald-900/60 mt-8">
      <div className="zaven-page-container py-6 sm:py-10 space-y-6">
        {/* Top Compact Brand + Quick Contact/Social Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-emerald-800/60">
          <div className="space-y-1.5 max-w-md">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#C89D54] flex items-center justify-center text-[#09261C] font-extrabold text-lg">
                Z
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-wider text-white">
                {storeSettings.storeName}
              </span>
            </Link>
            <p className="text-xs text-emerald-100/85 leading-relaxed">
              {storeSettings.tagline}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#16533F] border border-emerald-700 text-xs font-bold text-white transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#C89D54]" />
              <span>{storeSettings.supportPhone}</span>
            </a>

            <a
              href={storeSettings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0F3D2E] hover:bg-[#C89D54] hover:text-[#09261C] border border-emerald-700 text-xs font-bold text-white transition-colors"
            >
              <Instagram className="w-3.5 h-3.5" />
              <span>{storeSettings.instagramHandle}</span>
            </a>

            <button
              type="button"
              onClick={handleOpenInquiry}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#C89D54] hover:bg-[#B5893E] text-[#09261C] text-xs font-extrabold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{t('footer.sendInquiryBtn')}</span>
            </button>
          </div>
        </div>

        {/* Mobile Collapsible Link Groups / Desktop 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-8 divide-y md:divide-y-0 divide-emerald-800/50">
          {/* Group 1: Categories */}
          <div className="py-2 md:py-0">
            <button
              type="button"
              onClick={() => toggleGroup('categories')}
              className="w-full md:cursor-default flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#C89D54] py-1.5"
            >
              <span>{t('nav.categoriesTitle')}</span>
              <ChevronDown
                className={`w-4 h-4 md:hidden transition-transform ${
                  openMobileGroup === 'categories' ? 'rotate-180' : ''
                }`}
              />
            </button>
            <ul
              className={`space-y-2 text-xs text-emerald-100/90 pt-2 ${
                openMobileGroup === 'categories' ? 'block' : 'hidden md:block'
              }`}
            >
              {activeCategories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/catalog?category=${cat.slug}`}
                    className="hover:text-[#C89D54] transition-colors"
                  >
                    {getCategoryText(cat).name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Group 2: Customer Navigation (Including Favorites) */}
          <div className="py-2 md:py-0">
            <button
              type="button"
              onClick={() => toggleGroup('customer')}
              className="w-full md:cursor-default flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#C89D54] py-1.5"
            >
              <span>{t('footer.customerLinks')}</span>
              <ChevronDown
                className={`w-4 h-4 md:hidden transition-transform ${
                  openMobileGroup === 'customer' ? 'rotate-180' : ''
                }`}
              />
            </button>
            <ul
              className={`space-y-2 text-xs text-emerald-100/90 pt-2 ${
                openMobileGroup === 'customer' ? 'block' : 'hidden md:block'
              }`}
            >
              <li>
                <Link
                  to="/catalog"
                  className="hover:text-[#C89D54] transition-colors"
                >
                  {t('nav.allProducts')}
                </Link>
              </li>
              <li>
                <Link
                  to="/favorites"
                  className="hover:text-[#C89D54] transition-colors"
                >
                  {t('nav.favorites')}
                </Link>
              </li>
              <li>
                <Link
                  to="/catalog?filter=discounted"
                  className="hover:text-[#C89D54] transition-colors"
                >
                  {t('nav.specialDiscounts')}
                </Link>
              </li>
              <li>
                <Link
                  to="/cart"
                  className="hover:text-[#C89D54] transition-colors"
                >
                  {t('header.cart')}
                </Link>
              </li>
              <li>
                <Link
                  to="/account"
                  className="hover:text-[#C89D54] transition-colors"
                >
                  {t('header.account')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Group 3: Working Hours & Location */}
          <div className="py-2 md:py-0">
            <button
              type="button"
              onClick={() => toggleGroup('contact')}
              className="w-full md:cursor-default flex items-center justify-between text-xs font-extrabold uppercase tracking-wider text-[#C89D54] py-1.5"
            >
              <span>{t('footer.contactUs')}</span>
              <ChevronDown
                className={`w-4 h-4 md:hidden transition-transform ${
                  openMobileGroup === 'contact' ? 'rotate-180' : ''
                }`}
              />
            </button>
            <ul
              className={`space-y-2 text-xs text-emerald-100/90 pt-2 ${
                openMobileGroup === 'contact' ? 'block' : 'hidden md:block'
              }`}
            >
              <li className="flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                <span>Telegram: {storeSettings.supportTelegram}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                <span>{storeSettings.workingHours}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#C89D54] shrink-0" />
                <span>{storeSettings.cityLocation}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-4 border-t border-emerald-900/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-emerald-200/75">
          <p>
            © {new Date().getFullYear()} {storeSettings.storeName}.{' '}
            {t('footer.rights')}
          </p>
        </div>
      </div>

      {/* Customer Inquiry Modal */}
      <Modal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        title={t('footer.inquiryModalTitle')}
        footer={
          <div className="w-full grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsInquiryModalOpen(false)}
            >
              {t('footer.cancelBtn')}
            </Button>
            <Button
              type="submit"
              form="customer-inquiry-form"
              variant="primary"
              size="md"
              fullWidth
            >
              {t('footer.sendBtn')}
            </Button>
          </div>
        }
      >
        <form
          id="customer-inquiry-form"
          onSubmit={handleSubmitInquiry}
          className="space-y-4 text-gray-900"
        >
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          <Input
            label={t('cart.fullName')}
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />

          <Input
            label={t('cart.phone')}
            required
            value={phone}
            onChange={(e) => setPhone(formatUzbekPhone(e.target.value))}
            placeholder="+998 90 123-45-67"
          />

          <Input
            label="Mavzu / Тема / Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">
              Xabar / Сообщение / Message <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
            />
          </div>
        </form>
      </Modal>
    </footer>
  );
};
