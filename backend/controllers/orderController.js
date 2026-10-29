import { Order } from '../models/Order.js';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Settings } from '../models/Settings.js';
import { fallbackStore } from '../services/storageFallback.js';
import {
  validateOrderTransition,
  checkIngredientsStock,
  deductRecipeStock,
  restoreRecipeStock,
  getRecipeIngredientTotals,
  generateNextOrderNumber,
} from '../../src/utils/orderLogic.js';
import {
  verifyRazorpaySignature,
  getRazorpayConfig,
} from '../services/razorpayService.js';
import {
  createPaymentAttempt,
  verifyPaymentAttempt,
  getVerifiedPaymentAttempt,
  consumePaymentAttempt,
} from '../services/paymentAttemptService.js';
import { createPaymentFingerprint } from '../services/paymentFingerprint.js';
import mongoose from 'mongoose';

// Helper to detect when MongoDB transactions are unsupported (e.g. standalone instances)
const isTransactionUnsupported = (err) => {
  if (!err) return false;
  const msg = err.message || '';
  return (
    msg.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    msg.includes('This MongoDB deployment does not support retryable writes') ||
    msg.includes('Transactions are not supported') ||
    err.code === 20 ||
    err.codeName === 'IllegalOperation'
  );
};

// Allowed addons catalog with authoritative server-side pricing
const VALID_ADDONS = {
  'extra espresso shot': 35,
  'oat milk alternative': 45,
  'oat milk sub': 45,
  'madagascar vanilla syrup': 25,
  'caramel drizzle': 20,
  'whipped cream': 25,
  'sugar-free stevia': 0,
  'less sweet': 0,
};

// Maximum allowed discount percentages by staff role
const ROLE_DISCOUNT_CAPS = {
  Barista: 10,
  Cashier: 15,
  Manager: 30,
  Owner: 100,
};

export const getOrders = async (req, res, next) => {
  try {
    const { status, paymentMethod, search, limit = 50, page = 1 } = req.query;

    if (mongoose.connection.readyState === 1) {
      const query = {};
      if (status && status !== 'All') {
        query.status = status;
      }
      if (paymentMethod && paymentMethod !== 'All') {
        query.paymentMethod = paymentMethod;
      }
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } },
        ];
      }

      const total = await Order.countDocuments(query);
      const orders = await Order.find(query)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean();

      return res.status(200).json({
        success: true,
        count: orders.length,
        total,
        page: Number(page),
        data: orders,
      });
    }

    // Fallback store
    let orders = [...fallbackStore.orders];
    if (status && status !== 'All') {
      orders = orders.filter((o) => o.status === status);
    }
    if (paymentMethod && paymentMethod !== 'All') {
      orders = orders.filter((o) => o.paymentMethod === paymentMethod);
    }
    if (search) {
      const s = search.toLowerCase();
      orders = orders.filter(
        (o) =>
          o.orderNumber?.toLowerCase().includes(s) ||
          o.customerName?.toLowerCase().includes(s) ||
          o.customerPhone?.includes(s)
      );
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      total: orders.length,
      page: 1,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const order = await Order.findOne({
        $or: [{ id }, { orderNumber: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      }).lean();

      if (!order) {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
      return res.status(200).json({ success: true, data: order });
    }

    const order = fallbackStore.orders.find((o) => o.id === id || o.orderNumber === id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    next(error);
  }
};

export const createOrder = async (req, res, next) => {
  try {
    const {
      items,
      customerName,
      customerPhone,
      orderType = 'Dine-in',
      tableNumber,
      paymentMethod = 'Cash',
      discountPercent = 0,
      discount: directDiscount,
      discountReason,
      notes,
      assignedStaff,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot place order with empty items list',
      });
    }

    // 1. Fetch live settings, inventory, products
    let currentSettings = fallbackStore.settings;
    let inventoryList = fallbackStore.inventory;
    let productsList = fallbackStore.products;
    let existingOrders = fallbackStore.orders;

    if (mongoose.connection.readyState === 1) {
      const dbSettings = await Settings.findOne().lean();
      if (dbSettings) currentSettings = dbSettings;
      inventoryList = await Inventory.find().lean();
      productsList = await Product.find().lean();
      existingOrders = await Order.find({}, 'orderNumber').lean();
    }

    // 2. Strict Server-Side Catalog Verification (Anti-Tampering)
    // Client-supplied prices and costs are NEVER trusted.
    // Invalid quantities, unknown products, or unavailable items are STRICTLY rejected.
    const verifiedItems = [];
    for (const item of items) {
      // Validate quantity: strictly positive integer, no NaN, no silent defaults
      const rawQty = item.quantity;
      if (
        rawQty === undefined ||
        rawQty === null ||
        typeof rawQty !== 'number' ||
        !Number.isInteger(rawQty) ||
        rawQty <= 0 ||
        rawQty > 500
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity '${rawQty}' for item '${item.name || item.productId}'. Quantity must be a positive integer between 1 and 500.`,
        });
      }
      const qty = rawQty;

      // Find product in authoritative catalog
      const catalogProduct = productsList.find(
        (p) =>
          p.id === item.productId ||
          p.id === item.id ||
          (p._id && p._id.toString() === item.productId) ||
          p.name?.toLowerCase() === (item.name || '').toLowerCase()
      );

      if (!catalogProduct) {
        return res.status(400).json({
          success: false,
          message: `Product '${item.name || item.productId}' was not found in the official menu catalog.`,
        });
      }

      if (catalogProduct.available === false) {
        return res.status(400).json({
          success: false,
          message: `Product '${catalogProduct.name}' is currently marked unavailable.`,
        });
      }

      let verifiedUnitPrice = Number(catalogProduct.price);
      if (isNaN(verifiedUnitPrice) || verifiedUnitPrice < 0) {
        return res.status(400).json({
          success: false,
          message: `Catalog price error for product '${catalogProduct.name}'.`,
        });
      }

      // Verify size delta if size specified
      const chosenSize = item.size || 'Standard';
      if (chosenSize !== 'Standard') {
        if (!Array.isArray(catalogProduct.sizes)) {
          return res.status(400).json({
            success: false,
            message: `Product '${catalogProduct.name}' does not support multiple sizes.`,
          });
        }
        const sizeObj = catalogProduct.sizes.find(
          (s) => s.name.toLowerCase() === chosenSize.toLowerCase()
        );
        if (!sizeObj) {
          return res.status(400).json({
            success: false,
            message: `Invalid size '${chosenSize}' specified for product '${catalogProduct.name}'.`,
          });
        }
        verifiedUnitPrice += Number(sizeObj.priceDelta) || 0;
      }

      // Verify customizations and addons with authoritative catalog
      let customAddonPrice = 0;
      const verifiedCustomizations = [];
      if (Array.isArray(item.customizations)) {
        for (const cust of item.customizations) {
          const custName = (cust.name || '').trim();
          const lowerName = custName.toLowerCase();
          if (lowerName in VALID_ADDONS) {
            const authoritativeAddonPrice = VALID_ADDONS[lowerName];
            customAddonPrice += authoritativeAddonPrice;
            verifiedCustomizations.push({
              name: custName,
              price: authoritativeAddonPrice,
            });
          } else {
            return res.status(400).json({
              success: false,
              message: `Unknown or unauthorized customization '${custName}'.`,
            });
          }
        }
      }

      const totalUnitPrice = verifiedUnitPrice + customAddonPrice;
      const verifiedUnitCost = Number(catalogProduct.cost) || 0;
      const lineTotal = Math.round(totalUnitPrice * qty * 100) / 100;

      verifiedItems.push({
        productId: catalogProduct.id || catalogProduct._id.toString(),
        name: catalogProduct.name,
        price: totalUnitPrice,
        cost: verifiedUnitCost,
        quantity: qty,
        size: chosenSize,
        customizations: verifiedCustomizations,
        notes: (item.notes || '').trim(),
        totalItemPrice: lineTotal,
      });
    }

    // 3. Stock check if auto-deduct enabled
    if (currentSettings.autoDeductInventory) {
      const stockCheck = checkIngredientsStock(verifiedItems, inventoryList, productsList);
      if (!stockCheck.sufficient) {
        const details = stockCheck.missing
          .map((m) => `${m.name} (need ${m.required}${m.unit}, available: ${m.available}${m.unit})`)
          .join('; ');
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for recipe ingredients: ${details}`,
          missing: stockCheck.missing,
        });
      }
    }

    // 4. Server-side price recalculation & Role-based Discount Capping
    const subtotal = verifiedItems.reduce((acc, itm) => acc + itm.totalItemPrice, 0);

    // Validate discount percentages & amounts
    const userRole = req.user?.role || 'Cashier';
    const maxAllowedDiscountPct = ROLE_DISCOUNT_CAPS[userRole] ?? 15;

    let finalDiscount = 0;
    let effectivePct = 0;

    if (directDiscount !== undefined && directDiscount !== null) {
      const numDirectDiscount = Number(directDiscount);
      if (isNaN(numDirectDiscount) || numDirectDiscount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Direct discount amount must be a non-negative number.',
        });
      }
      finalDiscount = Math.min(subtotal, numDirectDiscount);
      effectivePct = subtotal > 0 ? (finalDiscount / subtotal) * 100 : 0;
    } else if (discountPercent !== undefined && discountPercent !== null) {
      const numPct = Number(discountPercent);
      if (isNaN(numPct) || numPct < 0) {
        return res.status(400).json({
          success: false,
          message: 'Discount percentage must be a non-negative number.',
        });
      }
      effectivePct = numPct;
      finalDiscount = Math.round(((subtotal * effectivePct) / 100) * 100) / 100;
    }

    // Enforce role-based discount cap
    if (effectivePct > maxAllowedDiscountPct) {
      return res.status(400).json({
        success: false,
        message: `Discount policy violation: Staff with role '${userRole}' cannot provide more than ${maxAllowedDiscountPct}% discount. Requested: ${Math.round(
          effectivePct
        )}%.`,
      });
    }

    const taxRate = Number(currentSettings.taxRatePercent) || 5.0;
    const taxableAmount = Math.max(0, subtotal - finalDiscount);
    const finalTax = Math.round(((taxableAmount * taxRate) / 100) * 100) / 100;
    const finalTotal = Math.round((taxableAmount + finalTax) * 100) / 100;

    // 5. Generate collision-free unique order number
    const orderNumber = generateNextOrderNumber(existingOrders);

    // 6. Payment status & Razorpay / simulation handling
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, isSimulatedPayment } = req.body;

    let isSimulated = false;
    let paymentStatus = 'Paid';
    let verifiedAttempt = null;
    const isOnlineMethod = paymentMethod === 'UPI' || paymentMethod === 'Card';

    if (razorpayOrderId || razorpayPaymentId || razorpaySignature) {
      if (!razorpayOrderId || !razorpayPaymentId) {
        return res.status(400).json({ success: false, message: 'Razorpay order and payment IDs are required.' });
      }
      if (razorpaySignature) {
        const verification = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
        if (!verification.valid || verification.isSimulated) {
          return res.status(400).json({
            success: false,
            message: verification.error || 'Razorpay payment signature verification failed.',
          });
        }
      }

      verifiedAttempt = await getVerifiedPaymentAttempt({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        staffId: String(req.user?.id || ''),
        fingerprint: createPaymentFingerprint(req.body),
        amountPaise: Math.round(finalTotal * 100),
      });
      if (!verifiedAttempt) {
        return res.status(400).json({
          success: false,
          message: 'Payment is not verified for this cart, staff session, or server-calculated amount. Please restart checkout.',
        });
      }
    } else {
      const demoPaymentsAllowed = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_PAYMENTS === 'true';
      if (isOnlineMethod && (!demoPaymentsAllowed || !isSimulatedPayment)) {
        return res.status(400).json({
          success: false,
          message: 'UPI/Card orders require a server-verified Razorpay payment. Demo payments are development-only.',
        });
      }
      if (isSimulatedPayment && !demoPaymentsAllowed) {
        return res.status(400).json({ success: false, message: 'Simulated payments are disabled.' });
      }
      isSimulated = Boolean(isOnlineMethod && isSimulatedPayment);
      paymentStatus = isSimulated ? 'Paid (Simulated)' : paymentMethod === 'Cash' ? 'Paid' : 'Unpaid';
    }

    const newOrderData = {
      id: `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      orderNumber,
      createdAt: new Date(),
      customerName: (customerName || '').trim() || 'Walk-in Guest',
      customerPhone: (customerPhone || '').trim() || undefined,
      orderType,
      tableNumber: orderType === 'Dine-in' ? tableNumber : undefined,
      items: verifiedItems,
      subtotal,
      discount: finalDiscount,
      discountReason:
        discountReason || (effectivePct > 0 ? `${Math.round(effectivePct)}% Staff Promo` : undefined),
      tax: finalTax,
      total: finalTotal,
      paymentMethod,
      paymentStatus,
      isSimulatedPayment: isSimulated,
      razorpayOrderId: razorpayOrderId || undefined,
      razorpayPaymentId: razorpayPaymentId || undefined,
      razorpaySignature: razorpaySignature || undefined,
      status: 'Confirmed',
      assignedStaff: assignedStaff || req.user?.name || 'Staff Member',
      notes: (notes || '').trim() || undefined,
      inventoryDeducted: Boolean(currentSettings.autoDeductInventory),
    };

    // 7. Update Inventory and CRM
    if (mongoose.connection.readyState === 1) {
      const recipeTotals = getRecipeIngredientTotals(verifiedItems, productsList);

      // Attempt MongoDB multi-document transaction (supported on Replica Sets / MongoDB Atlas)
      let session = null;
      let useTransaction = false;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (txStartErr) {
        if (isTransactionUnsupported(txStartErr)) {
          session = null;
          useTransaction = false;
        } else {
          throw txStartErr;
        }
      }

      if (useTransaction && session) {
        try {
          if (currentSettings.autoDeductInventory) {
            for (const [ingredientId, neededQty] of Object.entries(recipeTotals)) {
              if (neededQty <= 0) continue;
              const updated = await Inventory.findOneAndUpdate(
                {
                  $or: [
                    { id: ingredientId },
                    { _id: mongoose.isValidObjectId(ingredientId) ? ingredientId : null },
                  ],
                  stock: { $gte: neededQty },
                },
                {
                  $inc: { stock: -neededQty },
                  $set: { lastUpdated: new Date().toISOString().split('T')[0] },
                },
                { session, new: true }
              );

              if (!updated) {
                await session.abortTransaction();
                await session.endSession();
                return res.status(400).json({
                  success: false,
                  message: `Insufficient stock for ingredient '${ingredientId}' under concurrent ordering.`,
                });
              }
            }
          }

          // Update or create customer
          if (customerPhone || (customerName && customerName !== 'Walk-in Guest')) {
            const query = customerPhone ? { phone: customerPhone } : { name: customerName };
            const existingCust = await Customer.findOne(query).session(session);
            if (existingCust) {
              existingCust.totalOrders += 1;
              existingCust.totalSpend += finalTotal;
              existingCust.loyaltyPoints += Math.floor(finalTotal / 10);
              existingCust.lastVisit = new Date().toISOString().split('T')[0];
              await existingCust.save({ session });
            } else {
              await Customer.create(
                [
                  {
                    id: `cust-${Date.now()}`,
                    name: customerName,
                    phone: customerPhone,
                    totalOrders: 1,
                    totalSpend: finalTotal,
                    loyaltyPoints: Math.floor(finalTotal / 10),
                    favoriteItem: verifiedItems[0]?.name || 'Coffee',
                    lastVisit: new Date().toISOString().split('T')[0],
                  },
                ],
                { session }
              );
            }
          }

          const [created] = await Order.create([newOrderData], { session });
          if (verifiedAttempt) {
            const consumed = await consumePaymentAttempt({
              orderId: razorpayOrderId,
              paymentId: razorpayPaymentId,
              staffId: String(req.user?.id || ''),
              session,
            });
            if (!consumed) throw new Error('Payment attempt was already consumed by another request.');
          }
          await session.commitTransaction();
          await session.endSession();

          return res.status(201).json({
            success: true,
            message: `Order ${orderNumber} created successfully`,
            data: created,
          });
        } catch (txError) {
          if (session) {
            try {
              await session.abortTransaction();
            } catch {
              // Ignore session abort error if already aborted
            }
            try {
              await session.endSession();
            } catch {
              // Ignore session end error
            }
          }

          if (!isTransactionUnsupported(txError)) {
            throw txError;
          }
          // If transaction unsupported, fall through to standalone MongoDB fallback
        }
      }

      // Standalone MongoDB Fallback: Conditional atomic updates with compensating rollback
      const deductedIngredients = [];
      let deductionFailed = false;
      let failedIng = null;

      if (currentSettings.autoDeductInventory) {
        for (const [ingredientId, neededQty] of Object.entries(recipeTotals)) {
          if (neededQty <= 0) continue;
          const updated = await Inventory.findOneAndUpdate(
            {
              $or: [
                { id: ingredientId },
                { _id: mongoose.isValidObjectId(ingredientId) ? ingredientId : null },
              ],
              stock: { $gte: neededQty },
            },
            {
              $inc: { stock: -neededQty },
              $set: { lastUpdated: new Date().toISOString().split('T')[0] },
            },
            { new: true }
          );

          if (!updated) {
            deductionFailed = true;
            failedIng = ingredientId;
            break;
          }
          deductedIngredients.push({ ingredientId, qty: neededQty });
        }

        if (deductionFailed) {
          // Compensating rollback for any ingredients already deducted!
          for (const rolledBack of deductedIngredients) {
            await Inventory.updateOne(
              {
                $or: [
                  { id: rolledBack.ingredientId },
                  { _id: mongoose.isValidObjectId(rolledBack.ingredientId) ? rolledBack.ingredientId : null },
                ],
              },
              { $inc: { stock: rolledBack.qty } }
            );
          }
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for recipe ingredient '${failedIng}' under concurrent requests.`,
          });
        }
      }

      try {
        if (customerPhone || (customerName && customerName !== 'Walk-in Guest')) {
          const query = customerPhone ? { phone: customerPhone } : { name: customerName };
          const existingCust = await Customer.findOne(query);
          if (existingCust) {
            existingCust.totalOrders += 1;
            existingCust.totalSpend += finalTotal;
            existingCust.loyaltyPoints += Math.floor(finalTotal / 10);
            existingCust.lastVisit = new Date().toISOString().split('T')[0];
            await existingCust.save();
          } else {
            await Customer.create({
              id: `cust-${Date.now()}`,
              name: customerName,
              phone: customerPhone,
              totalOrders: 1,
              totalSpend: finalTotal,
              loyaltyPoints: Math.floor(finalTotal / 10),
              favoriteItem: verifiedItems[0]?.name || 'Coffee',
              lastVisit: new Date().toISOString().split('T')[0],
            });
          }
        }

        const created = await Order.create(newOrderData);
        if (verifiedAttempt) {
          const consumed = await consumePaymentAttempt({
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
            staffId: String(req.user?.id || ''),
          });
          if (!consumed) throw new Error('Payment attempt was already consumed by another request.');
        }
        return res.status(201).json({
          success: true,
          message: `Order ${orderNumber} created successfully`,
          data: created,
        });
      } catch (orderCreationError) {
        // Compensate and restore any inventory reserved if order creation failed
        if (currentSettings.autoDeductInventory && deductedIngredients.length > 0) {
          for (const rolledBack of deductedIngredients) {
            await Inventory.updateOne(
              {
                $or: [
                  { id: rolledBack.ingredientId },
                  { _id: mongoose.isValidObjectId(rolledBack.ingredientId) ? rolledBack.ingredientId : null },
                ],
              },
              { $inc: { stock: rolledBack.qty } }
            );
          }
        }
        throw orderCreationError;
      }
    }

    // In-memory fallback
    if (currentSettings.autoDeductInventory) {
      fallbackStore.inventory = deductRecipeStock(fallbackStore.inventory, verifiedItems, productsList);
    }

    if (customerPhone || (customerName && customerName !== 'Walk-in Guest')) {
      const existingCust = fallbackStore.customers.find(
        (c) =>
          (customerPhone && c.phone === customerPhone) ||
          c.name.toLowerCase() === customerName.toLowerCase()
      );
      if (existingCust) {
        existingCust.totalOrders += 1;
        existingCust.totalSpend += finalTotal;
        existingCust.loyaltyPoints += Math.floor(finalTotal / 10);
        existingCust.lastVisit = new Date().toISOString().split('T')[0];
      } else {
        fallbackStore.customers.unshift({
          id: `cust-${Date.now()}`,
          name: customerName,
          phone: customerPhone,
          totalOrders: 1,
          totalSpend: finalTotal,
          loyaltyPoints: Math.floor(finalTotal / 10),
          favoriteItem: verifiedItems[0]?.name || 'Coffee',
          lastVisit: new Date().toISOString().split('T')[0],
        });
      }
    }

    if (razorpayPaymentId && fallbackStore.orders.some((order) => order.razorpayPaymentId === razorpayPaymentId)) {
      return res.status(409).json({ success: false, message: 'This Razorpay payment has already been used.' });
    }
    if (verifiedAttempt) {
      const consumed = await consumePaymentAttempt({
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        staffId: String(req.user?.id || ''),
      });
      if (!consumed) return res.status(409).json({ success: false, message: 'Payment attempt was already used.' });
    }
    fallbackStore.orders.unshift(newOrderData);
    return res.status(201).json({
      success: true,
      message: `Order ${orderNumber} created successfully`,
      data: newOrderData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status: nextStatus } = req.body;

    if (!nextStatus) {
      return res.status(400).json({ success: false, message: 'Please provide target status' });
    }

    let targetOrder = null;
    if (mongoose.connection.readyState === 1) {
      targetOrder = await Order.findOne({
        $or: [{ id }, { orderNumber: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
    } else {
      targetOrder = fallbackStore.orders.find((o) => o.id === id || o.orderNumber === id);
    }

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Validate transition using pure logic validator
    const validation = validateOrderTransition(targetOrder.status, nextStatus);
    if (!validation.valid) {
      return res.status(400).json({ success: false, message: validation.error });
    }

    if (nextStatus === 'Cancelled') {
      return cancelOrder(req, res, next);
    }

    targetOrder.status = nextStatus;
    if (mongoose.connection.readyState === 1) {
      await targetOrder.save();
    }

    return res.status(200).json({
      success: true,
      message: `Order ${targetOrder.orderNumber} status updated to ${nextStatus}`,
      data: targetOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Staff Cancellation' } = req.body || {};

    let targetOrder = null;
    let productsList = fallbackStore.products;
    let currentSettings = fallbackStore.settings;

    if (mongoose.connection.readyState === 1) {
      targetOrder = await Order.findOne({
        $or: [{ id }, { orderNumber: id }, { _id: mongoose.isValidObjectId(id) ? id : null }],
      });
      productsList = await Product.find().lean();
      const s = await Settings.findOne().lean();
      if (s) currentSettings = s;
    } else {
      targetOrder = fallbackStore.orders.find((o) => o.id === id || o.orderNumber === id);
    }

    if (!targetOrder) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (targetOrder.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Order ${targetOrder.orderNumber} is already cancelled`,
      });
    }

    if (targetOrder.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: `Completed order ${targetOrder.orderNumber} cannot be cancelled`,
      });
    }

    // Concurrency protection & Idempotency:
    // Only restore inventory if it was previously deducted, and atomically mark inventoryDeducted as false
    if (mongoose.connection.readyState === 1) {
      let session = null;
      let useTransaction = false;
      try {
        session = await mongoose.startSession();
        session.startTransaction();
        useTransaction = true;
      } catch (txStartErr) {
        if (isTransactionUnsupported(txStartErr)) {
          session = null;
          useTransaction = false;
        } else {
          throw txStartErr;
        }
      }

      if (useTransaction && session) {
        try {
          const atomicOrder = await Order.findOneAndUpdate(
            {
              _id: targetOrder._id,
              status: { $nin: ['Cancelled', 'Completed'] },
              inventoryDeducted: true,
            },
            {
              $set: {
                status: 'Cancelled',
                inventoryDeducted: false,
                cancelledAt: new Date(),
                notes: `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}Cancelled: ${reason}`,
              },
            },
            { session, new: true }
          );

          if (atomicOrder) {
            if (currentSettings.autoDeductInventory) {
              const recipeTotals = getRecipeIngredientTotals(targetOrder.items || [], productsList);
              for (const [ingId, qty] of Object.entries(recipeTotals)) {
                await Inventory.updateOne(
                  {
                    $or: [
                      { id: ingId },
                      { _id: mongoose.isValidObjectId(ingId) ? ingId : null },
                    ],
                  },
                  {
                    $inc: { stock: qty },
                    $set: { lastUpdated: new Date().toISOString().split('T')[0] },
                  },
                  { session }
                );
              }
            }
            await session.commitTransaction();
            await session.endSession();
            return res.status(200).json({
              success: true,
              message: `Order ${atomicOrder.orderNumber} cancelled and ingredient stock restored`,
              data: atomicOrder,
            });
          } else {
            // Check if already cancelled without stock restoration
            const justCancel = await Order.findOneAndUpdate(
              {
                _id: targetOrder._id,
                status: { $nin: ['Cancelled', 'Completed'] },
              },
              {
                $set: {
                  status: 'Cancelled',
                  cancelledAt: new Date(),
                  notes: `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}Cancelled: ${reason}`,
                },
              },
              { session, new: true }
            );
            await session.commitTransaction();
            await session.endSession();

            if (!justCancel) {
              return res.status(400).json({
                success: false,
                message: `Order ${targetOrder.orderNumber} has already been cancelled or completed.`,
              });
            }
            return res.status(200).json({
              success: true,
              message: `Order ${justCancel.orderNumber} cancelled`,
              data: justCancel,
            });
          }
        } catch (txErr) {
          if (session) {
            try {
              await session.abortTransaction();
            } catch {
              // Ignore abort error
            }
            try {
              await session.endSession();
            } catch {
              // Ignore endSession error
            }
          }
          if (!isTransactionUnsupported(txErr)) {
            throw txErr;
          }
        }
      }

      // Standalone MongoDB fallback with atomic single-restoration guarantee
      const atomicOrder = await Order.findOneAndUpdate(
        {
          _id: targetOrder._id,
          status: { $nin: ['Cancelled', 'Completed'] },
          inventoryDeducted: true,
        },
        {
          $set: {
            status: 'Cancelled',
            inventoryDeducted: false,
            cancelledAt: new Date(),
            notes: `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}Cancelled: ${reason}`,
          },
        },
        { new: true }
      );

      if (atomicOrder) {
        if (currentSettings.autoDeductInventory) {
          const recipeTotals = getRecipeIngredientTotals(targetOrder.items || [], productsList);
          for (const [ingId, qty] of Object.entries(recipeTotals)) {
            await Inventory.updateOne(
              {
                $or: [
                  { id: ingId },
                  { _id: mongoose.isValidObjectId(ingId) ? ingId : null },
                ],
              },
              {
                $inc: { stock: qty },
                $set: { lastUpdated: new Date().toISOString().split('T')[0] },
              }
            );
          }
        }
        return res.status(200).json({
          success: true,
          message: `Order ${atomicOrder.orderNumber} cancelled and ingredient stock restored`,
          data: atomicOrder,
        });
      } else {
        const justCancel = await Order.findOneAndUpdate(
          {
            _id: targetOrder._id,
            status: { $nin: ['Cancelled', 'Completed'] },
          },
          {
            $set: {
              status: 'Cancelled',
              cancelledAt: new Date(),
              notes: `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}Cancelled: ${reason}`,
            },
          },
          { new: true }
        );

        if (!justCancel) {
          return res.status(400).json({
            success: false,
            message: `Order ${targetOrder.orderNumber} has already been cancelled or completed.`,
          });
        }
        return res.status(200).json({
          success: true,
          message: `Order ${justCancel.orderNumber} cancelled`,
          data: justCancel,
        });
      }
    }

    // In-memory fallback
    if (currentSettings.autoDeductInventory && targetOrder.inventoryDeducted) {
      fallbackStore.inventory = restoreRecipeStock(
        fallbackStore.inventory,
        targetOrder.items || [],
        productsList
      );
    }

    targetOrder.status = 'Cancelled';
    targetOrder.inventoryDeducted = false; // Idempotency protection against duplicate restorations
    targetOrder.cancelledAt = new Date();
    targetOrder.notes = `${targetOrder.notes ? targetOrder.notes + ' | ' : ''}Cancelled: ${reason}`;

    return res.status(200).json({
      success: true,
      message: `Order ${targetOrder.orderNumber} cancelled and ingredient stock restored`,
      data: targetOrder,
    });
  } catch (error) {
    next(error);
  }
};

export const getRazorpayConfigHandler = async (_req, res) => {
  const config = getRazorpayConfig();
  return res.status(200).json({
    success: true,
    data: config,
  });
};

export const createRazorpayOrderHandler = async (req, res, _next) => {
  try {
    const rzpOrder = await createPaymentAttempt(req);
    return res.status(200).json({
      success: true,
      data: rzpOrder,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Could not start payment checkout.' });
  }
};

export const verifyRazorpayPaymentHandler = async (req, res, _next) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const verification = await verifyPaymentAttempt({
      staffId: String(req.user?.id || ''),
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    return res.status(200).json({
      success: true,
      data: verification,
    });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || 'Payment verification failed.' });
  }
};

export default {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  cancelOrder,
  getRazorpayConfigHandler,
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
};
