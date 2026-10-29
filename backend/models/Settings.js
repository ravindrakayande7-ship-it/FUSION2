import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    cafeName: {
      type: String,
      required: true,
      default: 'FUSION Coffee Roasters',
    },
    tagline: {
      type: String,
      default: 'Brew Better. Manage Smarter.',
    },
    address: {
      type: String,
      default: '14, Brigade Gateway Enclave, Malleshwaram, Bengaluru, Karnataka 560055',
    },
    phone: {
      type: String,
      default: '+91 98765 43210',
    },
    email: {
      type: String,
      default: 'hello@fusioncoffee.in',
    },
    gstin: {
      type: String,
      default: '29ABCDE1234F1Z5',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    currencySymbol: {
      type: String,
      default: '₹',
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata',
    },
    taxRatePercent: {
      type: Number,
      default: 5.0,
      min: 0,
    },
    receiptFooterMessage: {
      type: String,
      default: 'Thank you for stopping by FUSION! Brewed fresh with love.',
    },
    lowStockThresholdDefault: {
      type: Number,
      default: 20,
    },
    autoDeductInventory: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
export default Settings;
