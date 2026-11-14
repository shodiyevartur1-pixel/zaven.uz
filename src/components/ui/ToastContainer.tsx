import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

/**
 * Requirement #8: Single compact toast notification positioned below the header
 * at the top-right (`max-w-[260px] sm:max-w-[300px]`), showing only the latest
 * notification so it never covers the product title, price, quantity controls,
 * or purchase button.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  // Render only the single latest toast so notifications never stack over product content
  const latestToast = toasts[toasts.length - 1];

  const iconMap = {
    success: (
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
    ),
    error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    info: <Info className="w-4 h-4 text-[#C89D54] shrink-0" />,
  };

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-16 sm:top-20 right-3 sm:right-5 z-50 pointer-events-none flex justify-end"
    >
      <div
        key={latestToast.id}
        role="status"
        className="pointer-events-auto w-auto max-w-[260px] sm:max-w-[300px] bg-[#09261C]/95 dark:bg-[#12211C]/95 text-white rounded-xl border border-[#C89D54]/50 shadow-lg px-3 py-2 flex items-center justify-between gap-2 backdrop-blur-sm transition-all"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {iconMap[latestToast.type]}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] sm:text-xs font-extrabold text-white leading-tight break-words line-clamp-1">
              {latestToast.title}
            </p>
            {latestToast.description && (
              <p className="text-[10px] sm:text-[11px] text-emerald-100/90 leading-snug mt-0.5 break-words line-clamp-1">
                {latestToast.description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => removeToast(latestToast.id)}
          aria-label="Yopish / Close notification"
          className="w-6 h-6 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
