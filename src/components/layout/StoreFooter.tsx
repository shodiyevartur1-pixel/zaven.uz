import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Instagram,
  MapPin,
  Clock,
  Send,
  ShieldCheck,
  Truck,
  CreditCard,
  Headphones,
  MessageSquarePlus,
  User,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { formatUzbekPhone, isValidUzbekPhone } from '../../utils/format';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

export const StoreFooter: React.FC = () => {
  const {
    categories,
    storeSettings,
    currentCustomer,
    submitCustomerInquiry,
  } = useStore();
  const { t, getCategoryText } = useThemeLanguage();

  const [isInquiryModalOpen, setIsInquiryModalOpen] = useState(false);
  const [inqName, setInqName] = useState(currentCustomer?.fullName || '');
  const [inqPhone, setInqPhone] = useState(currentCustomer?.phone || '+998 ');
  const [inqSubject, setInqSubject] = useState('');
  const [inqMessage, setInqMessage] = useState('');
  const [inqError, setInqError] = useState('');

  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const enabledTrustItems = storeSettings.trustItems.filter(
    (tItem) => tItem.isEnabled
  );
  const enabledPaymentMethods = storeSettings.paymentMethods.filter(
    (pm) => pm.isEnabled
  );

  const getTrustIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShieldCheck':
        return <ShieldCheck className="w-6 h-6 text-brand-green" />;
      case 'Truck':
        return <Truck className="w-6 h-6 text-brand-green" />;
      case 'CreditCard':
        return <CreditCard className="w-6 h-6 text-brand-green" />;
      case 'Headphones':
      default:
        return <Headphones className="w-6 h-6 text-brand-green" />;
    }
  };

  const handleOpenInquiryModal = () => {
    setInqError('');
    setInqName(currentCustomer?.fullName || '');
    setInqPhone(currentCustomer?.phone || '+998 ');
    setInqSubject('');
    setInqMessage('');
    setIsInquiryModalOpen(true);
  };

  const handleSubmitInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (inqName.trim().length < 2) {
      setInqError(t('cart.fullName'));
      return;
    }
    if (!isValidUzbekPhone(inqPhone)) {
      setInqError('+998 XX XXX-XX-XX');
      return;
    }
    if (inqMessage.trim().length < 5) {
      setInqError('...');
      return;
    }

    submitCustomerInquiry({
      customerName: inqName,
      phone: inqPhone,
      subject: inqSubject.trim() || 'Mijoz savoli',
      message: inqMessage,
    });
    setIsInquiryModalOpen(false);
  };

  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      {/* Configurable Trust Highlights Strip */}
      {enabledTrustItems.length > 0 && (
        <div className="border-b border-gray-200 bg-surface-subtle/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {enabledTrustItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3.5 bg-white p-4 rounded-xl border border-gray-200/80 shadow-card"
                >
                  <div className="w-11 h-11 rounded-lg bg-brand-green-light flex items-center justify-center shrink-0">
                    {getTrustIcon(item.iconName)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Columns (No public Admin links) */}
      <div className="bg-brand-green-dark text-emerald-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
            {/* Column 1: Brand & About */}
            <div className="space-y-4">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-brand-gold flex items-center justify-center text-brand-green-dark font-extrabold text-xl">
                  Z
                </div>
                <span className="font-extrabold text-2xl tracking-wider text-white">
                  {storeSettings.storeName}
                </span>
              </Link>
              <p className="text-sm text-emerald-100/90 leading-relaxed">
                {t('top.tagline')}.
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-2.5">
                <a
                  href={storeSettings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-brand-green hover:bg-brand-gold hover:text-brand-green-dark text-white text-xs font-bold transition-colors border border-brand-gold/40"
                >
                  <Instagram className="w-4 h-4" />
                  <span>Instagram: {storeSettings.instagramHandle}</span>
                </a>
              </div>
            </div>

            {/* Column 2: Categories */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-gold mb-4">
                {t('nav.categoriesTitle')}
              </h4>
              <ul className="space-y-2.5 text-sm text-emerald-100">
                <li>
                  <Link
                    to="/catalog"
                    className="hover:text-brand-gold transition-colors"
                  >
                    {t('nav.allProducts')}
                  </Link>
                </li>
                {activeCategories.map((cat) => {
                  const locCat = getCategoryText(cat);
                  return (
                    <li key={cat.id}>
                      <Link
                        to={`/catalog?category=${cat.slug}`}
                        className="hover:text-brand-gold transition-colors"
                      >
                        {locCat.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Column 3: Customer Links & Payment Info */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-gold mb-4">
                {t('footer.customerLinks')}
              </h4>
              <ul className="space-y-2.5 text-sm text-emerald-100">
                <li>
                  <Link
                    to="/catalog?filter=new"
                    className="hover:text-brand-gold transition-colors"
                  >
                    {t('nav.newArrivals')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/catalog?filter=discounted"
                    className="hover:text-brand-gold transition-colors"
                  >
                    {t('nav.specialDiscounts')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cart"
                    className="hover:text-brand-gold transition-colors"
                  >
                    {t('header.cart')}
                  </Link>
                </li>
                <li>
                  <Link
                    to="/account"
                    className="hover:text-brand-gold transition-colors"
                  >
                    {t('header.account')}
                  </Link>
                </li>
              </ul>

              {enabledPaymentMethods.length > 0 && (
                <div className="mt-6">
                  <div className="flex flex-wrap gap-1.5">
                    {enabledPaymentMethods.map((pm) => (
                      <span
                        key={pm.id}
                        className="text-[11px] px-2.5 py-1 rounded bg-brand-green text-emerald-100 border border-emerald-700"
                      >
                        {pm.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Column 4: Store Contacts & Direct Inquiry Button */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-brand-gold">
                {t('footer.contactUs')}
              </h4>
              <ul className="space-y-3 text-sm text-emerald-100">
                <li className="flex items-start gap-2.5">
                  <Phone className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <div>
                    <a
                      href={`tel:${storeSettings.supportPhone.replace(/\s+/g, '')}`}
                      className="font-bold text-white hover:text-brand-gold block"
                    >
                      {storeSettings.supportPhone}
                    </a>
                    <span className="text-xs text-emerald-200">
                      {t('footer.supportService')}
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Send className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-white block">
                      Telegram: {storeSettings.supportTelegram}
                    </span>
                  </div>
                </li>
                <li className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <span>{storeSettings.workingHours}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-brand-gold shrink-0 mt-0.5" />
                  <span>{storeSettings.cityLocation}</span>
                </li>
              </ul>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleOpenInquiryModal}
                  className="w-full py-2.5 px-4 rounded-xl bg-brand-gold hover:bg-brand-gold-hover text-brand-green-dark font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span>{t('footer.sendInquiryBtn')}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-emerald-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-200/80">
            <p>
              © {new Date().getFullYear()} {storeSettings.storeName}.{' '}
              {t('footer.rights')}
            </p>
            <p className="text-center sm:text-right">{t('footer.demoNotice')}</p>
          </div>
        </div>
      </div>

      {/* Customer Support Inquiry Modal */}
      <Modal
        isOpen={isInquiryModalOpen}
        onClose={() => setIsInquiryModalOpen(false)}
        title={t('footer.inquiryModalTitle')}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsInquiryModalOpen(false)}
            >
              {t('footer.cancelBtn')}
            </Button>
            <Button
              type="submit"
              form="customer-inquiry-form"
              variant="primary"
              size="sm"
            >
              {t('footer.sendBtn')}
            </Button>
          </>
        }
      >
        <form
          id="customer-inquiry-form"
          onSubmit={handleSubmitInquiry}
          className="space-y-4 text-xs sm:text-sm"
        >
          {inqError && (
            <p className="text-xs font-bold text-red-600">{inqError}</p>
          )}

          <Input
            label={t('cart.fullName')}
            required
            value={inqName}
            onChange={(e) => {
              setInqName(e.target.value);
              setInqError('');
            }}
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label={t('cart.phone')}
            required
            type="tel"
            value={inqPhone}
            onChange={(e) => {
              setInqPhone(formatUzbekPhone(e.target.value));
              setInqError('');
            }}
            placeholder="+998 90 123-45-67"
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Mavzu / Тема / Subject"
            value={inqSubject}
            onChange={(e) => setInqSubject(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-800 mb-1.5">
              Xabar / Сообщение / Message <span className="text-red-600">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={inqMessage}
              onChange={(e) => {
                setInqMessage(e.target.value);
                setInqError('');
              }}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-green focus:outline-none"
            />
          </div>
        </form>
      </Modal>
    </footer>
  );
};