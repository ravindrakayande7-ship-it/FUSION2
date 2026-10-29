import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayConfig,
  isRazorpayConfigured,
} from '../services/razorpayService.js';
import { getRecipeIngredientTotals } from '../../src/utils/orderLogic.js';
import { createOrder } from '../controllers/orderController.js';
import { fallbackStore } from '../services/storageFallback.js';
import { calculateCheckoutQuote, createPaymentAttempt, verifyPaymentAttempt, getVerifiedPaymentAttempt } from '../services/paymentAttemptService.js';
import { createPaymentFingerprint } from '../services/paymentFingerprint.js';

describe('Razorpay Online Payments & Database Integrity', () => {
  beforeEach(() => {
    fallbackStore.reset();
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  it('correctly reports unconfigured state when keys are omitted', () => {
    assert.equal(isRazorpayConfigured(), false);
    const config = getRazorpayConfig();
    assert.equal(config.isConfigured, false);
    assert.equal(config.keyId, null);
  });

  it('generates simulated order with isSimulated: true when keys are missing', async () => {
    const order = await createRazorpayOrder({ amount: 350.5, receipt: 'fus_test_1' });
    assert.equal(order.isSimulated, true);
    assert.equal(order.amount, 35050); // In paise
    assert.equal(order.currency, 'INR');
    assert.ok(order.id.startsWith('order_sim_'));
  });

  it('verifies valid HMAC SHA256 signature when secret is configured', () => {
    const testSecret = 'secret_test_key_12345';
    process.env.RAZORPAY_KEY_SECRET = testSecret;

    const orderId = 'order_ABC12345';
    const paymentId = 'pay_XYZ67890';
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const result = verifyRazorpaySignature({
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: validSignature,
    });

    assert.equal(result.valid, true);
    assert.equal(result.isSimulated, false);
  });

  it('strictly rejects tampered or mismatched Razorpay signatures', () => {
    process.env.RAZORPAY_KEY_SECRET = 'secret_test_key_12345';

    const result = verifyRazorpaySignature({
      razorpayOrderId: 'order_ABC12345',
      razorpayPaymentId: 'pay_XYZ67890',
      razorpaySignature: 'tampered_fake_signature_hex_value',
    });

    assert.equal(result.valid, false);
    assert.match(result.error, /signature/i);
  });

  it('rejects order creation if payment signature verification fails', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'live_secret_key_8899';

    const req = {
      user: { id: 'usr-1', name: 'Cashier', role: 'Cashier' },
      body: {
        paymentMethod: 'UPI',
        razorpayOrderId: 'order_real_123',
        razorpayPaymentId: 'pay_real_456',
        razorpaySignature: 'invalid_forged_signature',
        items: [
          {
            productId: 'prod-1',
            name: 'Signature Cappuccino',
            price: 210,
            quantity: 1,
            size: 'Standard',
          },
        ],
      },
    };

    let statusCode = null;
    let resData = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resData = data;
        return this;
      },
    };

    await createOrder(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(resData.message, /signature/i);
  });

  it('rejects a signed payment unless a matching server payment attempt was verified', async () => {
    const testSecret = 'secret_live_pos_99';
    process.env.RAZORPAY_KEY_SECRET = testSecret;

    const rzpOrderId = 'order_live_999';
    const rzpPayId = 'pay_live_888';
    const validSignature = crypto
      .createHmac('sha256', testSecret)
      .update(`${rzpOrderId}|${rzpPayId}`)
      .digest('hex');

    const req = {
      user: { id: 'usr-1', name: 'Tanya Cashier', role: 'Cashier' },
      body: {
        paymentMethod: 'UPI',
        razorpayOrderId: rzpOrderId,
        razorpayPaymentId: rzpPayId,
        razorpaySignature: validSignature,
        customerName: 'Aarav Sharma',
        customerPhone: '+919876543210',
        items: [
          {
            productId: 'prod-1',
            name: 'Signature Cappuccino',
            price: 210,
            quantity: 1,
            size: 'Standard',
          },
        ],
      },
    };

    let statusCode = null;
    let resData = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        resData = data;
        return this;
      },
    };

    await createOrder(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(resData.message, /not verified/i);
  });

  it('binds a verified captured payment to the server-calculated cart amount and staff', async () => {
    const originalFetch = globalThis.fetch;
    const testSecret = 'secret_live_pos_99';
    const orderId = 'order_attempt_123';
    const paymentId = 'pay_attempt_123';
    process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
    process.env.RAZORPAY_KEY_SECRET = testSecret;

    const body = {
      items: [{ productId: 'prod-1', quantity: 1, size: 'Standard', customizations: [] }],
      customerName: 'Walk-in Guest',
      orderType: 'Dine-in',
      tableNumber: 'Table 1',
      paymentMethod: 'UPI',
      discount: 0,
      discountPercent: 0,
      amount: 1, // deliberately forged client total; server must ignore it
    };
    const quote = await calculateCheckoutQuote(body, { id: 'usr-1', role: 'Owner' });

    globalThis.fetch = async (url, options = {}) => {
      if (url.endsWith('/orders') && options.method === 'POST') {
        return { ok: true, json: async () => ({ id: orderId, ...JSON.parse(options.body) }) };
      }
      if (url.endsWith(`/orders/${orderId}`)) {
        return { ok: true, json: async () => ({ id: orderId, amount: quote.amountPaise, currency: 'INR', status: 'paid' }) };
      }
      if (url.endsWith(`/payments/${paymentId}`)) {
        return { ok: true, json: async () => ({ id: paymentId, order_id: orderId, amount: quote.amountPaise, currency: 'INR', status: 'captured' }) };
      }
      throw new Error(`Unexpected mocked Razorpay URL: ${url}`);
    };

    try {
      const user = { id: 'usr-1', role: 'Owner', name: 'Owner' };
      const created = await createPaymentAttempt({ user, body });
      assert.equal(created.id, orderId);
      assert.equal(created.amount, quote.amountPaise);

      const signature = crypto.createHmac('sha256', testSecret).update(`${orderId}|${paymentId}`).digest('hex');
      const result = await verifyPaymentAttempt({ staffId: user.id, razorpayOrderId: orderId, razorpayPaymentId: paymentId, razorpaySignature: signature });
      assert.equal(result.valid, true);
      assert.equal(result.amountPaise, quote.amountPaise);

      const stored = await getVerifiedPaymentAttempt({
        orderId,
        paymentId,
        staffId: user.id,
        fingerprint: createPaymentFingerprint(body),
        amountPaise: quote.amountPaise,
      });
      assert.ok(stored);
      assert.equal(await getVerifiedPaymentAttempt({
        orderId,
        paymentId,
        staffId: user.id,
        fingerprint: createPaymentFingerprint(body),
        amountPaise: quote.amountPaise - 1,
      }), null);
      assert.equal(await getVerifiedPaymentAttempt({
        orderId,
        paymentId,
        staffId: 'another-user',
        fingerprint: createPaymentFingerprint(body),
        amountPaise: quote.amountPaise,
      }), null);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('aggregates recipe ingredient totals across multiple products and quantities', () => {
    const products = [
      {
        id: 'prod-1',
        recipe: [
          { ingredientId: 'ing-beans', quantity: 18 },
          { ingredientId: 'ing-milk', quantity: 150 },
        ],
      },
      {
        id: 'prod-2',
        recipe: [
          { ingredientId: 'ing-beans', quantity: 20 },
          { ingredientId: 'ing-vanilla', quantity: 15 },
        ],
      },
    ];

    const items = [
      { productId: 'prod-1', quantity: 2 }, // 36 beans, 300 milk
      { productId: 'prod-2', quantity: 3 }, // 60 beans, 45 vanilla
    ];

    const totals = getRecipeIngredientTotals(items, products);
    assert.equal(totals['ing-beans'], 96);
    assert.equal(totals['ing-milk'], 300);
    assert.equal(totals['ing-vanilla'], 45);
  });
});
