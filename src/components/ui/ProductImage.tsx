import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';

export interface ProductImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  alt?: string;
  fallbackLabel?: string;
}

/**
 * Shared reliable image component for product cards, detail galleries, and thumbnails:
 * - Resets error state automatically whenever `src` changes.
 * - Never renders the browser's broken-image icon or raw overflowing alt text.
 * - Preserves accessible `aria-label={alt}` on the compact ZAVEN placeholder.
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt = '',
  className = '',
  fallbackLabel = 'ZAVEN',
  onClick,
  ...rest
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || !src.trim() || hasError) {
    return (
      <div
        role="img"
        aria-label={alt || fallbackLabel}
        onClick={onClick as React.MouseEventHandler<HTMLDivElement> | undefined}
        className={`bg-gradient-to-br from-[#0F3D2E] to-[#09261C] text-[#C89D54] flex flex-col items-center justify-center p-2 select-none overflow-hidden ${className}`}
      >
        <div className="w-8 h-8 rounded-xl bg-[#C89D54]/15 border border-[#C89D54]/40 flex items-center justify-center mb-1 shrink-0">
          <Package className="w-4 h-4 text-[#C89D54]" />
        </div>
        <span className="text-[10px] font-extrabold tracking-widest uppercase text-[#E5C992] truncate max-w-full">
          {fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onClick={onClick}
      onError={() => setHasError(true)}
      className={className}
      {...rest}
    />
  );
};
