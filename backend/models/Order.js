import mongoose from 'mongoose';

const orderItemCustomizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    cost: { type: Number, default: 0, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    size: { type: String, default: 'Standard' },
    customizations: [orderItemCustomizationSchema],
    notes: { type: String, default: '' },
    totalItemPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Walk-in Guest',
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
    },
    orderType: {
      type: String,
      enum: ['Dine-in', 'Takeaway'],
      default: 'Dine-in',
    },
    tableNumber: {
      type: String,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountReason: {
      type: String,
    },
    tax: {
      type: Number,
      default: 0,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['UPI', 'Cash', 'Card', 'Other'],
      default: 'Cash',
    },
    paymentStatus: {
      type: String,
      default: 'Paid',
    },
    isSimulatedPayment: {
      type: Boolean,
      default: false,
    },
    razorpayOrderId: {
      type: String,
      trim: true,
    },
    razorpayPaymentId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },
    razorpaySignature: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      default: 'Confirmed',
      index: true,
    },
    assignedStaff: {
      type: String,
      default: 'Kitchen Staff',
    },
    notes: {
      type: String,
    },
    inventoryDeducted: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

orderSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }
  next();
});

export const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);
export default Order;
