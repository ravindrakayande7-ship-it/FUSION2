import { Attendance } from '../models/Attendance.js';
import { Staff } from '../models/Staff.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getAttendance = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (date) {
        query.date = date;
      }
      const records = await Attendance.find(query).sort({ date: -1, createdAt: -1 }).lean();
      return res.status(200).json({ success: true, count: records.length, data: records });
    }

    let records = [...fallbackStore.attendance];
    if (date) {
      records = records.filter((r) => r.date === date);
    }
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};

/**
 * Register Shift Check-In
 * IDOR Protection: Staff can only check in for themselves unless they are Manager or Owner.
 */
export const checkIn = async (req, res, next) => {
  try {
    const { staffId } = req.body;
    const requester = req.user;

    if (!staffId) {
      return res.status(400).json({ success: false, message: 'Please provide staffId' });
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;
    const todayStr = now.toISOString().split('T')[0];
    const status = now.getHours() >= 8 && now.getMinutes() > 0 ? 'Late' : 'Present';

    let staffMember = null;
    let staffName = 'Staff Member';

    if (mongoose.connection.readyState === 1) {
      staffMember = await Staff.findOne({
        $or: [{ id: staffId }, { _id: mongoose.isValidObjectId(staffId) ? staffId : null }],
      });
      if (staffMember) staffName = staffMember.name;
    } else {
      staffMember = fallbackStore.staff.find((s) => s.id === staffId);
      if (staffMember) staffName = staffMember.name;
    }

    if (!staffMember) {
      return res.status(404).json({ success: false, message: 'Staff member record not found.' });
    }

    // IDOR Enforcement:
    // If requester is not Owner or Manager, they can ONLY check in for their own account
    const isPrivileged = requester && (requester.role === 'Owner' || requester.role === 'Manager');
    const isSelf =
      requester &&
      (requester.id === staffMember.id ||
        (staffMember.userId && requester.id === staffMember.userId.toString()) ||
        requester.name?.toLowerCase() === staffMember.name?.toLowerCase() ||
        requester.email?.toLowerCase() === staffMember.email?.toLowerCase());

    if (!isPrivileged && !isSelf) {
      return res.status(403).json({
        success: false,
        message:
          'Forbidden: You can only record attendance for yourself. Manager or Owner authorization is required to punch in for other staff.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const existing = await Attendance.findOne({ staffId: staffMember.id, date: todayStr });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: `${staffName} has already checked in today at ${existing.checkIn}`,
          data: existing,
        });
      }

      const record = await Attendance.create({
        id: `att-${Date.now()}`,
        staffId: staffMember.id,
        staffName,
        date: todayStr,
        checkIn: timeStr,
        status,
        hoursWorked: 0,
      });

      return res.status(201).json({
        success: true,
        message: `Checked in ${staffName} at ${timeStr} (${status})`,
        data: record,
      });
    }

    // Fallback store
    const existing = fallbackStore.attendance.find(
      (a) => a.staffId === staffMember.id && a.date === todayStr
    );
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `${staffName} has already checked in today at ${existing.checkIn}`,
        data: existing,
      });
    }

    const newRecord = {
      id: `att-${Date.now()}`,
      staffId: staffMember.id,
      staffName,
      date: todayStr,
      checkIn: timeStr,
      status,
      hoursWorked: 0,
    };
    fallbackStore.attendance.unshift(newRecord);

    return res.status(201).json({
      success: true,
      message: `Checked in ${staffName} at ${timeStr} (${status})`,
      data: newRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register Shift Check-Out
 * IDOR Protection: Staff can only check out their own attendance unless Manager or Owner.
 */
export const checkOut = async (req, res, next) => {
  try {
    const { attendanceId } = req.body;
    const requester = req.user;

    if (!attendanceId) {
      return res.status(400).json({ success: false, message: 'Please provide attendanceId' });
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    let record = null;
    if (mongoose.connection.readyState === 1) {
      record = await Attendance.findOne({
        $or: [{ id: attendanceId }, { _id: mongoose.isValidObjectId(attendanceId) ? attendanceId : null }],
      });
    } else {
      record = fallbackStore.attendance.find((a) => a.id === attendanceId);
    }

    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }

    if (record.checkOut) {
      return res.status(400).json({
        success: false,
        message: `Staff member already checked out at ${record.checkOut}`,
        data: record,
      });
    }

    // IDOR Check:
    const isPrivileged = requester && (requester.role === 'Owner' || requester.role === 'Manager');
    const isSelf =
      requester &&
      (requester.id === record.staffId ||
        requester.name?.toLowerCase() === record.staffName?.toLowerCase());

    if (!isPrivileged && !isSelf) {
      return res.status(403).json({
        success: false,
        message:
          'Forbidden: You cannot modify attendance records belonging to other staff members.',
      });
    }

    const [inH, inM] = record.checkIn.split(':').map(Number);
    const [outH, outM] = timeStr.split(':').map(Number);
    const diffMinutes = Math.max(0, outH * 60 + outM - (inH * 60 + inM));
    const hours = Number((diffMinutes / 60).toFixed(1));

    record.checkOut = timeStr;
    record.hoursWorked = hours;

    if (mongoose.connection.readyState === 1) {
      await record.save();
    }

    return res.status(200).json({
      success: true,
      message: `Checked out successfully at ${timeStr} (${hours} hrs worked)`,
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAttendance,
  checkIn,
  checkOut,
};
