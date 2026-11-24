import React from 'react';
import { PackageSearch } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}) => {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6 sm:py-8 px-4 sm:px-6' : 'py-12 px-6'} bg-white dark:bg-[#12211C] rounded-xl border border-gray-200 dark:border-[#28453B]`}>
      <div className={`${compact ? 'w-12 h-12 mb-3' : 'w-14 h-14 mb-4'} rounded-full bg-brand-green-light text-brand-green flex items-center justify-center`}>
        {icon || <PackageSearch className="w-7 h-7" />}
      </div>
      <h3 className={`${compact ? 'text-base sm:text-lg mb-1' : 'text-lg mb-1.5'} font-bold text-gray-900 dark:text-gray-100`}>{title}</h3>
      <p className={`${compact ? 'mb-4' : 'mb-6'} text-sm text-gray-600 dark:text-gray-300 max-w-md`}>{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
