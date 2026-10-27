import express from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  getUserAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../controllers/address.controller.js';

const router = express.Router();

const createAddressSchema = z.object({
  body: z.object({
    recipientName: z
      .string({ required_error: 'Recipient name is required' })
      .trim()
      .min(2, 'Recipient name must be at least 2 characters')
      .max(100, 'Recipient name cannot exceed 100 characters'),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number format'),
    addressLine1: z
      .string({ required_error: 'Street address is required' })
      .trim()
      .min(5, 'Street address must be at least 5 characters')
      .max(200, 'Street address cannot exceed 200 characters'),
    addressLine2: z
      .string()
      .trim()
      .max(200, 'Address line 2 cannot exceed 200 characters')
      .optional()
      .nullable(),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters'),
    state: z
      .string({ required_error: 'State is required' })
      .trim()
      .min(2, 'State must be at least 2 characters')
      .max(100, 'State cannot exceed 100 characters'),
    postalCode: z
      .string({ required_error: 'PIN code is required' })
      .trim()
      .regex(/^[1-9][0-9]{5}$/, 'Must be a valid 6-digit Indian PIN code'),
    country: z.string().trim().default('India').optional(),
    isDefault: z.boolean().optional().default(false),
  }),
});

const updateAddressSchema = z.object({
  body: z.object({
    recipientName: z
      .string()
      .trim()
      .min(2, 'Recipient name must be at least 2 characters')
      .max(100, 'Recipient name cannot exceed 100 characters')
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+ -]{10,15}$/, 'Invalid phone number format')
      .optional(),
    addressLine1: z
      .string()
      .trim()
      .min(5, 'Street address must be at least 5 characters')
      .max(200, 'Street address cannot exceed 200 characters')
      .optional(),
    addressLine2: z
      .string()
      .trim()
      .max(200, 'Address line 2 cannot exceed 200 characters')
      .optional()
      .nullable(),
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(100, 'City cannot exceed 100 characters')
      .optional(),
    state: z
      .string()
      .trim()
      .min(2, 'State must be at least 2 characters')
      .max(100, 'State cannot exceed 100 characters')
      .optional(),
    postalCode: z
      .string()
      .trim()
      .regex(/^[1-9][0-9]{5}$/, 'Must be a valid 6-digit Indian PIN code')
      .optional(),
    country: z.string().trim().optional(),
    isDefault: z.boolean().optional(),
  }),
});

// Authenticated Customer Address Endpoints
router.get('/addresses', authenticate, getUserAddresses);
router.post('/addresses', authenticate, validate(createAddressSchema), createAddress);
router.put('/addresses/:id', authenticate, validate(updateAddressSchema), updateAddress);
router.delete('/addresses/:id', authenticate, deleteAddress);
router.patch('/addresses/:id/default', authenticate, setDefaultAddress);

export default router;
