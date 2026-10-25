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
 * Creates and returns an initialized Razorpay instance in Test Mode.
 */
export const getRazorpayInstance = () => {
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
