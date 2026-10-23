import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Mail, ArrowRight, ArrowUpRight } from 'lucide-react';
import { siteConfig } from '../content/site.js';
import ProductCard from '../components/ProductCard.jsx';
import useDocumentTitle from '../utils/useDocumentTitle.js';

export const Home = () => {
  useDocumentTitle('AUREVELLA — Luxury Interchangeable Heels');

  return (
    <div className="space-y-24 sm:space-y-36 py-4 sm:py-8 w-full overflow-hidden">
      {/* 1. HERO SECTION (Editorial Text-only with Brand Mark; No product photo in hero) */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex flex-col items-center justify-center text-center px-4 pt-10 pb-16 sm:pt-24 sm:pb-32 border-b border-[#2F1C15] w-full bg-[radial-gradient(ellipse_60%_50%_at_50%_25%,rgba(47,28,21,0.28),transparent_70%)]"
      >
        {/* Subtle Brand Crest */}
        <div className="flex justify-center mb-6 select-none">
          <img
            src="/brand/aurevella-mark.png"
            alt=""
            width="48"
            height="48"
            className="h-11 w-11 sm:h-12 sm:w-12 aspect-square object-contain opacity-90"
          />
        </div>

        <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] sm:tracking-[0.38em] text-[#B8AD9A] mb-4 block select-none font-medium">
          {siteConfig.descriptor}
        </span>

        <h1
          id="hero-heading"
          className="font-serif text-[clamp(2.5rem,7vw,5.5rem)] font-normal tracking-[0.05em] sm:tracking-[0.1em] text-[#FEF5E6] mb-6 leading-[1.1] max-w-4xl break-words select-none px-2"
        >
          {siteConfig.hero.headline}
        </h1>

        <p className="text-sm sm:text-lg lg:text-xl font-light tracking-wide text-[#B8AD9A] max-w-2xl mb-10 sm:mb-14 leading-relaxed px-2">
          {siteConfig.hero.subline}
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4 max-w-md sm:max-w-none mb-14">
          <Link
            to={siteConfig.hero.primaryCta.href}
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-[#FFFFFF] font-semibold transition-subtle shadow-md hover:shadow-lg outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            {siteConfig.hero.primaryCta.label}
          </Link>
          <Link
            to={siteConfig.hero.secondaryCta.href}
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-8 py-3.5 text-xs uppercase tracking-[0.2em] bg-[#181210] border border-[#2F1C15] hover:border-[#FEF5E6]/60 text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            {siteConfig.hero.secondaryCta.label}
          </Link>
        </div>

        {/* Architectural Hallmarks Grounding Strip */}
        <div className="pt-8 border-t border-[#2F1C15]/60 max-w-3xl w-full flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-[10px] sm:text-xs uppercase tracking-[0.22em] text-[#B8AD9A] select-none">
          <span>Interchangeable Heels</span>
          <span className="hidden sm:inline text-[#2F1C15]">•</span>
          <span>Crafted in India</span>
          <span className="hidden sm:inline text-[#2F1C15]">•</span>
          <span>Italian Design</span>
        </div>
      </section>

      {/* 2. BRAND STORY SECTION (Editorial Atelier Layout) */}
      <section
        aria-labelledby="story-heading"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
      >
        <div className="bg-[#181210] bg-[linear-gradient(180deg,rgba(47,28,21,0.18)_0%,transparent_100%)] border border-[#2F1C15] p-8 sm:p-14 lg:p-16 relative shadow-sm">
          <div className="max-w-3xl mx-auto text-center">
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.28em] text-[#B8AD9A] block mb-3 select-none font-medium">
              {siteConfig.story.eyebrow}
            </span>
            <h2
              id="story-heading"
              className="font-serif text-[clamp(1.85rem,4.5vw,3rem)] tracking-wide text-[#FEF5E6] mb-8 leading-snug break-words"
            >
              {siteConfig.story.heading}
            </h2>
            <div className="space-y-6 text-sm sm:text-base text-[#B8AD9A] leading-relaxed">
              {siteConfig.story.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <blockquote className="mt-10 pt-8 border-t border-[#2F1C15] font-serif italic text-lg sm:text-2xl text-[#FEF5E6] max-w-xl mx-auto">
              {siteConfig.story.quote}
            </blockquote>
          </div>
        </div>
      </section>

      {/* 3. FEATURED PRODUCTS (EXACTLY 3 SAMPLE PRODUCTS, 1/2/3 COLUMNS GRID, <=500px WIDTH) */}
      <section aria-labelledby="featured-heading" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#2F1C15] gap-4">
          <div>
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#B8AD9A] block mb-2 font-medium">
              Curated Selection
            </span>
            <h2 id="featured-heading" className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] text-[#FEF5E6]">
              Featured Footwear
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs uppercase tracking-[0.2em] text-[#FEF5E6] hover:text-white transition-subtle inline-flex items-center gap-1.5 min-h-[44px] group outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            <span>View Full Catalogue</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-subtle" />
          </Link>
        </div>

        {/* 1 / 2 / 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-items-center w-full">
          {siteConfig.featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 4. LIMITED EDITION TEASER (WITH IVORY-OUTLINE BADGE) */}
      <section
        aria-labelledby="limited-heading"
        className="max-w-5xl mx-auto px-4 sm:px-6 w-full"
      >
        <div className="bg-[#181210] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(47,28,21,0.22),transparent_70%)] border border-[#2F1C15] p-8 sm:p-14 text-center relative overflow-hidden shadow-sm">
          <div className="mb-6">
            <span className="border border-[#FEF5E6] px-4 py-1 text-[11px] uppercase tracking-[0.25em] text-[#FEF5E6] inline-block font-medium">
              {siteConfig.limitedEdition.badge}
            </span>
          </div>
          <h2
            id="limited-heading"
            className="font-serif text-[clamp(1.85rem,5vw,3rem)] tracking-wide text-[#FEF5E6] mb-4 break-words"
          >
            {siteConfig.limitedEdition.heading}
          </h2>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-2xl mx-auto mb-8 leading-relaxed">
            {siteConfig.limitedEdition.description}
          </p>
          <Link
            to={siteConfig.limitedEdition.cta.href}
            className="inline-flex items-center justify-center min-h-[48px] px-8 text-xs uppercase tracking-[0.2em] bg-transparent border border-[#FEF5E6] text-[#FEF5E6] hover:bg-[#FEF5E6] hover:text-[#0F0A09] transition-subtle font-semibold outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            {siteConfig.limitedEdition.cta.label}
          </Link>
        </div>
      </section>

      {/* 5. BRAND VALUES (3 PILLARS WITH ARCHITECTURAL ELEGANCE) */}
      <section
        aria-labelledby="values-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
      >
        <div className="text-center mb-12 sm:mb-16">
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#B8AD9A] block mb-2 font-medium">
            Our Foundation
          </span>
          <h2 id="values-heading" className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] text-[#FEF5E6]">
            The Aurevella Standards
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {siteConfig.values.map((val, idx) => (
            <div
              key={val.id}
              className="bg-[#181210] bg-[linear-gradient(180deg,rgba(47,28,21,0.12)_0%,transparent_100%)] border border-[#2F1C15] hover:border-[#4A2C26] p-8 sm:p-10 text-center flex flex-col items-center min-w-0 transition-subtle shadow-sm hover:shadow-md"
            >
              <span className="font-serif text-3xl sm:text-4xl text-[#FEF5E6]/30 mb-4 select-none">
                {`0${idx + 1}`}
              </span>
              <h3 className="font-serif text-xl sm:text-2xl text-[#FEF5E6] mb-3 break-words">
                {val.title}
              </h3>
              <p className="text-sm text-[#B8AD9A] leading-relaxed">
                {val.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 6. CONTACT STRIP (CONCIERGE & ATELIER GUIDANCE) */}
      <section
        aria-labelledby="contact-strip-heading"
        className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 w-full"
      >
        <div className="bg-[#181210] bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(47,28,21,0.2),transparent_70%)] border border-[#2F1C15] p-8 sm:p-12 text-center shadow-sm">
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.25em] text-[#B8AD9A] block mb-2 font-medium">
            Client Concierge
          </span>
          <h2
            id="contact-strip-heading"
            className="font-serif text-[clamp(1.65rem,4vw,2.25rem)] text-[#FEF5E6] mb-3 break-words"
          >
            Connect with the Atelier
          </h2>
          <p className="text-xs sm:text-sm text-[#B8AD9A] mb-8 max-w-md mx-auto leading-relaxed">
            Our luxury footwear consultants are available for personalized sizing inquiries and order guidance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* WhatsApp CTA */}
            <a
              href={siteConfig.contact.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-[0.18em] bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] hover:border-[#FEF5E6]/40 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <MessageSquare size={16} /> WhatsApp {siteConfig.contact.whatsapp.label}
            </a>

            {/* Instagram CTA */}
            <a
              href={siteConfig.contact.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-[0.18em] bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] hover:border-[#FEF5E6]/40 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <svg
                className="w-4 h-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
              <span>Instagram</span>
              <ArrowUpRight size={14} className="text-[#B8AD9A]" />
            </a>

            {/* Email CTA */}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-[0.18em] bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] hover:border-[#FEF5E6]/40 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <Mail size={16} /> Email Inquiries
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
