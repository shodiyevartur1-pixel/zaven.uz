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
 * PART 1 FIX: Compact mobile toast notification positioned below the sticky header
 * (`top-[4.25rem] sm:top-20`), bounded within the viewport (`max-w-[calc(100vw-2rem)] sm:max-w-xs`),
 * with clean 2-line text wrapping and a touch-friendly close button so it never covers
 * the product purchase area or collides with bottom navigation.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed top-[4.25rem] sm:top-20 right-4 left-4 sm:left-auto z-50 flex flex-col items-end gap-2 pointer-events-none"
    >
      {toasts.slice(-2).map((toast) => {
        const iconMap = {
          success: (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ),
          error: <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
          warning: (
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          ),
          info: <Info className="w-4 h-4 text-[#C89D54] shrink-0" />,
        };

        return (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto w-full max-w-[320px] sm:max-w-xs bg-[#09261C]/95 dark:bg-[#12211C]/95 text-white rounded-xl border border-[#C89D54]/45 shadow-lg px-3 py-2 flex items-center justify-between gap-2.5 backdrop-blur-sm transition-all"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {iconMap[toast.type]}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold text-white leading-tight break-words line-clamp-1">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="text-[11px] text-emerald-100/90 leading-snug mt-0.5 break-words line-clamp-1">
                    {toast.description}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Yopish / Close notification"
              className="w-7 h-7 rounded-lg text-emerald-200 hover:text-white hover:bg-white/10 flex items-center justify-center shrink-0 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
