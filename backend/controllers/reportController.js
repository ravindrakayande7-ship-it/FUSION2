import { Order } from '../models/Order.js';
import { Expense } from '../models/Expense.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getReportAnalytics = async (req, res, next) => {
  try {
    const { range = '30d', startDate, endDate } = req.query;

    let ordersList = [];
    let expensesList = [];

    if (mongoose.connection.readyState === 1) {
      ordersList = await Order.find().lean();
      expensesList = await Expense.find().lean();
    } else {
      ordersList = fallbackStore.orders;
      expensesList = fallbackStore.expenses;
    }

    // Filter by date range
    const now = new Date();
    let cutoff = new Date(0);
    if (range === 'today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '30d') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filteredOrders = ordersList.filter((o) => {
      const orderDate = new Date(o.createdAt);
      if (startDate && new Date(o.createdAt) < new Date(startDate)) return false;
      if (endDate && new Date(o.createdAt) > new Date(endDate)) return false;
      if (!startDate && !endDate && range !== 'all') {
        return orderDate >= cutoff;
      }
      return true;
    });

    const filteredExpenses = expensesList.filter((e) => {
      const expDate = new Date(e.date);
      if (startDate && new Date(e.date) < new Date(startDate)) return false;
      if (endDate && new Date(e.date) > new Date(endDate)) return false;
      if (!startDate && !endDate && range !== 'all') {
        return expDate >= cutoff;
      }
      return true;
    });

    const validOrders = filteredOrders.filter((o) => o.status !== 'Cancelled');
    const grossRevenue = validOrders.reduce((acc, o) => acc + (Number(o.total) || 0), 0);
    const totalOrdersCount = validOrders.length;
    const avgOrderValue = totalOrdersCount > 0 ? grossRevenue / totalOrdersCount : 0;

    const totalCOGS = validOrders.reduce((acc, o) => {
      return (
        acc +
        (o.items || []).reduce(
          (itemAcc, item) => itemAcc + (Number(item.cost) || 0) * (Number(item.quantity) || 1),
          0
        )
      );
    }, 0);

    const grossProfit = Math.max(0, grossRevenue - totalCOGS);
    const operatingExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
    const netProfit = grossProfit - operatingExpenses;

    // Payment methods
    const paymentMap = {};
    validOrders.forEach((o) => {
      const m = o.paymentMethod || 'Cash';
      paymentMap[m] = (paymentMap[m] || 0) + (Number(o.total) || 0);
    });

    const paymentBreakdown = Object.entries(paymentMap).map(([method, amount]) => ({
      method,
      amount,
      percentage: grossRevenue > 0 ? Math.round((amount / grossRevenue) * 100) : 0,
    }));

    // Category breakdown
    const categoryMap = {};
    validOrders.forEach((o) => {
      (o.items || []).forEach((item) => {
        const cat = item.category || 'Hot Coffee';
        categoryMap[cat] = (categoryMap[cat] || 0) + (Number(item.totalItemPrice) || 0);
      });
    });

    const categoryBreakdown = Object.entries(categoryMap).map(([category, amount]) => ({
      category,
      amount,
    }));

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          grossRevenue: Math.round(grossRevenue * 100) / 100,
          totalOrdersCount,
          avgOrderValue: Math.round(avgOrderValue * 100) / 100,
          totalCOGS: Math.round(totalCOGS * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          operatingExpenses: Math.round(operatingExpenses * 100) / 100,
          netProfit: Math.round(netProfit * 100) / 100,
          grossMarginPct: grossRevenue > 0 ? Math.round((grossProfit / grossRevenue) * 100) : 0,
        },
        paymentBreakdown,
        categoryBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getReportAnalytics,
};
