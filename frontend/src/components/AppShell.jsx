import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import Logo from './Logo.jsx';
import { siteConfig } from '../content/site.js';
import Button from './ui/button.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export const AppShell = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [navigate]);

  // Handle Escape key to close mobile drawer
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Focus trap inside mobile drawer
  useEffect(() => {
    if (!mobileMenuOpen || !drawerRef.current) return;

    const focusableElements = drawerRef.current.querySelectorAll(
      'a[href], button:not([disabled]), textarea, input, select'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleTabKey);
    firstElement.focus();

    return () => {
      window.removeEventListener('keydown', handleTabKey);
    };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
  };

  const navLinkClasses = ({ isActive }) =>
    `text-[11px] sm:text-xs uppercase tracking-[0.22em] font-medium min-h-[44px] inline-flex items-center px-3.5 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] ${
      isActive
        ? 'text-[#FEF5E6] font-semibold border-b border-[#FEF5E6]'
        : 'text-[#B8AD9A] hover:text-[#FEF5E6]'
    }`;

  const mobileNavLinkClasses = ({ isActive }) =>
    `text-xl font-serif tracking-[0.14em] min-h-[48px] flex items-center px-4 py-2 border-l-2 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] ${
      isActive
        ? 'text-[#FEF5E6] border-[#FEF5E6] bg-[#181210]'
        : 'text-[#B8AD9A] border-transparent hover:text-[#FEF5E6] hover:bg-[#181210]/60'
    }`;

  return (
    <div className="min-h-[100dvh] bg-[#0F0A09] text-[#B8AD9A] flex flex-col selection:bg-[#2F1C15] selection:text-[#FEF5E6]">
      {/* Skip to Content accessible link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#FEF5E6] focus:text-[#0F0A09] focus:text-xs focus:font-medium focus:tracking-wider focus:uppercase focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Sleek Sticky Header */}
      <header className="border-b border-[#2F1C15] bg-[#0F0A09]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Logo: header variant (mark + live text) */}
          <div className="flex items-center min-w-0">
            <Logo variant="header" />
          </div>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center space-x-1 xl:space-x-2"
          >
            {siteConfig.navLinks.map((item) => (
              <NavLink key={item.href} to={item.href} className={navLinkClasses} end={item.href === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Account / Action Links & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center space-x-3">
                <Link
                  to="/account"
                  className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle min-h-[44px] inline-flex items-center px-2 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                >
                  Account ({user?.role === 'admin' ? 'Admin' : user?.name?.split(' ')[0] || 'User'})
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6]"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle min-h-[44px] inline-flex items-center px-3 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#0F0A09] bg-[#FEF5E6] hover:bg-[#FFFFFF] transition-subtle min-h-[38px] inline-flex items-center px-4 font-semibold outline-none focus-visible:ring-1 focus-visible:ring-white shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button (min 44px) */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open mobile navigation"
              aria-expanded={mobileMenuOpen}
              className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#FEF5E6] hover:text-white transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {/* Accessible Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          ref={drawerRef}
          className="fixed inset-0 z-50 bg-[#0F0A09] animate-fade-in flex flex-col p-6 sm:p-8 overflow-y-auto"
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#2F1C15]">
            <Logo variant="header" />
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                menuButtonRef.current?.focus();
              }}
              aria-label="Close navigation drawer"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#FEF5E6] hover:text-white transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
            >
              <X size={24} />
            </button>
          </div>

          {/* Drawer Nav Links */}
          <nav aria-label="Mobile Navigation" className="flex-1 py-8 space-y-2">
            {siteConfig.navLinks.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={mobileNavLinkClasses}
                end={item.href === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Drawer Auth & Contact Actions */}
          <div className="pt-6 border-t border-[#2F1C15] space-y-4">
            {isAuthenticated ? (
              <div className="space-y-3">
                <Link
                  to="/account"
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle"
                >
                  My Account
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#FEF5E6] text-[#0F0A09] hover:bg-[#FFFFFF] transition-subtle font-semibold"
                >
                  Sign Up
                </Link>
              </div>
            )}

            {/* Quick Contact Links in Drawer */}
            <div className="pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#B8AD9A]">
              <a
                href={siteConfig.contact.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FEF5E6] transition-subtle inline-flex items-center gap-1 min-h-[44px]"
              >
                Instagram <ArrowUpRight size={14} />
              </a>
              <a
                href={siteConfig.contact.whatsapp.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#FEF5E6] transition-subtle inline-flex items-center gap-1 min-h-[44px]"
              >
                WhatsApp {siteConfig.contact.whatsapp.label}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-content" tabIndex="-1" className="flex-1 flex flex-col focus:outline-none w-full">
        {children}
      </main>

      {/* Global Footer (Editorial Layout anchored cleanly at bottom of viewport) */}
      <footer className="border-t border-[#2F1C15] bg-[#0F0A09] w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
            {/* Brand Column with full logo and aspect-ratio */}
            <div className="lg:col-span-2 space-y-4">
              <Logo variant="footer" className="mb-2" />
              <p className="text-xs uppercase tracking-[0.22em] text-[#FEF5E6] font-medium">
                {siteConfig.descriptor}
              </p>
              <p className="text-sm text-[#B8AD9A] tracking-wide max-w-sm leading-relaxed">
                {siteConfig.tagline} {siteConfig.subline}
              </p>
              <div className="pt-3 text-xs text-[#B8AD9A] space-y-2">
                <p>
                  <span className="text-[#FEF5E6]/60 uppercase tracking-widest text-[10px] block">Inquiries</span>
                  <a href={`mailto:${siteConfig.contact.email}`} className="text-[#FEF5E6] hover:underline transition-subtle">{siteConfig.contact.email}</a>
                </p>
                <p>
                  <span className="text-[#FEF5E6]/60 uppercase tracking-widest text-[10px] block">Concierge WhatsApp</span>
                  <a href={siteConfig.contact.whatsapp.url} target="_blank" rel="noopener noreferrer" className="text-[#FEF5E6] hover:underline transition-subtle">{siteConfig.contact.whatsapp.label}</a>
                </p>
                <p>
                  <span className="text-[#FEF5E6]/60 uppercase tracking-widest text-[10px] block">Instagram</span>
                  <a href={siteConfig.contact.instagram.url} target="_blank" rel="noopener noreferrer" className="text-[#FEF5E6] hover:underline transition-subtle">{siteConfig.contact.instagram.handle}</a>
                </p>
              </div>
            </div>

            {/* Shop Links */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                Shop
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#B8AD9A]">
                {siteConfig.footerNav.shop.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="hover:text-[#FEF5E6] transition-subtle inline-block py-0.5">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                Company
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#B8AD9A]">
                {siteConfig.footerNav.company.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="hover:text-[#FEF5E6] transition-subtle inline-block py-0.5">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                Legal
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#B8AD9A]">
                {siteConfig.footerNav.legal.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="hover:text-[#FEF5E6] transition-subtle inline-block py-0.5">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Origin Strip */}
          <div className="mt-16 pt-8 border-t border-[#2F1C15] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#B8AD9A] tracking-wider uppercase text-center sm:text-left">
            <p>{siteConfig.copyright}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6">
              <span>Handcrafted in India</span>
              <span className="hidden sm:inline text-[#2F1C15]">•</span>
              <span>Italian Elegance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
