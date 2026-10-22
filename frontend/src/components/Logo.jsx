import React from 'react';
import { Link } from 'react-router-dom';

export const Logo = ({ className = '', showTagline = false }) => {
  return (
    <Link
      to="/"
      className={`inline-flex flex-col items-center group outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0A09] ${className}`.trim()}
    >
      <span className="font-serif text-2xl sm:text-3xl tracking-[0.25em] text-[#CFC9BA] group-hover:text-white transition-subtle select-none">
        AUREVELLA
      </span>
      {showTagline && (
        <span className="text-[10px] uppercase tracking-[0.3em] text-[#9E9685] mt-1 select-none">
          Luxury, Reimagined
        </span>
      )}
    </Link>
  );
};

export default Logo;
