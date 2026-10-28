import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { paymentOrderLimiter } from '../middleware/rateLimiter.js';
import {
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
} from '../controllers/payment.controller.js';

const router = express.Router();

const createPaymentOrderSchema = z.object({
  body: z.object({
    orderId: z
      .string({ required_error: 'Order ID is required' })
      .trim()
      .min(1, 'Order ID is required'),
  }),
});

const verifyPaymentSchema = z.object({
  body: z.object({
    orderId: z
      .string({ required_error: 'Order ID is required' })
      .trim()
      .min(1, 'Order ID is required'),
    razorpayOrderId: z
      .string({ required_error: 'Razorpay order ID is required' })
      .trim()
      .min(1, 'Razorpay order ID is required'),
    razorpayPaymentId: z
      .string({ required_error: 'Razorpay payment ID is required' })
      .trim()
      .min(1, 'Razorpay payment ID is required'),
    razorpaySignature: z
      .string({ required_error: 'Razorpay signature is required' })
      .trim()
      .min(1, 'Razorpay signature is required'),
  }),
});

// 1. External webhook endpoint (HMAC signature verification, provider-to-server)
// Webhook endpoint is strictly unthrottled and exempt from rate limiting
router.post('/webhook', handleWebhook);

// 2. Authenticated customer endpoints (rate limited against payment spam)
router.post(
  '/create-order',
  paymentOrderLimiter,
  authenticate,
  validate(createPaymentOrderSchema),
  createPaymentOrder
);

router.post(
  '/verify',
  paymentOrderLimiter,
  authenticate,
  validate(verifyPaymentSchema),
  verifyPayment
);

export default router;
