import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  ArrowLeft,
  Database,
  Terminal,
} from 'lucide-react';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { useThemeLanguage } from '../../context/ThemeLanguageContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { ThemeLanguageControls } from '../../components/ui/ThemeLanguageControls';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    authError,
    isLoadingAuth,
    isSupabaseReady,
    isDevPreviewAllowed,
    signInWithSupabase,
    signInDevPreviewOwner,
  } = useOwnerAuth();
  const { language, t } = useThemeLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const labels = {
    uz: {
      badge: 'FAQAT DOʻKON EGASI UCHUN (SINGLE-OWNER)',
      title: 'ZAVEN Boshqaruv Paneliga Kirish',
      subtitle:
        'Ushbu boʻlim faqat ZAVEN doʻkoni egasi uchun moʻljallangan. Ochiq roʻyxatdan oʻtish yoki qoʻshimcha xodim hisoblari mavjud emas.',
      emailLabel: 'Doʻkon egasi (Owner) elektron pochtasi',
      passwordLabel: 'Maxfiy parol',
      signInBtn: 'Tasdiqlash va kirish',
      backToStore: 'Xaridorlar doʻkoniga qaytish',
      supabaseConnected: 'Supabase Auth himoyasi faol',
      supabaseNotConfigured: 'Supabase backend hali sozlanmagan (.env.local)',
      supabaseSetupHint:
        'Haqiqiy ishlab chiqarish (production) himoyasi uchun .env.local fayliga VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY va VITE_OWNER_EMAIL qiymatlarini kiriting.',
      devPreviewTitle: 'Lokal Dasturchi Sinov Rejimi (Faqat DEV muhitida)',
      devPreviewDesc:
        'Siz hozirda lokal dasturlash muhitidasiz (import.meta.env.DEV). Production buildda ushbu tugma avtomatik oʻchiriladi.',
      devPreviewBtn: 'Lokal Dev-Preview orqali Owner panelni koʻrish',
    },
    ru: {
      badge: 'ТОЛЬКО ДЛЯ ВЛАДЕЛЬЦА МАГАЗИНА (SINGLE-OWNER)',
      title: 'Вход в панель управления ZAVEN',
      subtitle:
        'Доступ разрешен исключительно владельцу магазина ZAVEN. Публичная регистрация и гостевые роли отключены.',
      emailLabel: 'Email владельца магазина (Owner)',
      passwordLabel: 'Пароль',
      signInBtn: 'Войти в панель владельца',
      backToStore: 'Вернуться в магазин',
      supabaseConnected: 'Защита Supabase Auth активна',
      supabaseNotConfigured: 'Supabase еще не подключен (.env.local)',
      supabaseSetupHint:
        'Для промышленной эксплуатации укажите VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY и VITE_OWNER_EMAIL в файле .env.local.',
      devPreviewTitle: 'Локальный режим разработчика (Только в DEV)',
      devPreviewDesc:
        'Доступно только при локальной разработке. В production-сборке этот обход полностью отключен.',
      devPreviewBtn: 'Открыть панель владельца (Dev-Preview)',
    },
    en: {
      badge: 'SINGLE-OWNER ACCESS ONLY',
      title: 'ZAVEN Owner Admin Sign In',
      subtitle:
        'This workspace is restricted exclusively to the ZAVEN store owner. Public registration and staff role switching are disabled.',
      emailLabel: 'Store Owner Email Address',
      passwordLabel: 'Password',
      signInBtn: 'Sign In as Owner',
      backToStore: 'Return to Storefront',
      supabaseConnected: 'Supabase Auth Protection Active',
      supabaseNotConfigured: 'Supabase Backend Not Configured (.env.local)',
      supabaseSetupHint:
        'Supply VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_OWNER_EMAIL in .env.local to enable live Supabase authentication.',
      devPreviewTitle: 'Local Developer Preview Mode (DEV Only)',
      devPreviewDesc:
        'Available only during local development. Automatically stripped and disabled in production builds.',
      devPreviewBtn: 'Enter Owner Workspace (Local Dev Preview)',
    },
  }[language];

  const handleSupabaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email.trim() || !password) {
      setLocalError('Email va parolni kiriting');
      return;
    }

    const ok = await signInWithSupabase(email, password);
    if (ok) {
      navigate('/admin', { replace: true });
    }
  };

  const handleDevPreviewLogin = () => {
    const ok = signInDevPreviewOwner(email || undefined);
    if (ok) {
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-surface-page text-gray-900 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-brand-green hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{labels.backToStore}</span>
        </Link>
        <ThemeLanguageControls variant="surface" />
      </div>

      {/* Center Card */}
      <div className="max-w-md w-full mx-auto my-8 bg-white rounded-2xl border border-gray-200 shadow-card overflow-hidden">
        <div className="bg-brand-green p-6 text-white text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-gold text-brand-green-dark font-extrabold text-2xl flex items-center justify-center mx-auto shadow-sm">
            <Lock className="w-6 h-6" />
          </div>
          <Badge variant="gold" size="sm">
            {labels.badge}
          </Badge>
          <h1 className="text-xl font-extrabold text-white">{labels.title}</h1>
          <p className="text-xs text-emerald-100 leading-relaxed">
            {labels.subtitle}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Backend Connection Status Banner */}
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
              isSupabaseReady
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <Database className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">
                {isSupabaseReady
                  ? labels.supabaseConnected
                  : labels.supabaseNotConfigured}
              </p>
              {!isSupabaseReady && (
                <p className="mt-1 text-amber-800 leading-relaxed">
                  {labels.supabaseSetupHint}
                </p>
              )}
            </div>
          </div>

          {(localError || authError) && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{localError || authError}</span>
            </div>
          )}

          {/* Owner Email + Password Sign-In Form */}
          <form onSubmit={handleSupabaseSubmit} className="space-y-4">
            <Input
              label={labels.emailLabel}
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@zaven.uz"
              leftIcon={<Mail className="w-4 h-4" />}
              disabled={!isSupabaseReady}
            />

            <Input
              label={labels.passwordLabel}
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              leftIcon={<KeyRound className="w-4 h-4" />}
              disabled={!isSupabaseReady}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isLoadingAuth}
              disabled={!isSupabaseReady}
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              {labels.signInBtn}
            </Button>
          </form>

          {/* Gated Local Development Preview Access (Strictly hidden in production builds) */}
          {isDevPreviewAllowed && (
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <div className="p-3 rounded-xl bg-surface-page border border-gray-200 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-gray-800">
                  <Terminal className="w-3.5 h-3.5 text-brand-green" />
                  <span>{labels.devPreviewTitle}</span>
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  {labels.devPreviewDesc}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="md"
                fullWidth
                onClick={handleDevPreviewLogin}
              >
                {labels.devPreviewBtn}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <div className="text-center text-xs text-gray-500 py-2">
        © {new Date().getFullYear()} ZAVEN — {t('footer.rights')}
      </div>
    </div>
  );
};