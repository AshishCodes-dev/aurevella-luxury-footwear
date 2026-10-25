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

  // If order is currently in processing (another concurrent worker), handle gracefully
  if (existingOrder.status === 'processing') {
    const refreshed = await Order.findById(orderId);
    if (refreshed.status === 'paid') {
      return {
        success: true,
        alreadyProcessed: true,
        order: refreshed,
        status: 'paid',
        message: 'Order was finalized by concurrent worker.',
      };
    }
    return {
      success: true,
      inProgress: true,
      order: refreshed,
      status: 'processing',
      message: 'Order payment is currently being processed by another worker.',
    };
  }

  // 3. Retry wrapper for transient write conflicts in multi-document transactions
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

  // 4. Multi-document transaction execution
  try {
    return await executeWithRetry(async () => {
      let session = null;
      try {
        session = await mongoose.startSession();
      } catch (_) {
        // Fallback if session cannot be started
        return await executeAtomicFallback();
      }

      try {
        let finalOrder = null;

        await session.withTransaction(async () => {
          // Step 4A: Fetch order inside transaction
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

          // Step 4B: Conditional atomic decrement for every item with stock check inside session
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

          // Step 4C: Final order payment and inventory state update inside session
          const updateDoc = {
            $set: {
              status: 'paid',
              'paymentDetails.inventoryDecremented': true,
              'paymentDetails.paidAt': orderInSession.paymentDetails?.paidAt || new Date(),
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

    throw txError;
  }

  // --- Fallback Helper for Standalone Non-Replica Set MongoDB Environments ---
  async function executeAtomicFallback() {
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
