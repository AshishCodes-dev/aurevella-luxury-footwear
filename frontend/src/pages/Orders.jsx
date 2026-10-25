import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  ArrowLeft,
  Calendar,
  MapPin,
  CreditCard,
  CheckCircle,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext.jsx';
import { fetchUserOrders, createPaymentOrder, verifyPayment } from '../utils/api.js';
import useDocumentTitle from '../utils/useDocumentTitle.js';

// Dynamic script loader for Razorpay
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const Orders = () => {
  useDocumentTitle('Your Commissions & Orders — AUREVELLA');
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [payingOrderId, setPayingOrderId] = useState(null);
  const [paymentSuccessOrder, setPaymentSuccessOrder] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserOrders({ page: 1, limit: 20 });
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to retrieve order history:', err);
      setError(err.message || 'Unable to retrieve your order history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  // Handle paying for an existing order in 'pending_payment' status
  const handlePayOrder = async (order) => {
    setPayingOrderId(order.id);
    setError(null);

    try {
      const paymentResponse = await createPaymentOrder(order.id);
      const keyId = paymentResponse.keyId;
      const razorpayOrderId = paymentResponse.razorpayOrderId || paymentResponse.order?.id;
      const amount = paymentResponse.amountPaise || paymentResponse.order?.amount || order.totalPaise;
      const currency = paymentResponse.currency || paymentResponse.order?.currency || 'INR';

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load.');
      }

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'AUREVELLA',
        description: `Order ${order.orderNumber}`,
        image: '/brand/aurevella-icon-512.png',
        order_id: razorpayOrderId,
        prefill: {
          name: order.shippingAddress?.recipientName || user?.name || '',
          email: user?.email || '',
          contact: order.shippingAddress?.phone || user?.phone || '',
        },
        theme: { color: '#0F0A09' },
        modal: {
          ondismiss: () => {
            setPayingOrderId(null);
          },
        },
        handler: async (paymentResult) => {
          try {
            const verifyResponse = await verifyPayment({
              orderId: order.id,
              razorpayOrderId: paymentResult.razorpay_order_id,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpaySignature: paymentResult.razorpay_signature,
            });

            if (verifyResponse.status === 'success') {
              setPaymentSuccessOrder(order.orderNumber);
              await loadOrders(); // Refresh status to 'paid'
            }
          } catch (verifyErr) {
            setError(verifyErr.message || 'Payment verification failed.');
          } finally {
            setPayingOrderId(null);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err.message || 'Failed to initiate payment gateway.');
      setPayingOrderId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider bg-emerald-950/70 text-emerald-400 px-2.5 py-1 border border-emerald-800 font-medium">
            <CheckCircle size={12} /> Paid & Confirmed
          </span>
        );
      case 'pending_payment':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider bg-amber-950/70 text-amber-400 px-2.5 py-1 border border-amber-800 font-medium">
            <Clock size={12} /> Pending Payment
          </span>
        );
      case 'payment_reconciliation_needed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider bg-purple-950/70 text-purple-300 px-2.5 py-1 border border-purple-800 font-medium">
            <AlertTriangle size={12} /> Reconciliation Needed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider bg-[#221A18] text-[#B8AD9A] px-2.5 py-1 border border-[#2F1C15] font-medium">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="text-[11px] uppercase tracking-wider text-[#B8AD9A] px-2.5 py-1 bg-[#181210] border border-[#2F1C15]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-fade-in">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/account"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
        >
          <ArrowLeft size={14} /> Back to Account
        </Link>
      </div>

      {/* Header */}
      <div className="border-b border-[#2F1C15] pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] block mb-2 font-medium">
            Atelier Order Register
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] tracking-wide">
            Your Orders & Commissions
          </h1>
        </div>
        <span className="text-xs uppercase tracking-widest text-[#B8AD9A] bg-[#181210] border border-[#2F1C15] px-3 py-1 self-start sm:self-auto">
          {orders.length} {orders.length === 1 ? 'Commission' : 'Commissions'}
        </span>
      </div>

      {/* Notifications */}
      {paymentSuccessOrder && (
        <div className="mb-6 p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <CheckCircle size={18} className="text-emerald-400 shrink-0" />
          <span>Payment verified successfully for Order <strong>{paymentSuccessOrder}</strong>.</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-950/40 border border-red-800 text-red-200 text-xs sm:text-sm flex items-center gap-3 animate-fade-in">
          <AlertTriangle size={18} className="text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-[#181210] border border-[#2F1C15] p-12 text-center text-xs text-[#B8AD9A]">
          Retrieving your bespoke order history...
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-[#181210] border border-[#2F1C15] p-12 sm:p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center mx-auto text-[#B8AD9A]">
            <Package size={28} />
          </div>
          <h2 className="font-serif text-2xl text-[#FEF5E6]">No Commissions Found</h2>
          <p className="text-xs sm:text-sm text-[#B8AD9A] max-w-md mx-auto">
            You have not placed any orders yet. Discover our signature interchangeable heels and launch catalogue.
          </p>
          <div className="pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center justify-center min-h-[46px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
            >
              Explore Catalogue
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-[#181210] border border-[#2F1C15] overflow-hidden shadow-sm hover:border-[#4A2C26] transition-subtle"
            >
              {/* Order Card Header */}
              <div className="p-5 sm:p-6 bg-[#140E0D] border-b border-[#2F1C15] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8AD9A] block mb-0.5">
                      Order Reference
                    </span>
                    <strong className="font-mono text-[#FEF5E6] text-sm">
                      {order.orderNumber}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8AD9A] block mb-0.5">
                      Date Commissioned
                    </span>
                    <span className="text-[#FEF5E6]">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8AD9A] block mb-0.5">
                      Payable Total
                    </span>
                    <strong className="font-serif text-[#FEF5E6] text-base">
                      {order.totalText}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}

                  {order.status === 'pending_payment' && (
                    <button
                      type="button"
                      onClick={() => handlePayOrder(order)}
                      disabled={payingOrderId === order.id}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-4 text-xs uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle disabled:opacity-50"
                    >
                      {payingOrderId === order.id ? (
                        <span>Opening...</span>
                      ) : (
                        <>
                          <CreditCard size={13} />
                          <span>Complete Payment</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Items in Order */}
              <div className="p-5 sm:p-6 space-y-4">
                <ul className="divide-y divide-[#2F1C15]/60">
                  {order.items?.map((item, idx) => (
                    <li key={idx} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0 text-xs">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.image}
                          alt={item.name}
                          width="48"
                          height="48"
                          className="w-12 h-12 object-cover aspect-square border border-[#2F1C15] bg-[#0F0A09] shrink-0"
                        />
                        <div>
                          <h4 className="font-serif text-sm text-[#FEF5E6]">{item.name}</h4>
                          <p className="text-[11px] text-[#B8AD9A]">
                            Qty: {item.quantity} × {item.priceText}
                          </p>
                        </div>
                      </div>
                      <span className="font-medium text-[#FEF5E6]">{item.lineTotalText}</span>
                    </li>
                  ))}
                </ul>

                {/* Delivery Snapshot Footer */}
                {order.shippingAddress && (
                  <div className="pt-3 border-t border-[#2F1C15]/80 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-[#B8AD9A] gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-[#FEF5E6]" />
                      <span>
                        Delivering to: <strong className="text-[#FEF5E6]">{order.shippingAddress.recipientName}</strong>, {order.shippingAddress.city} ({order.shippingAddress.postalCode})
                      </span>
                    </div>
                    {order.paymentDetails?.razorpayPaymentId && (
                      <span className="font-mono text-[10px] text-[#B8AD9A]/80">
                        Payment Ref: {order.paymentDetails.razorpayPaymentId}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
