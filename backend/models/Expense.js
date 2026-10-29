import mongoose from 'mongoose';

const expenseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Expense title is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Expense category is required'],
      enum: [
        'Rent',
        'Electricity',
        'Ingredients',
        'Equipment',
        'Maintenance',
        'Packaging',
        'Marketing',
        'Salary',
        'Water',
        'Other',
      ],
      default: 'Other',
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be positive'],
    },
    date: {
      type: String,
      required: true,
      default: () => new Date().toISOString().split('T')[0],
      index: true,
    },
    paymentMethod: {
      type: String,
      default: 'Bank Transfer',
    },
    supplierId: {
      type: String,
      ref: 'Supplier',
    },
    notes: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

expenseSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `exp-${Date.now()}`;
  }
  next();
});

export const Expense = mongoose.models.Expense || mongoose.model('Expense', expenseSchema);
export default Expense;
