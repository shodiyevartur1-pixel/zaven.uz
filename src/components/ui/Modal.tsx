import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

/**
 * Elevated to `z-[70]` with mobile safe-area clearance so modal footers and
 * close buttons are never covered by bottom navigation or Netlify preview badges.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/75 backdrop-blur-[1px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div
        className={`relative w-full ${maxWidthClass} bg-white dark:bg-[#12211C] rounded-2xl border border-gray-200 dark:border-[#2F5246] shadow-2xl overflow-hidden z-10 flex flex-col max-h-[86vh] sm:max-h-[88vh] my-auto`}
      >
        {/* Sticky Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 bg-gray-50 dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] flex items-center justify-between gap-3 shrink-0">
          <h3
            id="modal-title"
            className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-gray-100 truncate"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#2F5246] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center justify-center shrink-0 transition-colors"
            aria-label="Yopish / Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto scrollbar-thin flex-1">
          {children}
        </div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-gray-50 dark:bg-[#162923] border-t border-gray-200 dark:border-[#28453B] flex items-center justify-end gap-2.5 shrink-0 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
