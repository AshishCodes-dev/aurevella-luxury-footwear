import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Layers, Sliders, Shield } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const Collections = () => {
  useDocumentTitle('Curated Collections');

  const launchCapsules = [
    {
      id: 'interchangeable-heels',
      badge: 'Signature Engineering',
      title: 'Interchangeable Heels Capsule',
      subtitle: 'From Morning Poise to Gala Drama',
      description:
        'Our signature interchangeable heel engineering redefines footwear versatility. Designed with an ultra-secure locking mechanism, effortlessly transition between sculptural block profiles and daytime silhouettes without compromising lumbar alignment or arch balance.',
      features: [
        'Secure quick-release locking mechanism',
        'Balanced ergonomic arch distribution',
        'Supple full-grain Italian leather uppers',
        'Hand-finished heel accents',
      ],
      ctaText: 'Explore Interchangeable Heels',
      ctaLink: '/shop?category=interchangeable-heel',
      products: siteConfig.featuredProducts.filter(
        (p) => p.category === 'Interchangeable Heel'
      ),
    },
    {
      id: 'resort-slides',
      badge: 'Artisanal Comfort',
      title: 'Resort & Flat Slides Capsule',
      subtitle: 'Unlined Luxury for Effortless Elegance',
      description:
        'Embodying relaxed sophistication, our resort slides pair handwoven artisanal soles with cloud-soft knotted straps. Created for sun-drenched afternoons, coastal escapes, and understated daily comfort.',
      features: [
        'Naturally cushioned woven footbeds',
        'Hand-knotted silk-touch textile straps',
        'Non-slip textured rubber outsole',
        'Featherweight all-day construction',
      ],
      ctaText: 'Explore Resort Slides',
      ctaLink: '/shop?category=flat-slide',
      products: siteConfig.featuredProducts.filter((p) => p.category === 'Flat Slide'),
    },
    {
      id: 'gala-evening',
      badge: 'Atelier Preview',
      title: 'Red Carpet & Evening Series',
      subtitle: 'Statement Silhouettes for Grand Occasions',
      description:
        'Sculptural contours, hand-applied gold hardware, and architectural heel geometries crafted for red carpet entrances and bespoke celebrations. Each pair is built on an elongated Italian last for dramatic presence.',
      features: [
        'Solid brass hardware with anti-tarnish coating',
        'Hand-buffed museum patina leather',
        // TODO(client): Confirm Autumn/Winter Gala launch release date
        'Autumn/Winter Gala Series — Private Allocation via Concierge',
        'Bespoke heel height adjustments upon request',
      ],
      ctaText: 'Inquire via Concierge',
      ctaLink: '/contact',
      isUpcoming: true,
      products: [],
    },
  ];

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Editorial Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            Capsule Releases
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Curated Collections
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            Explore our curated footwear capsules, where classic continental architecture harmonizes with bespoke Indian shoemaking craftsmanship.
          </p>
        </div>
      </section>

      {/* Capsule Sections */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-24">
        {launchCapsules.map((capsule, index) => (
          <section
            key={capsule.id}
            id={capsule.id}
            className={`space-y-10 pb-16 ${
              index < launchCapsules.length - 1 ? 'border-b border-[#2F1C15]' : ''
            }`}
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Capsule Narrative */}
              <div className="lg:col-span-5 space-y-5">
                <span className="inline-block text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 bg-[#181210] border border-[#2F1C15] text-[#B8AD9A]">
                  {capsule.badge}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
                  {capsule.title}
                </h2>
                <h3 className="text-xs uppercase tracking-wider text-[#B8AD9A] font-medium">
                  {capsule.subtitle}
                </h3>
                <p className="text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
                  {capsule.description}
                </p>

                <div className="space-y-2 pt-2">
                  {capsule.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-[#B8AD9A]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FEF5E6]/60 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link
                    to={capsule.ctaLink}
                    className="inline-flex items-center gap-2 min-h-[44px] px-6 text-xs uppercase tracking-[0.18em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
                  >
                    {capsule.ctaText}
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Capsule Products Showcase */}
              <div className="lg:col-span-7">
                {capsule.products.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {capsule.products.map((product) => (
                      <Link
                        key={product.id}
                        to={product.link}
                        className="group bg-[#181210] border border-[#2F1C15] hover:border-[#4A2C26] transition-subtle flex flex-col overflow-hidden"
                      >
                        <div className="aspect-square w-full bg-[#0F0A09] relative overflow-hidden flex items-center justify-center p-4">
                          <img
                            src={product.image}
                            alt={product.alt}
                            className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <span className="text-[10px] uppercase tracking-wider text-[#B8AD9A]">
                              {product.category}
                            </span>
                            <h4 className="font-serif text-base text-[#FEF5E6] group-hover:text-white transition-colors">
                              {product.name}
                            </h4>
                          </div>
                          <div className="flex items-center justify-between border-t border-[#2F1C15] pt-3 text-xs">
                            <span className="font-medium text-[#FEF5E6]">{product.priceText}</span>
                            <span className="text-[#B8AD9A] group-hover:text-[#FEF5E6] flex items-center gap-1 uppercase tracking-wider text-[11px]">
                              View Pair &rarr;
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#181210] border border-dashed border-[#2F1C15] p-8 sm:p-12 text-center space-y-4">
                    <Sparkles size={28} className="mx-auto text-[#B8AD9A]/60" />
                    <h4 className="font-serif text-lg text-[#FEF5E6]">
                      Private Atelier Commissioning
                    </h4>
                    <p className="text-xs text-[#B8AD9A] max-w-md mx-auto leading-relaxed">
                      Our Red Carpet Gala Series is reserved for bespoke private orders and red carpet commissions.
                      Connect directly with our master atelier concierge to explore tailored heel heights and jewel allocations.
                    </p>
                    {/* TODO(client): Provide launch photography and confirm Autumn/Winter 2026 delivery window */}
                    <span className="block text-[11px] text-[#B8AD9A]/70 italic pt-2">
                      Private preview lookbook and bespoke allocations available upon concierge request.
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>

      {/* Sizing Assistance Banner */}
      <section className="border-t border-[#2F1C15] bg-[#140E0C] py-12 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div className="space-y-1">
            <h3 className="font-serif text-xl text-[#FEF5E6]">Unsure about your ideal fit?</h3>
            <p className="text-xs text-[#B8AD9A]">
              We offer complimentary sizing exchanges within 14 days and direct WhatsApp fitting consultation.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/shop"
              className="min-h-[42px] px-6 text-xs uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle flex items-center"
            >
              Browse All Shoes
            </Link>
            <a
              href={siteConfig.contact.whatsapp.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[42px] px-5 text-xs uppercase tracking-wider border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#221A18] transition-subtle flex items-center"
            >
              WhatsApp Concierge
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Collections;