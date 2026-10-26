import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, MessageSquare, ArrowLeft, ArrowRight } from 'lucide-react';
import { useBag } from '../context/BagContext.jsx';
import { siteConfig } from '../content/site.js';
import useDocumentTitle from '../utils/useDocumentTitle.js';

export const BagPage = () => {
  useDocumentTitle('Shopping Bag — AUREVELLA');
  const {
    items,
    totalCount,
    subtotalText,
    hasUnavailableItems,
    removeUnavailableItems,
    updateQuantity,
    removeFromBag,
  } = useBag();

  const getWhatsAppReservationUrl = () => {
    if (items.length === 0) return siteConfig.contact.whatsapp.url;

    const itemsSummary = items
      .map((item) => `• ${item.quantity}x ${item.name}${item.size ? ` (Size: ${item.size})` : ''} (${item.priceText})`)
      .join('\n');

    const message = `Hello Aurevella Atelier,\nI would like to place an order inquiry for the following handcrafted footwear:\n\n${itemsSummary}\n\nEstimated Subtotal: ${subtotalText}\n\nPlease advise on sizing guidance and delivery timeline.`;

    return `https://wa.me/917728060447?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-fade-in">
      {/* Breadcrumb / Back Link */}
      <div className="mb-8">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
        >
          <ArrowLeft size={14} /> Back to Catalogue
        </Link>
      </div>

      {/* Page Title */}
      <div className="border-b border-[#2F1C15] pb-6 mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] block mb-2 font-medium">
            Atelier Order Selection
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] tracking-wide">
            Your Shopping Bag
          </h1>
        </div>
        <span className="text-xs uppercase tracking-widest text-[#B8AD9A] bg-[#181210] border border-[#2F1C15] px-3 py-1 self-start sm:self-auto">
          {totalCount} {totalCount === 1 ? 'Handcrafted Model' : 'Handcrafted Models'}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#181210] border border-[#2F1C15] p-12 sm:p-20 text-center max-w-xl mx-auto">
          {hasUnavailableItems && (
            <div className="mb-6 p-3 bg-amber-950/40 border border-amber-900/60 text-amber-200 text-xs flex items-center justify-between text-left">
              <span>One or more items in your selection are no longer available.</span>
              <button
                type="button"
                onClick={removeUnavailableItems}
                className="underline hover:text-white ml-2 text-[11px] uppercase tracking-wider font-medium shrink-0"
              >
                Remove Unavailable
              </button>
            </div>
          )}
          <div className="w-16 h-16 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center mx-auto mb-6 text-[#B8AD9A]">
            <ShoppingBag size={28} />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6] mb-3">
            Your Bag is Empty
          </h2>
          <p className="text-xs sm:text-sm text-[#B8AD9A] mb-8 leading-relaxed">
            Discover our signature interchangeable heel footwear and Italian-inspired launch collection.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center min-h-[48px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-md"
          >
            Explore Catalogue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {hasUnavailableItems && (
              <div className="p-3 bg-amber-950/40 border border-amber-900/60 text-amber-200 text-xs flex items-center justify-between">
                <span>One or more items in your selection are currently unavailable.</span>
                <button
                  type="button"
                  onClick={removeUnavailableItems}
                  className="underline hover:text-white ml-2 text-[11px] uppercase tracking-wider font-medium"
                >
                  Remove Unavailable
                </button>
              </div>
            )}
            <ul className="divide-y divide-[#2F1C15] bg-[#181210] border border-[#2F1C15] p-6 sm:p-8">
              {items.map((item) => (
                <li key={item.lineKey || `${item.id}_${item.size || 'default'}`} className="py-6 flex flex-col sm:flex-row gap-6 first:pt-0 last:pb-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 bg-[#120D0C] border border-[#2F1C15] shrink-0 overflow-hidden aspect-square">
                    <img
                      src={item.image}
                      alt={item.alt || item.name}
                      width="112"
                      height="112"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.2em] text-[#B8AD9A] block mb-1">
                        {item.category}
                      </span>
                      <h3 className="font-serif text-lg sm:text-xl text-[#FEF5E6] mb-1">
                        {item.name}
                      </h3>
                      <div className="text-sm font-medium text-[#FEF5E6]/90">
                        {item.priceText}
                      </div>
                      {item.size ? (
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-[#FEF5E6] bg-[#0F0A09] border border-[#2F1C15]">
                          Size: {item.size}
                        </span>
                      ) : (
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-300/80 bg-amber-950/30 border border-amber-900/40">
                          Size not selected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4 pt-3 border-t border-[#2F1C15]/60">
                      <div className="flex items-center border border-[#2F1C15] bg-[#0F0A09]">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.size, item.quantity - 1)}
                          aria-label={`Decrease quantity for ${item.name}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="px-4 text-xs text-[#FEF5E6] font-medium select-none min-w-[32px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                          disabled={item.quantity >= 10}
                          aria-label={`Increase quantity for ${item.name}`}
                          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-[#FEF5E6] tracking-wide">
                          {item.lineTotalText}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeFromBag(item.id, item.size)}
                          aria-label={`Remove ${item.name} from bag`}
                          className="min-h-[44px] min-w-[36px] flex items-center justify-center text-[#B8AD9A] hover:text-red-400 transition-subtle"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-6 sticky top-28">
              <h2 className="text-xs uppercase tracking-[0.25em] text-[#FEF5E6] font-semibold border-b border-[#2F1C15] pb-4">
                Order Summary
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-[#B8AD9A]">
                  <span>Items Subtotal</span>
                  <span className="text-[#FEF5E6] font-medium">{subtotalText}</span>
                </div>
                <div className="flex justify-between text-[#B8AD9A]">
                  <span>White Glove Delivery</span>
                  <span className="text-[#FEF5E6] font-medium">Complimentary</span>
                </div>
                <div className="flex justify-between text-[#B8AD9A]">
                  <span>Handcrafted Storage Box</span>
                  <span className="text-[#FEF5E6] font-medium">Included</span>
                </div>
                <div className="pt-3 border-t border-[#2F1C15] flex justify-between text-sm">
                  <span className="font-semibold text-[#FEF5E6] uppercase tracking-wider text-xs">
                    Estimated Total
                  </span>
                  <span className="font-serif text-xl text-[#FEF5E6] font-normal">
                    {subtotalText}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-md"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="p-4 bg-[#0F0A09] border border-[#2F1C15] text-[11px] text-[#B8AD9A] leading-relaxed">
                <p className="text-[#FEF5E6] font-medium mb-1 uppercase tracking-wider text-[10px]">
                  Concierge Assistance
                </p>
                Prefer personalized sizing guidance or bespoke fitting consultation? Connect with our Atelier Concierge on WhatsApp.
              </div>

              <a
                href={getWhatsAppReservationUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 min-h-[42px] px-4 text-[11px] uppercase tracking-[0.15em] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:border-[#4A2C26] transition-subtle"
              >
                <MessageSquare size={14} />
                <span>Reserve via WhatsApp Concierge</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BagPage;
