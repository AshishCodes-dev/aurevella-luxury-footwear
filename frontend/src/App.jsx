import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { BagProvider } from './context/BagContext.jsx';
import AppShell from './components/AppShell.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import BagPage from './pages/BagPage.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Account from './pages/Account.jsx';
import Checkout from './pages/Checkout.jsx';
import Orders from './pages/Orders.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Collections from './pages/Collections.jsx';
import LimitedEdition from './pages/LimitedEdition.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import TermsConditions from './pages/TermsConditions.jsx';
import ShippingPolicy from './pages/ShippingPolicy.jsx';
import ReturnsPolicy from './pages/ReturnsPolicy.jsx';
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
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
