import Razorpay from 'razorpay';
import crypto from 'crypto';

/**
 * Returns the public Razorpay Key ID for client-side checkout initiation.
 * Throws a configuration error if missing.
 */
export const getRazorpayKeyId = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId || !keyId.trim()) {
    throw new Error('Razorpay configuration error: RAZORPAY_KEY_ID is missing or empty.');
  }
  return keyId.trim();
};

/**
 * Returns the private Razorpay Key Secret.
 * Throws a configuration error if missing.
 */
export const getRazorpayKeySecret = () => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret || !keySecret.trim()) {
    throw new Error('Razorpay configuration error: RAZORPAY_KEY_SECRET is missing or empty.');
  }
  return keySecret.trim();
};

/**
 * Returns the dedicated Razorpay Webhook Secret.
 * Throws a configuration error if missing.
 */
export const getRazorpayWebhookSecret = () => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !webhookSecret.trim()) {
    throw new Error('Razorpay configuration error: RAZORPAY_WEBHOOK_SECRET is missing or empty.');
  }
  return webhookSecret.trim();
};

/**
 * Internal slot for an injected offline mock instance.
 * Strictly used in automated test environments to prevent network requests.
 * In production/normal mode, this remains null and getRazorpayInstance()
 * instantiates the official Razorpay SDK client.
 */
let customRazorpayInstance = null;

/**
 * Injects a test-only mock Razorpay instance.
 * Fails closed with a fatal error if invoked in production.
 *
 * @param {Object|null} instance
 */
export const setCustomRazorpayInstance = (instance) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY FATAL] Custom Razorpay mock instance cannot be injected in production environment.'
    );
  }
  customRazorpayInstance = instance;
};

/**
 * Resets the custom Razorpay instance to null.
 */
export const resetCustomRazorpayInstance = () => {
  customRazorpayInstance = null;
};

/**
 * Creates a configurable offline Razorpay mock client for test suites.
 * Guaranteed to never make network requests.
 * Fails closed with a fatal error if invoked in production.
 * Fails loudly with an explicit error if an unhandled call is attempted.
 *
 * @param {Object} [options]
 * @returns {Object}
 */
export const createMockRazorpay = (options = {}) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[SECURITY FATAL] Cannot create mock Razorpay instance in production environment.'
    );
  }

  const paymentHandlers = new Map();
  const orderHandlers = [];
  let defaultPaymentHandler = null;
  let defaultOrderHandler = null;

  const mock = {
    payments: {
      fetch: async (paymentId) => {
        if (paymentHandlers.has(paymentId)) {
          const handler = paymentHandlers.get(paymentId);
          if (typeof handler === 'function') {
            return handler(paymentId);
          }
          if (handler instanceof Error) {
            throw handler;
          }
          return handler;
        }
        if (defaultPaymentHandler) {
          if (typeof defaultPaymentHandler === 'function') {
            return defaultPaymentHandler(paymentId);
          }
          if (defaultPaymentHandler instanceof Error) {
            throw defaultPaymentHandler;
          }
          return defaultPaymentHandler;
        }
        throw new Error(
          `[OFFLINE MOCK GUARD] Real network call blocked! Unhandled razorpay.payments.fetch("${paymentId}") in test.`
        );
      },
    },
    orders: {
      create: async (params) => {
        if (orderHandlers.length > 0) {
          const handler = orderHandlers.shift();
          if (typeof handler === 'function') {
            return handler(params);
          }
          if (handler instanceof Error) {
            throw handler;
          }
          return handler;
        }
        if (defaultOrderHandler) {
          if (typeof defaultOrderHandler === 'function') {
            return defaultOrderHandler(params);
          }
          if (defaultOrderHandler instanceof Error) {
            throw defaultOrderHandler;
          }
          return defaultOrderHandler;
        }
        throw new Error(
          `[OFFLINE MOCK GUARD] Real network call blocked! Unhandled razorpay.orders.create(${JSON.stringify(
            params
          )}) in test.`
        );
      },
    },

    // Chainable configuration helpers
    mockPayment: (paymentId, recordOrHandler) => {
      paymentHandlers.set(paymentId, recordOrHandler);
      return mock;
    },
    mockDefaultPayment: (recordOrHandler) => {
      defaultPaymentHandler = recordOrHandler;
      return mock;
    },
    mockOrder: (recordOrHandler) => {
      orderHandlers.push(recordOrHandler);
      return mock;
    },
    mockDefaultOrder: (recordOrHandler) => {
      defaultOrderHandler = recordOrHandler;
      return mock;
    },
    reset: () => {
      paymentHandlers.clear();
      orderHandlers.length = 0;
      defaultPaymentHandler = null;
      defaultOrderHandler = null;
    },
  };

  return mock;
};

/**
 * Creates and returns an initialized Razorpay instance in Test Mode.
 * Returns customRazorpayInstance only in non-production environments if set by a test runner.
 */
export const getRazorpayInstance = () => {
  if (process.env.NODE_ENV !== 'production' && customRazorpayInstance) {
    return customRazorpayInstance;
  }

  const key_id = getRazorpayKeyId();
  const key_secret = getRazorpayKeySecret();

  return new Razorpay({
    key_id,
    key_secret,
  });
};

/**
 * Verifies the payment signature returned by the Razorpay frontend checkout.
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, secret)
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 *
 * @param {Object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @param {string} [params.secret] - Optional override, defaults to getRazorpayKeySecret()
 * @returns {boolean}
 */
export const verifyPaymentSignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  secret,
}) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const keySecret = secret || getRazorpayKeySecret();
  const payload = `${razorpayOrderId.trim()}|${razorpayPaymentId.trim()}`;

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
  const actualBuf = Buffer.from(razorpaySignature.trim(), 'utf-8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};

/**
 * Verifies a Razorpay webhook HMAC-SHA256 signature against the exact raw request body.
 * Algorithm: HMAC-SHA256(rawBody, webhookSecret)
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 *
 * @param {Object} params
 * @param {Buffer|string} params.rawBody - Raw unparsed request body
 * @param {string} params.signature - Signature header from x-razorpay-signature
 * @param {string} [params.secret] - Optional override, defaults to getRazorpayWebhookSecret()
 * @returns {boolean}
 */
export const verifyWebhookSignature = ({ rawBody, signature, secret }) => {
  if (!rawBody || !signature) {
    return false;
  }

  const webhookSecret = secret || getRazorpayWebhookSecret();
  const rawBodyBuf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf-8');

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBodyBuf)
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSignature, 'utf-8');
  const actualBuf = Buffer.from(signature.trim(), 'utf-8');

  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, actualBuf);
};
