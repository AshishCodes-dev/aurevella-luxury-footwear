import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Button } from './ui/button.jsx';

export const AppShell = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#0F0A09] text-[#CFC9BA] flex flex-col selection:bg-[#2E1814] selection:text-[#CFC9BA]">
      {/* Header */}
      <header className="border-b border-[#2E1814] bg-[#0F0A09] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
          </div>

          <nav className="flex items-center space-x-4 sm:space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/account"
                  className="text-xs uppercase tracking-widest text-[#CFC9BA] hover:text-white min-h-[44px] inline-flex items-center px-2 focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]"
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
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs uppercase tracking-widest text-[#CFC9BA] hover:text-white min-h-[44px] inline-flex items-center px-2 focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="text-xs uppercase tracking-widest text-[#0F0A09] bg-[#CFC9BA] hover:bg-[#E5E0D3] min-h-[44px] inline-flex items-center px-4 font-medium focus:outline-none focus:ring-1 focus:ring-white"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {children}
      </main>

      {/* Footer Stub */}
      <footer className="border-t border-[#2E1814] bg-[#0F0A09] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9E9685] tracking-wider uppercase">
          <p>© 2026 AUREVELLA. Luxury, Reimagined.</p>
          <div className="flex items-center space-x-6">
            <span>Handcrafted in India</span>
            <span>Italian Elegance</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppShell;
