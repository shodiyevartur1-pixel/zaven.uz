import React from 'react';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightElement,
  id,
  className = '',
  ...props
}) => {
  const inputId =
    id ||
    `input-${
      label
        ? label.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase()
        : Math.random().toString(36).slice(2, 7)
    }`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full min-h-[44px] rounded-xl border bg-white dark:bg-[#0D1915] text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors focus:outline-none ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightElement ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500'
              : 'border-gray-300 dark:border-[#2F5246] focus:border-brand-green dark:focus:border-brand-gold focus:ring-1 focus:ring-brand-green dark:focus:ring-brand-gold'
          } disabled:bg-gray-100 dark:disabled:bg-[#162621] disabled:text-gray-500 dark:disabled:text-gray-500 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  id,
  className = '',
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5"
        >
          {label}
          {props.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full min-h-[44px] rounded-xl border bg-white dark:bg-[#0D1915] px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 transition-colors focus:outline-none ${
          error
            ? 'border-red-500 focus:border-red-500'
            : 'border-gray-300 dark:border-[#2F5246] focus:border-brand-green dark:focus:border-brand-gold focus:ring-1 focus:ring-brand-green dark:focus:ring-brand-gold'
        } disabled:bg-gray-100 dark:disabled:bg-[#162621] disabled:text-gray-500 ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            className="bg-white text-gray-900 dark:bg-[#12211C] dark:text-gray-100"
          >
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400 font-semibold">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};
