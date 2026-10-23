import React from 'react';
import { Link } from 'react-router-dom';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import Logo from '../components/Logo.jsx';

export const PlaceholderPage = ({
  title,
  eyebrow = 'Coming Soon',
  description = 'Our atelier is curating this section. Content and collection pieces will be unveiled shortly.',
  backLink = '/',
  backLabel = 'Return to Homepage',
  showLogo = false,
}) => {
  useDocumentTitle(title);

  return (
    <div className="flex-1 flex flex-col justify-center items-center w-full px-4 py-16 sm:py-24 animate-fade-in">
      <div className="max-w-4xl mx-auto text-center w-full">
        {showLogo && (
          <div className="flex justify-center mb-8">
            <Logo variant="full" asLink={false} />
          </div>
        )}
        <span className="text-xs uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#B8AD9A] block mb-3">
          {eyebrow}
        </span>
        <h1 className="font-serif text-[clamp(2rem,5vw,3.75rem)] tracking-wide text-[#FEF5E6] mb-6">
          {title}
        </h1>
        <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto mb-10 leading-relaxed">
          {description}
        </p>
        <div className="pt-4 border-t border-[#2F1C15] inline-block">
          <Link
            to={backLink}
            className="inline-flex items-center justify-center min-h-[44px] px-8 text-xs uppercase tracking-widest bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
