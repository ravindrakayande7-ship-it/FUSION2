import { Staff } from '../models/Staff.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getStaff = async (req, res, next) => {
  try {
    const isOwnerOrManager = req.user && ['Owner', 'Manager'].includes(req.user.role);

    if (mongoose.connection.readyState === 1) {
      let staffList = await Staff.find().sort({ role: 1, name: 1 }).lean();
      if (!isOwnerOrManager) {
        staffList = staffList.map(({ monthlySalary: _s, ...rest }) => rest);
      }
      return res.status(200).json({ success: true, count: staffList.length, data: staffList });
    }

    let staffList = [...fallbackStore.staff];
    if (!isOwnerOrManager) {
      staffList = staffList.map(({ monthlySalary: _s, ...rest }) => rest);
    }
    return res.status(200).json({ success: true, count: staffList.length, data: staffList });
  } catch (error) {
    next(error);
  }
};

export const createStaff = async (req, res, next) => {
  try {
    const { name, role = 'Barista', phone, email, shift, monthlySalary } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Staff name is required' });
    }

    // Role escalation check
    if ((role === 'Owner' || role === 'Manager') && req.user?.role !== 'Owner') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only an Owner can create Owner or Manager staff members.',
      });
    }

    const newStaffData = {
      id: `stf-${Date.now()}`,
      name: name.trim(),
      role,
      phone: (phone || '').trim(),
      email: (email || '').trim().toLowerCase(),
      shift: shift || 'Morning (07:00 - 15:00)',
      status: 'Active',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlySalary: Math.max(0, Number(monthlySalary) || 25000),
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Staff.create(newStaffData);
      return res
        .status(201)
        .json({ success: true, message: `Staff member "${name}" added`, data: created });
    }

    fallbackStore.staff.push(newStaffData);
    return res
      .status(201)
      .json({ success: true, message: `Staff member "${name}" added`, data: newStaffData });
  } catch (error) {
    next(error);
  }
};

export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.role && (updates.role === 'Owner' || updates.role === 'Manager') && req.user?.role !== 'Owner') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Only an Owner can promote staff to Owner or Manager.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const staffMember = await Staff.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { new: true, runValidators: true }
      );
      if (!staffMember) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }
      return res
        .status(200)
        .json({ success: true, message: 'Staff details updated', data: staffMember });
    }

    const idx = fallbackStore.staff.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    fallbackStore.staff[idx] = { ...fallbackStore.staff[idx], ...updates };
    return res
      .status(200)
      .json({ success: true, message: 'Staff details updated', data: fallbackStore.staff[idx] });
  } catch (error) {
    next(error);
  }
};

export const toggleStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const member = await Staff.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }
      member.status = member.status === 'Active' ? 'On Leave' : 'Active';
      await member.save();
      return res
        .status(200)
        .json({ success: true, message: `Status updated to ${member.status}`, data: member });
    }

    const member = fallbackStore.staff.find((s) => s.id === id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    member.status = member.status === 'Active' ? 'On Leave' : 'Active';
    return res
      .status(200)
      .json({ success: true, message: `Status updated to ${member.status}`, data: member });
  } catch (error) {
    next(error);
  }
};

export const deleteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const member = await Staff.findOneAndDelete({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!member) {
        return res.status(404).json({ success: false, message: 'Staff member not found' });
      }
      return res.status(200).json({ success: true, message: 'Staff record removed' });
    }

    const len = fallbackStore.staff.length;
    fallbackStore.staff = fallbackStore.staff.filter((s) => s.id !== id);
    if (fallbackStore.staff.length === len) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }
    return res.status(200).json({ success: true, message: 'Staff record removed' });
  } catch (error) {
    next(error);
  }
};

export default {
  getStaff,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff,
};
