import { Expense } from '../models/Expense.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getExpenses = async (req, res, next) => {
  try {
    const { category, search, startDate, endDate } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (category && category !== 'All') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { notes: { $regex: search, $options: 'i' } },
        ];
      }
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const expenses = await Expense.find(query).sort({ date: -1, createdAt: -1 }).lean();
      const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      return res
        .status(200)
        .json({ success: true, count: expenses.length, totalAmount, data: expenses });
    }

    let expenses = [...fallbackStore.expenses];
    if (category && category !== 'All') {
      expenses = expenses.filter((e) => e.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      expenses = expenses.filter(
        (e) => e.title.toLowerCase().includes(s) || e.notes?.toLowerCase().includes(s)
      );
    }
    if (startDate) {
      expenses = expenses.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      expenses = expenses.filter((e) => e.date <= endDate);
    }
    const totalAmount = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return res
      .status(200)
      .json({ success: true, count: expenses.length, totalAmount, data: expenses });
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req, res, next) => {
  try {
    const {
      title,
      category,
      amount,
      date,
      paymentMethod = 'Bank Transfer',
      notes,
      supplierId,
    } = req.body;

    if (!title || amount === undefined) {
      return res
        .status(400)
        .json({ success: false, message: 'Expense title and amount are required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const newExpense = {
      id: `exp-${Date.now()}`,
      title: title.trim(),
      category: category || 'Other',
      amount: numAmount,
      date: date || new Date().toISOString().split('T')[0],
      paymentMethod,
      notes: (notes || '').trim(),
      supplierId: supplierId || undefined,
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Expense.create(newExpense);
      return res
        .status(201)
        .json({ success: true, message: `Expense "${title}" recorded`, data: created });
    }

    fallbackStore.expenses.unshift(newExpense);
    return res
      .status(201)
      .json({ success: true, message: `Expense "${title}" recorded`, data: newExpense });
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const expense = await Expense.findOneAndDelete({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!expense) {
        return res.status(404).json({ success: false, message: 'Expense not found' });
      }
      return res.status(200).json({ success: true, message: 'Expense removed' });
    }

    const len = fallbackStore.expenses.length;
    fallbackStore.expenses = fallbackStore.expenses.filter((e) => e.id !== id);
    if (fallbackStore.expenses.length === len) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    return res.status(200).json({ success: true, message: 'Expense removed' });
  } catch (error) {
    next(error);
  }
};

export default {
  getExpenses,
  createExpense,
  deleteExpense,
};
