import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalSpend: {
      type: Number,
      default: 0,
      min: 0,
    },
    loyaltyPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    favoriteItem: {
      type: String,
      default: '',
    },
    lastVisit: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
  },
  {
    timestamps: true,
  }
);

customerSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `cust-${Date.now()}`;
  }
  next();
});

export const Customer = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
export default Customer;
