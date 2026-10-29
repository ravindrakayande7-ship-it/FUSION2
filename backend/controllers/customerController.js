import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getCustomers = async (req, res, next) => {
  try {
    const { search, sortBy = 'totalSpend', order = 'desc' } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }
      const sortOrder = order === 'asc' ? 1 : -1;
      const customers = await Customer.find(query).sort({ [sortBy]: sortOrder }).lean();
      return res.status(200).json({ success: true, count: customers.length, data: customers });
    }

    let customers = [...fallbackStore.customers];
    if (search) {
      const s = search.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(s) ||
          c.phone?.includes(s) ||
          c.email?.toLowerCase().includes(s)
      );
    }
    customers.sort((a, b) => {
      if (order === 'asc') return (a[sortBy] || 0) > (b[sortBy] || 0) ? 1 : -1;
      return (a[sortBy] || 0) < (b[sortBy] || 0) ? 1 : -1;
    });
    return res.status(200).json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    next(error);
  }
};

export const getCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const customer = await Customer.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      }).lean();

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const customerOrders = await Order.find({
        $or: [{ customerPhone: customer.phone }, { customerName: customer.name }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return res
        .status(200)
        .json({ success: true, data: { ...customer, orderHistory: customerOrders } });
    }

    const customer = fallbackStore.customers.find((c) => c.id === id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customerOrders = fallbackStore.orders
      .filter(
        (o) =>
          (customer.phone && o.customerPhone === customer.phone) ||
          o.customerName?.toLowerCase() === customer.name.toLowerCase()
      )
      .slice(0, 10);

    return res
      .status(200)
      .json({ success: true, data: { ...customer, orderHistory: customerOrders } });
  } catch (error) {
    next(error);
  }
};

export const createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, favoriteItem } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }

    const newCust = {
      id: `cust-${Date.now()}`,
      name: name.trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim().toLowerCase(),
      totalOrders: 0,
      totalSpend: 0,
      loyaltyPoints: 10,
      favoriteItem: favoriteItem || '',
      lastVisit: new Date().toISOString().split('T')[0],
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Customer.create(newCust);
      return res
        .status(201)
        .json({ success: true, message: `Customer "${name}" registered`, data: created });
    }

    fallbackStore.customers.unshift(newCust);
    return res
      .status(201)
      .json({ success: true, message: `Customer "${name}" registered`, data: newCust });
  } catch (error) {
    next(error);
  }
};

export const updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (mongoose.connection.readyState === 1) {
      const customer = await Customer.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { new: true, runValidators: true }
      );
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      return res
        .status(200)
        .json({ success: true, message: 'Customer details updated', data: customer });
    }

    const idx = fallbackStore.customers.findIndex((c) => c.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    fallbackStore.customers[idx] = { ...fallbackStore.customers[idx], ...updates };
    return res
      .status(200)
      .json({ success: true, message: 'Customer details updated', data: fallbackStore.customers[idx] });
  } catch (error) {
    next(error);
  }
};

export const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const customer = await Customer.findOneAndDelete({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      return res.status(200).json({ success: true, message: 'Customer removed' });
    }

    const len = fallbackStore.customers.length;
    fallbackStore.customers = fallbackStore.customers.filter((c) => c.id !== id);
    if (fallbackStore.customers.length === len) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    return res.status(200).json({ success: true, message: 'Customer removed' });
  } catch (error) {
    next(error);
  }
};

export default {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
