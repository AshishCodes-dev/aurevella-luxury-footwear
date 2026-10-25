import mongoose from 'mongoose';
import Order from '../models/Order.js';
import {
  getRazorpayInstance,
  getRazorpayKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from '../config/razorpay.js';
import {
  processPaymentSuccessAndDeductInventory,
  InventoryReconciliationError,
  PaymentConflictError,
} from '../services/paymentInventory.service.js';

/**
 * POST /api/payments/create-order
 * Initiates Razorpay payment for an existing pending order.
 * Strictly uses server-calculated totalPaise from database.
 * Safe & idempotent: re-uses existing razorpayOrderId if already created.
 */
export const createPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        status: 'error',
        message: 'A valid orderId is required to initiate payment',
      });
    }

    // 1. Fetch order belonging strictly to authenticated customer
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found or does not belong to your account',
      });
    }

    // 2. Validate eligibility
    if (order.status !== 'pending_payment') {
      return res.status(400).json({
        status: 'error',
        message: `Order is not eligible for payment initiation (current status: ${order.status})`,
      });
    }

    const keyId = getRazorpayKeyId();

    // 3. Idempotency: If Razorpay order was already created, reuse it
    if (order.paymentDetails?.razorpayOrderId) {
      return res.status(200).json({
        status: 'success',
        keyId,
        razorpayOrderId: order.paymentDetails.razorpayOrderId,
        amountPaise: order.totalPaise,
        currency: order.currency || 'INR',
        orderNumber: order.orderNumber,
      });
    }

    // 4. Create order via official Razorpay SDK
    const razorpay = getRazorpayInstance();
    const razorpayOrder = await razorpay.orders.create({
      amount: order.totalPaise, // Guaranteed integer paise from database
      currency: order.currency || 'INR',
      receipt: order.orderNumber,
      notes: {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        userId: req.user._id.toString(),
      },
    });

    // 5. Store razorpayOrderId on the order
    order.paymentDetails.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(201).json({
      status: 'success',
      keyId,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: order.totalPaise,
      currency: order.currency || 'INR',
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    const errorMsg = error?.message || error?.error?.description || 'Failed to initiate payment with gateway';
    console.error('[Payment Controller - createPaymentOrder]:', errorMsg);
    return res.status(500).json({
      status: 'error',
      message: typeof errorMsg === 'string' && errorMsg.includes('Razorpay configuration error')
        ? errorMsg
        : 'Failed to initiate payment with gateway',
    });
  }
};

/**
 * POST /api/payments/verify
 * Authenticated customer verification endpoint.
 * Validates HMAC SHA-256 signature, transitions order to 'paid',
 * and decrements inventory atomically.
 */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    // 1. Fetch order belonging strictly to authenticated customer
    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        status: 'error',
        message: 'Order not found or does not belong to your account',
      });
    }

    // 2. Validate Razorpay order reference matches local order
    if (order.paymentDetails?.razorpayOrderId !== razorpayOrderId) {
      return res.status(400).json({
        status: 'error',
        message: 'Razorpay order identifier does not match local order',
      });
    }

    // 3. Idempotency: If already paid, return existing state safely
    if (order.status === 'paid') {
      return res.status(200).json({
        status: 'success',
        isAlreadyPaid: true,
        order: order.toSafeJSON(),
      });
    }

    // 4. Ensure payment ID is not already used by another order
    if (razorpayPaymentId) {
      const existingWithPayment = await Order.findOne({
        'paymentDetails.razorpayPaymentId': razorpayPaymentId.trim(),
        _id: { $ne: order._id },
      });
      if (existingWithPayment) {
        return res.status(409).json({
          status: 'error',
          message: `Payment ID ${razorpayPaymentId} is already associated with another order`,
        });
      }
    }

    // 5. Verify payment signature cryptographically
    const isSignatureValid = verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid payment signature. Verification failed.',
      });
    }

    // 6. Independent Server-Side Gateway Verification: Confirm capture status, amount, and currency
    let paymentRecord;
    try {
      const razorpay = getRazorpayInstance();
      paymentRecord = await razorpay.payments.fetch(razorpayPaymentId);
    } catch (fetchError) {
      console.error(
        `[Payment Controller - verifyPayment] Gateway fetch error for payment ${razorpayPaymentId}:`,
        fetchError?.message || fetchError
      );
      // Gateway is unreachable or payment ID does not exist on gateway.
      // Do NOT mark order paid or decrement stock prematurely.
      return res.status(502).json({
        status: 'error',
        code: 'GATEWAY_VERIFICATION_UNAVAILABLE',
        message:
          'Payment signature verified, but unable to confirm capture status with payment gateway. Stock will be allocated once capture is verified via webhook.',
      });
    }

    // 6A. Verify gateway payment record references the expected order ID
    if (!paymentRecord || paymentRecord.order_id !== razorpayOrderId) {
      console.error(
        `[Payment Controller - verifyPayment] Gateway order mismatch. Expected ${razorpayOrderId}, received ${paymentRecord?.order_id}`
      );
      return res.status(400).json({
        status: 'error',
        code: 'PAYMENT_ORDER_MISMATCH',
        message: 'Payment record from gateway does not match the expected order identifier.',
      });
    }

    // 6B. Strict amount validation: must equal order.totalPaise
    if (paymentRecord.amount !== order.totalPaise) {
      console.error(
        `[Payment Controller - verifyPayment] Gateway amount mismatch on Order ${order.orderNumber}. Expected ${order.totalPaise}, received ${paymentRecord.amount}`
      );
      await Order.updateOne(
        { _id: order._id, status: 'pending_payment' },
        {
          $set: {
            status: 'payment_reconciliation_needed',
            'paymentDetails.failureReason': 'payment_amount_mismatch',
            'paymentDetails.reconciliationNotes': `Gateway reported amount ${paymentRecord.amount} paise, expected ${order.totalPaise} paise.`,
          },
        }
      );
      return res.status(409).json({
        status: 'error',
        code: 'PAYMENT_RECONCILIATION_NEEDED',
        message: 'Payment amount mismatch detected. Order flagged for atelier reconciliation.',
      });
    }

    // 6C. Strict currency validation
    const expectedCurrency = (order.currency || 'INR').trim().toUpperCase();
    if (
      !paymentRecord.currency ||
      paymentRecord.currency.trim().toUpperCase() !== expectedCurrency
    ) {
      console.error(
        `[Payment Controller - verifyPayment] Gateway currency mismatch on Order ${order.orderNumber}. Expected ${expectedCurrency}, received ${paymentRecord.currency}`
      );
      await Order.updateOne(
        { _id: order._id, status: 'pending_payment' },
        {
          $set: {
            status: 'payment_reconciliation_needed',
            'paymentDetails.failureReason': 'payment_currency_mismatch',
            'paymentDetails.reconciliationNotes': `Gateway reported currency "${paymentRecord.currency}", expected "${expectedCurrency}".`,
          },
        }
      );
      return res.status(409).json({
        status: 'error',
        code: 'PAYMENT_RECONCILIATION_NEEDED',
        message: 'Payment currency mismatch detected. Order flagged for atelier reconciliation.',
      });
    }

    // 6D. Verify captured status: Must be strictly 'captured'
    if (paymentRecord.status !== 'captured') {
      console.warn(
        `[Payment Controller - verifyPayment] Payment ${razorpayPaymentId} on Order ${order.orderNumber} has status "${paymentRecord.status}" (not "captured").`
      );
      return res.status(409).json({
        status: 'error',
        code: 'PAYMENT_NOT_CAPTURED',
        message: `Payment status is currently "${paymentRecord.status}". Inventory can only be allocated once payment capture is confirmed.`,
      });
    }

    // 7. Process atomic payment success & inventory decrement within transaction
    const result = await processPaymentSuccessAndDeductInventory({
      orderId: order._id,
      razorpayPaymentId,
      razorpaySignature,
    });

    return res.status(200).json({
      status: 'success',
      order: result.order.toSafeJSON(),
    });
  } catch (error) {
    if (error instanceof InventoryReconciliationError) {
      return res.status(409).json({
        status: 'error',
        code: 'PAYMENT_RECONCILIATION_NEEDED',
        message: error.message,
        order: error.details?.order ? error.details.order.toSafeJSON() : null,
      });
    }

    if (error instanceof PaymentConflictError) {
      return res.status(409).json({
        status: 'error',
        code: 'PAYMENT_CONFLICT',
        message: error.message,
      });
    }

    console.error('[Payment Controller - verifyPayment]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to complete payment verification',
    });
  }
};

/**
 * POST /api/payments/webhook
 * External provider-to-server webhook endpoint.
 * Verifies webhook HMAC signature using raw request body Buffer,
 * deduplicates event IDs, validates payment identity, amount, currency,
 * and applies idempotent inventory/payment updates.
 */
export const handleWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const eventId = req.headers['x-razorpay-event-id'] || req.body?.event_id;

    if (!signature) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing x-razorpay-signature header',
      });
    }

    // 1. Strict raw request body Buffer check: No JSON.stringify fallback!
    if (!req.rawBody || !Buffer.isBuffer(req.rawBody)) {
      return res.status(400).json({
        status: 'error',
        message: 'Raw request body buffer is required for webhook signature verification',
      });
    }

    const isSignatureValid = verifyWebhookSignature({
      rawBody: req.rawBody,
      signature,
    });

    if (!isSignatureValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid webhook signature',
      });
    }

    const { event, payload } = req.body;

    // 2. Filter supported events
    if (event === 'payment.captured' || event === 'order.paid') {
      const paymentEntity = payload?.payment?.entity;
      const orderEntity = payload?.order?.entity;

      const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

      if (!razorpayOrderId) {
        return res.status(200).json({
          status: 'ignored',
          message: 'Webhook payload missing order reference',
        });
      }

      const order = await Order.findOne({
        'paymentDetails.razorpayOrderId': razorpayOrderId,
      });

      if (!order) {
        // Unknown order (e.g. from test dashboard or another test environment)
        return res.status(200).json({
          status: 'ignored',
          message: `Order for Razorpay ID ${razorpayOrderId} not found locally`,
        });
      }

      // 3. Status checks: Never downgrade or alter already-finalized orders
      if (order.status === 'paid') {
        if (eventId && !order.paymentDetails?.webhookEventIds?.includes(eventId)) {
          await Order.updateOne(
            { _id: order._id },
            { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
          );
        }
        return res.status(200).json({
          status: 'ok',
          message: 'Order is already marked as paid',
        });
      }

      if (order.status === 'payment_reconciliation_needed') {
        if (eventId && !order.paymentDetails?.webhookEventIds?.includes(eventId)) {
          await Order.updateOne(
            { _id: order._id },
            { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
          );
        }
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: 'Order is already flagged for reconciliation',
        });
      }

      if (order.status === 'cancelled') {
        console.warn(
          `[Webhook Alert]: Payment received for previously cancelled Order ${order.orderNumber}.`
        );
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              status: 'payment_reconciliation_needed',
              'paymentDetails.failureReason': 'payment_on_cancelled_order',
              'paymentDetails.reconciliationNotes': `Webhook ${event} received for previously cancelled order. Atelier intervention required.`,
            },
            ...(eventId
              ? { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
              : {}),
          }
        );
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: 'Payment received for cancelled order. Flagged for reconciliation.',
        });
      }

      // 4. Strict payment evidence check: Real payment entity with real payment ID is mandatory
      // Never use orderEntity.amount alone as proof that payment was received, and never generate synthetic payment IDs!
      const hasValidPaymentEntity =
        paymentEntity &&
        typeof paymentEntity === 'object' &&
        typeof paymentEntity.id === 'string' &&
        paymentEntity.id.trim().length > 0;

      if (!hasValidPaymentEntity) {
        console.warn(
          `[Webhook Alert]: Webhook event "${event}" on Order ${order.orderNumber} does not include a verified payment entity or payment ID.`
        );
        await Order.updateOne(
          { _id: order._id, status: 'pending_payment' },
          {
            $set: {
              status: 'payment_reconciliation_needed',
              'paymentDetails.failureReason': 'insufficient_payment_evidence',
              'paymentDetails.reconciliationNotes': `Webhook event "${event}" received without verified payment entity or payment ID. Atelier reconciliation required.`,
            },
            ...(eventId
              ? { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
              : {}),
          }
        );
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: 'Webhook lacks verified payment identity. Order flagged for atelier reconciliation.',
        });
      }

      const verifiedPaymentId = paymentEntity.id.trim();

      // 4A. Verify captured status: Payment must be captured
      if (paymentEntity.status !== 'captured') {
        console.warn(
          `[Webhook Alert]: Payment status on Order ${order.orderNumber} is "${paymentEntity.status}" (not "captured").`
        );
        await Order.updateOne(
          { _id: order._id, status: 'pending_payment' },
          {
            $set: {
              status: 'payment_reconciliation_needed',
              'paymentDetails.failureReason': 'payment_not_captured',
              'paymentDetails.reconciliationNotes': `Webhook reported payment status as "${paymentEntity.status}", not "captured".`,
            },
            ...(eventId
              ? { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
              : {}),
          }
        );
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: `Payment status is "${paymentEntity.status}", not captured. Order flagged for reconciliation.`,
        });
      }

      // 4B. Strict amount validation: must be finite number exactly equal to order.totalPaise
      const isAmountValid =
        typeof paymentEntity.amount === 'number' &&
        Number.isFinite(paymentEntity.amount) &&
        !Number.isNaN(paymentEntity.amount) &&
        paymentEntity.amount === order.totalPaise;

      if (!isAmountValid) {
        console.error(
          `[Webhook Alert]: Amount invalid or mismatch on Order ${order.orderNumber}. Expected ${order.totalPaise} paise, received ${paymentEntity.amount}.`
        );
        await Order.updateOne(
          { _id: order._id, status: 'pending_payment' },
          {
            $set: {
              status: 'payment_reconciliation_needed',
              'paymentDetails.failureReason': 'payment_amount_mismatch',
              'paymentDetails.reconciliationNotes': `Webhook reported invalid or mismatched amount (${paymentEntity.amount}), expected ${order.totalPaise} paise.`,
            },
            ...(eventId
              ? { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
              : {}),
          }
        );
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: 'Payment amount mismatch or invalid. Order flagged for reconciliation.',
        });
      }

      // 4C. Strict currency validation: must be non-empty string exactly matching order currency (INR)
      const expectedCurrency = (order.currency || 'INR').trim().toUpperCase();
      const isCurrencyValid =
        typeof paymentEntity.currency === 'string' &&
        paymentEntity.currency.trim().length > 0 &&
        paymentEntity.currency.trim().toUpperCase() === expectedCurrency;

      if (!isCurrencyValid) {
        console.error(
          `[Webhook Alert]: Currency invalid or mismatch on Order ${order.orderNumber}. Expected ${expectedCurrency}, received ${paymentEntity.currency}.`
        );
        await Order.updateOne(
          { _id: order._id, status: 'pending_payment' },
          {
            $set: {
              status: 'payment_reconciliation_needed',
              'paymentDetails.failureReason': 'payment_currency_mismatch',
              'paymentDetails.reconciliationNotes': `Webhook reported invalid or mismatched currency (${paymentEntity.currency}), expected ${expectedCurrency}.`,
            },
            ...(eventId
              ? { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
              : {}),
          }
        );
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: 'Payment currency mismatch or invalid. Order flagged for reconciliation.',
        });
      }

      // 4D. Conflict check: Ensure payment ID is not associated with another order
      const duplicatePaymentOrder = await Order.findOne({
        'paymentDetails.razorpayPaymentId': verifiedPaymentId,
        _id: { $ne: order._id },
      });

      if (duplicatePaymentOrder) {
        console.error(
          `[Webhook Alert]: Payment ID ${verifiedPaymentId} already associated with Order ${duplicatePaymentOrder.orderNumber}.`
        );
        await Order.updateOne(
          { _id: order._id, status: 'pending_payment' },
          {
            $set: {
              status: 'payment_reconciliation_needed',
              'paymentDetails.failureReason': 'payment_id_conflict',
              'paymentDetails.reconciliationNotes': `Payment ID ${verifiedPaymentId} is already associated with Order ${duplicatePaymentOrder.orderNumber}.`,
            },
            ...(eventId
              ? { $addToSet: { 'paymentDetails.webhookEventIds': eventId } }
              : {}),
          }
        );
        return res.status(200).json({
          status: 'reconciliation_flagged',
          message: 'Payment ID already associated with another order. Flagged for reconciliation.',
        });
      }

      // 5. Process payment success & atomic inventory decrement using verified real payment ID
      await processPaymentSuccessAndDeductInventory({
        orderId: order._id,
        razorpayPaymentId: verifiedPaymentId,
        webhookEventId: eventId,
      });

      return res.status(200).json({
        status: 'ok',
        message: 'Payment capture webhook processed successfully',
      });
    }

    if (event === 'payment.failed') {
      const razorpayOrderId = payload?.payment?.entity?.order_id;
      const errorDesc = payload?.payment?.entity?.error_description || 'Payment failed';

      if (razorpayOrderId) {
        // Never overwrite an already-paid order
        await Order.findOneAndUpdate(
          {
            'paymentDetails.razorpayOrderId': razorpayOrderId,
            status: 'pending_payment',
          },
          {
            $set: {
              status: 'payment_failed',
              'paymentDetails.failureReason': errorDesc,
            },
          }
        );
      }

      return res.status(200).json({
        status: 'ok',
        message: 'Payment failure recorded',
      });
    }

    // Acknowledge other unhandled events safely with 200 so Razorpay stops retrying
    return res.status(200).json({
      status: 'ignored',
      message: `Event type "${event}" is not handled`,
    });
  } catch (error) {
    if (error instanceof InventoryReconciliationError) {
      return res.status(200).json({
        status: 'reconciliation_flagged',
        message: error.message,
      });
    }

    console.error('[Payment Controller - handleWebhook]:', error.message);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to process webhook event',
    });
  }
};
