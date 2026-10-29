import { Settings } from '../models/Settings.js';
import { Supplier } from '../models/Supplier.js';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Staff } from '../models/Staff.js';
import { Attendance } from '../models/Attendance.js';
import { Order } from '../models/Order.js';
import { Expense } from '../models/Expense.js';
import { fallbackStore } from '../services/storageFallback.js';
import { seedDatabase } from '../services/seedService.js';
import mongoose from 'mongoose';

export const getSettings = async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      let settings = await Settings.findOne().lean();
      if (!settings) {
        settings = await Settings.create(fallbackStore.settings);
      }
      return res.status(200).json({ success: true, data: settings });
    }
    return res.status(200).json({ success: true, data: fallbackStore.settings });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const updates = req.body;

    if (mongoose.connection.readyState === 1) {
      let settings = await Settings.findOne();
      if (!settings) {
        settings = await Settings.create(updates);
      } else {
        Object.assign(settings, updates);
        await settings.save();
      }
      return res
        .status(200)
        .json({ success: true, message: 'Settings updated successfully', data: settings });
    }

    fallbackStore.settings = { ...fallbackStore.settings, ...updates };
    return res
      .status(200)
      .json({ success: true, message: 'Settings updated successfully', data: fallbackStore.settings });
  } catch (error) {
    next(error);
  }
};

export const resetDemoData = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_RESET !== 'true') {
      return res.status(403).json({
        success: false,
        message: 'Database reset is strictly disabled in production mode.',
      });
    }

    if (mongoose.connection.readyState === 1) {
      await seedDatabase(true);
      const settings = await Settings.findOne().lean();
      return res.status(200).json({
        success: true,
        message: 'All cafe collections reset to fresh demo default in MongoDB',
        data: settings,
      });
    }

    fallbackStore.reset();
    return res.status(200).json({
      success: true,
      message: 'All cafe collections reset to fresh demo default in memory store',
      data: fallbackStore.settings,
    });
  } catch (error) {
    next(error);
  }
};

export const getFullBackup = async (_req, res, next) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const staffList = (await Staff.find().lean()).map((s) => {
        const rest = { ...s };
        delete rest.password;
        return rest;
      });

      const backup = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: await Settings.findOne().lean(),
        suppliers: await Supplier.find().lean(),
        inventory: await Inventory.find().lean(),
        products: await Product.find().lean(),
        customers: await Customer.find().lean(),
        staff: staffList,
        attendance: await Attendance.find().lean(),
        orders: await Order.find().lean(),
        expenses: await Expense.find().lean(),
      };
      return res.status(200).json(backup);
    }

    const fallbackStaff = fallbackStore.staff.map((s) => {
      const rest = { ...s };
      delete rest.password;
      return rest;
    });

    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      settings: fallbackStore.settings,
      suppliers: fallbackStore.suppliers,
      inventory: fallbackStore.inventory,
      products: fallbackStore.products,
      customers: fallbackStore.customers,
      staff: fallbackStaff,
      attendance: fallbackStore.attendance,
      orders: fallbackStore.orders,
      expenses: fallbackStore.expenses,
    };
    return res.status(200).json(backup);
  } catch (error) {
    next(error);
  }
};

export default {
  getSettings,
  updateSettings,
  resetDemoData,
  getFullBackup,
};
