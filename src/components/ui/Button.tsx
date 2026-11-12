import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      'bg-brand-green text-white hover:bg-brand-green-hover active:bg-brand-green-dark shadow-sm',
    secondary:
      'bg-brand-green-light text-brand-green hover:bg-[#d5e6df] border border-brand-green/15',
    gold:
      'bg-brand-gold text-brand-green-dark font-bold hover:bg-brand-gold-hover active:bg-brand-gold-dark shadow-sm',
    outline:
      'border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-brand-green hover:text-brand-green',
    'outline-light':
      'border-2 border-brand-gold/80 bg-brand-green-dark/60 text-white hover:bg-brand-gold hover:text-brand-green-dark hover:border-brand-gold shadow-sm',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-brand-green',
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  };

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[36px] text-xs px-3 py-1.5 gap-1.5',
    md: 'min-h-[42px] text-sm px-4 py-2.5 gap-2',
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
