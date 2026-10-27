import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight, ShoppingBag } from 'lucide-react';
import Logo from './Logo.jsx';
import { siteConfig } from '../content/site.js';
import Button from './ui/button.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useBag } from '../context/BagContext.jsx';
import BagDrawer from './BagDrawer.jsx';

export const AppShell = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { totalCount, openBag } = useBag();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    navigate('/login', { replace: true });
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

          {/* Account, Shopping Bag & Mobile Menu Toggle */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center space-x-2">
                <Link
                  to="/account"
                  className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle min-h-[44px] inline-flex items-center px-2 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                >
                  Account ({user?.role === 'admin' ? 'Admin' : user?.name?.split(' ')[0] || 'User'})
                </Link>
                <Link
                  to="/orders"
                  className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle min-h-[44px] inline-flex items-center px-2 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                >
                  Orders
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="text-[11px] sm:text-xs uppercase tracking-[0.2em] text-[#FEF5E6] bg-[#241B18] border border-[#2F1C15] hover:border-[#FEF5E6]/40 transition-subtle min-h-[44px] inline-flex items-center px-2.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                  >
                    Atelier Admin
                  </Link>
                )}
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

            {/* Shopping Bag Button (Header Desktop & Mobile) */}
            <button
              type="button"
              onClick={openBag}
              aria-label={`Open shopping bag with ${totalCount} items`}
              className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#FEF5E6] hover:text-white transition-subtle min-h-[44px] px-2.5 py-1.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6] bg-[#181210] border border-[#2F1C15] hover:border-[#FEF5E6]/40 select-none"
            >
              <ShoppingBag size={16} />
              <span className="hidden sm:inline font-medium">Bag</span>
              <span className="text-[10px] font-semibold bg-[#0F0A09] text-[#FEF5E6] px-1.5 py-0.5 border border-[#2F1C15] min-w-[20px] text-center">
                {totalCount}
              </span>
            </button>

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
            <div onClick={() => setMobileMenuOpen(false)}>
              <Logo variant="header" />
            </div>
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
          <nav aria-label="Mobile Navigation" className="flex-1 py-6 space-y-2">
            {siteConfig.navLinks.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClasses}
                end={item.href === '/'}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile Drawer Bag Action */}
          <div className="pb-4">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                openBag();
              }}
              className="w-full min-h-[44px] flex items-center justify-between px-4 uppercase tracking-[0.2em] text-xs bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag size={16} /> Shopping Bag
              </span>
              <span className="font-semibold text-[#FEF5E6] bg-[#0F0A09] border border-[#2F1C15] px-2 py-0.5">
                {totalCount}
              </span>
            </button>
          </div>

          {/* Drawer Auth & Contact Actions */}
          <div className="pt-6 border-t border-[#2F1C15] space-y-4">
            {isAuthenticated ? (
              <div className="space-y-3">
                <Link
                  to="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle"
                >
                  My Account
                </Link>
                <Link
                  to="/orders"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle"
                >
                  My Orders & Commissions
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#241B18] border border-amber-900/60 text-amber-200 hover:bg-[#2F1C15] transition-subtle"
                  >
                    Atelier Admin Portal
                  </Link>
                )}
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-[0.2em] text-xs bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18] transition-subtle"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
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

      {/* Global Shopping Bag Slide-Over Drawer */}
      <BagDrawer />

      {/* Global Footer (Balanced Editorial Luxury Architecture) */}
      <footer className="border-t border-[#2F1C15] bg-[#0F0A09] relative w-full overflow-hidden">
        {/* Subtle Warm Vignette on Footer Canvas */}
        <div
          className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(47,28,21,0.22),transparent_70%)]"
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 sm:pt-20 sm:pb-16">
          {/* Top Brand Tier: Logo + Descriptor + Short Statement + Atelier Advisory */}
          <div className="pb-10 sm:pb-14 border-b border-[#2F1C15] flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-3 max-w-md">
              <Logo variant="footer" className="mb-1" />
              <p className="text-xs uppercase tracking-[0.25em] text-[#FEF5E6] font-medium">
                {siteConfig.descriptor}
              </p>
              <p className="text-sm text-[#B8AD9A] tracking-wide leading-relaxed">
                {siteConfig.tagline} {siteConfig.subline}
              </p>
            </div>

            {/* Atelier Advisory Note */}
            <div className="text-left md:text-right max-w-sm">
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#FEF5E6]/80 block mb-1.5 font-medium">
                Bespoke Atelier Service
              </span>
              <p className="text-xs text-[#B8AD9A] leading-relaxed">
                Direct artisan inquiries, sizing consultations, and private commissions handled with discreet concierge care.
              </p>
            </div>
          </div>

          {/* 4 Balanced Desktop Columns (Clean Responsive Stack on Mobile) */}
          <div className="py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 sm:gap-8 lg:gap-10">
            {/* Column 1: The Collections */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                The Collections
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#B8AD9A]">
                {siteConfig.footerNav.shop.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="hover:text-[#FEF5E6] transition-subtle inline-block py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: The Atelier */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                The Atelier
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#B8AD9A]">
                {siteConfig.footerNav.company.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="hover:text-[#FEF5E6] transition-subtle inline-block py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Client Care */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                Client Care
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#B8AD9A]">
                {siteConfig.footerNav.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      to={link.href}
                      className="hover:text-[#FEF5E6] transition-subtle inline-block py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4: Concierge Contact */}
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FEF5E6] mb-5">
                Concierge Contact
              </h3>
              <div className="space-y-4 text-xs text-[#B8AD9A]">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#FEF5E6]/60 block mb-1">
                    WhatsApp Concierge
                  </span>
                  <a
                    href={siteConfig.contact.whatsapp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FEF5E6] hover:underline transition-subtle inline-flex items-center gap-1.5 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                  >
                    <span>{siteConfig.contact.whatsapp.label}</span>
                    <ArrowUpRight size={13} className="text-[#B8AD9A]" />
                  </a>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#FEF5E6]/60 block mb-1">
                    Email Inquiries
                  </span>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="text-[#FEF5E6] hover:underline transition-subtle inline-flex items-center gap-1.5 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                  >
                    <span>{siteConfig.contact.email}</span>
                  </a>
                </div>

                <div>
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#FEF5E6]/60 block mb-1">
                    Official Instagram
                  </span>
                  <a
                    href={siteConfig.contact.instagram.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FEF5E6] hover:underline transition-subtle inline-flex items-center gap-1.5 py-0.5 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
                  >
                    <span>{siteConfig.contact.instagram.handle}</span>
                    <ArrowUpRight size={13} className="text-[#B8AD9A]" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Unified Bottom Bar (Copyright & Origin) */}
          <div className="pt-8 border-t border-[#2F1C15] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#B8AD9A] tracking-wider uppercase text-center sm:text-left">
            <p className="select-none">{siteConfig.copyright}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-4 sm:gap-6 select-none">
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
