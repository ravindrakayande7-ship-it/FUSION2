import { Supplier } from '../models/Supplier.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getSuppliers = async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const suppliers = await Supplier.find().sort({ name: 1 }).lean();
      return res.status(200).json({ success: true, count: suppliers.length, data: suppliers });
    }
    return res.status(200).json({
      success: true,
      count: fallbackStore.suppliers.length,
      data: fallbackStore.suppliers,
    });
  } catch (error) {
    next(error);
  }
};

export const createSupplier = async (req, res, next) => {
  try {
    const {
      name,
      contactPerson,
      phone,
      email,
      itemsSupplied,
      outstandingBalance = 0,
      paymentTerms = 'Net 30',
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const newSupplier = {
      id: `sup-${Date.now()}`,
      name: name.trim(),
      contactPerson: (contactPerson || '').trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim().toLowerCase(),
      itemsSupplied: (itemsSupplied || '').trim(),
      outstandingBalance: Math.max(0, Number(outstandingBalance) || 0),
      paymentTerms: paymentTerms || 'Net 30',
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Supplier.create(newSupplier);
      return res.status(201).json({
        success: true,
        message: `Supplier "${name}" added`,
        data: created,
      });
    }

    fallbackStore.suppliers.push(newSupplier);
    return res.status(201).json({
      success: true,
      message: `Supplier "${name}" added`,
      data: newSupplier,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (mongoose.connection.readyState === 1) {
      const supplier = await Supplier.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { returnDocument: 'after', runValidators: true }
      );
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      return res.status(200).json({ success: true, message: 'Supplier updated', data: supplier });
    }

    const idx = fallbackStore.suppliers.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    fallbackStore.suppliers[idx] = { ...fallbackStore.suppliers[idx], ...updates };
    return res.status(200).json({
      success: true,
      message: 'Supplier updated',
      data: fallbackStore.suppliers[idx],
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const supplier = await Supplier.findOneAndDelete({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      return res.status(200).json({ success: true, message: 'Supplier removed' });
    }

    const initialLen = fallbackStore.suppliers.length;
    fallbackStore.suppliers = fallbackStore.suppliers.filter((s) => s.id !== id);
    if (fallbackStore.suppliers.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    return res.status(200).json({ success: true, message: 'Supplier removed' });
  } catch (error) {
    next(error);
  }
};

export const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amountPaid } = req.body;
    const amount = Number(amountPaid);

    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide valid positive payment amount',
      });
    }

    if (mongoose.connection.readyState === 1) {
      const supplier = await Supplier.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!supplier) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }
      supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - amount);
      await supplier.save();
      return res.status(200).json({
        success: true,
        message: 'Payment recorded against balance',
        data: supplier,
      });
    }

    const supplier = fallbackStore.suppliers.find((s) => s.id === id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - amount);
    return res.status(200).json({
      success: true,
      message: 'Payment recorded against balance',
      data: supplier,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  recordPayment,
};
