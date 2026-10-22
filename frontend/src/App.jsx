import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Account from './pages/Account.jsx';
import { apiFetch } from './utils/api.js';

const HomePagePlaceholder = () => {
  const { isAuthenticated, user } = useAuth();
  const [backendStatus, setBackendStatus] = useState('checking...');

  useEffect(() => {
    let isMounted = true;
    const checkBackend = async () => {
      try {
        const data = await apiFetch('/api/health');
        if (isMounted) {
          setBackendStatus(data.status === 'ok' ? 'connected' : 'error');
        }
      } catch (err) {
        if (isMounted) {
          setBackendStatus('not reachable');
        }
      }
    };

    checkBackend();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h1 className="font-serif text-5xl sm:text-7xl font-normal tracking-[0.2em] text-[#CFC9BA] mb-4 select-none">
        AUREVELLA
      </h1>
      <p className="text-sm sm:text-base font-light tracking-[0.3em] uppercase text-[#9E9685] mb-12 select-none">
        Luxury, Reimagined. Website coming soon.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
        {isAuthenticated ? (
          <Link
            to="/account"
            className="inline-flex items-center justify-center min-h-[44px] px-6 text-xs uppercase tracking-widest bg-[#CFC9BA] text-[#0F0A09] hover:bg-[#E5E0D3] font-medium focus:outline-none focus:ring-1 focus:ring-white"
          >
            Go to My Account ({user?.name || user?.email})
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-xs uppercase tracking-widest bg-[#CFC9BA] text-[#0F0A09] hover:bg-[#E5E0D3] font-medium focus:outline-none focus:ring-1 focus:ring-white"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-xs uppercase tracking-widest bg-[#181210] text-[#CFC9BA] border border-[#2E1814] hover:bg-[#221A18] font-medium focus:outline-none focus:ring-1 focus:ring-[#CFC9BA]"
            >
              Create Account
            </Link>
          </>
        )}
      </div>

      <div className="text-xs uppercase tracking-widest text-[#9E9685]/70 border-t border-[#2E1814] pt-6">
        <span>Backend: </span>
        <span
          className={
            backendStatus === 'connected'
              ? 'text-emerald-400 font-semibold'
              : 'text-amber-400 font-semibold'
          }
        >
          {backendStatus}
        </span>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePagePlaceholder />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <Account />
                </ProtectedRoute>
              }
            />
            {/* Fallback */}
            <Route path="*" element={<HomePagePlaceholder />} />
          </Routes>
        </AppShell>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
