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
 * Positioned at top-right (`top-20 right-4`) so notifications never collide with
 * sticky mobile bottom navigation, checkout submit buttons, or Netlify preview badges.
 */
export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  const iconMap = {
    success: (
      <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
    ),
    error: (
      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
    ),
    warning: (
      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
    ),
    info: (
      <Info className="w-5 h-5 text-brand-green dark:text-emerald-300 shrink-0" />
    ),
  };

  return (
    <div
      className="fixed top-20 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white dark:bg-[#162923] border border-gray-200 dark:border-[#2F5246] shadow-xl transition-all"
          role="status"
        >
          {iconMap[toast.type]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {toast.title}
            </p>
            {toast.description && (
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 line-clamp-2">
                {toast.description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1 rounded-lg"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
