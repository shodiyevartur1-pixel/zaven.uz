import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'green'
    | 'gold'
    | 'success'
    | 'warning'
    | 'danger'
    | 'neutral'
    | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  className = '',
}) => {
  // Explicit light and dark mode contrast pairs so badges are never washed out on product photos or dark cards
  const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
    green:
      'bg-[#0F3D2E] text-white border border-emerald-500/40 shadow-sm',
    gold:
      'bg-[#C89D54] text-[#09261C] font-bold border border-[#E5C992] shadow-sm',
    success:
      'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/90 dark:text-emerald-300 dark:border-emerald-700/70',
    warning:
      'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/90 dark:text-amber-300 dark:border-amber-700/70',
    danger:
      'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/90 dark:text-red-300 dark:border-red-700/70',
    info:
      'bg-sky-50 text-sky-800 border border-sky-200 dark:bg-sky-950/90 dark:text-sky-300 dark:border-sky-700/70',
    neutral:
      'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-[#1D352D] dark:text-gray-200 dark:border-[#2F5246]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-0.5 font-semibold',
    md: 'text-xs px-3 py-1 font-bold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};
