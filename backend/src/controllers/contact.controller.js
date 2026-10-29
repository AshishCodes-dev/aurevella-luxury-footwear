import mongoose from 'mongoose';
import Inquiry from '../models/Inquiry.js';

/**
 * POST /api/contact
 * Public inquiry submission endpoint.
 *
 * Protections:
 * - Anti-bot honeypot check (silently returns 200 with zero DB writes if filled)
 * - CSRF & Origin Guard (via global middleware)
 * - Dedicated 5 req/15 min rate limiter (via contactLimiter)
 * - NoSQL injection sanitization (via global middleware)
 * - Zod schema validation
 */
export const submitInquiry = async (req, res, next) => {
  try {
    const { name, email, phone, subject, message, hp_field } = req.body;

    // 1. Anti-Bot Honeypot Defense:
    // Legitimate users will not see or populate the hidden hp_field.
    // If populated, silently succeed without writing to the database.
    if (hp_field && typeof hp_field === 'string' && hp_field.trim().length > 0) {
      return res.status(200).json({
        status: 'success',
        message: 'Your inquiry has been received. Our concierge will be in touch shortly.',
      });
    }

    // 2. Persist legitimate inquiry to database
    const inquiry = await Inquiry.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone && typeof phone === 'string' ? phone.trim() : null,
      subject: subject && typeof subject === 'string' ? subject.trim() : 'General Inquiry',
      message: message.trim(),
      status: 'new',
      ip: req.ip || null,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Your inquiry has been received. Our concierge will be in touch shortly.',
      inquiry: inquiry.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/inquiries
 * Retrieves paginated list of atelier inquiries, newest first.
 * Restricted strictly to authenticated administrators.
 */
export const getAdminInquiries = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = {};

    // Filter by status if specified and valid
    if (req.query.status && ['new', 'read', 'replied'].includes(req.query.status)) {
      filter.status = req.query.status;
    }

    // Filter by search keyword (name, email, subject)
    if (req.query.search && typeof req.query.search === 'string' && req.query.search.trim()) {
      const escaped = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { subject: searchRegex },
      ];
    }

    const [inquiries, total, unreadCount] = await Promise.all([
      Inquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Inquiry.countDocuments(filter),
      Inquiry.countDocuments({ status: 'new' }),
    ]);

    return res.status(200).json({
      status: 'success',
      inquiries: inquiries.map((inq) => inq.toSafeJSON()),
      unreadCount,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/inquiries/:id
 * Retrieves a single inquiry by ID.
 * Restricted strictly to authenticated administrators.
 */
export const getAdminInquiryById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID format',
      });
    }

    const inquiry = await Inquiry.findById(id);
    if (!inquiry) {
      return res.status(404).json({
        status: 'error',
        message: 'Inquiry not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      inquiry: inquiry.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/inquiries/:id/status
 * Updates the response status of an inquiry ('new', 'read', 'replied').
 * Restricted strictly to authenticated administrators.
 */
export const updateAdminInquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid inquiry ID format',
      });
    }

    if (!status || !['new', 'read', 'replied'].includes(status)) {
      return res.status(400).json({
        status: 'error',
        message: 'Status must be one of: new, read, replied',
      });
    }

    const inquiry = await Inquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!inquiry) {
      return res.status(404).json({
        status: 'error',
        message: 'Inquiry not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      message: `Inquiry status updated to ${status}`,
      inquiry: inquiry.toSafeJSON(),
    });
  } catch (error) {
    next(error);
  }
};
