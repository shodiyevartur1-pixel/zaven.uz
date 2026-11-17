import React, { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { formatUZS } from '../../utils/format';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

/**
 * Shared Input component with built-in leading-zero protection when `type="number"` is used:
 * - Allows clearing a `0` value naturally while editing instead of trapping a leading `0` (e.g., `070000`).
 * - Normalizes leading zeros safely on change and blur while preserving numeric values for callers.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightElement,
      className = '',
      required,
      id,
      type = 'text',
      value,
      onChange,
      onBlur,
      ...props
    },
    ref
  ) => {
    const reactId = useId();
    const generatedId = id || `input-${reactId}`;

    const isNumericType = type === 'number';
    const [isFocused, setIsFocused] = useState(false);
    const [draftNumberStr, setDraftNumberStr] = useState<string>(() =>
      value === undefined || value === null ? '' : String(value)
    );

    useEffect(() => {
      if (!isNumericType) return;
      if (!isFocused) {
        setDraftNumberStr(
          value === undefined || value === null ? '' : String(value)
        );
      } else {
        const numericDraft =
          draftNumberStr === '' ? 0 : Number(draftNumberStr);
        if (
          value !== undefined &&
          value !== null &&
          value !== '' &&
          Number(value) !== numericDraft
        ) {
          setDraftNumberStr(String(value));
        }
      }
    }, [value, isNumericType, isFocused]);

    const handleInternalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isNumericType) {
        onChange?.(e);
        return;
      }

      const raw = e.target.value;
      // Allow empty string while editing so user can clear '0' and type '70000'
      if (raw === '') {
        setDraftNumberStr('');
        const clonedEvent = {
          ...e,
          target: { ...e.target, value: '' },
          currentTarget: { ...e.currentTarget, value: '' },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange?.(clonedEvent);
        return;
      }

      // Normalize leading zeros like "070000" -> "70000"
      const cleaned = raw.replace(/[^0-9.]/g, '');
      const normalized =
        cleaned.length > 1 && cleaned.startsWith('0') && !cleaned.startsWith('0.')
          ? cleaned.replace(/^0+/, '') || '0'
          : cleaned;

      setDraftNumberStr(normalized);
      const clonedEvent = {
        ...e,
        target: { ...e.target, value: normalized },
        currentTarget: { ...e.currentTarget, value: normalized },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(clonedEvent);
    };

    const handleInternalBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      if (isNumericType) {
        if (draftNumberStr === '') {
          const fallback = props.min !== undefined ? String(props.min) : '0';
          setDraftNumberStr(fallback);
        } else {
          const num = Number(draftNumberStr);
          if (!Number.isNaN(num)) {
            setDraftNumberStr(String(num));
          }
        }
      }
      onBlur?.(e);
    };

    return (
      <div className="w-full min-w-0">
        {label && (
          <label
            htmlFor={generatedId}
            className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={generatedId}
            type={isNumericType ? 'text' : type}
            inputMode={isNumericType ? 'numeric' : props.inputMode}
            required={required}
            value={isNumericType ? draftNumberStr : value}
            onFocus={(e) => {
              setIsFocused(true);
              if (isNumericType && draftNumberStr === '0') {
                setDraftNumberStr('');
              }
              props.onFocus?.(e);
            }}
            onChange={handleInternalChange}
            onBlur={handleInternalBlur}
            className={`w-full min-h-[42px] rounded-xl border bg-white dark:bg-[#0D1915] px-3.5 py-2 text-xs sm:text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89D54] ${
              leftIcon ? 'pl-10' : ''
            } ${rightElement ? 'pr-10' : ''} ${
              error
                ? 'border-red-400 focus:border-red-500'
                : 'border-gray-300 dark:border-[#2F5246] focus:border-brand-green dark:focus:border-[#C89D54]'
            } disabled:bg-gray-100 dark:disabled:bg-[#162621] disabled:text-gray-500 ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = 'Input';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<
    React.SelectHTMLAttributes<HTMLSelectElement>,
    'onChange' | 'value'
  > {
  label?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

/**
 * Shared accessible ZAVEN dropdown replacing the native OS <select> popup:
 * - Preserves the exact existing SelectProps API (`value`, `onChange(e)`, `options`, `label`, `disabled`, `required`).
 * - Supports mouse, touch, keyboard navigation (`ArrowDown`, `ArrowUp`, `Home`, `End`, `Enter`, `Space`, `Escape`),
 *   outside-click dismissal, and screen readers (`role="listbox"`, `aria-activedescendant`, `aria-selected`).
 * - Automatically flips upward if opening near the bottom of a dialog or viewport so it is never clipped.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      value,
      onChange,
      options,
      required,
      error,
      helperText,
      disabled,
      className = '',
      id,
      name,
    },
    ref
  ) => {
    const reactId = useId();
    const selectId = id || `select-${reactId}`;
    const listboxId = `${selectId}-listbox`;

    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(() =>
      Math.max(
        0,
        options.findIndex((o) => o.value === value)
      )
    );

    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const selectedOption =
      options.find((o) => o.value === value) || options[0] || null;

    useEffect(() => {
      const idx = options.findIndex((o) => o.value === value);
      if (idx >= 0) {
        setHighlightedIndex(idx);
      }
    }, [value, options]);

    const emitChange = (nextVal: string) => {
      if (!onChange) return;
      const syntheticEvent = {
        target: { value: nextVal, name: name || '' },
        currentTarget: { value: nextVal, name: name || '' },
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    };

    const updatePlacementAndOpen = () => {
      if (disabled) return;
      if (triggerRef.current && typeof window !== 'undefined') {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        setOpenUpward(spaceBelow < 230 && spaceAbove > spaceBelow);
      }
      const currentIdx = options.findIndex((o) => o.value === value);
      setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);
      setIsOpen(true);
    };

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    useEffect(() => {
      if (isOpen && optionRefs.current[highlightedIndex]) {
        optionRefs.current[highlightedIndex]?.scrollIntoView({
          block: 'nearest',
        });
      }
    }, [isOpen, highlightedIndex]);

    const handleTriggerKeyDown = (
      e: React.KeyboardEvent<HTMLButtonElement>
    ) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) {
          updatePlacementAndOpen();
        } else if (options[highlightedIndex]) {
          emitChange(options[highlightedIndex].value);
          setIsOpen(false);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          updatePlacementAndOpen();
        } else {
          setHighlightedIndex((prev) => (prev + 1) % Math.max(1, options.length));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          updatePlacementAndOpen();
        } else {
          setHighlightedIndex(
            (prev) =>
              (prev - 1 + Math.max(1, options.length)) %
              Math.max(1, options.length)
          );
        }
      } else if (e.key === 'Home' && isOpen) {
        e.preventDefault();
        setHighlightedIndex(0);
      } else if (e.key === 'End' && isOpen) {
        e.preventDefault();
        setHighlightedIndex(Math.max(0, options.length - 1));
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const setCombinedRef = (node: HTMLButtonElement | null) => {
      triggerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLButtonElement | null>).current =
          node;
      }
    };

    const activeOptionId =
      isOpen && options[highlightedIndex]
        ? `${selectId}-opt-${highlightedIndex}`
        : undefined;

    return (
      <div
        ref={containerRef}
        className={`w-full min-w-0 relative ${className}`}
      >
        {label && (
          <label
            id={`${selectId}-label`}
            htmlFor={selectId}
            className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}

        <button
          ref={setCombinedRef}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby={
            label ? `${selectId}-label ${selectId}` : undefined
          }
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
          onClick={() => (isOpen ? setIsOpen(false) : updatePlacementAndOpen())}
          onKeyDown={handleTriggerKeyDown}
          className={`w-full min-h-[42px] px-3.5 py-2 rounded-xl border text-left text-xs sm:text-sm font-semibold transition-all flex items-center justify-between gap-2 bg-white dark:bg-[#0D1915] text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89D54] ${
            isOpen
              ? 'border-[#C89D54] ring-2 ring-[#C89D54]/25'
              : error
              ? 'border-red-400'
              : 'border-gray-300 dark:border-[#2F5246] hover:border-brand-green dark:hover:border-[#C89D54]'
          } disabled:opacity-60 disabled:cursor-not-allowed`}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : '—'}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-[#C89D54]' : ''
            }`}
          />
        </button>

        {isOpen && (
          <ul
            id={listboxId}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={label ? `${selectId}-label` : undefined}
            className={`absolute left-0 right-0 ${
              openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
            } max-h-56 overflow-y-auto overscroll-contain scrollbar-thin rounded-2xl bg-white dark:bg-[#12211C] border border-gray-200 dark:border-[#2F5246] shadow-2xl p-1.5 z-50 space-y-0.5`}
          >
            {options.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isHighlighted = idx === highlightedIndex;
              return (
                <li
                  key={opt.value}
                  id={`${selectId}-opt-${idx}`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    ref={(el) => {
                      optionRefs.current[idx] = el;
                    }}
                    type="button"
                    tabIndex={-1}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    onClick={() => {
                      emitChange(opt.value);
                      setIsOpen(false);
                      triggerRef.current?.focus();
                    }}
                    className={`w-full min-h-[38px] px-3 py-2 rounded-xl text-left text-xs sm:text-sm transition-colors flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#0F3D2E] text-white font-extrabold'
                        : isHighlighted
                        ? 'bg-brand-green-light/65 dark:bg-[#162923] text-gray-900 dark:text-gray-100 font-semibold'
                        : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#162923] font-medium'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#C89D54] text-[#09261C] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error ? (
          <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);
Select.displayName = 'Select';

export interface NumericInputProps {
  label: string;
  value: number | null | undefined;
  onChange: (nextValue: number | null) => void;
  allowEmpty?: boolean;
  required?: boolean;
  min?: number;
  placeholder?: string;
  showCurrencyPreview?: boolean;
  error?: string;
  helperText?: string;
}

/**
 * Dedicated numeric input component for UZS prices, stock counts, and thresholds:
 * - Never traps a leading '0' when clearing the field.
 * - Normalizes leading zeros on edit and blur while keeping calculations strictly numeric.
 * - Displays formatted UZS currency below the input when `showCurrencyPreview` is enabled.
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  label,
  value,
  onChange,
  allowEmpty = false,
  required = false,
  min = 0,
  placeholder = '0',
  showCurrencyPreview = false,
  error,
  helperText,
}) => {
  const reactId = useId();
  const inputId = `numeric-${reactId}`;

  const [isFocused, setIsFocused] = useState(false);
  const [rawText, setRawText] = useState<string>(() =>
    value === null || value === undefined || (value === 0 && allowEmpty)
      ? ''
      : String(value)
  );

  useEffect(() => {
    if (!isFocused) {
      setRawText(
        value === null || value === undefined || (value === 0 && allowEmpty)
          ? ''
          : String(value)
      );
    }
  }, [value, allowEmpty, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '');
    const normalized =
      digitsOnly.length > 1 ? digitsOnly.replace(/^0+/, '') || '0' : digitsOnly;

    setRawText(normalized);

    if (normalized === '') {
      onChange(allowEmpty ? null : 0);
    } else {
      const parsed = Math.max(min, Number(normalized));
      onChange(parsed);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (rawText === '0') {
      setRawText('');
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (rawText === '') {
      if (allowEmpty) {
        onChange(null);
      } else {
        const fallback = Math.max(0, min);
        setRawText(String(fallback));
        onChange(fallback);
      }
    } else {
      const parsed = Math.max(min, Number(rawText));
      setRawText(String(parsed));
      onChange(parsed);
    }
  };

  const previewAmount =
    rawText !== '' && !Number.isNaN(Number(rawText))
      ? Number(rawText)
      : value && value > 0
      ? value
      : null;

  return (
    <div className="w-full min-w-0">
      <label
        htmlFor={inputId}
        className="block text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5"
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        value={rawText}
        onFocus={handleFocus}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`w-full min-h-[42px] rounded-xl border bg-white dark:bg-[#0D1915] px-3.5 py-2 text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C89D54] ${
          error
            ? 'border-red-400 focus:border-red-500'
            : 'border-gray-300 dark:border-[#2F5246] focus:border-brand-green dark:focus:border-[#C89D54]'
        }`}
      />

      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : showCurrencyPreview && previewAmount !== null && previewAmount > 0 ? (
        <p className="mt-1 text-[11px] font-bold text-brand-green">
          {formatUZS(previewAmount)}
        </p>
      ) : helperText ? (
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
