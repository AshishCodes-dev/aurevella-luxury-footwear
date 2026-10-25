import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { BagProvider } from './context/BagContext.jsx';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import BagPage from './pages/BagPage.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Account from './pages/Account.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

const AppRoutes = () => {
  const { authEpoch } = useAuth();

  return (
    <AppShell>
      <Routes>
        {/* Core Homepage */}
        <Route path="/" element={<Home />} />

        {/* Product Catalogue */}
        <Route path="/shop" element={<Shop />} />

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

        {/* Authentication Routes (Keyed with authEpoch to guarantee fresh remount & clean form state on logout) */}
        <Route path="/login" element={<Login key={`login-${authEpoch}`} />} />
        <Route path="/signup" element={<Signup key={`signup-${authEpoch}`} />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />

        {/* Curated Collections & Placeholders */}
        <Route
          path="/collections"
          element={
            <PlaceholderPage
              title="Curated Collections"
              eyebrow="Seasonal Releases"
              description="Distinct footwear capsule releases, from formal black-tie Oxfords to unlined summer loafers crafted for refined comfort."
            />
          }
        />
        <Route
          path="/limited-edition"
          element={
            <PlaceholderPage
              title="Limited Edition Series"
              eyebrow="Numbered Drops"
              description="Individually numbered small-batch creations featuring museum calfskin and antique patinas. Limited strictly to 50 pairs per series."
            />
          }
        />
        <Route
          path="/about"
          element={
            <PlaceholderPage
              title="About Aurevella"
              eyebrow="Heritage & Atelier"
              showLogo={true}
              description="AUREVELLA brings Italian-inspired elegance to footwear, crafted in India and made by hand. Our signature interchangeable heels are designed around one idea: Luxury, Reimagined."
            />
          }
        />
        <Route
          path="/contact"
          element={
            <PlaceholderPage
              title="Contact & Concierge"
              eyebrow="Atelier Service"
              description="Reach our concierge team via WhatsApp, Instagram, or email for bespoke inquiries, custom fits, and order status updates."
            />
          }
        />

        {/* Legal & Policy Placeholders */}
        <Route
          path="/privacy"
          element={
            <PlaceholderPage
              title="Privacy Policy"
              eyebrow="Client Protection"
              description="Our comprehensive guidelines on customer data protection, order confidentiality, and secure payment processing."
            />
          }
        />
        <Route
          path="/terms"
          element={
            <PlaceholderPage
              title="Terms & Conditions"
              eyebrow="Client Agreement"
              description="Official purchasing terms, merchant agreements, warranty terms, and site usage policies."
            />
          }
        />
        <Route
          path="/shipping-policy"
          element={
            <PlaceholderPage
              title="Shipping & Dispatch"
              eyebrow="White Glove Delivery"
              description="Insured door-to-door courier delivery across India, packaged in bespoke wooden storage boxes with cedar shoe trees."
            />
          }
        />
        <Route
          path="/returns-policy"
          element={
            <PlaceholderPage
              title="Returns & Exchanges"
              eyebrow="Client Guarantee"
              description="Our seamless 14-day sizing exchange and return policy for unworn handcrafted footwear."
            />
          }
        />

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
    </AppShell>
  );
};

export const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BagProvider>
          <AppRoutes />
        </BagProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
