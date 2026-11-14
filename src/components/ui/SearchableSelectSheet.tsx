import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Search, Check, X, MapPin } from 'lucide-react';

export interface SelectSheetOption {
  value: string;
  label: string;
  sublabel?: string;
  badgeText?: string;
}

export interface SearchableSelectSheetProps {
  label: string;
  sheetTitle: string;
  searchPlaceholder: string;
  noResultsText: string;
  value: string;
  options: SelectSheetOption[];
  onChange: (newValue: string) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
}

/**
 * Requirement #11: Custom responsive ZAVEN-styled searchable picker.
 * - Replaces the oversized Android/iOS native <select> popup.
 * - Renders as a polished bottom sheet on mobile (`items-end sm:items-center`)
 *   and a centered dialog on tablet/desktop.
 * - Provides live search filtering, selected checkmark, keyboard accessibility,
 *   and viewport-safe internal scrolling (`max-h-[55dvh]`).
 */
export const SearchableSelectSheet: React.FC<SearchableSelectSheetProps> = ({
  label,
  sheetTitle,
  searchPlaceholder,
  noResultsText,
  value,
  options,
  onChange,
  required = false,
  error,
  helperText,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value) || options[0] || null,
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
        (opt.badgeText && opt.badgeText.toLowerCase().includes(q))
    );
  }, [options, searchQuery]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    document.body.classList.add('zaven-modal-open');
    window.addEventListener('keydown', handleKeyDown);

    const focusTimer = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 60);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = '';
      document.body.classList.remove('zaven-modal-open');
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleOpen = () => {
    setSearchQuery('');
    setIsOpen(true);
  };

  const handleSelectOption = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="w-full min-w-0">
      <label className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-left transition-colors flex items-center justify-between gap-2 bg-white dark:bg-[#0D1915] shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89D54] ${
          error
            ? 'border-red-400 dark:border-red-500/70'
            : 'border-gray-300 dark:border-[#2F5246] hover:border-brand-green dark:hover:border-[#C89D54]'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-brand-green shrink-0" />
          <div className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
              {selectedOption ? selectedOption.label : '—'}
            </span>
            {selectedOption?.badgeText && (
              <span className="text-[11px] font-extrabold text-brand-green bg-brand-green-light dark:bg-[#162923] px-2 py-0.5 rounded-md shrink-0">
                {selectedOption.badgeText}
              </span>
            )}
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
          {helperText}
        </p>
      ) : null}

      {/* Responsive Bottom Sheet (Mobile) / Centered Modal (Tablet & Desktop) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={sheetTitle}
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-[2px] transition-opacity"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Sheet Container */}
          <div className="relative z-10 w-full sm:max-w-md bg-white dark:bg-[#12211C] rounded-t-2xl sm:rounded-2xl border-t sm:border border-gray-200 dark:border-[#2F5246] shadow-2xl flex flex-col max-h-[82dvh] sm:max-h-[78vh] overflow-hidden">
            {/* Top Grab Handle on Mobile */}
            <div className="sm:hidden pt-2 pb-1 flex justify-center bg-[#0F3D2E]">
              <span className="w-10 h-1 rounded-full bg-emerald-200/40" />
            </div>

            {/* Header */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-[#0F3D2E] text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-[#C89D54] shrink-0" />
                <h3 className="text-sm sm:text-base font-extrabold text-white truncate">
                  {sheetTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Yopish / Close"
                className="w-8 h-8 rounded-lg bg-[#09261C]/80 hover:bg-[#16533F] text-emerald-100 hover:text-white flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-3 bg-[#F8F9FA] dark:bg-[#162923] border-b border-gray-200 dark:border-[#28453B] shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-gray-300 dark:border-[#2F5246] bg-white dark:bg-[#0D1915] text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:border-[#C89D54] focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Options List */}
            <ul
              role="listbox"
              aria-label={sheetTitle}
              className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-gray-100 dark:divide-[#28453B] p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
            >
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectOption(opt.value)}
                        className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-xl text-left transition-colors flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-brand-green-light dark:bg-[#1D352D] text-brand-green font-extrabold'
                            : 'text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#162923] font-semibold'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="text-xs sm:text-sm block break-words">
                            {opt.label}
                          </span>
                          {opt.sublabel && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal block mt-0.5">
                              {opt.sublabel}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {opt.badgeText && (
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md font-bold ${
                                isSelected
                                  ? 'bg-[#0F3D2E] text-[#F3D79B]'
                                  : 'bg-gray-100 dark:bg-[#0D1915] text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {opt.badgeText}
                            </span>
                          )}
                          {isSelected && (
                            <span className="w-6 h-6 rounded-full bg-[#0F3D2E] text-[#C89D54] flex items-center justify-center">
                              <Check className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="py-8 px-4 text-center text-xs text-gray-500 dark:text-gray-400">
                  {noResultsText}
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
