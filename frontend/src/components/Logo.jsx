import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Logo component: single swap point for brand identity.
 *
 * Variants:
 *  - "header" (default): aurevella-mark.png (~40px high, alt="") + live serif text "AUREVELLA".
 *                        Link has aria-label="AUREVELLA home".
 *  - "footer" / "full":  aurevella-logo-full.png (alt="AUREVELLA - Luxury Interchangeable Heels")
 *                        with width, height, and aspect-ratio set to eliminate CLS.
 */
export const Logo = ({ variant = 'header', className = '', asLink = true }) => {
  if (variant === 'footer' || variant === 'full') {
    const fullLogo = (
      <img
        src="/brand/aurevella-logo-full.png"
        alt="AUREVELLA - Luxury Interchangeable Heels"
        width="200"
        height="163"
        className={`w-44 sm:w-52 h-auto aspect-[200/163] max-w-full object-contain select-none ${className}`.trim()}
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
    <div className={`inline-flex items-center gap-2 sm:gap-2.5 select-none shrink-0 ${className}`.trim()}>
      <img
        src="/brand/aurevella-mark.png"
        alt=""
        width="40"
        height="40"
        className="h-8 w-8 sm:h-9 sm:w-9 xl:h-10 xl:w-10 aspect-square object-contain shrink-0"
      />
      <span className="font-serif text-base sm:text-lg xl:text-xl 2xl:text-2xl tracking-[0.12em] sm:tracking-[0.16em] xl:tracking-[0.18em] 2xl:tracking-[0.2em] text-[#FEF5E6] group-hover:text-white transition-subtle whitespace-nowrap">
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
      className="inline-flex items-center group outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0A09] shrink-0"
    >
      {headerLogo}
    </Link>
  );
};

export default Logo;
