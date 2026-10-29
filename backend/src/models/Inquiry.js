import mongoose from 'mongoose';

/**
 * AUREVELLA — Client Inquiry & Atelier Concierge Model
 *
 * Persists customer inquiries submitted through the public Contact page.
 * Tracks operational response status ('new', 'read', 'replied').
 */
const inquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email address is required'],
      lowercase: true,
      trim: true,
      maxlength: [150, 'Email cannot exceed 150 characters'],
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
      maxlength: [30, 'Phone cannot exceed 30 characters'],
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Inquiry',
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: [3000, 'Message cannot exceed 3000 characters'],
    },
    status: {
      type: String,
      enum: {
        values: ['new', 'read', 'replied'],
        message: 'Status must be one of: new, read, replied',
      },
      default: 'new',
      index: true,
    },
    ip: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Newest inquiries indexed for admin sorting
inquirySchema.index({ createdAt: -1 });

inquirySchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    subject: this.subject,
    message: this.message,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const Inquiry = mongoose.model('Inquiry', inquirySchema);

export default Inquiry;
