import React from 'react';
import { Truck, ShieldCheck, Clock, PackageCheck, HelpCircle } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const ShippingPolicy = () => {
  useDocumentTitle('Shipping & White-Glove Delivery');

  const highlights = [
    {
      icon: Truck,
      title: 'Complimentary Domestic Shipping',
      description: 'All domestic orders across India are shipped with fully complimentary insured express courier delivery.',
    },
    {
      icon: Clock,
      title: '2–3 Day In-Stock Dispatch',
      description: 'In-stock footwear models are carefully inspected, buffed, and dispatched within 2 to 3 business days.',
    },
    {
      icon: PackageCheck,
      title: 'Bespoke Wooden Presentation',
      description: 'Arrives in our custom rigid wooden presentation box with individual dust bags and protective tissue.',
    },
    {
      icon: ShieldCheck,
      title: 'Fully Insured Transit',
      description: 'Your commission is 100% insured against loss or damage from our atelier doors to your residence.',
    },
  ];

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            White Glove Delivery
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Shipping & Dispatch Policy
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            Every pair of AUREVELLA footwear is an artisanal investment, treated with utmost care from workshop bench to doorstep.
          </p>
        </div>
      </section>

      {/* Highlights Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((h, i) => {
            const Icon = h.icon;
            return (
              <div
                key={i}
                className="p-6 bg-[#181210] border border-[#2F1C15] space-y-3 hover:border-[#4A2C26] transition-subtle"
              >
                <div className="w-10 h-10 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center text-[#FEF5E6]">
                  <Icon size={18} />
                </div>
                <h3 className="font-serif text-base text-[#FEF5E6]">{h.title}</h3>
                <p className="text-xs text-[#B8AD9A] leading-relaxed">{h.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Detailed Policy Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">1. Order Fulfillment & Lead Times</h2>
          <p>
            Because each shoe incorporates our proprietary interchangeable heel fitting and hand-stitched components, every pair undergoes final quality calibration prior to packing.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li><strong className="text-[#FEF5E6]">In-Stock Ready-to-Wear:</strong> Dispatched within 2–3 business days of verified payment.</li>
            <li><strong className="text-[#FEF5E6]">Limited Edition & Made-to-Order:</strong> Individually lasted and dispatched within 10–14 business days.</li>
            <li>Orders placed on weekends or national holidays will be queued for fulfillment the following business day.</li>
          </ul>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">2. Tracking & Delivery Inspection</h2>
          <p>
            Upon courier collection, you will receive an automated tracking notification via email and SMS containing your live consignment tracking number.
          </p>
          <p>
            To guarantee security, all deliveries require a physical signature or one-time delivery confirmation. Please inspect the outer branded tamper seal before accepting delivery. If a parcel appears damaged or tampered with in transit, please note it with the courier and notify our concierge immediately at <a href={`mailto:${siteConfig.contact.email}`} className="text-[#FEF5E6] underline">{siteConfig.contact.email}</a>.
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">3. International Deliveries</h2>
          <p>
            Currently, standard online checkout is configured for destinations across India. For international orders, bespoke delivery quotes including customs handling can be arranged directly through our WhatsApp concierge.
          </p>
          {/* TODO(client): Confirm official international courier rates, countries served, and import duty responsibilities */}
          <p className="text-[11px] text-[#B8AD9A]/70 italic">
            International consignments are arranged with dedicated white-glove logistics partners. Duties, customs clearances, and transit schedules are confirmed individually prior to dispatch.
          </p>
        </div>
      </section>
    </div>
  );
};

export default ShippingPolicy;