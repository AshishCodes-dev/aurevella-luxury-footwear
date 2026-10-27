import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Package, ShieldCheck, Sparkles, ArrowRight, MessageCircle } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const LimitedEdition = () => {
  useDocumentTitle('Limited Edition Series');

  const hallmarks = [
    {
      icon: Award,
      title: 'Individually Numbered',
      description:
        'Every pair carries a hand-stamped serial number (e.g., 07/50) heat-pressed into the interior Italian calfskin lining.',
    },
    {
      icon: Package,
      title: 'Solid Cedar & Wooden Box',
      description:
        'Delivered in an archival handcrafted wooden storage box with custom aromatic cedar shoe trees tailored to maintain the silhouette.',
    },
    {
      icon: ShieldCheck,
      title: 'Archival Provenance Certificate',
      description:
        'Accompanied by a gold-embossed certificate of authenticity signed by our chief lasting artisan confirming leather batch origins.',
    },
    {
      icon: Sparkles,
      title: 'Strict Global Cap',
      description:
        'Limited strictly to 50 pairs worldwide. Once a series is fully commissioned, the last and pattern are permanently retired.',
    },
  ];

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Hero Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#181210] border border-[#2F1C15] text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A]">
            <Sparkles size={12} className="text-[#FEF5E6]" />
            Strictly 50 Pairs Worldwide
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            The Limited Edition Drops
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            Small-batch handcrafted collector drops featuring antique patinas, rare floral textiles, and solid brass detailing.
          </p>
        </div>
      </section>

      {/* Featured Drop Showcase */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-10 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Visual Box with fixed aspect ratio to eliminate layout shift */}
            <div className="lg:col-span-6 bg-[#0F0A09] border border-[#2F1C15] p-6 aspect-square sm:aspect-4/3 max-h-[380px] w-full flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute top-4 left-4 z-10">
                <span className="text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 bg-[#181210]/90 border border-[#2F1C15] text-[#FEF5E6] font-medium backdrop-blur-sm">
                  Series 01 &bull; 50 Pairs
                </span>
              </div>
              <img
                src="/images/products/product-03-floral-block-heel-mule.jpg"
                alt="Floral Block Heel Mule Limited Edition"
                width="400"
                height="400"
                className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500"
              />
            </div>

            {/* Narrative Box */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-[0.2em] text-[#B8AD9A]">
                  Active Atelier Allocation
                </span>
                <h2 className="font-serif text-2xl sm:text-4xl text-[#FEF5E6]">
                  Floral Block Heel Mule
                </h2>
                <p className="font-serif text-xl text-[#B8AD9A]">₹3,699</p>
              </div>

              <p className="text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
                Handcrafted from rich floral jacquard and lined with butter-soft calfskin. Finished with our signature interchangeable block heel mechanism and a solid brushed gold buckle. Designed for discerning patrons who demand singular craftsmanship.
              </p>

              {/* Series Allocation Badge */}
              <div className="p-4 bg-[#140E0C] border border-[#2F1C15] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#B8AD9A] uppercase tracking-wider text-[11px]">Allocation Status:</span>
                  <span className="text-emerald-400 font-medium">Bespoke Orders Open</span>
                </div>
                <div className="w-full bg-[#0F0A09] h-1.5 rounded-full overflow-hidden border border-[#2F1C15]">
                  <div className="bg-[#FEF5E6] h-full w-2/5 rounded-full" />
                </div>
                <p className="text-[10px] text-[#B8AD9A]/70 text-right">
                  Numbered 01/50 through 50/50 allocation in progress
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Link
                  to="/product/prod-03"
                  className="w-full sm:w-auto min-h-[46px] px-8 text-xs uppercase tracking-[0.18em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle flex items-center justify-center gap-2"
                >
                  Commission This Pair
                  <ArrowRight size={14} />
                </Link>
                <a
                  href={siteConfig.contact.whatsapp.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto min-h-[46px] px-6 text-xs uppercase tracking-[0.18em] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#221A18] transition-subtle flex items-center justify-center gap-2"
                >
                  <MessageCircle size={14} />
                  Reserve Serial Number
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hallmarks of the Limited Edition */}
      <section className="border-t border-[#2F1C15] bg-[#140E0C] py-16 sm:py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A]">
              Atelier Standards
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
              Every Pair is an Heirloom
            </h3>
            <p className="text-xs sm:text-sm text-[#B8AD9A]">
              We treat our limited drops as pieces of wearable sculpture rather than seasonal commodities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {hallmarks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-6 bg-[#181210] border border-[#2F1C15] space-y-3 text-left hover:border-[#4A2C26] transition-subtle"
                >
                  <div className="w-10 h-10 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center text-[#FEF5E6]">
                    <Icon size={18} />
                  </div>
                  <h4 className="font-serif text-base text-[#FEF5E6]">{item.title}</h4>
                  <p className="text-xs text-[#B8AD9A] leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>

          {/* TODO(client): Confirm specific serial stamping sequence and custom monogramming availability */}
          <div className="text-center text-[11px] text-[#B8AD9A]/70 pt-4">
            Individual serial inscriptions are assigned sequentially upon order confirmation. Bespoke monogram inquiries may be routed to our concierge.
          </div>
        </div>
      </section>
    </div>
  );
};

export default LimitedEdition;