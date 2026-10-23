import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/**
 * ProductCard Component
 * Displays a single footwear model within cards strictly 500 CSS px or less.
 * Aspect ratio is derived dynamically from CSS token `--product-ratio: 1 / 1`.
 * Supports image load opacity fade-in (.img-fade-in) and lazy/eager loading.
 */
export const ProductCard = ({
  product,
  image,
  alt,
  name,
  priceText,
  link = '/shop',
  priority = false,
  category,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Allow passing individual props or a unified product object
  const resolvedImage = image || product?.image;
  const resolvedAlt = alt || product?.alt || '';
  const resolvedName = name || product?.name || '';
  const resolvedPriceText =
    priceText || product?.priceText || product?.priceDisplay || 'Price coming soon';
  const resolvedLink = link || product?.link || '/shop';
  const resolvedCategory = category || product?.category;
  const resolvedPriority = priority || Boolean(product?.priority);

  return (
    <article className="group bg-[#181210] border border-[#2F1C15] flex flex-col h-full w-full max-w-[480px] min-w-0 transition-subtle hover:border-[#FEF5E6]/30">
      {/* Aspect Ratio Image Container (1:1 from --product-ratio token) */}
      <div
        className="w-full bg-[#0F0A09] border-b border-[#2F1C15] overflow-hidden relative aspect-square"
        style={{ aspectRatio: 'var(--product-ratio, 1 / 1)' }}
        aria-label={`Product image slot for ${resolvedName}`}
      >
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={resolvedAlt}
            width="500"
            height="500"
            loading={resolvedPriority ? 'eager' : 'lazy'}
            onLoad={() => setIsLoaded(true)}
            className={`w-full h-full aspect-square max-w-full object-cover object-center img-fade-in ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none aspect-square">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A] bg-[#181210] border border-[#2F1C15] px-2.5 py-1 mb-2">
              1:1 Ratio
            </span>
            <p className="text-xs text-[#B8AD9A] max-w-[200px] leading-relaxed">
              TODO(client): image
            </p>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="p-5 sm:p-6 flex flex-col flex-1 min-w-0">
        {resolvedCategory && (
          <span className="text-[10px] uppercase tracking-widest text-[#B8AD9A] mb-1.5 block truncate">
            {resolvedCategory}
          </span>
        )}
        <h3 className="font-serif text-lg sm:text-xl text-[#FEF5E6] group-hover:text-white transition-subtle mb-2 break-words">
          {resolvedName}
        </h3>
        <div className="mt-auto pt-3 border-t border-[#2F1C15] flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-[#FEF5E6] tracking-wider truncate">
            {resolvedPriceText}
          </span>
          <Link
            to={resolvedLink}
            className="text-xs uppercase tracking-wider text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle underline underline-offset-4 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 shrink-0"
            aria-label={`View details for ${resolvedName}`}
          >
            Inquire
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
