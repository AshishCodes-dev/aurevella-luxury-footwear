import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { orderLimiter } from '../middleware/rateLimiter.js';
import {
  validateCheckoutQuote,
  createOrder,
  getUserOrders,
  getOrderByIdOrNumber,
} from '../controllers/order.controller.js';

const router = express.Router();

const orderItemInputSchema = z.object({
  id: z.string({ required_error: 'Product identifier is required' }).trim().min(1),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Maximum 10 items per product model'),
  size: z.string().trim().max(20).optional().nullable(),
});

const quoteOrderSchema = z.object({
  body: z.object({
    items: z
      .array(orderItemInputSchema, { required_error: 'Items array is required' })
      .min(1, 'Order must contain at least one item')
      .max(20, 'Order cannot exceed 20 unique line items'),
    addressId: z.string().trim().optional().nullable(),
  }),
});

const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(orderItemInputSchema, { required_error: 'Items array is required' })
      .min(1, 'Order must contain at least one item')
      .max(20, 'Order cannot exceed 20 unique line items'),
    addressId: z
      .string({ required_error: 'Shipping address ID is required' })
      .trim()
      .min(1, 'Shipping address ID is required'),
    notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
    idempotencyKey: z.string().trim().max(100).optional(),
  }),
});

// All order endpoints require authentication
router.use(authenticate);

router.post('/quote', orderLimiter, validate(quoteOrderSchema), validateCheckoutQuote);
router.post('/', orderLimiter, validate(createOrderSchema), createOrder);
router.get('/', getUserOrders);
router.get('/:idOrNumber', getOrderByIdOrNumber);

export default router;
