import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

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
    <article className="group bg-[#181210] border border-[#2F1C15] hover:border-[#4A2C26] flex flex-col h-full w-full max-w-[420px] min-w-0 transition-subtle shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      {/* Aspect Ratio Image Container (1:1 from --product-ratio token) */}
      <div
        className="w-full bg-[#120D0C] border-b border-[#2F1C15] overflow-hidden relative aspect-square"
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
      <div className="p-6 sm:p-7 flex flex-col flex-1 min-w-0 justify-between">
        <div>
          {resolvedCategory && (
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A] mb-2 block truncate">
              {resolvedCategory}
            </span>
          )}
          <h3 className="font-serif text-xl sm:text-2xl text-[#FEF5E6] group-hover:text-white transition-subtle mb-3 break-words leading-snug">
            {resolvedName}
          </h3>
        </div>

        <div className="mt-6 pt-4 border-t border-[#2F1C15] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-[#B8AD9A]">Price</span>
            <span className="text-base font-medium text-[#FEF5E6] tracking-wide truncate">
              {resolvedPriceText}
            </span>
          </div>

          <Link
            to={resolvedLink}
            className="text-xs uppercase tracking-[0.16em] text-[#FEF5E6] hover:text-white bg-[#0F0A09] hover:bg-[#241B18] border border-[#2F1C15] hover:border-[#FEF5E6]/40 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] min-h-[44px] inline-flex items-center justify-center px-4 shrink-0 gap-1.5"
            aria-label={`Inquire about ${resolvedName}`}
          >
            <span>Inquire</span>
            <ArrowUpRight size={14} className="text-[#B8AD9A] group-hover:text-[#FEF5E6] transition-subtle" />
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
