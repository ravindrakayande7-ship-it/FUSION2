import { Inventory } from '../models/Inventory.js';
import { Expense } from '../models/Expense.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getInventory = async (req, res, next) => {
  try {
    const { category, search, lowStockOnly } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (category && category !== 'All') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
        ];
      }
      if (lowStockOnly === 'true') {
        query.$expr = { $lte: ['$stock', '$minThreshold'] };
      }

      const items = await Inventory.find(query).sort({ name: 1 }).lean();
      return res.status(200).json({ success: true, count: items.length, data: items });
    }

    let items = [...fallbackStore.inventory];
    if (category && category !== 'All') {
      items = items.filter((i) => i.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(s) || i.sku?.toLowerCase().includes(s)
      );
    }
    if (lowStockOnly === 'true') {
      items = items.filter((i) => (Number(i.stock) || 0) <= (Number(i.minThreshold) || 0));
    }
    return res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    next(error);
  }
};

export const getInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const item = await Inventory.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      }).lean();
      if (!item) {
        return res.status(404).json({ success: false, message: 'Ingredient not found' });
      }
      return res.status(200).json({ success: true, data: item });
    }

    const item = fallbackStore.inventory.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    return res.status(200).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
};

export const createInventoryItem = async (req, res, next) => {
  try {
    const {
      name,
      category,
      stock,
      unit,
      minThreshold,
      unitCost,
      sku,
      supplierId,
      expiryDate,
    } = req.body;

    if (!name || stock === undefined || !unit || unitCost === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, stock, unit, and unit cost',
      });
    }

    const numStock = Number(stock);
    const numCost = Number(unitCost);

    if (isNaN(numStock) || numStock < 0 || isNaN(numCost) || numCost < 0) {
      return res.status(400).json({
        success: false,
        message: 'Stock and unit cost must be non-negative numbers',
      });
    }

    const id = `ing-${Date.now()}`;
    const newItemData = {
      id,
      name: name.trim(),
      category: (category || 'General').trim(),
      stock: numStock,
      unit: unit.trim(),
      minThreshold: Math.max(0, Number(minThreshold) || 20),
      unitCost: numCost,
      sku: (sku || `SKU-${Date.now().toString().slice(-4)}`).trim(),
      supplierId: supplierId || undefined,
      expiryDate: expiryDate || undefined,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    if (mongoose.connection.readyState === 1) {
      const created = await Inventory.create(newItemData);
      return res.status(201).json({
        success: true,
        message: `Ingredient "${name}" added to inventory`,
        data: created,
      });
    }

    fallbackStore.inventory.unshift(newItemData);
    return res.status(201).json({
      success: true,
      message: `Ingredient "${name}" added to inventory`,
      data: newItemData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateInventoryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body, lastUpdated: new Date().toISOString().split('T')[0] };

    if (updates.stock !== undefined && (isNaN(Number(updates.stock)) || Number(updates.stock) < 0)) {
      return res.status(400).json({ success: false, message: 'Stock must be a non-negative number' });
    }

    if (mongoose.connection.readyState === 1) {
      const item = await Inventory.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { returnDocument: 'after', runValidators: true }
      );
      if (!item) {
        return res.status(404).json({ success: false, message: 'Ingredient not found' });
      }
      return res.status(200).json({ success: true, message: 'Ingredient updated', data: item });
    }

    const idx = fallbackStore.inventory.findIndex((i) => i.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    fallbackStore.inventory[idx] = { ...fallbackStore.inventory[idx], ...updates };
    return res.status(200).json({
      success: true,
      message: 'Ingredient updated',
      data: fallbackStore.inventory[idx],
    });
  } catch (error) {
    next(error);
  }
};

export const adjustStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deltaQty, reason = 'Inventory Adjustment' } = req.body;

    if (deltaQty === undefined || isNaN(Number(deltaQty))) {
      return res.status(400).json({ success: false, message: 'Please provide numeric deltaQty' });
    }

    const delta = Number(deltaQty);
    const dateStr = new Date().toISOString().split('T')[0];

    if (mongoose.connection.readyState === 1) {
      const item = await Inventory.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Ingredient not found' });
      }
      item.stock = Math.max(0, Math.round((item.stock + delta) * 100) / 100);
      item.lastUpdated = dateStr;
      await item.save();
      return res.status(200).json({
        success: true,
        message: `Stock adjusted by ${delta > 0 ? '+' : ''}${delta} (${reason})`,
        data: item,
      });
    }

    const item = fallbackStore.inventory.find((i) => i.id === id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    item.stock = Math.max(0, Math.round((item.stock + delta) * 100) / 100);
    item.lastUpdated = dateStr;
    return res.status(200).json({
      success: true,
      message: `Stock adjusted by ${delta > 0 ? '+' : ''}${delta} (${reason})`,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const recordWastage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { wastageQty, reason = 'Spoilage / Spill' } = req.body;

    if (!wastageQty || isNaN(Number(wastageQty)) || Number(wastageQty) <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide valid positive wastageQty' });
    }

    const qty = Number(wastageQty);
    const dateStr = new Date().toISOString().split('T')[0];
    let targetItem = null;

    if (mongoose.connection.readyState === 1) {
      targetItem = await Inventory.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!targetItem) {
        return res.status(404).json({ success: false, message: 'Ingredient not found' });
      }
      targetItem.stock = Math.max(0, Math.round((targetItem.stock - qty) * 100) / 100);
      targetItem.lastUpdated = dateStr;
      await targetItem.save();

      const wastageCost = Math.round(targetItem.unitCost * qty);
      let expenseRecord = null;
      if (wastageCost > 0) {
        expenseRecord = await Expense.create({
          id: `exp-${Date.now()}`,
          title: `Wastage: ${targetItem.name} (${reason})`,
          category: 'Ingredients',
          amount: wastageCost,
          date: dateStr,
          paymentMethod: 'Other',
          notes: `Recorded stock wastage of ${qty} ${targetItem.unit}. Reason: ${reason}`,
        });
      }
      return res.status(200).json({
        success: true,
        message: `Recorded wastage of ${qty} ${targetItem.unit}`,
        data: targetItem,
        expense: expenseRecord,
      });
    }

    targetItem = fallbackStore.inventory.find((i) => i.id === id);
    if (!targetItem) {
      return res.status(404).json({ success: false, message: 'Ingredient not found' });
    }
    targetItem.stock = Math.max(0, Math.round((targetItem.stock - qty) * 100) / 100);
    targetItem.lastUpdated = dateStr;

    const wastageCost = Math.round(targetItem.unitCost * qty);
    let newExpense = null;
    if (wastageCost > 0) {
      newExpense = {
        id: `exp-${Date.now()}`,
        title: `Wastage: ${targetItem.name} (${reason})`,
        category: 'Ingredients',
        amount: wastageCost,
        date: dateStr,
        paymentMethod: 'Other',
        notes: `Recorded stock wastage of ${qty} ${targetItem.unit}. Reason: ${reason}`,
      };
      fallbackStore.expenses.unshift(newExpense);
    }

    return res.status(200).json({
      success: true,
      message: `Recorded wastage of ${qty} ${targetItem.unit}`,
      data: targetItem,
      expense: newExpense,
    });
  } catch (error) {
    next(error);
  }
};

export const getLowStockAlerts = async (_req, res, next) => {
  try {
    let items = [];
    if (mongoose.connection.readyState === 1) {
      items = await Inventory.find({
        $expr: { $lte: ['$stock', '$minThreshold'] },
      }).lean();
    } else {
      items = fallbackStore.inventory.filter((i) => i.stock <= i.minThreshold);
    }
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  recordWastage,
  getLowStockAlerts,
};
