import React, { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from './ui/button.jsx';
import { siteConfig } from '../content/site.js';

export const AppShell = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const drawerRef = useRef(null);
  const menuButtonRef = useRef(null);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (drawerOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [drawerOpen]);

  // Close drawer on Escape key and handle Focus Trap
  useEffect(() => {
    if (!drawerOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setDrawerOpen(false);
        menuButtonRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const focusableElements = drawerRef.current.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Initial focus into drawer
    const focusTimer = setTimeout(() => {
      const closeBtn = drawerRef.current?.querySelector('button');
      closeBtn?.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(focusTimer);
    };
  }, [drawerOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinkClasses = ({ isActive }) =>
    `text-xs uppercase tracking-widest min-h-[44px] inline-flex items-center px-3 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA] ${
      isActive
        ? 'text-[#CFC9BA] font-semibold border-b border-[#CFC9BA]'
        : 'text-[#9E9685] hover:text-[#CFC9BA]'
    }`;

  const mobileNavLinkClasses = ({ isActive }) =>
    `text-lg font-serif tracking-widest min-h-[48px] flex items-center px-4 py-2 border-l-2 transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA] ${
      isActive
        ? 'text-[#CFC9BA] border-[#CFC9BA] bg-[#181210]'
        : 'text-[#9E9685] border-transparent hover:text-[#CFC9BA] hover:bg-[#181210]/60'
    }`;

  return (
    <div className="min-h-screen bg-[#0F0A09] text-[#CFC9BA] flex flex-col selection:bg-[#2E1814] selection:text-[#CFC9BA]">
      {/* Skip to Content accessible link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-[#CFC9BA] focus:text-[#0F0A09] focus:text-xs focus:font-medium focus:tracking-wider focus:uppercase focus:outline-none focus:ring-2 focus:ring-white"
      >
        Skip to main content
      </a>

      {/* Sticky Header */}
      <header className="border-b border-[#2E1814] bg-[#0F0A09]/95 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center">
            <Logo showTagline={false} />
          </div>

          {/* Desktop Navigation */}
          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center space-x-1 xl:space-x-4"
          >
            {siteConfig.navLinks.map((item) => (
              <NavLink key={item.href} to={item.href} className={navLinkClasses} end={item.href === '/'}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Account / Action Links & Mobile Menu Toggle */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center space-x-3">
                <Link
                  to="/account"
                  className="text-xs uppercase tracking-widest text-[#CFC9BA] hover:text-white transition-subtle min-h-[44px] inline-flex items-center px-2 outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA]"
                >
                  Account ({user?.role === 'admin' ? 'Admin' : user?.name?.split(' ')[0] || 'User'})
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-xs uppercase tracking-widest text-[#9E9685] hover:text-[#CFC9BA]"
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-xs uppercase tracking-widest text-[#CFC9BA] hover:text-white transition-subtle min-h-[44px] inline-flex items-center px-2 outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-xs uppercase tracking-widest text-[#0F0A09] bg-[#CFC9BA] hover:bg-[#E5E0D3] transition-subtle min-h-[44px] inline-flex items-center px-4 font-medium outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
              className="lg:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#CFC9BA] hover:text-white transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA]"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer (Opacity-only fade-in, focus trapped, body scroll locked) */}
      {drawerOpen && (
        <div
          id="mobile-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Site Navigation"
          ref={drawerRef}
          className="fixed inset-0 z-50 bg-[#0F0A09] animate-fade-in flex flex-col p-6 sm:p-8 overflow-y-auto"
        >
          {/* Drawer Top Header */}
          <div className="flex items-center justify-between pb-6 border-b border-[#2E1814]">
            <Logo />
            <button
              type="button"
              onClick={() => {
                setDrawerOpen(false);
                menuButtonRef.current?.focus();
              }}
              aria-label="Close navigation menu"
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#CFC9BA] hover:text-white transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#CFC9BA]"
            >
              <X size={24} />
            </button>
          </div>

          {/* Drawer Navigation Links */}
          <nav aria-label="Mobile navigation" className="py-8 flex flex-col space-y-2">
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

          {/* Drawer Auth & Secondary Actions */}
          <div className="mt-auto pt-6 border-t border-[#2E1814] flex flex-col space-y-4">
            {isAuthenticated ? (
              <div className="flex flex-col space-y-3">
                <Link
                  to="/account"
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-widest text-xs bg-[#181210] border border-[#2E1814] text-[#CFC9BA] hover:bg-[#241B18] transition-subtle"
                >
                  My Account ({user?.role === 'admin' ? 'Admin' : user?.name || user?.email})
                </Link>
                <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex flex-col space-y-3">
                <Link
                  to="/login"
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-widest text-xs bg-[#181210] border border-[#2E1814] text-[#CFC9BA] hover:bg-[#241B18] transition-subtle"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="min-h-[44px] flex items-center justify-center uppercase tracking-widest text-xs bg-[#CFC9BA] text-[#0F0A09] hover:bg-[#E5E0D3] font-medium transition-subtle"
                >
                  Create Account
                </Link>
              </div>
            )}

            {/* Quick Contact Links in Drawer */}
            <div className="pt-4 flex items-center justify-between text-xs text-[#9E9685]">
              <a
                href={siteConfig.contact.instagram.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#CFC9BA] transition-subtle inline-flex items-center gap-1"
              >
                Instagram <ArrowUpRight size={14} />
              </a>
              <a
                href={`mailto:${siteConfig.contact.email}`}
                className="hover:text-[#CFC9BA] transition-subtle"
              >
                {siteConfig.contact.email}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main id="main-content" tabIndex="-1" className="flex-1 focus:outline-none">
        {children}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-[#2E1814] bg-[#0F0A09]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
            {/* Brand Column */}
            <div className="lg:col-span-2 space-y-4">
              <span className="font-serif text-2xl tracking-[0.25em] text-[#CFC9BA] block select-none">
                {siteConfig.brand}
              </span>
              <p className="text-sm text-[#9E9685] tracking-wide max-w-sm">
                {siteConfig.tagline} {siteConfig.subline}
              </p>
              <div className="pt-2 text-xs text-[#9E9685] space-y-1">
                <p>Email: <a href={`mailto:${siteConfig.contact.email}`} className="text-[#CFC9BA] hover:underline transition-subtle">{siteConfig.contact.email}</a></p>
                <p>Concierge WhatsApp: <a href={siteConfig.contact.whatsapp.url} target="_blank" rel="noopener noreferrer" className="text-[#CFC9BA] hover:underline transition-subtle">{siteConfig.contact.whatsapp.label}</a></p>
                <p>Instagram: <a href={siteConfig.contact.instagram.url} target="_blank" rel="noopener noreferrer" className="text-[#CFC9BA] hover:underline transition-subtle">{siteConfig.contact.instagram.handle}</a></p>
              </div>
            </div>

            {/* Shop Links */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#CFC9BA] mb-4">
                Shop
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#9E9685]">
                {siteConfig.footerNav.shop.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="hover:text-[#CFC9BA] transition-subtle">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company Links */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#CFC9BA] mb-4">
                Company
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#9E9685]">
                {siteConfig.footerNav.company.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="hover:text-[#CFC9BA] transition-subtle">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-[#CFC9BA] mb-4">
                Legal
              </h3>
              <ul className="space-y-3 text-xs tracking-wider text-[#9E9685]">
                {siteConfig.footerNav.legal.map((link) => (
                  <li key={link.href}>
                    <Link to={link.href} className="hover:text-[#CFC9BA] transition-subtle">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Origin Strip */}
          <div className="mt-16 pt-8 border-t border-[#2E1814] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9E9685] tracking-wider uppercase">
            <p>{siteConfig.copyright}</p>
            <div className="flex items-center space-x-6">
              <span>Handcrafted in India</span>
              <span>Italian Elegance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
