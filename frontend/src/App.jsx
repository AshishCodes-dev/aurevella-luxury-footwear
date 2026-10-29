import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { BagProvider } from './context/BagContext.jsx';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// Core routes kept in the main bundle (Home, Shop, Product, Bag)
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import BagPage from './pages/BagPage.jsx';

// Public auxiliary pages kept in main bundle
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Collections from './pages/Collections.jsx';
import LimitedEdition from './pages/LimitedEdition.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

// Route-level code splitting with React.lazy + Suspense
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Account = lazy(() => import('./pages/Account.jsx'));
const Orders = lazy(() => import('./pages/Orders.jsx'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy.jsx'));
const TermsConditions = lazy(() => import('./pages/TermsConditions.jsx'));
const ShippingPolicy = lazy(() => import('./pages/ShippingPolicy.jsx'));
const ReturnsPolicy = lazy(() => import('./pages/ReturnsPolicy.jsx'));

// Luxury dark theme Suspense fallback matching atelier aesthetic without layout shift
const AtelierSuspenseFallback = () => (
  <div
    role="status"
    aria-label="Loading atelier content"
    className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#0F0A09] text-[#B8AD9A]"
  >
    <div className="w-8 h-8 rounded-full border border-[#2F1C15] border-t-[#FEF5E6] animate-spin mb-4" />
    <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A]">
      Loading Atelier
    </span>
  </div>
);

const AppRoutes = () => {
  const { authEpoch } = useAuth();

  return (
    <AppShell>
      <Suspense fallback={<AtelierSuspenseFallback />}>
        <Routes>
          {/* Core Homepage */}
          <Route path="/" element={<Home />} />

          {/* Product Catalogue */}
          <Route path="/shop" element={<Shop />} />

          {/* Product Detail Page */}
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/shop/:id" element={<ProductDetail />} />

          {/* Dedicated Shopping Bag Page & Cart Alias */}
          <Route path="/bag" element={<BagPage />} />
          <Route path="/cart" element={<BagPage />} />

          {/* Bespoke Checkout Flow */}
          <Route path="/checkout" element={<Checkout />} />

          {/* Verified Customer Orders Register */}
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <Orders />
              </ProtectedRoute>
            }
          />

          {/* Secure Atelier Executive Admin Portal */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Authentication Routes (Keyed with authEpoch to guarantee fresh remount & clean form state on logout) */}
          <Route path="/login" element={<Login key={`login-${authEpoch}`} />} />
          <Route path="/signup" element={<Signup key={`signup-${authEpoch}`} />} />
          <Route path="/forgot-password" element={<ForgotPassword key={`forgot-${authEpoch}`} />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          {/* Curated Editorial Collections & Brand Pages */}
          <Route path="/collections" element={<Collections />} />
          <Route path="/limited-edition" element={<LimitedEdition />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />

          {/* Legal & Atelier Policies */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsConditions />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/returns-policy" element={<ReturnsPolicy />} />

          {/* 404 Fallback */}
          <Route
            path="*"
            element={
              <PlaceholderPage
                title="Page Not Found"
                eyebrow="404 Error"
                description="The page you requested does not exist or may have been relocated within the atelier."
                backLabel="Return to Homepage"
                backLink="/"
              />
            }
          />
        </Routes>
      </Suspense>
    </AppShell>
  );
};

export const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <BagProvider>
            <AppRoutes />
          </BagProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
