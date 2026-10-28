import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShoppingBag,
  MapPin,
  CreditCard,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Plus,
  ShieldCheck,
  Truck,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';

import { useBag } from '../context/BagContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import {
  fetchUserAddresses,
  createUserAddress,
  fetchOrderQuote,
  createOrder,
  createPaymentOrder,
  verifyPayment,
  ApiError,
} from '../utils/api.js';
import useDocumentTitle from '../utils/useDocumentTitle.js';

// New Address validation schema matching backend Address model rules
const newAddressSchema = z.object({
  recipientName: z
    .string()
    .trim()
    .min(2, 'Recipient name must be at least 2 characters')
    .max(100, 'Recipient name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+ -]{10,15}$/, 'Please enter a valid 10-15 digit delivery contact number'),
  addressLine1: z
    .string()
    .trim()
    .min(5, 'Street address must be at least 5 characters')
    .max(200, 'Address line 1 cannot exceed 200 characters'),
  addressLine2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z
    .string()
    .trim()
    .min(2, 'City is required')
    .max(100),
  state: z
    .string()
    .trim()
    .min(2, 'State is required')
    .max(100),
  postalCode: z
    .string()
    .trim()
    .regex(/^[1-9][0-9]{5}$/, 'Please enter a valid 6-digit Indian PIN code (e.g. 400001)'),
  country: z.string().default('India'),
  isDefault: z.boolean().default(false),
});

// Helper to dynamically load Razorpay checkout script safely
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
    script.onerror = () => {
      console.error('Failed to load Razorpay checkout SDK script');
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const Checkout = () => {
  useDocumentTitle('Bespoke Checkout — AUREVELLA');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { items: bagItems, rawItems, totalCount, clearBag } = useBag();

  // State management
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');

  // Authoritative server-side quote state
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Submission & payment lifecycle state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null); // Local Order document
  const [paymentStatus, setPaymentStatus] = useState('idle'); // idle | modal_open | verifying | success | cancelled | failed | reconciliation
  const [paymentDetails, setPaymentDetails] = useState(null);

  // Idempotency key generated once per unique cart & address combination
  const generateIdempotencyKey = () =>
    `aur_idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const idempotencyKeyRef = useRef(generateIdempotencyKey());

  // Fingerprint representing current cart items, quantities, and selected delivery address
  const cartFingerprint = useMemo(() => {
    const itemsSig = (rawItems || [])
      .map((i) => `${i.id}:${i.size || 'default'}:${i.quantity}`)
      .sort()
      .join('|');
    return `${itemsSig}#${selectedAddressId || 'none'}`;
  }, [rawItems, selectedAddressId]);

  // Detect if any footwear items in the bag lack a selected size
  const hasUnsizedCartItems = useMemo(() => {
    return (rawItems || []).some(
      (item) => !item.size || typeof item.size !== 'string' || item.size.trim().length === 0
    );
  }, [rawItems]);

  const lastFingerprintRef = useRef(cartFingerprint);

  // Invalidate idempotency key and clear stale active order when cart or address changes
  useEffect(() => {
    if (lastFingerprintRef.current !== cartFingerprint) {
      lastFingerprintRef.current = cartFingerprint;
      idempotencyKeyRef.current = generateIdempotencyKey();
      setActiveOrder(null);
      setCheckoutError(null);
      setPaymentStatus('idle');
    }
  }, [cartFingerprint]);

  // React Hook Form for New Address
  const {
    register,
    handleSubmit,
    reset: resetAddressForm,
    formState: { errors: addressErrors, isSubmitting: isSavingAddress },
  } = useForm({
    resolver: zodResolver(newAddressSchema),
    defaultValues: {
      recipientName: user?.name || '',
      phone: user?.phone || '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      isDefault: false,
    },
  });

  // 1. Fetch user addresses once authenticated
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const loadAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const data = await fetchUserAddresses();
        if (isMounted) {
          const fetchedAddresses = data.addresses || [];
          setAddresses(fetchedAddresses);
          if (fetchedAddresses.length > 0) {
            // Select default address or first address
            const defaultAddr = fetchedAddresses.find((a) => a.isDefault) || fetchedAddresses[0];
            setSelectedAddressId(defaultAddr.id || defaultAddr._id);
          } else {
            setShowNewAddressForm(true);
          }
        }
      } catch (err) {
        console.error('Failed to load delivery addresses:', err);
      } finally {
        if (isMounted) setLoadingAddresses(false);
      }
    };

    loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // 2. Fetch authoritative server quote whenever rawItems or selectedAddressId changes
  useEffect(() => {
    if (!user || rawItems.length === 0) return;

    let isMounted = true;
    const fetchQuote = async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const data = await fetchOrderQuote({
          items: rawItems,
          addressId: selectedAddressId,
        });
        if (isMounted) {
          setQuote(data.quote);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Server quote calculation error:', err);
          setQuoteError(err.message || 'Unable to calculate verified order pricing.');
          setQuote(null);
        }
      } finally {
        if (isMounted) setQuoteLoading(false);
      }
    };

    fetchQuote();

    return () => {
      isMounted = false;
    };
  }, [user, rawItems, selectedAddressId]);

  // Handle saving new shipping address
  const handleSaveAddress = async (data) => {
    setCheckoutError(null);
    try {
      const response = await createUserAddress(data);
      const newAddr = response.address;
      const newAddrId = newAddr.id || newAddr._id;

      setAddresses((prev) => [newAddr, ...prev]);
      setSelectedAddressId(newAddrId);
      setShowNewAddressForm(false);
      resetAddressForm();
    } catch (err) {
      console.error('Failed to save shipping address:', err);
      setCheckoutError(err.message || 'Could not save shipping address. Please verify required fields.');
    }
  };

  // 3. Handle Order Creation & Razorpay Test Payment Flow
  const handlePlaceOrderAndPay = async () => {
    if (!selectedAddressId) {
      setCheckoutError('Please select or provide a valid shipping address to proceed.');
      return;
    }
    if (rawItems.length === 0) {
      setCheckoutError('Your shopping bag is empty.');
      return;
    }
    if (hasUnsizedCartItems) {
      setCheckoutError(
        'One or more footwear models in your shopping bag do not have a size selected. Please return to your bag to select your shoe size before commissioning your order.'
      );
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setCheckoutError(null);
    setIsSubmitting(true);

    try {
      // Step A: Create order through backend API (verifies prices, stock & address ownership)
      const orderPayload = {
        items: rawItems,
        addressId: selectedAddressId,
        notes: orderNotes.trim(),
        idempotencyKey: idempotencyKeyRef.current,
      };

      const orderResponse = await createOrder(orderPayload);
      const createdOrder = orderResponse.order;
      setActiveOrder(createdOrder);

      // Step B: Initiate Razorpay Test Mode order on backend
      const paymentResponse = await createPaymentOrder(createdOrder.id);
      const keyId = paymentResponse.keyId;
      const razorpayOrderId = paymentResponse.razorpayOrderId || paymentResponse.order?.id;
      const amount = paymentResponse.amountPaise || paymentResponse.order?.amount || createdOrder.totalPaise;
      const currency = paymentResponse.currency || paymentResponse.order?.currency || 'INR';

      // Step C: Load Razorpay script
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay payment gateway failed to load. Please check your network connection.');
      }

      setPaymentStatus('modal_open');

      // Selected address snapshot for prefill
      const selectedAddr = addresses.find((a) => (a.id || a._id) === selectedAddressId);
      const brandLogoUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/brand/aurevella-icon-512.png`
          : '/brand/aurevella-icon-512.png';

      // Step D: Open Razorpay checkout modal
      const options = {
        key: keyId,
        amount, // Server-provided integer paise
        currency,
        name: 'AUREVELLA',
        description: `Order ${createdOrder.orderNumber} — Bespoke Footwear`,
        image: brandLogoUrl,
        order_id: razorpayOrderId,
        prefill: {
          name: selectedAddr?.recipientName || user?.name || '',
          email: user?.email || '',
          contact: selectedAddr?.phone || user?.phone || '',
        },
        theme: {
          color: '#0F0A09',
        },
        modal: {
          ondismiss: () => {
            console.log('Razorpay modal closed by client');
            setPaymentStatus('cancelled');
            setIsSubmitting(false);
          },
        },
        handler: async (paymentResult) => {
          setPaymentStatus('verifying');
          try {
            // Step E: Server-side cryptographic HMAC signature verification & atomic stock decrement
            const verifyResponse = await verifyPayment({
              orderId: createdOrder.id,
              razorpayOrderId: paymentResult.razorpay_order_id,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpaySignature: paymentResult.razorpay_signature,
            });

            if (verifyResponse.status === 'success') {
              setPaymentStatus('success');
              setPaymentDetails({
                paymentId: paymentResult.razorpay_payment_id,
                orderNumber: createdOrder.orderNumber,
                totalText: quote?.totalText || createdOrder.totalText,
              });
              // Clear shopping bag only after verified server payment
              clearBag();
            } else {
              setPaymentStatus('failed');
              setCheckoutError(verifyResponse.message || 'Payment verification could not be confirmed.');
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            if (verifyErr.data?.code === 'PAYMENT_RECONCILIATION_NEEDED') {
              setPaymentStatus('reconciliation');
              setCheckoutError(verifyErr.message || 'Payment received but requires atelier reconciliation.');
            } else if (verifyErr.data?.code === 'PAYMENT_NOT_CAPTURED') {
              setPaymentStatus('failed');
              setCheckoutError(verifyErr.message || 'Payment authorized but awaiting gateway capture. Please wait a moment.');
            } else if (verifyErr.data?.code === 'GATEWAY_VERIFICATION_UNAVAILABLE') {
              setPaymentStatus('failed');
              setCheckoutError(verifyErr.message || 'Gateway verification temporarily unavailable. Your order will be confirmed once capture is verified.');
            } else {
              setPaymentStatus('failed');
              setCheckoutError(verifyErr.message || 'Payment verification failed.');
            }
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', (failResp) => {
        console.error('Razorpay payment failed:', failResp.error);
        setPaymentStatus('failed');
        setCheckoutError(failResp.error?.description || 'Payment was declined by issuing bank.');
        setIsSubmitting(false);
      });

      rzpInstance.open();
    } catch (err) {
      console.error('Checkout error:', err);
      if (err.data?.code === 'IDEMPOTENCY_CONFLICT') {
        idempotencyKeyRef.current = generateIdempotencyKey();
        setActiveOrder(null);
      }
      setPaymentStatus('failed');
      setCheckoutError(err.message || 'An error occurred while creating your order.');
      setIsSubmitting(false);
    }
  };

  // Re-attempt payment on existing created order
  const handleRetryPayment = async () => {
    if (!activeOrder) return;
    setIsSubmitting(true);
    setCheckoutError(null);

    try {
      const paymentResponse = await createPaymentOrder(activeOrder.id);
      const keyId = paymentResponse.keyId;
      const razorpayOrderId = paymentResponse.razorpayOrderId || paymentResponse.order?.id;
      const amount = paymentResponse.amountPaise || paymentResponse.order?.amount || activeOrder.totalPaise;
      const currency = paymentResponse.currency || paymentResponse.order?.currency || 'INR';

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded || !window.Razorpay) {
        throw new Error('Razorpay checkout failed to load.');
      }

      setPaymentStatus('modal_open');

      const brandLogoUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/brand/aurevella-icon-512.png`
          : '/brand/aurevella-icon-512.png';

      const options = {
        key: keyId,
        amount,
        currency,
        name: 'AUREVELLA',
        description: `Order ${activeOrder.orderNumber}`,
        image: brandLogoUrl,
        order_id: razorpayOrderId,
        prefill: {
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#0F0A09' },
        modal: {
          ondismiss: () => {
            setPaymentStatus('cancelled');
            setIsSubmitting(false);
          },
        },
        handler: async (paymentResult) => {
          setPaymentStatus('verifying');
          try {
            const verifyResponse = await verifyPayment({
              orderId: activeOrder.id,
              razorpayOrderId: paymentResult.razorpay_order_id,
              razorpayPaymentId: paymentResult.razorpay_payment_id,
              razorpaySignature: paymentResult.razorpay_signature,
            });

            if (verifyResponse.status === 'success') {
              setPaymentStatus('success');
              setPaymentDetails({
                paymentId: paymentResult.razorpay_payment_id,
                orderNumber: activeOrder.orderNumber,
                totalText: quote?.totalText || activeOrder.totalText,
              });
              clearBag();
            }
          } catch (verifyErr) {
            console.error('Payment retry verification error:', verifyErr);
            if (verifyErr.data?.code === 'PAYMENT_RECONCILIATION_NEEDED') {
              setPaymentStatus('reconciliation');
              setCheckoutError(verifyErr.message || 'Payment received but requires atelier reconciliation.');
            } else if (verifyErr.data?.code === 'PAYMENT_NOT_CAPTURED') {
              setPaymentStatus('failed');
              setCheckoutError(verifyErr.message || 'Payment authorized but awaiting gateway capture. Please wait a moment.');
            } else if (verifyErr.data?.code === 'GATEWAY_VERIFICATION_UNAVAILABLE') {
              setPaymentStatus('failed');
              setCheckoutError(verifyErr.message || 'Gateway verification temporarily unavailable. Your order will be confirmed once capture is verified.');
            } else {
              setPaymentStatus('failed');
              setCheckoutError(verifyErr.message || 'Payment verification failed.');
            }
          } finally {
            setIsSubmitting(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setCheckoutError(err.message || 'Could not re-initiate payment gateway.');
      setIsSubmitting(false);
    }
  };

  // ----------------------------------------------------
  // View 1: Verified Payment Success State
  // ----------------------------------------------------
  if (paymentStatus === 'success' && paymentDetails) {
    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-fade-in">
        <div className="bg-[#181210] border border-[#2F1C15] p-8 sm:p-14 text-center shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-600/50 flex items-center justify-center mx-auto text-emerald-400">
            <CheckCircle size={32} />
          </div>

          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] block font-medium">
            Atelier Order Confirmed
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] tracking-wide">
            Thank You for Your Order
          </h1>

          <p className="text-xs sm:text-sm text-[#B8AD9A] max-w-lg mx-auto leading-relaxed">
            Your payment has been securely verified. Our master artisans have received your commission and will begin bespoke preparation.
          </p>

          {/* Order Details Card */}
          <div className="bg-[#0F0A09] border border-[#2F1C15] p-6 text-left max-w-md mx-auto space-y-3 text-xs">
            <div className="flex justify-between py-1 border-b border-[#2F1C15]/80">
              <span className="text-[#B8AD9A]">Order Number:</span>
              <span className="font-mono text-[#FEF5E6] font-semibold">{paymentDetails.orderNumber}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2F1C15]/80">
              <span className="text-[#B8AD9A]">Payment Transaction ID:</span>
              <span className="font-mono text-[#B8AD9A]">{paymentDetails.paymentId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#2F1C15]/80">
              <span className="text-[#B8AD9A]">Total Amount Paid:</span>
              <span className="font-serif text-base text-[#FEF5E6] font-normal">{paymentDetails.totalText}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-[#B8AD9A]">Delivery Status:</span>
              <span className="text-emerald-400 font-medium">Preparing for Dispatch</span>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/orders"
              className="w-full sm:w-auto min-h-[46px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle flex items-center justify-center"
            >
              View Order History
            </Link>
            <Link
              to="/shop"
              className="w-full sm:w-auto min-h-[46px] px-8 text-xs uppercase tracking-[0.2em] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#221A18] transition-subtle flex items-center justify-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // View 2: Unauthenticated Customer State
  // ----------------------------------------------------
  if (!authLoading && !user) {
    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-fade-in">
        <div className="bg-[#181210] border border-[#2F1C15] p-8 sm:p-14 text-center shadow-xl space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center mx-auto text-[#B8AD9A]">
            <ShieldCheck size={28} />
          </div>

          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] block font-medium">
            Atelier Authentication Required
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] tracking-wide">
            Sign In to Complete Checkout
          </h1>

          <p className="text-xs sm:text-sm text-[#B8AD9A] max-w-md mx-auto leading-relaxed">
            To ensure secure order snapshotting, verified customer isolation, and address protection, please sign in to your Aurevella account. Your bag has been saved.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-sm mx-auto">
            <Link
              to="/login?redirect=/checkout"
              className="w-full min-h-[48px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle flex items-center justify-center shadow-md"
            >
              Sign In to Account
            </Link>
            <Link
              to="/signup?redirect=/checkout"
              className="w-full min-h-[48px] px-8 text-xs uppercase tracking-[0.2em] border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#221A18] transition-subtle flex items-center justify-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // View 3: Empty Bag State
  // ----------------------------------------------------
  if (bagItems.length === 0 && paymentStatus !== 'success') {
    return (
      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-fade-in text-center">
        <div className="bg-[#181210] border border-[#2F1C15] p-10 sm:p-16 space-y-6">
          <div className="w-16 h-16 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center mx-auto text-[#B8AD9A]">
            <ShoppingBag size={28} />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl text-[#FEF5E6]">
            Your Bag is Empty
          </h2>
          <p className="text-xs sm:text-sm text-[#B8AD9A] max-w-md mx-auto">
            Please select at least one footwear model from our handcrafted catalogue before proceeding to checkout.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center min-h-[48px] px-8 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
          >
            Explore Catalogue
          </Link>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // Main Checkout Flow
  // ----------------------------------------------------
  return (
    <div className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 animate-fade-in">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          to="/bag"
          className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
        >
          <ArrowLeft size={14} /> Back to Bag
        </Link>
      </div>

      {/* Title */}
      <div className="border-b border-[#2F1C15] pb-6 mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] block mb-2 font-medium">
            Atelier Order Verification
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#FEF5E6] tracking-wide">
            Secure Checkout
          </h1>
        </div>
        <div className="text-xs text-[#B8AD9A] flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span>Signed in as <strong className="text-[#FEF5E6] font-medium">{user?.email}</strong></span>
        </div>
      </div>

      {/* Global Alerts / Status Notices */}
      {checkoutError && (
        <div className="mb-8 p-4 bg-red-950/40 border border-red-800 text-red-200 text-xs sm:text-sm flex items-start gap-3 animate-fade-in" role="alert">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-400" />
          <div className="flex-1 leading-relaxed">
            <strong className="block mb-0.5 text-red-300 font-medium">Checkout Advisory:</strong>
            <p>{checkoutError}</p>
            {hasUnsizedCartItems && (
              <div className="mt-2.5">
                <Link
                  to="/bag"
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#FEF5E6] hover:text-white underline font-medium transition-subtle"
                >
                  Return to Shopping Bag to Select Size &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {quoteError && (
        <div className="mb-8 p-4 bg-amber-950/40 border border-amber-800 text-amber-200 text-xs sm:text-sm flex items-start gap-3 animate-fade-in" role="alert">
          <AlertCircle size={18} className="shrink-0 mt-0.5 text-amber-400" />
          <div className="flex-1 leading-relaxed">
            <strong className="block mb-0.5 text-amber-300 font-medium">
              {quoteError.toLowerCase().includes('auth') || quoteError.toLowerCase().includes('sign in')
                ? 'Authentication Required:'
                : 'Pricing & Availability Advisory:'}
            </strong>
            <p>{quoteError}</p>
            {(quoteError.toLowerCase().includes('auth') || quoteError.toLowerCase().includes('sign in')) && (
              <div className="mt-2.5">
                <Link
                  to="/login?redirect=/checkout"
                  className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#FEF5E6] hover:text-white underline font-medium transition-subtle"
                >
                  Sign In to Continue Checkout &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {paymentStatus === 'cancelled' && activeOrder && (
        <div className="mb-8 p-4 bg-[#181210] border border-amber-800/80 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <RotateCcw size={18} className="shrink-0 mt-0.5 text-amber-400" />
            <div>
              <p className="font-medium text-[#FEF5E6]">Payment Window Closed</p>
              <p className="text-[11px] text-[#B8AD9A]">
                Order <strong className="text-[#FEF5E6]">{activeOrder.orderNumber}</strong> was saved in Pending Payment status. You may re-open the payment gateway at any time.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetryPayment}
            disabled={isSubmitting}
            className="shrink-0 min-h-[38px] px-5 text-[11px] uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
          >
            {isSubmitting ? 'Opening...' : 'Retry Payment'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Shipping Address Selection & Order Details (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-8">
          {/* Section 1: Delivery Address Selection */}
          <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#2F1C15] pb-4">
              <div className="flex items-center gap-2.5">
                <MapPin size={18} className="text-[#FEF5E6]" />
                <h2 className="font-serif text-xl text-[#FEF5E6] tracking-wide">
                  1. Shipping Address
                </h2>
              </div>
              {!showNewAddressForm && (
                <button
                  type="button"
                  onClick={() => setShowNewAddressForm(true)}
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.15em] text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
                >
                  <Plus size={14} /> Add Address
                </button>
              )}
            </div>

            {loadingAddresses ? (
              <div className="py-8 text-center text-xs text-[#B8AD9A]">
                Retrieving your registered delivery addresses...
              </div>
            ) : showNewAddressForm ? (
              /* Inline New Address Form */
              <form onSubmit={handleSubmit(handleSaveAddress)} className="space-y-4 pt-2" noValidate>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                      Recipient Full Name *
                    </label>
                    <input
                      type="text"
                      {...register('recipientName')}
                      placeholder="e.g. Ananya Sharma"
                      className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                    />
                    {addressErrors.recipientName && (
                      <p className="mt-1 text-[11px] text-red-400">{addressErrors.recipientName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                      Delivery Phone Number *
                    </label>
                    <input
                      type="tel"
                      {...register('phone')}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                    />
                    {addressErrors.phone && (
                      <p className="mt-1 text-[11px] text-red-400">{addressErrors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                    Address Line 1 (House/Flat, Building, Street) *
                  </label>
                  <input
                    type="text"
                    {...register('addressLine1')}
                    placeholder="e.g. Flat 402, Signature Towers, MG Road"
                    className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                  />
                  {addressErrors.addressLine1 && (
                    <p className="mt-1 text-[11px] text-red-400">{addressErrors.addressLine1.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                    Address Line 2 (Landmark, Area - Optional)
                  </label>
                  <input
                    type="text"
                    {...register('addressLine2')}
                    placeholder="e.g. Near Royal Palms Atelier"
                    className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                      City *
                    </label>
                    <input
                      type="text"
                      {...register('city')}
                      placeholder="e.g. Mumbai"
                      className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                    />
                    {addressErrors.city && (
                      <p className="mt-1 text-[11px] text-red-400">{addressErrors.city.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                      State *
                    </label>
                    <input
                      type="text"
                      {...register('state')}
                      placeholder="e.g. Maharashtra"
                      className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                    />
                    {addressErrors.state && (
                      <p className="mt-1 text-[11px] text-red-400">{addressErrors.state.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#B8AD9A] mb-1.5 font-medium">
                      PIN Code (6 Digits) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      {...register('postalCode')}
                      placeholder="400001"
                      className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                    />
                    {addressErrors.postalCode && (
                      <p className="mt-1 text-[11px] text-red-400">{addressErrors.postalCode.message}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isDefault"
                    {...register('isDefault')}
                    className="accent-[#FEF5E6] w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor="isDefault" className="text-xs text-[#B8AD9A] select-none cursor-pointer">
                    Set as my primary delivery address
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="min-h-[42px] px-6 text-xs uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle"
                  >
                    {isSavingAddress ? 'Saving Address...' : 'Save & Deliver Here'}
                  </button>
                  {addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowNewAddressForm(false)}
                      className="min-h-[42px] px-4 text-xs text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Existing Addresses Radio Cards */
              <div className="space-y-3">
                {addresses.map((addr) => {
                  const addrId = addr.id || addr._id;
                  const isSelected = selectedAddressId === addrId;
                  return (
                    <div
                      key={addrId}
                      onClick={() => setSelectedAddressId(addrId)}
                      className={`p-4 border transition-subtle cursor-pointer flex items-start gap-3 ${
                        isSelected
                          ? 'bg-[#1D1412] border-[#FEF5E6] shadow-sm'
                          : 'bg-[#0F0A09] border-[#2F1C15] hover:border-[#4A2C26]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="delivery_address"
                        checked={isSelected}
                        onChange={() => setSelectedAddressId(addrId)}
                        className="mt-1 accent-[#FEF5E6] cursor-pointer"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[#FEF5E6] text-sm">
                            {addr.recipientName}
                          </span>
                          {addr.isDefault && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-[#181210] border border-[#2F1C15] text-[#B8AD9A]">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[#B8AD9A] leading-relaxed">
                          {addr.addressLine1}
                          {addr.addressLine2 ? `, ${addr.addressLine2}` : ''}
                        </p>
                        <p className="text-[#B8AD9A]">
                          {addr.city}, {addr.state} — <strong className="text-[#FEF5E6] font-mono">{addr.postalCode}</strong>
                        </p>
                        <p className="text-[#B8AD9A]/80 mt-1">Contact: {addr.phone}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 2: Items Review */}
          <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between border-b border-[#2F1C15] pb-4">
              <h2 className="font-serif text-xl text-[#FEF5E6] tracking-wide">
                2. Review Commissioned Footwear ({totalCount})
              </h2>
              <Link to="/bag" className="text-[11px] uppercase tracking-widest text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle">
                Modify Bag
              </Link>
            </div>

            <ul className="divide-y divide-[#2F1C15]/70">
              {bagItems.map((item) => (
                <li key={item.lineKey || `${item.id}_${item.size || 'default'}`} className="py-4 flex items-center justify-between gap-4 first:pt-2 last:pb-0">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      width="56"
                      height="56"
                      className="w-14 h-14 object-cover aspect-square border border-[#2F1C15] bg-[#0F0A09] shrink-0"
                    />
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-[#B8AD9A] block">
                        {item.category}
                      </span>
                      <h4 className="font-serif text-sm sm:text-base text-[#FEF5E6]">
                        {item.name}
                      </h4>
                      <p className="text-xs text-[#B8AD9A] flex items-center gap-2 mt-0.5">
                        <span>Qty: {item.quantity} × {item.priceText}</span>
                        {item.size ? (
                          <span className="px-1.5 py-0.2 text-[10px] uppercase tracking-wider text-[#FEF5E6] bg-[#0F0A09] border border-[#2F1C15]">
                            Size: {item.size}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[10px] uppercase tracking-wider text-amber-300 bg-amber-950/40 border border-amber-900/60 font-medium">
                            Size not selected
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs sm:text-sm font-medium text-[#FEF5E6]">
                      {item.lineTotalText}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {hasUnsizedCartItems && (
              <div className="p-3 bg-amber-950/30 border border-amber-900/60 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 animate-fade-in">
                <span>One or more footwear models in your selection require a shoe size.</span>
                <Link
                  to="/bag"
                  className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-[#FEF5E6] hover:text-white underline font-medium shrink-0"
                >
                  Select Size in Bag &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Section 3: Bespoke Delivery Instructions */}
          <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-3">
            <h2 className="font-serif text-xl text-[#FEF5E6] tracking-wide">
              3. Atelier Notes & Delivery Instructions (Optional)
            </h2>
            <p className="text-xs text-[#B8AD9A]">
              Include bespoke fitting notes, gift enclosure cards, or special dispatch instructions.
            </p>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="e.g. Please leave package with building concierge; request discrete luxury box packaging."
              className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] p-3 text-xs text-[#FEF5E6] outline-none transition-subtle resize-none"
            />
            <div className="text-right text-[10px] text-[#B8AD9A]/60">
              {500 - orderNotes.length} characters remaining
            </div>
          </div>
        </div>

        {/* Right Column: Verified Order Summary & Payment Gateway CTA (4 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-6 sticky top-28">
            <h2 className="text-xs uppercase tracking-[0.25em] text-[#FEF5E6] font-semibold border-b border-[#2F1C15] pb-4">
              Verified Order Summary
            </h2>

            {/* Price Calculations */}
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between text-[#B8AD9A]">
                <span>Items Subtotal:</span>
                <span className="text-[#FEF5E6] font-medium">
                  {quoteLoading ? 'Calculating...' : quote ? quote.subtotalText : '—'}
                </span>
              </div>

              <div className="flex justify-between text-[#B8AD9A]">
                <div className="flex items-center gap-1.5">
                  <Truck size={14} />
                  <span>White Glove Delivery:</span>
                </div>
                <span className="text-emerald-400 font-medium">
                  {quote?.shippingFeeText || 'Complimentary'}
                </span>
              </div>

              <div className="flex justify-between text-[#B8AD9A]">
                <span>Insured Storage Box:</span>
                <span className="text-[#FEF5E6] font-medium">Included</span>
              </div>

              <div className="pt-4 border-t border-[#2F1C15] flex justify-between items-baseline">
                <span className="font-semibold text-[#FEF5E6] uppercase tracking-wider text-xs">
                  Payable Amount:
                </span>
                <span className="font-serif text-2xl text-[#FEF5E6] font-normal tracking-wide">
                  {quoteLoading ? '...' : quote ? quote.totalText : '—'}
                </span>
              </div>
            </div>

            {/* Payment Gateway Trust Notice */}
            <div className="p-4 bg-[#0F0A09] border border-[#2F1C15] space-y-2 text-[11px] text-[#B8AD9A] leading-relaxed">
              <div className="flex items-center gap-2 text-[#FEF5E6] font-medium uppercase tracking-wider text-[10px]">
                <CreditCard size={14} />
                <span>Razorpay Test Mode Gateway</span>
              </div>
              <p>
                Transactions are processed in authenticated Test Mode. UPI, NetBanking, and simulated Credit/Debit cards are supported without real charges.
              </p>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handlePlaceOrderAndPay}
              disabled={isSubmitting || quoteLoading || Boolean(quoteError) || !selectedAddressId || hasUnsizedCartItems}
              className="w-full inline-flex items-center justify-center gap-2 min-h-[50px] px-6 text-xs uppercase tracking-[0.2em] bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle shadow-lg disabled:opacity-40 disabled:cursor-not-allowed select-none"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#0F0A09] border-t-transparent rounded-full animate-spin" />
                  <span>Securing Order...</span>
                </>
              ) : hasUnsizedCartItems ? (
                <span>Select Shoe Size to Proceed</span>
              ) : quoteLoading ? (
                <span>Recalculating Quote...</span>
              ) : (
                <>
                  <ShieldCheck size={16} />
                  <span>Pay {quote?.totalText || ''} with Razorpay</span>
                </>
              )}
            </button>

            {/* Security Guarantee Badge */}
            <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-[#B8AD9A]/80 pt-1">
              <ShieldCheck size={13} className="text-emerald-400" />
              <span>256-Bit SSL Encrypted & Session Isolated</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
