import mongoose from 'mongoose';

const paymentAttemptSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true, index: true },
    razorpayPaymentId: { type: String, sparse: true, unique: true, index: true },
    staffId: { type: String, required: true, index: true },
    amountPaise: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ['INR'], default: 'INR' },
    fingerprint: { type: String, required: true },
    checkoutData: { type: mongoose.Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ['created', 'verified', 'consumed', 'failed', 'expired'],
      default: 'created',
      index: true,
    },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    verifiedAt: Date,
    consumedAt: Date,
  },
  { timestamps: true }
);

export const PaymentAttempt =
  mongoose.models.PaymentAttempt || mongoose.model('PaymentAttempt', paymentAttemptSchema);
export default PaymentAttempt;
