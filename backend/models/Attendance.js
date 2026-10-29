import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      unique: true,
      index: true,
    },
    staffId: {
      type: String,
      required: true,
      index: true,
    },
    staffName: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
      index: true,
    },
    checkIn: {
      type: String,
      required: true,
    },
    checkOut: {
      type: String,
    },
    status: {
      type: String,
      enum: ['Present', 'Late', 'Half Day', 'Absent'],
      default: 'Present',
    },
    hoursWorked: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

attendanceSchema.index({ staffId: 1, date: 1 });

attendanceSchema.pre('save', function (next) {
  if (!this.id) {
    this.id = `att-${Date.now()}`;
  }
  next();
});

export const Attendance =
  mongoose.models.Attendance || mongoose.model('Attendance', attendanceSchema);
export default Attendance;
