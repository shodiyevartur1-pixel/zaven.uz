import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Terminal,
  X,
  Store,
  LayoutDashboard,
  RefreshCw,
  ShoppingBag,
  Package,
  Lock,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { useOwnerAuth } from '../../context/OwnerAuthContext';
import { isDevDemoAuthAllowed } from '../../lib/supabase';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

/**
 * Strictly Development-Only QA Inspector.
 * Completely disabled and returns `null` in production builds (`import.meta.env.PROD`)
 * or when `VITE_ENABLE_DEV_DEMO_AUTH=false`.
 */
export const PrototypeToolbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { orders, products, cart, resetAllDemoData } = useStore();
  const { isOwnerAuthenticated, ownerEmail, authMode } = useOwnerAuth();

  if (!isDevDemoAuthAllowed) {
    return null;
  }

  const newOrderCount = orders.filter((o) => o.status === 'new').length;
  const cartTotalUnits = cart.reduce((s, i) => s + i.quantity, 0);

  if (!isOpen) {
    return (
      <div className="fixed bottom-20 md:bottom-5 left-4 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 text-white border border-brand-gold/70 shadow-lg hover:bg-brand-green text-[11px] font-extrabold transition-all"
          title="Faqat lokal DEV muhitida koʻrinadigan dasturchi paneli"
        >
          <Terminal className="w-3.5 h-3.5 text-brand-gold" />
          <span>DEV ONLY</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-5 left-4 z-50 w-80 bg-white rounded-2xl border-2 border-brand-green shadow-2xl overflow-hidden text-xs">
      <div className="bg-brand-green-dark text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-brand-gold" />
          <span className="font-extrabold tracking-wide">
            DEV MODE INSPECTOR
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="p-1 rounded-lg text-emerald-200 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3.5">
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
          Ushbu panel faqat lokal <code>import.meta.env.DEV</code> muhitida koʻrinadi. Production buildda avtomatik olib tashlanadi.
        </div>

        {/* Owner Session Status */}
        <div className="p-2.5 rounded-xl bg-surface-page border border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-gray-500 block">
              Owner Session:
            </span>
            <strong className="text-gray-900">
              {isOwnerAuthenticated ? ownerEmail : 'Tizimga kirilmagan'}
            </strong>
          </div>
          <Badge
            variant={isOwnerAuthenticated ? 'success' : 'neutral'}
            size="sm"
          >
            {authMode}
          </Badge>
        </div>

        {/* Quick Navigation */}
        <div className="grid grid-cols-2 gap-1.5">
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="px-2.5 py-2 rounded-lg border border-gray-200 hover:border-brand-green font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <Store className="w-3.5 h-3.5 text-brand-green" />
            <span>Storefront</span>
          </Link>
          <Link
            to="/catalog"
            onClick={() => setIsOpen(false)}
            className="px-2.5 py-2 rounded-lg border border-gray-200 hover:border-brand-green font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5 text-brand-green" />
            <span>Catalog ({products.length})</span>
          </Link>
          <Link
            to="/cart"
            onClick={() => setIsOpen(false)}
            className="px-2.5 py-2 rounded-lg border border-gray-200 hover:border-brand-green font-semibold text-gray-800 flex items-center gap-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-brand-green" />
            <span>Cart ({cartTotalUnits})</span>
          </Link>
          <Link
            to="/admin"
            onClick={() => setIsOpen(false)}
            className="px-2.5 py-2 rounded-lg border border-gray-200 hover:border-brand-green font-semibold text-gray-800 flex items-center gap-1.5"
          >
            {isOwnerAuthenticated ? (
              <LayoutDashboard className="w-3.5 h-3.5 text-brand-gold-dark" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-red-600" />
            )}
            <span>/admin ({newOrderCount})</span>
          </Link>
        </div>

        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="text-[11px] text-gray-500 truncate">
            {location.pathname}
          </span>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={resetAllDemoData}
          >
            Demo tiklash
          </Button>
        </div>
      </div>
    </div>
  );
};