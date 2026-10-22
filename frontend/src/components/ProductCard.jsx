import React from 'react';
import { Link } from 'react-router-dom';

export const ProductCard = ({ product }) => {
  return (
    <article className="group bg-[#181210] border border-[#2E1814] flex flex-col h-full transition-subtle hover:border-[#CFC9BA]/30">
      {/* 3:4 Aspect Ratio Image Placeholder Block */}
      <div
        className="w-full aspect-[3/4] bg-[#0F0A09] border-b border-[#2E1814] flex flex-col items-center justify-center p-6 text-center relative select-none"
        aria-label={`Product image slot for ${product.name}`}
      >
        <span className="text-[10px] uppercase tracking-[0.25em] text-[#9E9685] bg-[#181210] border border-[#2E1814] px-2.5 py-1 mb-2">
          3:4 Aspect Ratio
        </span>
        <p className="text-xs text-[#9E9685] max-w-[200px] leading-relaxed">
          {product.imageSlotPlaceholder || 'TODO(client): image'}
        </p>
      </div>

      {/* Product Information */}
      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {product.category && (
          <span className="text-[10px] uppercase tracking-widest text-[#9E9685] mb-1.5 block">
            {product.category}
          </span>
        )}
        <h3 className="font-serif text-lg sm:text-xl text-[#CFC9BA] group-hover:text-white transition-subtle mb-2">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-xs text-[#9E9685] line-clamp-2 mb-4 leading-relaxed flex-1">
            {product.description}
          </p>
        )}
        <div className="mt-auto pt-3 border-t border-[#2E1814] flex items-center justify-between">
          <span className="text-sm font-medium text-[#CFC9BA] tracking-wider">
            {product.priceDisplay}
          </span>
          <Link
            to="/shop"
            className="text-xs uppercase tracking-wider text-[#9E9685] hover:text-[#CFC9BA] transition-subtle underline underline-offset-4 outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA]"
            aria-label={`View details for ${product.name}`}
          >
            Inquire
          </Link>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
