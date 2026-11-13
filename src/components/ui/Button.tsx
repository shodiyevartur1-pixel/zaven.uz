import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | 'primary'
    | 'secondary'
    | 'gold'
    | 'outline'
    | 'outline-light'
    | 'ghost'
    | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#0F3D2E] text-white hover:bg-[#16533F] active:bg-[#09261C] border border-emerald-500/30 shadow-sm',
    secondary:
      'bg-brand-green-light text-brand-green hover:bg-[#d5e6df] dark:bg-[#1A332A] dark:text-emerald-200 dark:hover:bg-[#224236] border border-brand-green/20 dark:border-emerald-700/50',
    gold:
      'bg-[#C89D54] text-[#09261C] font-extrabold hover:bg-[#B5893E] active:bg-[#9E7632] shadow-sm',
    outline:
      'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-brand-green dark:bg-[#12211C] dark:text-gray-100 dark:border-[#2F5246] dark:hover:bg-[#1A3028] dark:hover:border-brand-gold',
    'outline-light':
      'border-2 border-[#C89D54] bg-[#09261C]/70 text-white hover:bg-[#C89D54] hover:text-[#09261C] shadow-sm',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-brand-green dark:text-gray-200 dark:hover:bg-[#1D352D]',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  };

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[38px] text-xs px-3 py-1.5 gap-1.5',
    md: 'min-h-[44px] text-sm px-4 py-2.5 gap-2',
    lg: 'min-h-[48px] text-base px-6 py-3 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span className="truncate">{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
