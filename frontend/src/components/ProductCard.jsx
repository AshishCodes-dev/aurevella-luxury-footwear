import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowUpRight, Check } from 'lucide-react';
import { useBag } from '../context/BagContext.jsx';

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
  id,
  showAddToBag = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  // Safely access bag context
  let bag = null;
  try {
    bag = useBag();
  } catch (_) {}

  // Allow passing individual props or a unified product object
  const resolvedId = id || product?.id;
  const resolvedImage = image || product?.image;
  const resolvedAlt = alt || product?.alt || '';
  const resolvedName = name || product?.name || '';
  const resolvedPriceText =
    priceText || product?.priceText || product?.priceDisplay || 'Price coming soon';
  const defaultLink = resolvedId ? `/product/${resolvedId}` : '/shop';
  const resolvedLink =
    link && link !== '/shop'
      ? link
      : product?.link && product.link !== '/shop'
      ? product.link
      : defaultLink;
  const resolvedCategory = category || product?.category;
  const resolvedPriority = priority || Boolean(product?.priority);

  const handleAddToBag = () => {
    if (resolvedId && bag?.addToBag) {
      const ok = bag.addToBag(resolvedId, 1, product);
      if (ok) {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 1500);
      }
    }
  };

  return (
    <article className="group bg-[#181210] border border-[#2F1C15] hover:border-[#4A2C26] flex flex-col h-full w-full max-w-[420px] min-w-0 transition-subtle shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      {/* Aspect Ratio Image Container (1:1 from --product-ratio token) */}
      <div
        className="w-full bg-[#120D0C] border-b border-[#2F1C15] overflow-hidden relative aspect-square"
        style={{ aspectRatio: 'var(--product-ratio, 1 / 1)' }}
        aria-label={`Product image slot for ${resolvedName}`}
      >
        <Link to={resolvedLink} className="block w-full h-full outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#FEF5E6]">
          {resolvedImage ? (
            <img
              src={resolvedImage}
              alt={resolvedAlt}
              width="500"
              height="500"
              loading={resolvedPriority ? 'eager' : 'lazy'}
              onLoad={() => setIsLoaded(true)}
              className={`w-full h-full aspect-square max-w-full object-cover object-center img-fade-in transition-subtle group-hover:scale-[1.02] ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none aspect-square">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A] bg-[#181210] border border-[#2F1C15] px-2.5 py-1 mb-2">
                1:1 Ratio
              </span>
              {/* TODO(client): image */}
              <p className="text-xs text-[#B8AD9A] max-w-[200px] leading-relaxed">
                Atelier Image Pending
              </p>
            </div>
          )}
        </Link>
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
            <Link to={resolvedLink} className="outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] hover:underline underline-offset-4">
              {resolvedName}
            </Link>
          </h3>
        </div>

        <div className="mt-6 pt-4 border-t border-[#2F1C15] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#B8AD9A]">Price</span>
            <span className="text-base font-medium text-[#FEF5E6] tracking-wide truncate">
              {resolvedPriceText}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {showAddToBag && resolvedId ? (
              <button
                type="button"
                onClick={handleAddToBag}
                className="flex-1 inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3 text-xs uppercase tracking-[0.16em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-white"
                aria-label={`Add ${resolvedName} to shopping bag`}
              >
                {justAdded ? (
                  <>
                    <Check size={14} /> Added
                  </>
                ) : (
                  <>
                    <ShoppingBag size={14} /> Add to Bag
                  </>
                )}
              </button>
            ) : null}

            <Link
              to={resolvedLink}
              className="inline-flex items-center justify-center gap-1 min-h-[44px] px-3 text-xs uppercase tracking-[0.16em] text-[#FEF5E6] hover:text-white bg-[#0F0A09] hover:bg-[#241B18] border border-[#2F1C15] hover:border-[#FEF5E6]/40 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] shrink-0"
              aria-label={`View details for ${resolvedName}`}
            >
              <span>Details</span>
              <ArrowUpRight size={13} className="text-[#B8AD9A]" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
