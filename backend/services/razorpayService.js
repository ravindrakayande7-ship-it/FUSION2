/* global fetch */
import crypto from 'crypto';
import { Buffer } from 'buffer';

/**
 * Razorpay Payment Gateway Service
 * Handles Razorpay order creation, HMAC SHA256 signature verification, and test mode fallback.
 */

export const isRazorpayConfigured = () => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  return Boolean(keyId && keySecret);
};

export const getRazorpayConfig = () => {
  const isConfigured = isRazorpayConfigured();
  return {
    isConfigured,
    keyId: isConfigured ? process.env.RAZORPAY_KEY_ID.trim() : null,
    currency: 'INR',
  };
};

/**
 * Creates an order on Razorpay or generates a structured test order if keys are not configured.
 * @param {Object} params
 * @param {number} params.amount - Amount in INR (e.g. 249.50)
 * @param {string} params.receipt - Order receipt / internal order reference
 * @param {Object} [params.notes] - Optional key-value notes
 * @returns {Promise<{ id: string, amount: number, currency: string, isSimulated: boolean, keyId: string|null }>}
 */
export const createRazorpayOrder = async ({ amount, receipt, notes = {} }) => {
  const amountInPaise = Math.round(Number(amount) * 100);
  if (isNaN(amountInPaise) || amountInPaise <= 0) {
    throw new Error('Valid order amount greater than 0 is required');
  }

  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (Boolean(keyId) !== Boolean(keySecret)) {
    throw new Error('Both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
  }

  if (Boolean(keyId) !== Boolean(keySecret)) {
    throw new Error('Both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are required.');
  }

  // If live or test keys are present in environment, call the official Razorpay Orders API
  if (keyId && keySecret) {
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: 'INR',
        receipt: (receipt || `rcpt_${Date.now()}`).slice(0, 40),
        notes,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const errMessage = data.error?.description || 'Failed to create Razorpay order with gateway';
      throw new Error(`Razorpay API Error: ${errMessage}`);
    }

    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
      isSimulated: false,
      keyId,
    };
  }

  if (process.env.NODE_ENV === 'production' || process.env.ALLOW_DEMO_PAYMENTS !== 'true') {
    throw new Error('Razorpay is not configured. Online payments are unavailable.');
  }

  // Explicit local development simulation only. Never use as a real payment signal.
  const simulatedId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: simulatedId,
    amount: amountInPaise,
    currency: 'INR',
    isSimulated: true,
    keyId: null,
    message: 'Razorpay keys not configured in environment; running in test/simulation mode.',
  };
};

/**
 * Verifies Razorpay payment signature using HMAC SHA256.
 * @param {Object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @returns {{ valid: boolean, isSimulated: boolean, error?: string }}
 */
export const verifyRazorpaySignature = ({
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
}) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!keySecret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return {
      valid: false,
      isSimulated: false,
      error: 'Razorpay credentials and all payment verification fields are required.',
    };
  }

  if (!/^[a-f\d]{64}$/i.test(razorpaySignature)) {
    return { valid: false, isSimulated: false, error: 'Invalid Razorpay signature format.' };
  }

  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest();
  const suppliedSignature = Buffer.from(razorpaySignature, 'hex');
  const valid =
    suppliedSignature.length === expectedSignature.length &&
    crypto.timingSafeEqual(expectedSignature, suppliedSignature);

  return {
    valid,
    isSimulated: false,
    error: valid ? undefined : 'Razorpay payment signature verification failed.',
  };
};

const razorpayRequest = async (path, method = 'GET', payload) => {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) throw new Error('Razorpay server credentials are not configured.');

  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      ...(payload && { 'Content-Type': 'application/json' }),
    },
    ...(payload && { body: JSON.stringify(payload) }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.description || 'Razorpay request failed.');
  }
  return data;
};

export const fetchRazorpayPayment = (paymentId) =>
  razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);

export const fetchRazorpayOrder = (orderId) =>
  razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);

export const captureRazorpayPayment = (paymentId, amountPaise, currency = 'INR') =>
  razorpayRequest(`/payments/${encodeURIComponent(paymentId)}/capture`, 'POST', {
    amount: amountPaise,
    currency,
  });

export const verifyRazorpayWebhookSignature = (rawBody, signature) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();
  if (!webhookSecret || !Buffer.isBuffer(rawBody) || !/^[a-f\d]{64}$/i.test(signature || '')) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest();
  const supplied = Buffer.from(signature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(expected, supplied);
};

export default {
  isRazorpayConfigured,
  getRazorpayConfig,
  createRazorpayOrder,
  verifyRazorpaySignature,
  fetchRazorpayPayment,
  fetchRazorpayOrder,
  captureRazorpayPayment,
  verifyRazorpayWebhookSignature,
};
