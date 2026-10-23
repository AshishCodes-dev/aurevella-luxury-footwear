import React from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Mail, ArrowRight } from 'lucide-react';
import { siteConfig } from '../content/site.js';
import ProductCard from '../components/ProductCard.jsx';
import useDocumentTitle from '../utils/useDocumentTitle.js';

export const Home = () => {
  useDocumentTitle('AUREVELLA — Luxury Interchangeable Heels');

  return (
    <div className="space-y-20 sm:space-y-32 py-4 sm:py-8 w-full overflow-hidden">
      {/* 1. HERO SECTION (Text-only with Logo; No product photo in hero) */}
      <section
        aria-labelledby="hero-heading"
        className="relative flex flex-col items-center justify-center text-center px-4 pt-8 pb-16 sm:pt-20 sm:pb-32 border-b border-[#2F1C15] w-full"
      >
        <span className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#B8AD9A] mb-4 block select-none">
          {siteConfig.descriptor}
        </span>
        <h1
          id="hero-heading"
          className="font-serif text-[clamp(2.15rem,6.5vw,5.5rem)] font-normal tracking-[0.06em] sm:tracking-[0.14em] text-[#FEF5E6] mb-6 leading-[1.15] max-w-4xl break-words select-none px-2"
        >
          {siteConfig.hero.headline}
        </h1>
        <p className="text-sm sm:text-lg lg:text-xl font-light tracking-wide text-[#B8AD9A] max-w-2xl mb-10 sm:mb-12 leading-relaxed px-2">
          {siteConfig.hero.subline}
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4 max-w-md sm:max-w-none">
          <Link
            to={siteConfig.hero.primaryCta.href}
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-8 py-3 text-xs uppercase tracking-widest bg-[#FEF5E6] text-[#0F0A09] hover:bg-[#FFFFFF] font-medium transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            {siteConfig.hero.primaryCta.label}
          </Link>
          <Link
            to={siteConfig.hero.secondaryCta.href}
            className="w-full sm:w-auto inline-flex items-center justify-center min-h-[44px] px-8 py-3 text-xs uppercase tracking-widest bg-transparent border border-[#FEF5E6] text-[#FEF5E6] hover:bg-[#FEF5E6] hover:text-[#0F0A09] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            {siteConfig.hero.secondaryCta.label}
          </Link>
        </div>
      </section>

      {/* 2. BRAND STORY SECTION */}
      <section
        aria-labelledby="story-heading"
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center w-full"
      >
        <span className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#B8AD9A] block mb-3 select-none">
          {siteConfig.story.eyebrow}
        </span>
        <h2
          id="story-heading"
          className="font-serif text-[clamp(1.75rem,5vw,3rem)] tracking-wide text-[#FEF5E6] mb-8 leading-snug break-words"
        >
          {siteConfig.story.heading}
        </h2>
        <div className="space-y-6 text-sm sm:text-base text-[#B8AD9A] leading-relaxed max-w-3xl mx-auto">
          {siteConfig.story.paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
        <blockquote className="mt-10 pt-8 border-t border-[#2F1C15] font-serif italic text-lg sm:text-xl text-[#FEF5E6] max-w-2xl mx-auto px-2">
          {siteConfig.story.quote}
        </blockquote>
      </section>

      {/* 3. FEATURED PRODUCTS (EXACTLY 3 SAMPLE PRODUCTS, 1/2/3 COLUMNS GRID, <=500px WIDTH) */}
      <section aria-labelledby="featured-heading" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 pb-4 border-b border-[#2F1C15] gap-4">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#B8AD9A] block mb-2">
              Curated Selection
            </span>
            <h2 id="featured-heading" className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] text-[#FEF5E6]">
              Featured Footwear
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-xs uppercase tracking-widest text-[#FEF5E6] hover:text-white transition-subtle inline-flex items-center gap-1 min-h-[44px] group outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            View Full Catalogue <ArrowRight size={14} />
          </Link>
        </div>

        {/* 1 / 2 / 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 justify-items-center w-full">
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
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-14 text-center relative overflow-hidden">
          <div className="mb-6">
            <span className="border border-[#FEF5E6] px-3.5 py-1 text-xs uppercase tracking-[0.2em] sm:tracking-[0.25em] text-[#FEF5E6] inline-block font-medium">
              {siteConfig.limitedEdition.badge}
            </span>
          </div>
          <h2
            id="limited-heading"
            className="font-serif text-[clamp(1.75rem,5vw,3rem)] tracking-wide text-[#FEF5E6] mb-4 break-words"
          >
            {siteConfig.limitedEdition.heading}
          </h2>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-2xl mx-auto mb-8 leading-relaxed">
            {siteConfig.limitedEdition.description}
          </p>
          <Link
            to={siteConfig.limitedEdition.cta.href}
            className="inline-flex items-center justify-center min-h-[44px] px-8 text-xs uppercase tracking-widest bg-transparent border border-[#FEF5E6] text-[#FEF5E6] hover:bg-[#FEF5E6] hover:text-[#0F0A09] transition-subtle font-medium outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            {siteConfig.limitedEdition.cta.label}
          </Link>
        </div>
      </section>

      {/* 5. BRAND VALUES (3 PILLARS) */}
      <section
        aria-labelledby="values-heading"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full"
      >
        <div className="text-center mb-10 sm:mb-12">
          <span className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#B8AD9A] block mb-2">
            Our Foundation
          </span>
          <h2 id="values-heading" className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] text-[#FEF5E6]">
            The Aurevella Standards
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {siteConfig.values.map((val) => (
            <div
              key={val.id}
              className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 text-center flex flex-col items-center min-w-0"
            >
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

      {/* 6. CONTACT STRIP (WHATSAPP, INSTAGRAM, EMAIL) */}
      <section
        aria-labelledby="contact-strip-heading"
        className="max-w-4xl mx-auto px-4 sm:px-6 pb-12 w-full"
      >
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-10 text-center">
          <h2
            id="contact-strip-heading"
            className="font-serif text-[clamp(1.5rem,4vw,2rem)] text-[#FEF5E6] mb-2 break-words"
          >
            Connect with the Atelier
          </h2>
          <p className="text-xs sm:text-sm text-[#B8AD9A] mb-8 max-w-md mx-auto">
            Our luxury footwear consultants are available for personalized sizing inquiries and order guidance.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {/* WhatsApp CTA */}
            <a
              href={siteConfig.contact.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-widest bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <MessageSquare size={16} /> WhatsApp {siteConfig.contact.whatsapp.label}
            </a>

            {/* Instagram CTA */}
            <a
              href={siteConfig.contact.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-widest bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
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
            </a>

            {/* Email CTA */}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-widest bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
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
