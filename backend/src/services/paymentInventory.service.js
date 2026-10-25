import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';

export class InventoryReconciliationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'InventoryReconciliationError';
    this.details = details;
  }
}

export class PaymentConflictError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'PaymentConflictError';
    this.details = details;
  }
}

class OutOfStockError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'OutOfStockError';
    this.details = details;
  }
}

/**
 * Determines whether the current MongoDB deployment reliably supports multi-document transactions.
 * Requires a confirmed replica set or sharded cluster topology from the MongoDB driver.
 * Never relies on hostname substrings.
 *
 * @returns {boolean}
 */
export const isTransactionSupportedTopology = () => {
  const client = mongoose.connection.client;
  const topology = client?.topology;
  const topoType = topology?.description?.type;

  // Reliable MongoDB driver topology types that support multi-document ACID transactions
  const transactionalTopologies = ['ReplicaSetWithPrimary', 'Sharded', 'LoadBalanced'];
  return transactionalTopologies.includes(topoType);
};

/**
 * Transitions an order to 'paid' status and atomically decrements inventory.
 * Guarantees that inventory is decremented AT MOST ONCE per order, using
 * Mongoose session transactions on replica set deployments (Atlas)
 * with automatic write-conflict retries and safe reconciliation tracking.
 *
 * @param {Object} params
 * @param {string|mongoose.Types.ObjectId} params.orderId
 * @param {string} params.razorpayPaymentId
 * @param {string} [params.razorpaySignature]
 * @param {string} [params.webhookEventId]
 * @returns {Promise<{ success: boolean, order: Object, status: string, message: string }>}
 */
export const processPaymentSuccessAndDeductInventory = async ({
  orderId,
  razorpayPaymentId,
  razorpaySignature,
  webhookEventId,
}) => {
  // 1. Guard against reusing a payment ID already associated with another order
  if (
    razorpayPaymentId &&
    typeof razorpayPaymentId === 'string' &&
    !razorpayPaymentId.startsWith('webhook-')
  ) {
    const duplicatePaymentOrder = await Order.findOne({
      'paymentDetails.razorpayPaymentId': razorpayPaymentId.trim(),
      _id: { $ne: orderId },
    });
    if (duplicatePaymentOrder) {
      throw new PaymentConflictError(
        `Payment ID ${razorpayPaymentId} is already associated with Order ${duplicatePaymentOrder.orderNumber}`
      );
    }
  }

  // 2. Fetch order to verify eligibility
  const existingOrder = await Order.findById(orderId);
  if (!existingOrder) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Idempotent return if already paid and decremented
  if (existingOrder.status === 'paid' && existingOrder.paymentDetails?.inventoryDecremented) {
    if (webhookEventId && !existingOrder.paymentDetails.webhookEventIds?.includes(webhookEventId)) {
      await Order.updateOne(
        { _id: existingOrder._id },
        { $addToSet: { 'paymentDetails.webhookEventIds': webhookEventId } }
      );
    }
    return {
      success: true,
      alreadyProcessed: true,
      order: existingOrder,
      status: 'paid',
      message: 'Payment and inventory already processed for this order.',
    };
  }

  // Guard against processing orders that are in a terminal non-payable state
  if (['cancelled', 'payment_reconciliation_needed'].includes(existingOrder.status)) {
    return {
      success: false,
      alreadyProcessed: true,
      order: existingOrder,
      status: existingOrder.status,
      message: `Order is in "${existingOrder.status}" state and cannot be processed for payment.`,
    };
  }

  // 3. Atomically claim the order from 'pending_payment' to 'processing'
  // Single-document atomic update guarantees that only ONE worker can transition the order.
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: orderId,
      status: 'pending_payment',
    },
    {
      $set: {
        status: 'processing',
        'paymentDetails.processingClaimedAt': new Date(),
      },
    },
    { new: true }
  );

  if (!claimedOrder) {
    // Another worker has already claimed this order or it transitioned.
    // Poll to allow the in-flight worker to complete its transaction cleanly.
    let currentOrder = await Order.findById(orderId);
    for (let poll = 0; poll < 20 && currentOrder?.status === 'processing'; poll++) {
      await new Promise((resolve) => setTimeout(resolve, 75));
      currentOrder = await Order.findById(orderId);
    }

    if (currentOrder?.status === 'paid') {
      if (webhookEventId && !currentOrder.paymentDetails?.webhookEventIds?.includes(webhookEventId)) {
        await Order.updateOne(
          { _id: orderId },
          { $addToSet: { 'paymentDetails.webhookEventIds': webhookEventId } }
        );
      }
      return {
        success: true,
        alreadyProcessed: true,
        order: currentOrder,
        status: 'paid',
        message: 'Payment and inventory already processed for this order.',
      };
    }

    if (currentOrder?.status === 'payment_reconciliation_needed') {
      return {
        success: false,
        alreadyProcessed: true,
        order: currentOrder,
        status: 'payment_reconciliation_needed',
        message: 'Order is flagged for manual reconciliation.',
      };
    }

    if (currentOrder?.status === 'processing') {
      return {
        success: true,
        inProgress: true,
        order: currentOrder,
        status: 'processing',
        message: 'Order payment is currently being processed by another worker.',
      };
    }

    return {
      success: false,
      order: currentOrder,
      status: currentOrder?.status || 'unknown',
      message: `Order is in unexpected state: ${currentOrder?.status}`,
    };
  }

  // 4. Retry wrapper for transient write conflicts in multi-document transactions
  const executeWithRetry = async (fn, maxRetries = 5) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        const isTransient =
          err.hasErrorLabel?.('TransientTransactionError') ||
          err.code === 112 || // WriteConflict error code
          err.message?.includes('Write conflict') ||
          err.message?.includes('WriteConflict');

        if (isTransient && attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 60 * attempt));
          continue;
        }
        throw err;
      }
    }
  };

  // 5. Multi-document transaction execution
  try {
    const isTxSupported = isTransactionSupportedTopology();

    if (!isTxSupported) {
      if (process.env.NODE_ENV === 'production') {
        const topoType = mongoose.connection.client?.topology?.description?.type || 'unknown';
        throw new Error(
          `[SECURITY FATAL] Multi-document ACID transactions are strictly required for payment fulfillment in production environment. Current MongoDB topology "${topoType}" does not support transactions.`
        );
      }
      return await executeAtomicFallback();
    }

    return await executeWithRetry(async () => {
      let session = null;
      try {
        session = await mongoose.startSession();
      } catch (sessionErr) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            `[SECURITY FATAL] Failed to start Mongoose session in production: ${sessionErr.message}`
          );
        }
        return await executeAtomicFallback();
      }

      try {
        let finalOrder = null;

        await session.withTransaction(async () => {
          // Step 5A: Fetch order inside transaction
          const orderInSession = await Order.findById(orderId).session(session);
          if (!orderInSession) {
            throw new Error(`Order ${orderId} not found inside transaction`);
          }

          if (
            orderInSession.status === 'paid' &&
            orderInSession.paymentDetails?.inventoryDecremented
          ) {
            finalOrder = orderInSession;
            return;
          }

          if (
            orderInSession.status !== 'pending_payment' &&
            orderInSession.status !== 'processing'
          ) {
            finalOrder = orderInSession;
            return;
          }

          // Step 5B: Conditional atomic decrement for every item with stock check inside session
          for (const item of orderInSession.items) {
            const qty = item.quantity;
            const productId = item.product;

            const updatedProduct = await Product.findOneAndUpdate(
              {
                _id: productId,
                stockQuantity: { $gte: qty },
              },
              {
                $inc: { stockQuantity: -qty },
              },
              { new: true, session }
            );

            if (!updatedProduct) {
              // Abort transaction - automatically rolls back any previous line item decrements!
              throw new OutOfStockError(
                `Insufficient stock for "${item.name}". Requested: ${qty}`,
                { productId: productId.toString(), productName: item.name, requested: qty }
              );
            }
          }

          // Step 5C: Final order payment and inventory state update inside session
          const updateDoc = {
            $set: {
              status: 'paid',
              'paymentDetails.inventoryDecremented': true,
              'paymentDetails.paidAt': orderInSession.paymentDetails?.paidAt || new Date(),
            },
            $unset: {
              'paymentDetails.processingClaimedAt': 1,
            },
          };
          if (razorpayPaymentId) {
            updateDoc.$set['paymentDetails.razorpayPaymentId'] = razorpayPaymentId;
          }
          if (razorpaySignature) {
            updateDoc.$set['paymentDetails.razorpaySignature'] = razorpaySignature;
          }
          if (webhookEventId) {
            updateDoc.$addToSet = { 'paymentDetails.webhookEventIds': webhookEventId };
          }

          finalOrder = await Order.findByIdAndUpdate(orderId, updateDoc, {
            new: true,
            session,
          });
        });

        return {
          success: true,
          order: finalOrder,
          status: finalOrder?.status || 'paid',
          message: 'Payment verified and inventory decremented atomically within transaction.',
        };
      } finally {
        await session.endSession();
      }
    });
  } catch (txError) {
    if (txError instanceof OutOfStockError) {
      console.error(
        `[CRITICAL INVENTORY RECONCILIATION]: Order ${existingOrder.orderNumber} payment succeeded (${razorpayPaymentId}), but product "${txError.details?.productName}" is out of stock. Transaction cleanly aborted (0 inventory deducted).`
      );

      // Durable, separate update to flag for manual reconciliation / refund
      const reconciledOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status: 'payment_reconciliation_needed',
            'paymentDetails.inventoryDecremented': false,
            'paymentDetails.razorpayPaymentId': razorpayPaymentId,
            'paymentDetails.failureReason': 'insufficient_stock_post_payment',
            'paymentDetails.reconciliationNotes': `Payment captured (${razorpayPaymentId}) but stock was depleted: ${txError.message}. Transaction aborted cleanly.`,
          },
          $unset: {
            'paymentDetails.processingClaimedAt': 1,
          },
          ...(webhookEventId
            ? { $addToSet: { 'paymentDetails.webhookEventIds': webhookEventId } }
            : {}),
        },
        { new: true }
      );

      throw new InventoryReconciliationError(txError.message, {
        order: reconciledOrder,
        error: txError,
      });
    }

    if (txError.code === 11000) {
      throw new PaymentConflictError(
        `Payment ID ${razorpayPaymentId} is already recorded on another order.`
      );
    }

    if (
      txError.message?.includes('Transaction numbers are only allowed on a replica set member or mongos')
    ) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(
          '[SECURITY FATAL] Multi-document ACID transactions failed on production deployment. Standalone fallback is strictly forbidden in production.'
        );
      }
      return await executeAtomicFallback();
    }

    // If order was claimed to 'processing' but aborted with an unexpected failure,
    // safely release the claim back to 'pending_payment' so subsequent requests can re-attempt
    try {
      const orderCheck = await Order.findById(orderId);
      if (orderCheck && orderCheck.status === 'processing') {
        await Order.updateOne(
          { _id: orderId, status: 'processing' },
          {
            $set: { status: 'pending_payment' },
            $unset: { 'paymentDetails.processingClaimedAt': 1 },
          }
        );
      }
    } catch (_) {}

    throw txError;
  }

  // --- Fallback Helper for Standalone Non-Replica Set MongoDB Environments (Test/Dev Only) ---
  async function executeAtomicFallback() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        '[SECURITY FATAL] executeAtomicFallback cannot be executed in production environment.'
      );
    }

    const decrementedItems = [];
    let stockDepletionError = null;

    for (const item of existingOrder.items) {
      const qty = item.quantity;
      const productId = item.product;

      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: productId,
          stockQuantity: { $gte: qty },
        },
        {
          $inc: { stockQuantity: -qty },
        },
        { new: true }
      );

      if (!updatedProduct) {
        stockDepletionError = {
          productId: productId.toString(),
          productName: item.name,
          requested: qty,
        };
        break;
      }

      decrementedItems.push({ productId, quantity: qty });
    }

    if (stockDepletionError) {
      for (const dec of decrementedItems) {
        try {
          await Product.updateOne(
            { _id: dec.productId },
            { $inc: { stockQuantity: dec.quantity } }
          );
        } catch (_) {}
      }

      const reconciledOrder = await Order.findByIdAndUpdate(
        orderId,
        {
          $set: {
            status: 'payment_reconciliation_needed',
            'paymentDetails.inventoryDecremented': false,
            'paymentDetails.razorpayPaymentId': razorpayPaymentId,
            'paymentDetails.failureReason': 'insufficient_stock_post_payment',
            'paymentDetails.reconciliationNotes': `Payment received (${razorpayPaymentId}) but inventory depleted for "${stockDepletionError.productName}".`,
          },
          $unset: {
            'paymentDetails.processingClaimedAt': 1,
          },
          ...(webhookEventId
            ? { $addToSet: { 'paymentDetails.webhookEventIds': webhookEventId } }
            : {}),
        },
        { new: true }
      );

      throw new InventoryReconciliationError(
        `Stock depleted for product "${stockDepletionError.productName}".`,
        { order: reconciledOrder, stockDepletionError }
      );
    }

    const updateDoc = {
      $set: {
        status: 'paid',
        'paymentDetails.inventoryDecremented': true,
        'paymentDetails.paidAt': existingOrder.paymentDetails?.paidAt || new Date(),
      },
      $unset: {
        'paymentDetails.processingClaimedAt': 1,
      },
    };
    if (razorpayPaymentId) {
      updateDoc.$set['paymentDetails.razorpayPaymentId'] = razorpayPaymentId;
    }
    if (razorpaySignature) {
      updateDoc.$set['paymentDetails.razorpaySignature'] = razorpaySignature;
    }
    if (webhookEventId) {
      updateDoc.$addToSet = { 'paymentDetails.webhookEventIds': webhookEventId };
    }

    const finalizedOrder = await Order.findByIdAndUpdate(orderId, updateDoc, { new: true });

    return {
      success: true,
      order: finalizedOrder,
      status: 'paid',
      message: 'Payment verified and inventory decremented successfully.',
    };
  }
};
