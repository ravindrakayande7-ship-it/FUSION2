import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Staff name is required'],
      trim: true,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: ['Owner', 'Manager', 'Barista', 'Cashier'],
      default: 'Barista',
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
    shift: {
      type: String,
      default: 'Morning (07:00 - 15:00)',
    },
    status: {
      type: String,
      enum: ['Active', 'On Leave', 'Inactive'],
      default: 'Active',
    },
    joiningDate: {
      type: String,
      default: () => new Date().toISOString().split('T')[0],
    },
    monthlySalary: {
      type: Number,
      default: 25000,
      min: 0,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

staffSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `stf-${Date.now()}`;
  }
  next();
});

export const Staff = mongoose.models.Staff || mongoose.model('Staff', staffSchema);
export default Staff;
