import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Logo component: single swap point for brand identity.
 *
 * Variants:
 *  - "header" (default): aurevella-mark.png (~40px high, alt="") + live serif text "AUREVELLA".
 *                        Link has aria-label="AUREVELLA home".
 *  - "footer" / "full":  aurevella-logo-full.png (alt="AUREVELLA - Luxury Interchangeable Heels")
 *                        with width and height set.
 */
export const Logo = ({ variant = 'header', className = '', asLink = true }) => {
  if (variant === 'footer' || variant === 'full') {
    const fullLogo = (
      <img
        src="/brand/aurevella-logo-full.png"
        alt="AUREVELLA - Luxury Interchangeable Heels"
        width="200"
        height="163"
        className={`w-44 sm:w-52 h-auto object-contain select-none ${className}`.trim()}
      />
    );

    if (!asLink) {
      return fullLogo;
    }

    return (
      <Link
        to="/"
        aria-label="AUREVELLA home"
        className="inline-block group outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0A09]"
      >
        {fullLogo}
      </Link>
    );
  }

  // Header / Default variant
  const headerLogo = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`.trim()}>
      <img
        src="/brand/aurevella-mark.png"
        alt=""
        width="40"
        height="40"
        className="h-10 w-auto object-contain shrink-0"
      />
      <span className="font-serif text-xl sm:text-2xl tracking-[0.22em] text-[#FEF5E6] group-hover:text-white transition-subtle">
        AUREVELLA
      </span>
    </div>
  );

  if (!asLink) {
    return headerLogo;
  }

  return (
    <Link
      to="/"
      aria-label="AUREVELLA home"
      className="inline-flex items-center group outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0A09]"
    >
      {headerLogo}
    </Link>
  );
};

export default Logo;
