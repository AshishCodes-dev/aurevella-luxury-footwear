import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Hammer, ShieldCheck, HeartHandshake, ArrowRight } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const About = () => {
  useDocumentTitle('Our Story & Atelier');

  const processSteps = [
    {
      step: '01',
      title: 'Anatomical Last Sculpting',
      description:
        'Each silhouette originates on custom wooden lasts contoured to distribute body weight evenly across the metatarsal and heel arches.',
    },
    {
      step: '02',
      title: 'Artisan Material Selection',
      description:
        'We source breathable full-grain leathers, durable woven textiles, and precision metal hardware tested to resist coastal humidity and wear.',
    },
    {
      step: '03',
      title: 'Interchangeable Heel Engineering',
      description:
        'Our proprietary heel locking mechanism is machined from lightweight structural alloy to provide rock-solid stability in every setting.',
    },
    {
      step: '04',
      title: 'Bench Lasting & Hand Finishing',
      description:
        'Master shoemakers in India hand-last each upper, gently pulling leather over the curve before applying edge-burnished sole finishes.',
    },
  ];

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Hero Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            The Atelier Philosophy
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Where Continental Architecture Meets Indian Craftsmanship
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            AUREVELLA was founded on a singular premise: luxury footwear should embody timeless European elegance without sacrificing anatomical ease or local artisanal integrity.
          </p>
        </div>
      </section>

      {/* Brand Narrative Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 bg-[#181210] border border-[#2F1C15] text-[#B8AD9A]">
              Italian Inspiration
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
              Sculpted for Poise. Built for Motion.
            </h2>
            <p className="text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
              Inspired by the sculptural precision of Milanese couture and the relaxed warmth of the Mediterranean coastline, our silhouettes celebrate clean lines and confident postures.
            </p>
            <p className="text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
              By introducing our signature interchangeable heel mechanism, we eliminate the false choice between towering evening glamour and all-day walking comfort. One pair effortlessly fulfills multiple facets of your calendar.
            </p>
          </div>

          <div className="bg-[#181210] border border-[#2F1C15] p-8 text-center space-y-4">
            <img
              src="/brand/aurevella-wordmark.png"
              alt="AUREVELLA Atelier"
              width="240"
              height="45"
              className="h-9 sm:h-10 mx-auto object-contain opacity-90"
            />
            <blockquote className="font-serif text-xl sm:text-2xl text-[#FEF5E6] italic pt-4">
              &ldquo;Luxury, Reimagined.&rdquo;
            </blockquote>
            <p className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
              Italian-inspired elegance &bull; Crafted in India
            </p>
          </div>
        </div>

        {/* The 3 Core Pillars */}
        <div className="space-y-8 pt-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#B8AD9A]">Foundational Commitments</span>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">The Three Pillars</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {siteConfig.values.map((val) => (
              <div
                key={val.id}
                className="bg-[#181210] border border-[#2F1C15] p-6 space-y-3 hover:border-[#4A2C26] transition-subtle text-left"
              >
                <div className="w-8 h-8 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center text-[#FEF5E6] text-xs font-serif font-bold">
                  &bull;
                </div>
                <h4 className="font-serif text-lg text-[#FEF5E6]">{val.title}</h4>
                <p className="text-xs text-[#B8AD9A] leading-relaxed">{val.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workshop Craftsmanship Steps */}
      <section id="craftsmanship" className="border-t border-[#2F1C15] bg-[#140E0C] py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A]">
              Artisan Execution
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
              Inside the Aurevella Workshop
            </h3>
            <p className="text-xs sm:text-sm text-[#B8AD9A]">
              Every pair undergoes over seventy bespoke bench operations before receiving its final seal of dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {processSteps.map((step) => (
              <div
                key={step.step}
                className="bg-[#181210] border border-[#2F1C15] p-6 space-y-3 text-left relative group hover:border-[#4A2C26] transition-subtle"
              >
                <span className="font-mono text-2xl font-bold text-[#FEF5E6]/30 group-hover:text-[#FEF5E6] transition-colors block">
                  {step.step}
                </span>
                <h4 className="font-serif text-base text-[#FEF5E6]">{step.title}</h4>
                <p className="text-xs text-[#B8AD9A] leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>

          {/* TODO(client): Confirm physical atelier address for appointment-only fittings and private commissions */}
          <div className="p-4 bg-[#181210] border border-[#2F1C15] max-w-xl mx-auto text-center space-y-1">
            <p className="text-[11px] text-[#FEF5E6]">
              {siteConfig.contact.studioAddress}
            </p>
            <p className="text-[10px] text-[#B8AD9A]/70">
              Private fittings and bespoke commissions arranged exclusively through our concierge service.
            </p>
          </div>

          <div className="text-center pt-4">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 min-h-[46px] px-8 text-xs uppercase tracking-[0.18em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
            >
              Explore the Footwear
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;