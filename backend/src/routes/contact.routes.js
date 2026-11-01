import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { submitInquiry } from '../controllers/contact.controller.js';

const router = express.Router();

const contactInquirySchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'Client name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email address is required' })
      .trim()
      .email('Please provide a valid email address')
      .max(150, 'Email cannot exceed 150 characters'),
    phone: z
      .string()
      .trim()
      .max(30, 'Phone number cannot exceed 30 characters')
      .optional()
      .nullable(),
    subject: z
      .string()
      .trim()
      .max(200, 'Subject cannot exceed 200 characters')
      .optional()
      .nullable(),
    message: z
      .string({ required_error: 'Message content is required' })
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(3000, 'Message cannot exceed 3000 characters'),
    hp_field: z.string().optional().nullable(),
  }),
});

// Public Contact Form Submission
router.post('/', contactLimiter, validate(contactInquirySchema), submitInquiry);

export default router;
