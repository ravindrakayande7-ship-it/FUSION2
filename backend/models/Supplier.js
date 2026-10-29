import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Supplier company name is required'],
      trim: true,
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    itemsSupplied: {
      type: String,
      trim: true,
      default: '',
    },
    outstandingBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentTerms: {
      type: String,
      default: 'Net 30',
    },
  },
  {
    timestamps: true,
  }
);

supplierSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `sup-${Date.now()}`;
  }
  next();
});

export const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
export default Supplier;
