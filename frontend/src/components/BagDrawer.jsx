import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag, MessageSquare, ArrowRight } from 'lucide-react';
import { useBag } from '../context/BagContext.jsx';
import { siteConfig } from '../content/site.js';

export const BagDrawer = () => {
  const {
    items,
    totalCount,
    subtotal,
    subtotalText,
    isBagOpen,
    closeBag,
    updateQuantity,
    removeFromBag,
  } = useBag();

  const drawerRef = useRef(null);
  const closeBtnRef = useRef(null);
  const navigate = useNavigate();

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isBagOpen) {
        closeBag();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBagOpen, closeBag]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isBagOpen) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => closeBtnRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isBagOpen]);

  // Build WhatsApp reservation message
  const getWhatsAppReservationUrl = () => {
    if (items.length === 0) return siteConfig.contact.whatsapp.url;

    const itemsSummary = items
      .map((item) => `• ${item.quantity}x ${item.name} (${item.priceText})`)
      .join('\n');

    const message = `Hello Aurevella Atelier,\nI would like to place an order inquiry for the following handcrafted footwear:\n\n${itemsSummary}\n\nEstimated Subtotal: ${subtotalText}\n\nPlease advise on sizing guidance and delivery timeline.`;

    return `https://wa.me/917728060447?text=${encodeURIComponent(message)}`;
  };

  if (!isBagOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopping Bag Drawer"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={closeBag}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div
          ref={drawerRef}
          className="w-screen max-w-md bg-[#0F0A09] border-l border-[#2F1C15] flex flex-col shadow-2xl animate-fade-in"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#2F1C15] flex items-center justify-between bg-[#181210]/60">
            <div className="flex items-center gap-2.5">
              <ShoppingBag size={20} className="text-[#FEF5E6]" />
              <h2 className="font-serif text-xl sm:text-2xl text-[#FEF5E6] tracking-wide">
                Shopping Bag
              </h2>
              <span className="text-xs uppercase tracking-widest text-[#B8AD9A] bg-[#181210] border border-[#2F1C15] px-2 py-0.5 ml-1">
                {totalCount} {totalCount === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeBag}
              aria-label="Close shopping bag"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <X size={22} />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-16 px-4">
                <div className="w-16 h-16 rounded-full bg-[#181210] border border-[#2F1C15] flex items-center justify-center mb-5 text-[#B8AD9A]">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="font-serif text-2xl text-[#FEF5E6] mb-2 tracking-wide">
                  Your Bag is Empty
                </h3>
                <p className="text-xs sm:text-sm text-[#B8AD9A] max-w-xs mb-8 leading-relaxed">
                  Explore our launch silhouettes and discover handcrafted Italian-inspired elegance.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeBag();
                    navigate('/shop');
                  }}
                  className="inline-flex items-center justify-center min-h-[44px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  Explore Footwear
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-[#2F1C15]" aria-label="Items in bag">
                {items.map((item) => (
                  <li key={item.id} className="py-5 flex gap-4 first:pt-0 last:pb-0">
                    {/* Thumbnail */}
                    <div className="w-20 h-20 bg-[#120D0C] border border-[#2F1C15] shrink-0 overflow-hidden aspect-square">
                      <img
                        src={item.image}
                        alt={item.alt || item.name}
                        width="80"
                        height="80"
                        className="w-full h-full object-cover object-center"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-[#B8AD9A] block truncate mb-1">
                          {item.category}
                        </span>
                        <h4 className="font-serif text-base text-[#FEF5E6] truncate mb-1">
                          {item.name}
                        </h4>
                        <div className="text-xs text-[#FEF5E6]/90 font-medium">
                          {item.priceText}
                        </div>
                      </div>

                      {/* Quantity & Remove Controls */}
                      <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#2F1C15]/50">
                        <div className="flex items-center border border-[#2F1C15] bg-[#181210]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            aria-label={`Decrease quantity for ${item.name}`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="px-3 text-xs text-[#FEF5E6] font-medium select-none min-w-[28px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={item.quantity >= 10}
                            aria-label={`Increase quantity for ${item.name}`}
                            className="min-h-[34px] min-w-[34px] flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-[#FEF5E6] tracking-wide">
                            {item.lineTotalText}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromBag(item.id)}
                            aria-label={`Remove ${item.name} from bag`}
                            className="min-h-[44px] min-w-[36px] flex items-center justify-center text-[#B8AD9A] hover:text-red-400 transition-subtle"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Drawer Footer (Only when bag has items) */}
          {items.length > 0 && (
            <div className="p-6 border-t border-[#2F1C15] bg-[#181210] space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
                  Estimated Subtotal
                </span>
                <span className="font-serif text-xl text-[#FEF5E6] font-normal tracking-wide">
                  {subtotalText}
                </span>
              </div>

              {/* Delivery notice */}
              <p className="text-[11px] text-[#B8AD9A] leading-relaxed">
                Includes complimentary insured delivery & bespoke presentation box across India.
              </p>

              {/* Primary Checkout Action */}
              <Link
                to="/checkout"
                onClick={closeBag}
                className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] px-6 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-md outline-none focus-visible:ring-1 focus-visible:ring-white"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </Link>

              {/* View Full Bag Link */}
              <Link
                to="/bag"
                onClick={closeBag}
                className="w-full inline-flex items-center justify-center min-h-[40px] text-[11px] uppercase tracking-[0.18em] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#221A18] transition-subtle"
              >
                View Full Bag ({totalCount})
              </Link>

              {/* Concierge Order Reservation Action */}
              <a
                href={getWhatsAppReservationUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 min-h-[38px] px-4 text-[10px] uppercase tracking-[0.15em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
              >
                <MessageSquare size={13} />
                <span>Reserve via WhatsApp Concierge</span>
              </a>

              {/* Continue Shopping button */}
              <button
                type="button"
                onClick={closeBag}
                className="w-full inline-flex items-center justify-center min-h-[44px] text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
              >
                Continue Shopping
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BagDrawer;
