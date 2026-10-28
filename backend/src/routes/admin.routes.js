import express from 'express';
import { z } from 'zod';
import { authenticate, authorizeAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import {
  getDashboardStats,
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  updateProductStock,
  getAdminOrders,
  getAdminOrderById,
  updateOrderFulfillment,
} from '../controllers/admin.controller.js';

const router = express.Router();

// Strict Security Requirement: All admin endpoints enforce authentication, admin authorization, and rate limiting
router.use(authenticate, authorizeAdmin, adminLimiter);

// Diagnostic Ping
router.get('/ping', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Admin authenticated',
    admin: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

// --- Validation Schemas ---

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createProductSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Product name is required' })
      .trim()
      .min(2, 'Product name must be at least 2 characters')
      .max(150, 'Product name cannot exceed 150 characters'),
    slug: z
      .string({ required_error: 'Product slug is required' })
      .trim()
      .toLowerCase()
      .regex(slugRegex, 'Product slug must be kebab-case (e.g. floral-block-heel-sandal)'),
    code: z.string().trim().max(50).optional().nullable(),
    pricePaise: z
      .number({ required_error: 'Price in paise is required' })
      .int('Price must be an integer paise value')
      .min(100, 'Price must be at least ₹1.00 (100 paise)'),
    categoryId: z
      .string({ required_error: 'Category ID is required' })
      .regex(objectIdRegex, 'Invalid category ID format'),
    description: z
      .string({ required_error: 'Description is required' })
      .trim()
      .min(5, 'Description must be at least 5 characters')
      .max(2000, 'Description cannot exceed 2000 characters'),
    image: z
      .string({ required_error: 'Primary image path is required' })
      .trim()
      .min(1, 'Primary image path cannot be empty'),
    images: z.array(z.string().trim()).optional().default([]),
    alt: z.string().trim().max(200).optional(),
    stockQuantity: z
      .number()
      .int('Stock quantity must be an integer')
      .min(0, 'Stock quantity cannot be negative')
      .optional()
      .default(0),
    isActive: z.boolean().optional().default(true),
    priority: z.boolean().optional().default(false),
  }),
});

const updateProductSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(150).optional(),
    pricePaise: z.number().int().min(100).optional(),
    categoryId: z.string().regex(objectIdRegex, 'Invalid category ID format').optional(),
    description: z.string().trim().min(5).max(2000).optional(),
    image: z.string().trim().min(1).optional(),
    images: z.array(z.string().trim()).optional(),
    alt: z.string().trim().max(200).optional(),
    stockQuantity: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
    priority: z.boolean().optional(),
  }),
});

const updateProductStockSchema = z.object({
  body: z.object({
    stockQuantity: z
      .number({ required_error: 'Stock quantity is required' })
      .int('Stock quantity must be an integer')
      .min(0, 'Stock quantity cannot be negative'),
  }),
});

const updateOrderFulfillmentSchema = z.object({
  body: z.object({
    status: z.enum(['processing', 'shipped', 'delivered', 'cancelled'], {
      required_error: 'Valid fulfillment status is required (processing, shipped, delivered, or cancelled)',
    }),
    notes: z.string().trim().max(500, 'Notes cannot exceed 500 characters').optional(),
    expectedStatus: z.string().trim().optional(),
  }),
});

// --- Admin Routes ---

// Dashboard Analytics & Metrics
router.get('/stats', getDashboardStats);

// Product Management
router.get('/products', getAdminProducts);
router.get('/products/:idOrSlug', getAdminProductById);
router.post('/products', validate(createProductSchema), createProduct);
router.put('/products/:id', validate(updateProductSchema), updateProduct);
router.patch('/products/:id/stock', validate(updateProductStockSchema), updateProductStock);

// Order Management & Fulfillment
router.get('/orders', getAdminOrders);
router.get('/orders/:idOrNumber', getAdminOrderById);
router.patch('/orders/:idOrNumber/fulfillment', validate(updateOrderFulfillmentSchema), updateOrderFulfillment);

export default router;
