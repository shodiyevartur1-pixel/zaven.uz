import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

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
      className="pointer-events-none fixed inset-x-0 z-[60] flex w-full min-w-0 justify-center px-3 sm:justify-end sm:px-5"
      style={{
        top: 'calc(var(--zaven-store-header-height, 5rem) + env(safe-area-inset-top) + 0.5rem)',
      }}
    >
      <div
        key={latestToast.id}
        role={latestToast.type === 'error' ? 'alert' : 'status'}
        className="pointer-events-auto flex max-h-[70vh] w-full min-w-0 max-w-md items-start justify-between gap-2 overflow-y-auto rounded-xl border border-[#C89D54]/50 bg-[#09261C]/95 px-3 py-2 text-white shadow-lg backdrop-blur-sm transition-all dark:bg-[#12211C]/95"
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {iconMap[latestToast.type]}
          <div className="min-w-0 flex-1 space-y-0.5">
            <p className="break-words text-xs font-extrabold leading-snug text-white [overflow-wrap:anywhere]">
              {latestToast.title}
            </p>
            {latestToast.description && (
              <p className="break-words text-[11px] leading-snug text-emerald-100/90 [overflow-wrap:anywhere]">
                {latestToast.description}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => removeToast(latestToast.id)}
          aria-label="Yopish / Close notification"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-emerald-200 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
