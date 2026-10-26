import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingBag,
  Search,
  Filter,
  RefreshCw,
  Eye,
  CheckCircle,
  Truck,
  RotateCcw,
  Clock,
  AlertCircle,
  X,
  CreditCard,
  MapPin,
  ChevronLeft,
  ChevronRight,
  PackageCheck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchAdminOrders,
  fetchAdminOrder,
  updateAdminOrderFulfillment,
} from '../../utils/api.js';

export const AdminOrders = ({ initialOrderId = null, onClearInitialOrder = null }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [fulfillmentNote, setFulfillmentNote] = useState('');
  const [confirmStatus, setConfirmStatus] = useState(null); // When user clicks a status button, prompts confirmation

  // Status Badge Helper
  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return {
          label: 'Paid (Awaiting Fulfillment)',
          classes: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60',
          icon: CheckCircle,
        };
      case 'processing':
        return {
          label: 'Processing in Atelier',
          classes: 'text-amber-300 bg-amber-950/40 border-amber-800/60',
          icon: Clock,
        };
      case 'shipped':
        return {
          label: 'Shipped & In Transit',
          classes: 'text-sky-300 bg-sky-950/40 border-sky-800/60',
          icon: Truck,
        };
      case 'delivered':
        return {
          label: 'Delivered to Patron',
          classes: 'text-[#FEF5E6] bg-[#241B18] border-[#3E2922]',
          icon: PackageCheck,
        };
      case 'payment_reconciliation_needed':
        return {
          label: 'Reconciliation Required',
          classes: 'text-rose-400 bg-rose-950/40 border-rose-800/60',
          icon: AlertCircle,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          classes: 'text-stone-400 bg-stone-900 border-stone-800',
          icon: RotateCcw,
        };
      case 'payment_failed':
        return {
          label: 'Payment Failed',
          classes: 'text-stone-400 bg-stone-900 border-stone-800',
          icon: AlertCircle,
        };
      case 'pending_payment':
      default:
        return {
          label: 'Pending Payment',
          classes: 'text-amber-200 bg-amber-950/20 border-amber-900/40',
          icon: Clock,
        };
    }
  };

  // Load Orders with filter & search
  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page: currentPage,
        limit: 10,
      };

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const res = await fetchAdminOrders(params);
      if (res?.status === 'success') {
        setOrders(res.orders || []);
        setTotalPages(res.pagination?.pages || 1);
        setTotalOrders(res.pagination?.total || 0);
      }
    } catch (err) {
      setError(err.message || 'Failed to retrieve orders');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle deep-linked order selection from Overview
  useEffect(() => {
    if (initialOrderId) {
      handleInspectOrder(initialOrderId);
      if (onClearInitialOrder) onClearInitialOrder();
    }
  }, [initialOrderId]);

  // Inspect Single Order
  const handleInspectOrder = async (orderIdOrNumber) => {
    setDetailLoading(true);
    setDetailError(null);
    setConfirmStatus(null);
    setFulfillmentNote('');
    try {
      const res = await fetchAdminOrder(orderIdOrNumber);
      if (res?.status === 'success') {
        setSelectedOrder(res.order);
      }
    } catch (err) {
      setDetailError(err.message || 'Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  // Execute Fulfillment State Transition
  const handleConfirmTransition = async () => {
    if (!selectedOrder || !confirmStatus) return;

    setTransitioning(true);
    try {
      const res = await updateAdminOrderFulfillment(
        selectedOrder.orderNumber || selectedOrder._id,
        {
          status: confirmStatus,
          notes: fulfillmentNote.trim() || undefined,
        }
      );

      if (res?.status === 'success') {
        setSelectedOrder(res.order);
        setConfirmStatus(null);
        setFulfillmentNote('');
        setActionNotice({
          type: 'success',
          message: res.message || `Order successfully updated to ${confirmStatus}`,
        });
        setTimeout(() => setActionNotice(null), 4000);
        // Refresh table list in background
        loadOrders();
      }
    } catch (err) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Failed to update order status',
      });
    } finally {
      setTransitioning(false);
    }
  };

  // Determine allowed transitions for selected order
  const getAllowedTransitions = (order) => {
    if (!order) return [];
    switch (order.status) {
      case 'paid':
        return [
          { status: 'processing', label: 'Begin Processing in Atelier', style: 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/60' },
          { status: 'cancelled', label: 'Cancel Order & Commission', style: 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800' },
        ];
      case 'processing':
        return [
          { status: 'shipped', label: 'Mark Shipped / In Transit', style: 'bg-sky-950/40 border-sky-800 text-sky-300 hover:bg-sky-900/60' },
          { status: 'cancelled', label: 'Cancel Order', style: 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800' },
        ];
      case 'shipped':
        return [
          { status: 'delivered', label: 'Mark Delivered to Patron', style: 'bg-[#241B18] border-[#3E2922] text-[#FEF5E6] hover:bg-[#2F1C15]' },
        ];
      case 'payment_reconciliation_needed':
        return [
          { status: 'processing', label: 'Authorize Atelier Processing', style: 'bg-amber-950/40 border-amber-800 text-amber-300 hover:bg-amber-900/60' },
          { status: 'cancelled', label: 'Cancel Order', style: 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800' },
        ];
      case 'pending_payment':
        return [
          { status: 'cancelled', label: 'Cancel Unpaid Order', style: 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800' },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#2F1C15]">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
            Atelier Order Register
          </h2>
          <p className="text-xs text-[#B8AD9A] mt-1 tracking-wide">
            Inspect verified customer orders, review cryptographic payment receipts, and manage physical fulfillment.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 text-xs uppercase tracking-widest bg-[#181210] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6] hover:bg-[#241B18] transition-subtle disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div
          className={`p-4 border text-xs tracking-wide flex items-center justify-between ${
            actionNotice.type === 'error'
              ? 'bg-red-950/40 border-red-800/80 text-red-300'
              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <CheckCircle size={16} />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-[#B8AD9A] hover:text-[#FEF5E6]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-[#181210] border border-[#2F1C15] p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search Input */}
        <div className="relative md:col-span-2">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B8AD9A]" />
          <input
            type="text"
            placeholder="Search order number, customer name, phone, Razorpay ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] placeholder-[#665B54] focus:outline-none focus:border-[#FEF5E6]/40 font-mono"
          />
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40"
          >
            <option value="all">All Statuses ({totalOrders})</option>
            <option value="paid">Paid (Awaiting Processing)</option>
            <option value="processing">Processing in Atelier</option>
            <option value="shipped">Shipped & In Transit</option>
            <option value="delivered">Delivered to Patron</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="payment_reconciliation_needed">Reconciliation Needed</option>
            <option value="cancelled">Cancelled</option>
            <option value="payment_failed">Payment Failed</option>
          </select>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-[#181210] border border-[#2F1C15] overflow-hidden">
        {loading && orders.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-center space-y-3">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-[#FEF5E6] border-r-transparent" />
            <p className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
              Loading Orders Register...
            </p>
          </div>
        ) : error && orders.length === 0 ? (
          <div className="py-16 text-center space-y-4 max-w-md mx-auto px-4">
            <p className="text-sm text-red-400 leading-relaxed">{error}</p>
            <button
              type="button"
              onClick={loadOrders}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs uppercase tracking-widest bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15]"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="py-20 text-center space-y-4 px-4">
            <ShoppingBag size={36} className="mx-auto text-[#665B54] stroke-1" />
            <div className="space-y-1">
              <p className="font-serif text-lg text-[#FEF5E6]">No orders found</p>
              <p className="text-xs text-[#B8AD9A] max-w-sm mx-auto">
                No customer orders match the current search or status filter.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="px-4 py-2 text-xs uppercase tracking-widest bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15]"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#2F1C15] bg-[#140E0C] text-[#B8AD9A] uppercase tracking-[0.16em] text-[10px]">
                  <th className="py-3.5 px-4 font-medium">Order Number</th>
                  <th className="py-3.5 px-4 font-medium">Date & Time</th>
                  <th className="py-3.5 px-4 font-medium">Customer / Recipient</th>
                  <th className="py-3.5 px-4 font-medium">Items</th>
                  <th className="py-3.5 px-4 font-medium text-right">Amount</th>
                  <th className="py-3.5 px-4 font-medium text-center">Fulfillment Status</th>
                  <th className="py-3.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F1C15]/60 text-[#FEF5E6]">
                {orders.map((o) => {
                  const badge = getStatusBadge(o.status);
                  const BadgeIcon = badge.icon;
                  const dateStr = o.createdAt
                    ? new Date(o.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—';
                  const timeStr = o.createdAt
                    ? new Date(o.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';

                  return (
                    <tr
                      key={o._id || o.id || o.orderNumber}
                      className="hover:bg-[#201613]/50 transition-subtle group"
                    >
                      {/* Order Number & Gateway badge */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-xs font-semibold text-[#FEF5E6]">
                          {o.orderNumber}
                        </div>
                        {o.paymentDetails?.razorpayPaymentId && (
                          <div className="text-[10px] text-[#665B54] font-mono truncate max-w-[140px]">
                            {o.paymentDetails.razorpayPaymentId}
                          </div>
                        )}
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-[#B8AD9A] whitespace-nowrap">
                        <div>{dateStr}</div>
                        <div className="text-[10px] text-[#665B54]">{timeStr}</div>
                      </td>

                      {/* Customer / Recipient */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-[#FEF5E6]">
                          {o.customerName || o.shippingAddress?.recipientName || 'Patron'}
                        </div>
                        <div className="text-[10px] text-[#B8AD9A]">
                          {o.shippingAddress?.phone || o.customerEmail || '—'}
                        </div>
                      </td>

                      {/* Items summary */}
                      <td className="py-3.5 px-4 text-[#B8AD9A]">
                        <span>
                          {o.items?.length || 0} {o.items?.length === 1 ? 'pair' : 'pairs'}
                        </span>
                        {o.items?.[0] && (
                          <span className="text-[10px] block text-[#665B54] truncate max-w-[160px]">
                            {o.items[0].productName || o.items[0].name}
                            {o.items[0].size ? ` (Size ${o.items[0].size})` : ''}
                          </span>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="py-3.5 px-4 text-right font-serif text-sm font-medium text-[#FEF5E6] whitespace-nowrap">
                        {o.totalFormatted || `₹${(o.totalPaise / 100).toLocaleString('en-IN')}`}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider border ${badge.classes}`}
                        >
                          <BadgeIcon size={11} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Action Button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectOrder(o.orderNumber || o._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] uppercase tracking-wider bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15] transition-subtle"
                        >
                          <Eye size={12} />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-[#2F1C15] flex items-center justify-between text-xs text-[#B8AD9A]">
            <p>
              Showing page <span className="text-[#FEF5E6]">{currentPage}</span> of{' '}
              <span className="text-[#FEF5E6]">{totalPages}</span> ({totalOrders} orders recorded)
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || loading}
                className="p-1.5 bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15] disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Next Page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail & Fulfillment Progression Modal */}
      {(selectedOrder || detailLoading) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[#0F0A09]/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="bg-[#181210] border border-[#2F1C15] w-full max-w-3xl my-8 p-6 sm:p-8 space-y-6 shadow-2xl animate-fade-in text-xs max-h-[90vh] overflow-y-auto">
            {detailLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-solid border-[#FEF5E6] border-r-transparent" />
                <p className="text-xs uppercase tracking-[0.2em] text-[#B8AD9A]">
                  Retrieving Order Dossier...
                </p>
              </div>
            ) : selectedOrder ? (
              <>
                {/* Modal Top Bar */}
                <div className="flex items-start justify-between pb-4 border-b border-[#2F1C15]">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-serif text-xl sm:text-2xl text-[#FEF5E6]">
                        {selectedOrder.orderNumber}
                      </h3>
                      {(() => {
                        const b = getStatusBadge(selectedOrder.status);
                        const BIcon = b.icon;
                        return (
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] uppercase tracking-wider border ${b.classes}`}
                          >
                            <BIcon size={11} />
                            <span>{b.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-[11px] text-[#B8AD9A] mt-1">
                      Placed on{' '}
                      {selectedOrder.createdAt
                        ? new Date(selectedOrder.createdAt).toLocaleString('en-IN')
                        : '—'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      setConfirmStatus(null);
                    }}
                    className="text-[#B8AD9A] hover:text-[#FEF5E6] p-1"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Cryptographic Payment Security Seal */}
                <div className="bg-[#140E0C] border border-[#2F1C15] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-medium">
                      <ShieldCheck size={16} />
                      <span className="uppercase tracking-widest text-[10px]">
                        Cryptographic Payment Verification
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-[#665B54]">
                      Tamper-Resistant Record
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] pt-1">
                    <div>
                      <span className="text-[#665B54] uppercase tracking-wider block text-[9px]">
                        Razorpay Payment ID
                      </span>
                      <span className="font-mono text-[#FEF5E6] select-all">
                        {selectedOrder.paymentDetails?.razorpayPaymentId || 'N/A (Pending)'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#665B54] uppercase tracking-wider block text-[9px]">
                        Payment Method
                      </span>
                      <span className="uppercase text-[#FEF5E6]">
                        {selectedOrder.paymentDetails?.method || 'Razorpay Gateway'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#665B54] uppercase tracking-wider block text-[9px]">
                        Paid At Timestamp
                      </span>
                      <span className="text-[#FEF5E6]">
                        {selectedOrder.paymentDetails?.paidAt
                          ? new Date(selectedOrder.paymentDetails.paidAt).toLocaleString('en-IN')
                          : 'Not settled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Customer & Shipping Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Patron Details */}
                  <div className="bg-[#140E0C] border border-[#2F1C15] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[#FEF5E6] uppercase tracking-widest text-[10px] font-medium border-b border-[#2F1C15] pb-2">
                      <CreditCard size={13} />
                      <span>Patron Profile</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <p className="font-medium text-[#FEF5E6]">
                        {selectedOrder.customer?.name ||
                          selectedOrder.shippingAddress?.recipientName ||
                          'Guest Patron'}
                      </p>
                      <p className="text-[#B8AD9A]">
                        Email: {selectedOrder.customer?.email || 'N/A'}
                      </p>
                      <p className="text-[#B8AD9A]">
                        Phone: {selectedOrder.customer?.phone || selectedOrder.shippingAddress?.phone || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-[#140E0C] border border-[#2F1C15] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[#FEF5E6] uppercase tracking-widest text-[10px] font-medium border-b border-[#2F1C15] pb-2">
                      <MapPin size={13} />
                      <span>Delivery Destination</span>
                    </div>
                    <div className="space-y-0.5 text-[11px] text-[#B8AD9A]">
                      <p className="font-medium text-[#FEF5E6]">
                        {selectedOrder.shippingAddress?.recipientName}
                      </p>
                      <p>{selectedOrder.shippingAddress?.addressLine1}</p>
                      {selectedOrder.shippingAddress?.addressLine2 && (
                        <p>{selectedOrder.shippingAddress.addressLine2}</p>
                      )}
                      <p>
                        {selectedOrder.shippingAddress?.city},{' '}
                        {selectedOrder.shippingAddress?.state} -{' '}
                        {selectedOrder.shippingAddress?.postalCode}
                      </p>
                      <p className="text-[10px] text-[#665B54]">
                        Country: {selectedOrder.shippingAddress?.country || 'India'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="bg-[#140E0C] border border-[#2F1C15] overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-[#2F1C15] text-[10px] uppercase tracking-widest text-[#B8AD9A] font-medium">
                    Commissioned Items ({selectedOrder.items?.length || 0})
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-[#2F1C15]/40 text-[#665B54] uppercase tracking-wider text-[9px]">
                        <th className="py-2 px-4">Item</th>
                        <th className="py-2 px-4">Size</th>
                        <th className="py-2 px-4 text-center">Qty</th>
                        <th className="py-2 px-4 text-right">Unit Price</th>
                        <th className="py-2 px-4 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2F1C15]/30 text-[#FEF5E6]">
                      {selectedOrder.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-4 font-medium">
                            {item.productName || item.name}
                            <span className="block text-[10px] text-[#665B54] font-mono">
                              {item.productCode || item.productId}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-[#B8AD9A] font-mono">
                            {item.size || 'Standard'}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-[#B8AD9A]">
                            ₹{((item.pricePaise || item.unitPricePaise || 0) / 100).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono text-[#FEF5E6] font-semibold">
                            ₹{((item.lineTotalPaise || 0) / 100).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Totals Summary */}
                  <div className="p-4 border-t border-[#2F1C15] flex flex-col items-end space-y-1 text-[11px]">
                    <div className="flex justify-between w-48 text-[#B8AD9A]">
                      <span>Subtotal:</span>
                      <span className="font-mono">
                        ₹{((selectedOrder.subtotalPaise || selectedOrder.totalPaise) / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex justify-between w-48 text-[#B8AD9A]">
                      <span>Shipping (Express):</span>
                      <span className="font-mono">
                        {selectedOrder.shippingPaise ? `₹${(selectedOrder.shippingPaise / 100).toLocaleString('en-IN')}` : 'Complimentary'}
                      </span>
                    </div>
                    <div className="flex justify-between w-48 text-sm font-serif font-bold text-[#FEF5E6] pt-2 border-t border-[#2F1C15]">
                      <span>Total Value:</span>
                      <span>
                        {selectedOrder.totalFormatted || `₹${(selectedOrder.totalPaise / 100).toLocaleString('en-IN')}`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Existing Order Audit Notes */}
                {selectedOrder.notes && (
                  <div className="bg-[#140E0C] border border-[#2F1C15] p-3 text-[11px] space-y-1">
                    <span className="text-[#665B54] uppercase tracking-widest text-[9px] block">
                      Fulfillment History & Notes
                    </span>
                    <pre className="font-mono text-[10px] text-[#B8AD9A] whitespace-pre-wrap leading-relaxed">
                      {selectedOrder.notes}
                    </pre>
                  </div>
                )}

                {/* Fulfillment Progression Controls */}
                <div className="bg-[#140E0C] border border-[#2F1C15] p-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#2F1C15] pb-2">
                    <h4 className="font-serif text-sm text-[#FEF5E6]">
                      Fulfillment Progression Controls
                    </h4>
                    <span className="text-[10px] text-[#665B54]">
                      Current Stage: <span className="uppercase text-[#FEF5E6] font-mono">{selectedOrder.status}</span>
                    </span>
                  </div>

                  {confirmStatus ? (
                    /* Confirmation Dialog for Selected Transition */
                    <div className="bg-[#181210] border border-amber-800/80 p-4 space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-amber-300 font-medium">
                        <AlertTriangle size={15} />
                        <span>Confirm Transition to "{confirmStatus.toUpperCase()}"</span>
                      </div>
                      <p className="text-[11px] text-[#B8AD9A]">
                        Are you sure you want to update order{' '}
                        <strong className="text-[#FEF5E6]">{selectedOrder.orderNumber}</strong> from{' '}
                        <strong className="text-[#FEF5E6]">{selectedOrder.status}</strong> to{' '}
                        <strong className="text-[#FEF5E6]">{confirmStatus}</strong>?
                      </p>

                      <div className="space-y-1">
                        <label className="uppercase tracking-widest text-[9px] text-[#B8AD9A] block">
                          Optional Fulfillment Note / Tracking Identifier
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Dispatched via BlueDart AWB 948192841"
                          value={fulfillmentNote}
                          onChange={(e) => setFulfillmentNote(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0F0A09] border border-[#2F1C15] text-[#FEF5E6] focus:outline-none focus:border-[#FEF5E6]/40 text-xs font-mono"
                        />
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setConfirmStatus(null)}
                          className="px-4 py-2 text-xs uppercase tracking-wider bg-[#241B18] border border-[#2F1C15] text-[#B8AD9A] hover:text-[#FEF5E6]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmTransition}
                          disabled={transitioning}
                          className="px-5 py-2 text-xs uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] font-semibold hover:bg-white transition-subtle disabled:opacity-50"
                        >
                          {transitioning ? 'Executing Update...' : `Confirm ${confirmStatus}`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Progression Action Buttons */
                    <div className="space-y-3">
                      {getAllowedTransitions(selectedOrder).length > 0 ? (
                        <div className="flex flex-wrap items-center gap-3">
                          {getAllowedTransitions(selectedOrder).map((trans) => (
                            <button
                              key={trans.status}
                              type="button"
                              onClick={() => setConfirmStatus(trans.status)}
                              className={`px-4 py-2 text-xs uppercase tracking-wider border font-medium transition-subtle ${trans.style}`}
                            >
                              {trans.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#665B54]">
                          {selectedOrder.status === 'delivered'
                            ? 'Order has been delivered and fulfilled. No further state transitions allowed.'
                            : selectedOrder.status === 'cancelled'
                            ? 'Order is cancelled. No further state transitions allowed.'
                            : 'No valid manual transitions available for this status.'}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      setConfirmStatus(null);
                    }}
                    className="px-6 py-2 text-xs uppercase tracking-widest bg-[#241B18] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#2F1C15]"
                  >
                    Close Dossier
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOrders;