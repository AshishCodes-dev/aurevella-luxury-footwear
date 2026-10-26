import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Package,
  ShoppingBag,
  ArrowLeft,
  Shield,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { fetchAdminStats } from '../../utils/api.js';
import AdminOverview from './AdminOverview.jsx';
import AdminProducts from './AdminProducts.jsx';
import AdminOrders from './AdminOrders.jsx';

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active tab state: 'overview' | 'products' | 'orders'
  const initialTab = searchParams.get('tab') || 'overview';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Global Admin Metrics State
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  // Deep-linked order ID to open in orders tab
  const [targetedOrderId, setTargetedOrderId] = useState(null);

  // Fetch live stats
  const loadStats = useCallback(async () => {
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const res = await fetchAdminStats();
      if (res?.status === 'success') {
        setMetrics(res.metrics);
      }
    } catch (err) {
      setMetricsError(err.message || 'Failed to retrieve administrative metrics');
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Keep search params in sync with activeTab
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  // Callback from Overview to navigate directly to an order
  const handleSelectOrderFromOverview = (orderNumberOrId) => {
    setTargetedOrderId(orderNumberOrId);
    handleTabChange('orders');
  };

  return (
    <div className="min-h-screen bg-[#0F0A09] text-[#B8AD9A] pb-24">
      {/* Top Administrative Atelier Bar */}
      <div className="bg-[#140E0C] border-b border-[#2F1C15]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          {/* Breadcrumb & Atelier Identity */}
          <div className="flex items-center gap-2 text-[#665B54]">
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
            >
              <ArrowLeft size={13} />
              <span>Return to Boutique</span>
            </Link>
            <span>/</span>
            <span className="text-[#FEF5E6] flex items-center gap-1.5 font-medium">
              <Shield size={12} className="text-amber-400" />
              <span>Atelier Management Portal</span>
            </span>
          </div>

          {/* Authenticated Admin Badge */}
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#B8AD9A]">
              Administrator:{' '}
              <strong className="text-[#FEF5E6] font-medium">
                {user?.name || user?.email || 'Authorized Executive'}
              </strong>
            </span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Navigation Tabs Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#2F1C15] pb-4">
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Overview Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('overview')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest transition-subtle border ${
                activeTab === 'overview'
                  ? 'bg-[#FEF5E6] text-[#0F0A09] border-[#FEF5E6] font-semibold shadow-sm'
                  : 'bg-[#181210] border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#241B18]'
              }`}
            >
              <BarChart3 size={14} />
              <span>Overview</span>
            </button>

            {/* Products Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('products')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest transition-subtle border ${
                activeTab === 'products'
                  ? 'bg-[#FEF5E6] text-[#0F0A09] border-[#FEF5E6] font-semibold shadow-sm'
                  : 'bg-[#181210] border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#241B18]'
              }`}
            >
              <Package size={14} />
              <span>Products</span>
              {metrics?.inventory?.totalProducts !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 border ${
                    activeTab === 'products'
                      ? 'bg-[#0F0A09] text-[#FEF5E6] border-[#0F0A09]'
                      : 'bg-[#241B18] text-[#B8AD9A] border-[#2F1C15]'
                  }`}
                >
                  {metrics.inventory.totalProducts}
                </span>
              )}
            </button>

            {/* Orders Tab */}
            <button
              type="button"
              onClick={() => handleTabChange('orders')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-widest transition-subtle border ${
                activeTab === 'orders'
                  ? 'bg-[#FEF5E6] text-[#0F0A09] border-[#FEF5E6] font-semibold shadow-sm'
                  : 'bg-[#181210] border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#241B18]'
              }`}
            >
              <ShoppingBag size={14} />
              <span>Orders</span>
              {metrics?.orders?.paid !== undefined && metrics.orders.paid > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 font-bold">
                  {metrics.orders.paid} new
                </span>
              )}
            </button>
          </div>

          {/* Quick Link to Storefront Shop */}
          <Link
            to="/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start sm:self-auto text-xs text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
          >
            <span>Live Boutique Preview</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        {/* Tab Content Panes */}
        <div>
          {activeTab === 'overview' && (
            <AdminOverview
              metrics={metrics}
              loading={metricsLoading}
              error={metricsError}
              onRefresh={loadStats}
              onNavigateTab={(tab) => handleTabChange(tab)}
              onSelectOrder={handleSelectOrderFromOverview}
            />
          )}

          {activeTab === 'products' && <AdminProducts />}

          {activeTab === 'orders' && (
            <AdminOrders
              initialOrderId={targetedOrderId}
              onClearInitialOrder={() => setTargetedOrderId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;