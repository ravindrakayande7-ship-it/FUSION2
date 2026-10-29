import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Ingredient name is required'],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      index: true,
    },
    stock: {
      type: Number,
      required: [true, 'Stock count is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    unit: {
      type: String,
      required: [true, 'Unit of measurement is required'],
      default: 'g',
    },
    minThreshold: {
      type: Number,
      default: 20,
    },
    unitCost: {
      type: Number,
      required: [true, 'Unit cost is required'],
      min: [0, 'Cost cannot be negative'],
    },
    supplierId: {
      type: String,
      ref: 'Supplier',
    },
    expiryDate: {
      type: String,
    },
    lastUpdated: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
  },
  {
    timestamps: true,
  }
);

inventorySchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `ing-${Date.now()}`;
  }
  next();
});

export const Inventory = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
export default Inventory;
