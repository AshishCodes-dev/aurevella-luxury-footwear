import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
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
router.post('/webhook', handleWebhook);

// 2. Authenticated customer endpoints
router.post(
  '/create-order',
  authenticate,
  validate(createPaymentOrderSchema),
  createPaymentOrder
);

router.post(
  '/verify',
  authenticate,
  validate(verifyPaymentSchema),
  verifyPayment
);

export default router;
