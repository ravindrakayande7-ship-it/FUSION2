import mongoose from 'mongoose';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { Settings } from '../models/Settings.js';
import { PaymentAttempt } from '../models/PaymentAttempt.js';
import { fallbackStore } from './storageFallback.js';
import { checkIngredientsStock } from '../../src/utils/orderLogic.js';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
  captureRazorpayPayment,
} from './razorpayService.js';
import { createPaymentFingerprint } from './paymentFingerprint.js';

const ROLE_DISCOUNT_CAPS = { Barista: 10, Cashier: 15, Manager: 30, Owner: 100 };
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

const getCatalog = async () => {
  if (mongoose.connection.readyState === 1) {
    const [settings, inventory, products] = await Promise.all([
      Settings.findOne().lean(),
      Inventory.find().lean(),
      Product.find().lean(),
    ]);
    return {
      settings: settings || fallbackStore.settings,
      inventory,
      products,
    };
  }
  return {
    settings: fallbackStore.settings,
    inventory: fallbackStore.inventory,
    products: fallbackStore.products,
  };
};

export const calculateCheckoutQuote = async (body, user) => {
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error('Cannot calculate payment for an empty cart.');
  }

  const { settings, inventory, products } = await getCatalog();
  const verifiedItems = body.items.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('Each cart entry must be a valid menu item.');
    }
    const qty = item.quantity;
    if (!Number.isInteger(qty) || qty < 1 || qty > 500) {
      throw new Error('Each item quantity must be a whole number from 1 to 500.');
    }
    const productId = String(item.productId || item.id || '');
    const product = products.find((entry) =>
      entry.id === productId || (entry._id && entry._id.toString() === productId)
    );
    if (!product || product.available === false) {
      throw new Error('A selected menu item is unavailable. Refresh the menu and try again.');
    }

    let price = Number(product.price);
    if (!Number.isFinite(price) || price < 0) throw new Error(`Invalid catalog price for ${product.name}.`);
    const size = String(item.size || 'Standard');
    if (size !== 'Standard') {
      const chosen = product.sizes?.find((entry) => entry.name.toLowerCase() === size.toLowerCase());
      if (!chosen) throw new Error(`Invalid size selected for ${product.name}.`);
      price += Number(chosen.priceDelta) || 0;
    }
    if (item.customizations != null && !Array.isArray(item.customizations)) {
      throw new Error(`Invalid add-ons for ${product.name}.`);
    }
    const customizations = (item.customizations || []).map((value) => {
      const name = String(value.name || '').trim();
      const addonPrice = VALID_ADDONS[name.toLowerCase()];
      if (addonPrice === undefined) throw new Error(`Invalid add-on selected for ${product.name}.`);
      return { name, price: addonPrice };
    });
    price += customizations.reduce((sum, entry) => sum + entry.price, 0);
    return {
      productId: product.id || product._id.toString(),
      quantity: qty,
      size,
      price,
      totalItemPrice: Math.round(price * qty * 100) / 100,
      customizations,
    };
  });

  if (settings.autoDeductInventory) {
    const stock = checkIngredientsStock(verifiedItems, inventory, products);
    if (!stock.sufficient) throw new Error('Insufficient inventory for this cart. Refresh stock and try again.');
  }

  const subtotal = verifiedItems.reduce((sum, item) => sum + item.totalItemPrice, 0);
  const requestedDiscount = body.discount == null ? 0 : Number(body.discount);
  const requestedPercent = body.discountPercent == null ? 0 : Number(body.discountPercent);
  if (!Number.isFinite(requestedDiscount) || requestedDiscount < 0 || !Number.isFinite(requestedPercent) || requestedPercent < 0) {
    throw new Error('Discount must be a valid non-negative amount or percentage.');
  }
  const discount = body.discount != null
    ? Math.min(subtotal, requestedDiscount)
    : Math.round((subtotal * requestedPercent / 100) * 100) / 100;
  const effectivePercent = subtotal ? discount / subtotal * 100 : 0;
  const cap = ROLE_DISCOUNT_CAPS[user?.role] ?? 15;
  if (effectivePercent > cap + 0.0001) throw new Error(`Your role may apply a maximum ${cap}% discount.`);

  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round((taxable * (Number(settings.taxRatePercent) || 5) / 100) * 100) / 100;
  const totalPaise = Math.round((taxable + tax) * 100);
  if (totalPaise <= 0) throw new Error('The payment total must be greater than zero.');

  return { amountPaise: totalPaise, fingerprint: createPaymentFingerprint(body) };
};

export const createPaymentAttempt = async (req) => {
  if (!['UPI', 'Card'].includes(req.body.paymentMethod)) {
    throw new Error('Razorpay checkout is only available for UPI or Card orders.');
  }
  const { amountPaise, fingerprint } = await calculateCheckoutQuote(req.body, req.user);
  const razorpayOrder = await createRazorpayOrder({
    amount: amountPaise / 100,
    receipt: `fus_${Date.now()}`,
    notes: { staffId: req.user.id },
  });
  if (razorpayOrder.isSimulated) return { ...razorpayOrder, amountPaise };

  const attempt = {
    razorpayOrderId: razorpayOrder.id,
    staffId: req.user.id,
    amountPaise,
    currency: 'INR',
    fingerprint,
    checkoutData: {
      items: req.body.items,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      orderType: req.body.orderType,
      tableNumber: req.body.tableNumber,
      paymentMethod: req.body.paymentMethod,
      discount: req.body.discount,
      discountPercent: req.body.discountPercent,
      discountReason: req.body.discountReason,
      notes: req.body.notes,
    },
    status: 'created',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };
  if (mongoose.connection.readyState === 1) await PaymentAttempt.create(attempt);
  else fallbackStore.paymentAttempts.push(attempt);

  return { ...razorpayOrder, amountPaise };
};

const findAttempt = async (orderId, staffId) => {
  if (mongoose.connection.readyState === 1) {
    return PaymentAttempt.findOne({ razorpayOrderId: orderId, staffId }).lean();
  }
  return fallbackStore.paymentAttempts.find(
    (attempt) => attempt.razorpayOrderId === orderId && attempt.staffId === staffId
  );
};

const updateAttempt = async (orderId, staffId, filter, update) => {
  if (mongoose.connection.readyState === 1) {
    return PaymentAttempt.findOneAndUpdate(
      { razorpayOrderId: orderId, staffId, ...filter },
      update,
      { returnDocument: 'after' }
    ).lean();
  }
  const attempt = fallbackStore.paymentAttempts.find(
    (entry) => entry.razorpayOrderId === orderId && entry.staffId === staffId &&
      Object.entries(filter).every(([key, value]) =>
        value && typeof value === 'object' && Array.isArray(value.$in)
          ? value.$in.includes(entry[key])
          : entry[key] === value
      )
  );
  if (!attempt) return null;
  Object.assign(attempt, update.$set || {});
  return attempt;
};

export const verifyPaymentAttempt = async ({ staffId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) => {
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) throw new Error('Payment verification details are incomplete.');
  const attempt = await findAttempt(razorpayOrderId, staffId);
  if (!attempt || attempt.status !== 'created' || new Date(attempt.expiresAt) <= new Date()) {
    throw new Error('Payment attempt is invalid, expired, or already used. Start checkout again.');
  }

  const signature = verifyRazorpaySignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature });
  if (!signature.valid || signature.isSimulated) throw new Error('Razorpay signature verification failed.');

  const [gatewayOrder, payment] = await Promise.all([
    fetchRazorpayOrder(razorpayOrderId),
    fetchRazorpayPayment(razorpayPaymentId),
  ]);
  if (gatewayOrder.id !== razorpayOrderId || gatewayOrder.amount !== attempt.amountPaise || gatewayOrder.currency !== 'INR') {
    throw new Error('Razorpay order amount or currency does not match the server-calculated checkout.');
  }
  if (payment.order_id !== razorpayOrderId || payment.amount !== attempt.amountPaise || payment.currency !== 'INR') {
    throw new Error('Razorpay payment amount, currency, or order does not match this checkout.');
  }

  let captured = payment;
  if (payment.status === 'authorized') {
    captured = await captureRazorpayPayment(razorpayPaymentId, attempt.amountPaise, 'INR');
  }
  if (captured.status !== 'captured' || captured.amount !== attempt.amountPaise || captured.currency !== 'INR') {
    throw new Error('Razorpay payment is not captured for the expected amount.');
  }

  const verified = await updateAttempt(
    razorpayOrderId,
    staffId,
    { status: 'created' },
    { $set: { status: 'verified', razorpayPaymentId, verifiedAt: new Date() } }
  );
  if (!verified) throw new Error('Payment attempt was already processed.');
  return { valid: true, isSimulated: false, amountPaise: attempt.amountPaise };
};

export const getVerifiedPaymentAttempt = async ({ orderId, paymentId, staffId, fingerprint, amountPaise }) => {
  const attempt = await findAttempt(orderId, staffId);
  if (!attempt || attempt.status !== 'verified' || attempt.razorpayPaymentId !== paymentId) return null;
  if (new Date(attempt.expiresAt) <= new Date() || attempt.fingerprint !== fingerprint || attempt.amountPaise !== amountPaise) return null;
  return attempt;
};

export const consumePaymentAttempt = async ({ orderId, paymentId, staffId, session }) => {
  if (mongoose.connection.readyState === 1) {
    return PaymentAttempt.findOneAndUpdate(
      { razorpayOrderId: orderId, razorpayPaymentId: paymentId, staffId, status: 'verified' },
      { $set: { status: 'consumed', consumedAt: new Date() } },
      { returnDocument: 'after', session }
    );
  }
  const attempt = fallbackStore.paymentAttempts.find(
    (entry) => entry.razorpayOrderId === orderId && entry.razorpayPaymentId === paymentId && entry.staffId === staffId && entry.status === 'verified'
  );
  if (!attempt) return null;
  attempt.status = 'consumed';
  attempt.consumedAt = new Date();
  return attempt;
};

export const verifyCapturedPaymentFromWebhook = async (payment) => {
  const orderId = payment?.order_id;
  const paymentId = payment?.id;
  if (!orderId || !paymentId) throw new Error('Webhook payment is missing its order or payment ID.');

  const attempt = mongoose.connection.readyState === 1
    ? await PaymentAttempt.findOne({ razorpayOrderId: orderId }).lean()
    : fallbackStore.paymentAttempts.find((entry) => entry.razorpayOrderId === orderId);
  if (!attempt) throw new Error('No matching server payment attempt exists.');
  if (attempt.status === 'consumed') return { attempt, alreadyConsumed: true };
  if (attempt.status === 'failed' || new Date(attempt.expiresAt) <= new Date()) throw new Error('Payment attempt is no longer active.');
  if (payment.amount !== attempt.amountPaise || payment.currency !== 'INR' || payment.status !== 'captured') {
    throw new Error('Webhook payment does not match the expected amount, currency, and captured status.');
  }

  const [gatewayOrder, gatewayPayment] = await Promise.all([
    fetchRazorpayOrder(orderId),
    fetchRazorpayPayment(paymentId),
  ]);
  if (gatewayOrder.amount !== attempt.amountPaise || gatewayOrder.currency !== 'INR' || gatewayOrder.status !== 'paid') {
    throw new Error('Razorpay order is not paid for the expected amount.');
  }
  if (gatewayPayment.order_id !== orderId || gatewayPayment.amount !== attempt.amountPaise || gatewayPayment.currency !== 'INR' || gatewayPayment.status !== 'captured') {
    throw new Error('Razorpay payment fetch did not confirm the captured amount.');
  }

  const verified = await updateAttempt(
    orderId,
    attempt.staffId,
    { status: { $in: ['created', 'verified'] } },
    { $set: { status: 'verified', razorpayPaymentId: paymentId, verifiedAt: new Date() } }
  );
  if (!verified && mongoose.connection.readyState !== 1) {
    const current = fallbackStore.paymentAttempts.find((entry) => entry.razorpayOrderId === orderId);
    if (current?.status !== 'verified') throw new Error('Webhook payment attempt could not be marked verified.');
  } else if (!verified) {
    const current = await PaymentAttempt.findOne({ razorpayOrderId: orderId, razorpayPaymentId: paymentId, status: 'verified' }).lean();
    if (!current) throw new Error('Webhook payment attempt could not be marked verified.');
  }
  return { attempt, alreadyConsumed: false };
};
