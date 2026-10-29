import { Product } from '../models/Product.js';
import { fallbackStore } from '../services/storageFallback.js';
import mongoose from 'mongoose';

export const getProducts = async (req, res, next) => {
  try {
    const { category, search, available } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (category && category !== 'All') {
        query.category = category;
      }
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { sku: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }
      if (available !== undefined) {
        query.available = available === 'true';
      }

      const products = await Product.find(query).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ success: true, count: products.length, data: products });
    }

    // Fallback in-memory
    let products = [...fallbackStore.products];
    if (category && category !== 'All') {
      products = products.filter((p) => p.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.sku?.toLowerCase().includes(s) ||
          p.description?.toLowerCase().includes(s)
      );
    }
    if (available !== undefined) {
      const isAvail = available === 'true';
      products = products.filter((p) => p.available === isAvail);
    }

    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    next(error);
  }
};

export const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (mongoose.connection.readyState === 1) {
      const product = await Product.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      }).lean();
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.status(200).json({ success: true, data: product });
    }

    const product = fallbackStore.products.find((p) => p.id === id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const {
      name,
      category,
      price,
      cost,
      description,
      sku,
      prepTime,
      available,
      sizes,
      recipe,
      image,
    } = req.body;

    if (!name || price === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, and price',
      });
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
    }

    const id = `prod-${Date.now()}`;
    const newProductData = {
      id,
      name: name.trim(),
      category: category.trim(),
      price: numPrice,
      cost: Math.max(0, Number(cost) || 0),
      description: (description || '').trim(),
      sku: (sku || `SKU-${Date.now().toString().slice(-4)}`).trim(),
      prepTime: Math.max(1, Number(prepTime) || 3),
      available: available !== undefined ? Boolean(available) : true,
      sizes: Array.isArray(sizes) && sizes.length > 0 ? sizes : [{ name: 'Standard', priceDelta: 0 }],
      recipe: Array.isArray(recipe) ? recipe : [],
      image: image || '/src/assets/images/coffee_cappuccino_1792072634092.jpg',
    };

    if (mongoose.connection.readyState === 1) {
      const product = await Product.create(newProductData);
      return res.status(201).json({
        success: true,
        message: `Product "${product.name}" created successfully`,
        data: product,
      });
    }

    fallbackStore.products.unshift(newProductData);
    return res.status(201).json({
      success: true,
      message: `Product "${newProductData.name}" created successfully`,
      data: newProductData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.price !== undefined && (isNaN(Number(updates.price)) || Number(updates.price) < 0)) {
      return res.status(400).json({ success: false, message: 'Price must be a non-negative number' });
    }

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findOneAndUpdate(
        { $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }] },
        updates,
        { new: true, runValidators: true }
      );
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: product,
      });
    }

    const idx = fallbackStore.products.findIndex((p) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    fallbackStore.products[idx] = { ...fallbackStore.products[idx], ...updates };
    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: fallbackStore.products[idx],
    });
  } catch (error) {
    next(error);
  }
};

export const toggleAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findOne({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      product.available = !product.available;
      await product.save();
      return res.status(200).json({
        success: true,
        message: `Product availability updated to ${product.available}`,
        data: product,
      });
    }

    const target = fallbackStore.products.find((p) => p.id === id);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    target.available = !target.available;
    return res.status(200).json({
      success: true,
      message: `Product availability updated to ${target.available}`,
      data: target,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const product = await Product.findOneAndDelete({
        $or: [{ id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      return res.status(200).json({ success: true, message: 'Product removed' });
    }

    const initialLength = fallbackStore.products.length;
    fallbackStore.products = fallbackStore.products.filter((p) => p.id !== id);
    if (fallbackStore.products.length === initialLength) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    return res.status(200).json({ success: true, message: 'Product removed' });
  } catch (error) {
    next(error);
  }
};

export default {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleAvailability,
  deleteProduct,
};
