import React from 'react';
import { RotateCcw, ShieldCheck, CheckCircle2, AlertCircle, MessageCircle } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const ReturnsPolicy = () => {
  useDocumentTitle('Returns & Exchanges');

  const conditions = [
    'Footwear must be in entirely unworn, pristine condition with zero scratches, scuffs, or indentations on the leather outsoles.',
    'Always try on your AUREVELLA footwear on a clean, soft carpeted surface until you are completely satisfied with the sizing.',
    'All original presentation elements must accompany the return: bespoke wooden box, dust bags, spare heel attachments, and certificate of provenance.',
    'Return or exchange must be initiated within 14 calendar days of confirmed courier delivery.',
  ];

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            Client Guarantee
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Returns & Sizing Exchanges
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            We are dedicated to ensuring your footwear fits impeccably. Enjoy our seamless 14-day sizing exchange and return policy.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
        {/* Complimentary Sizing Exchange Card */}
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <RotateCcw size={20} />
            <h2 className="font-serif text-xl">Complimentary Sizing Exchange</h2>
          </div>
          <p>
            If your footwear does not provide the contoured comfort you desire, we offer one complimentary size exchange per order. Our concierge will arrange doorstep courier pickup and coordinate dispatch of your replacement size at no additional charge.
          </p>
          <div className="pt-2">
            <a
              href={siteConfig.contact.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 min-h-[40px] px-5 text-xs uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
            >
              <MessageCircle size={14} />
              Initiate Sizing Exchange via WhatsApp
            </a>
          </div>
        </div>

        {/* Eligibility Conditions */}
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <ShieldCheck size={20} />
            <h2 className="font-serif text-xl">Eligibility Requirements</h2>
          </div>
          <p>
            To qualify for a sizing exchange or refund, the returned pair must satisfy our strict atelier return standards:
          </p>
          <div className="space-y-2.5 pt-2">
            {conditions.map((cond, i) => (
              <div key={i} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 size={15} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{cond}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Refund Processing */}
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">Refund Timeframes</h2>
          <p>
            Once received at our atelier, returned footwear undergoes a technical inspection within 48 business hours. Upon approval, your refund is initiated immediately to your original payment method (via Razorpay).
          </p>
          <p>
            Depending on your issuing bank or card network, refunds typically reflect in your account within 5 to 7 business days.
          </p>
          {/* TODO(client): Confirm policy regarding customized initials, monograms, or bespoke heel height adjustments (typically non-returnable) */}
          <p className="text-[11px] text-[#B8AD9A]/70 italic pt-2">
            Please note: Personalized orders, custom monograms, and made-to-order sizing modifications are crafted exclusively for the commissioning patron and are non-returnable.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ReturnsPolicy;