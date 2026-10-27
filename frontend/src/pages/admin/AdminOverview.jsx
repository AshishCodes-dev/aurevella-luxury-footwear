import React from 'react';
import {
  Package,
  ShoppingBag,
  Users,
  AlertTriangle,
  ArrowUpRight,
  RefreshCw,
  Clock,
  CheckCircle,
  Truck,
  RotateCcw,
} from 'lucide-react';

export const AdminOverview = ({
  metrics,
  loading,
  error,
  onRefresh,
  onNavigateTab,
  onSelectOrder,
}) => {
  if (loading && !metrics) {
    return (
      <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-[#FEF5E6] border-r-transparent" />
        <p className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
          Retrieving Atelier Analytics...
        </p>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="py-16 text-center space-y-4 max-w-md mx-auto">
        <p className="text-sm text-red-400 leading-relaxed">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#181210] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#241B18]"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  const { revenue, orders, inventory, customers, recentOrders } = metrics || {
    revenue: { totalFormatted: '₹0', totalPaise: 0 },
    orders: { total: 0, paid: 0, processing: 0, shipped: 0, delivered: 0, pending: 0, cancelled: 0, reconciliationNeeded: 0 },
    inventory: { totalProducts: 0, lowStockCount: 0, lowStockItems: [] },
    customers: { total: 0 },
    recentOrders: [],
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60';
      case 'processing':
        return 'text-amber-300 bg-amber-950/40 border-amber-800/60';
      case 'shipped':
        return 'text-sky-300 bg-sky-950/40 border-sky-800/60';
      case 'delivered':
        return 'text-[#FEF5E6] bg-[#241B18] border-[#3E2922]';
      case 'payment_reconciliation_needed':
        return 'text-rose-400 bg-rose-950/40 border-rose-800/60';
      case 'cancelled':
      case 'payment_failed':
        return 'text-stone-400 bg-stone-900/60 border-stone-800';
      default:
        return 'text-amber-200 bg-amber-950/20 border-amber-900/40';
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Top Banner & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#2F1C15]">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
            Atelier Executive Overview
          </h2>
          <p className="text-xs text-[#B8AD9A] mt-1 tracking-wide">
            Live business intelligence computed directly from authoritative database records.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 text-xs uppercase tracking-widest bg-[#181210] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#241B18] transition-subtle disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* 4-Column Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Verified Revenue */}
        <div className="bg-[#120D0C] border border-[#2F1C15] p-5 sm:p-6 relative overflow-hidden group hover:border-[#3E2922] transition-subtle">
          <div className="flex items-center justify-between text-[#B8AD9A] mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Verified Revenue</span>
            <span className="text-emerald-400 text-xs">INR</span>
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] font-medium tracking-tight">
            {revenue.totalFormatted}
          </div>
          <p className="text-[11px] text-[#B8AD9A]/80 mt-2">
            Derived from confirmed paid & fulfilled commissions
          </p>
        </div>

        {/* Metric 2: Orders Total & Breakdown */}
        <div className="bg-[#120D0C] border border-[#2F1C15] p-5 sm:p-6 relative overflow-hidden group hover:border-[#3E2922] transition-subtle">
          <div className="flex items-center justify-between text-[#B8AD9A] mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Total Orders</span>
            <ShoppingBag size={16} className="text-[#FEF5E6]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] font-medium tracking-tight">
            {orders.total}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-[#B8AD9A] mt-2">
            <span className="text-emerald-400">{orders.paid} paid</span>
            <span>•</span>
            <span className="text-amber-300">{orders.processing} in craft</span>
            <span>•</span>
            <span className="text-sky-300">{orders.shipped} en route</span>
          </div>
        </div>

        {/* Metric 3: Active Products & Stock Alert */}
        <div className="bg-[#120D0C] border border-[#2F1C15] p-5 sm:p-6 relative overflow-hidden group hover:border-[#3E2922] transition-subtle">
          <div className="flex items-center justify-between text-[#B8AD9A] mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Footwear Catalogue</span>
            <Package size={16} className="text-[#FEF5E6]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] font-medium tracking-tight">
            {inventory.totalProducts}
          </div>
          <p className="text-[11px] mt-2 flex items-center gap-1.5">
            {inventory.lowStockCount > 0 ? (
              <span className="text-amber-400 font-medium">
                {inventory.lowStockCount} model{inventory.lowStockCount > 1 ? 's' : ''} with stock &le; 5 units
              </span>
            ) : (
              <span className="text-emerald-400">Inventory levels healthy</span>
            )}
          </p>
        </div>

        {/* Metric 4: Customer Accounts */}
        <div className="bg-[#120D0C] border border-[#2F1C15] p-5 sm:p-6 relative overflow-hidden group hover:border-[#3E2922] transition-subtle">
          <div className="flex items-center justify-between text-[#B8AD9A] mb-3">
            <span className="text-[11px] uppercase tracking-[0.2em] font-medium">Customer Patrons</span>
            <Users size={16} className="text-[#FEF5E6]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] font-medium tracking-tight">
            {customers.total}
          </div>
          <p className="text-[11px] text-[#B8AD9A]/80 mt-2">
            Authenticated client profiles in atelier registry
          </p>
        </div>
      </div>

      {/* 2-Column Section: Low Stock Warning + Status Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column (2/3): Low Stock / Inventory Alerts */}
        <div className="lg:col-span-2 bg-[#120D0C] border border-[#2F1C15] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-amber-400" />
              <h3 className="font-serif text-lg text-[#FEF5E6]">
                Inventory Attention Watchlist
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="text-xs uppercase tracking-widest text-[#B8AD9A] hover:text-[#FEF5E6] inline-flex items-center gap-1"
            >
              <span>Manage Catalogue</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          {inventory.lowStockItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-[#B8AD9A]">
              All footwear silhouettes currently have ample atelier stock reserves (&gt; 5 units).
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#2F1C15] text-[#B8AD9A] uppercase tracking-wider">
                    <th className="py-3 px-2">Footwear Model</th>
                    <th className="py-3 px-2">Category</th>
                    <th className="py-3 px-2">Price</th>
                    <th className="py-3 px-2">Stock Balance</th>
                    <th className="py-3 px-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2F1C15]/40 text-[#FEF5E6]">
                  {inventory.lowStockItems.map((item) => (
                    <tr key={item.id} className="hover:bg-[#181210] transition-subtle">
                      <td className="py-3 px-2 flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-10 h-10 object-cover border border-[#2F1C15] shrink-0"
                        />
                        <div>
                          <span className="font-medium block leading-snug">{item.name}</span>
                          <span className="text-[10px] text-[#B8AD9A]">{item.code || item.slug}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-[#B8AD9A]">{item.category || 'Atelier'}</td>
                      <td className="py-3 px-2 font-medium">{item.priceText}</td>
                      <td className="py-3 px-2">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] uppercase font-semibold border ${
                            item.stockQuantity === 0
                              ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                              : 'bg-amber-950/40 text-amber-300 border-amber-800/60'
                          }`}
                        >
                          {item.stockQuantity} pairs left
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('products')}
                          className="text-[11px] uppercase tracking-wider text-[#B8AD9A] hover:text-[#FEF5E6] underline underline-offset-4"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Column (1/3): Fulfillment Pipeline Quick View */}
        <div className="bg-[#120D0C] border border-[#2F1C15] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-[#FEF5E6]">Fulfillment Status</h3>
            <button
              type="button"
              onClick={() => onNavigateTab('orders')}
              className="text-xs uppercase tracking-widest text-[#B8AD9A] hover:text-[#FEF5E6] inline-flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight size={13} />
            </button>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-[#181210] border border-[#2F1C15]">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle size={15} />
                <span>Paid (Ready for Atelier Craft)</span>
              </div>
              <span className="font-semibold text-[#FEF5E6]">{orders.paid}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#181210] border border-[#2F1C15]">
              <div className="flex items-center gap-2 text-amber-300">
                <Clock size={15} />
                <span>Processing in Atelier</span>
              </div>
              <span className="font-semibold text-[#FEF5E6]">{orders.processing}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#181210] border border-[#2F1C15]">
              <div className="flex items-center gap-2 text-sky-300">
                <Truck size={15} />
                <span>Shipped / In Transit</span>
              </div>
              <span className="font-semibold text-[#FEF5E6]">{orders.shipped}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-[#181210] border border-[#2F1C15]">
              <div className="flex items-center gap-2 text-[#B8AD9A]">
                <CheckCircle size={15} />
                <span>Delivered to Client</span>
              </div>
              <span className="font-semibold text-[#FEF5E6]">{orders.delivered}</span>
            </div>

            {orders.reconciliationNeeded > 0 && (
              <div className="flex items-center justify-between p-3 bg-rose-950/30 border border-rose-800/50 text-rose-300">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>Reconciliation Flagged</span>
                </div>
                <span className="font-semibold">{orders.reconciliationNeeded}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-[#120D0C] border border-[#2F1C15] p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-xl text-[#FEF5E6]">
              Recent Atelier Commissions
            </h3>
            <p className="text-xs text-[#B8AD9A] mt-0.5">
              Latest client footwear orders submitted through the storefront.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('orders')}
            className="text-xs uppercase tracking-widest text-[#B8AD9A] hover:text-[#FEF5E6] inline-flex items-center gap-1"
          >
            <span>All Orders ({orders.total})</span>
            <ArrowUpRight size={13} />
          </button>
        </div>

        {recentOrders.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#B8AD9A]">
            No commissioned orders recorded yet in the database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#2F1C15] text-[#B8AD9A] uppercase tracking-wider">
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Client</th>
                  <th className="py-3 px-3">Pairs</th>
                  <th className="py-3 px-3">Total Amount</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F1C15]/40 text-[#FEF5E6]">
                {recentOrders.map((ord) => {
                  const statusKey = ord.status || ord.fulfillmentStatus || 'pending';
                  const itemsCount = ord.itemsCount ?? ord.items?.length ?? 0;
                  const totalDisplay = ord.totalText || ord.totalFormatted || (ord.totalPaise ? `₹${(ord.totalPaise / 100).toLocaleString('en-IN')}` : '₹0');
                  const dateDisplay = ord.createdAt
                    ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';

                  return (
                    <tr key={ord.id || ord._id || ord.orderNumber} className="hover:bg-[#181210] transition-subtle">
                      <td className="py-3.5 px-3 font-mono font-medium text-[#FEF5E6]">
                        {ord.orderNumber || ord.id || '—'}
                      </td>
                      <td className="py-3.5 px-3 text-[#B8AD9A]">
                        {dateDisplay}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="block font-medium">{ord.customerName || 'Guest Customer'}</span>
                        {ord.customerEmail && (
                          <span className="text-[10px] text-[#B8AD9A] block">{ord.customerEmail}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-[#B8AD9A]">{itemsCount} pair{itemsCount === 1 ? '' : 's'}</td>
                      <td className="py-3.5 px-3 font-medium text-[#FEF5E6]">{totalDisplay}</td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-block px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold border ${getStatusBadge(
                            statusKey
                          )}`}
                        >
                          {String(statusKey).replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelectOrder(ord.orderNumber || ord.id)}
                          className="text-xs uppercase tracking-wider text-[#B8AD9A] hover:text-[#FEF5E6] underline underline-offset-4"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOverview;
