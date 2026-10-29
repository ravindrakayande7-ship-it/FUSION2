import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fallbackStore } from '../services/storageFallback.js';
import {
  checkIngredientsStock,
  deductRecipeStock,
  restoreRecipeStock,
  validateOrderTransition,
  generateNextOrderNumber,
  calculateOrderTotals,
} from '../../src/utils/orderLogic.js';
import { createOrder, cancelOrder } from '../controllers/orderController.js';

describe('Backend Orders, Inventory & Financial Consistency', () => {
  beforeEach(() => {
    fallbackStore.reset();
    process.env.NODE_ENV = 'test';
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
  });

  it('calculates order total with 5% GST and 10% promo discount accurately', () => {
    const items = [
      { name: 'Signature Cappuccino', price: 210, quantity: 2, totalItemPrice: 420 },
      { name: 'Pure Butter Croissant', price: 180, quantity: 1, totalItemPrice: 180 },
    ];
    // Subtotal: 600
    // 10% discount: 60 -> Discounted: 540
    // 5% GST on 540 = 27
    // Total = 567
    const totals = calculateOrderTotals(items, 10, 5.0);
    assert.equal(totals.subtotal, 600);
    assert.equal(totals.discountAmount, 60);
    assert.equal(totals.discountedSubtotal, 540);
    assert.equal(totals.taxAmount, 27);
    assert.equal(totals.grandTotal, 567);
  });

  it('blocks order creation when recipe ingredient stock is insufficient', () => {
    const inventory = [
      { id: 'ing-1', name: 'Arabica Espresso Beans', stock: 15, unit: 'g' }, // only 15g left
    ];
    const products = [
      {
        id: 'prod-1',
        name: 'Signature Cappuccino',
        recipe: [{ ingredientId: 'ing-1', quantity: 18 }], // requires 18g per item
      },
    ];
    const cart = [{ productId: 'prod-1', quantity: 1 }];
    const result = checkIngredientsStock(cart, inventory, products);
    assert.equal(result.sufficient, false);
    assert.equal(result.missing.length, 1);
    assert.equal(result.missing[0].name, 'Arabica Espresso Beans');
    assert.equal(result.missing[0].required, 18);
    assert.equal(result.missing[0].available, 15);
  });

  it('deducts inventory correctly when order is confirmed', () => {
    const inventory = [
      { id: 'ing-1', name: 'Arabica Espresso Beans', stock: 1000, unit: 'g' },
      { id: 'ing-3', name: 'Organic Whole Milk', stock: 5000, unit: 'ml' },
    ];
    const products = [
      {
        id: 'prod-1',
        name: 'Signature Cappuccino',
        recipe: [
          { ingredientId: 'ing-1', quantity: 18 },
          { ingredientId: 'ing-3', quantity: 180 },
        ],
      },
    ];
    const cart = [{ productId: 'prod-1', quantity: 2 }]; // 36g beans, 360ml milk
    const updated = deductRecipeStock(inventory, cart, products);
    const beans = updated.find((i) => i.id === 'ing-1');
    const milk = updated.find((i) => i.id === 'ing-3');
    assert.equal(beans.stock, 964);
    assert.equal(milk.stock, 4640);
  });

  it('restores recipe ingredient stock when an order is cancelled', () => {
    const inventory = [
      { id: 'ing-1', name: 'Arabica Espresso Beans', stock: 964, unit: 'g' },
      { id: 'ing-3', name: 'Organic Whole Milk', stock: 4640, unit: 'ml' },
    ];
    const products = [
      {
        id: 'prod-1',
        name: 'Signature Cappuccino',
        recipe: [
          { ingredientId: 'ing-1', quantity: 18 },
          { ingredientId: 'ing-3', quantity: 180 },
        ],
      },
    ];
    const items = [{ productId: 'prod-1', quantity: 2 }];
    const restored = restoreRecipeStock(inventory, items, products);
    const beans = restored.find((i) => i.id === 'ing-1');
    const milk = restored.find((i) => i.id === 'ing-3');
    assert.equal(beans.stock, 1000);
    assert.equal(milk.stock, 5000);
  });

  it('strictly validates order transition lifecycle and rejects terminal mutations', () => {
    // Valid transitions
    assert.equal(validateOrderTransition('Pending', 'Confirmed').valid, true);
    assert.equal(validateOrderTransition('Confirmed', 'Preparing').valid, true);
    assert.equal(validateOrderTransition('Preparing', 'Ready').valid, true);
    assert.equal(validateOrderTransition('Ready', 'Completed').valid, true);
    assert.equal(validateOrderTransition('Preparing', 'Cancelled').valid, true);

    // Invalid terminal mutations
    assert.equal(validateOrderTransition('Completed', 'Pending').valid, false);
    assert.equal(validateOrderTransition('Completed', 'Cancelled').valid, false);
    assert.equal(validateOrderTransition('Cancelled', 'Preparing').valid, false);

    // Invalid skips
    assert.equal(validateOrderTransition('Pending', 'Completed').valid, false);
  });

  it('generates collision-free order numbers incrementally', () => {
    const existing = [
      { orderNumber: 'FUS-1080' },
      { orderNumber: 'FUS-1083' },
      { orderNumber: 'FUS-1081' },
    ];
    const nextNum = generateNextOrderNumber(existing);
    assert.equal(nextNum, 'FUS-1084');
  });

  it('controller ignores tampered client item prices and enforces catalog rate', async () => {
    const req = {
      user: { id: 'usr-3', name: 'Tanya Cashier', role: 'Cashier' },
      body: {
        customerName: 'Guest',
        orderType: 'Dine-in',
        paymentMethod: 'Cash',
        items: [
          {
            productId: 'prod-1', // Signature Cappuccino (Catalog price: 210)
            name: 'Signature Cappuccino',
            price: 1, // TAMPERED! Client tries to buy for ₹1
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
    assert.equal(statusCode, 201);
    // Server catalog price (210) + 5% GST (10.5) = 220.5
    assert.equal(resData.data.items[0].price, 210);
    assert.equal(resData.data.subtotal, 210);
    assert.equal(resData.data.total, 220.5);
  });

  it('controller strictly rejects invalid quantities (<= 0 or non-integers)', async () => {
    const req = {
      user: { id: 'usr-3', name: 'Tanya Cashier', role: 'Cashier' },
      body: {
        customerName: 'Guest',
        items: [
          {
            productId: 'prod-1',
            quantity: -5, // Invalid negative quantity
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
    assert.match(resData.message, /Invalid quantity/);
  });

  it('enforces role-based discount cap (rejects Cashier asking for 50% discount)', async () => {
    const req = {
      user: { id: 'usr-3', name: 'Tanya Cashier', role: 'Cashier' }, // Cashier max is 15%
      body: {
        customerName: 'Guest',
        discountPercent: 50, // Exceeds 15% cap!
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
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
    assert.match(resData.message, /Discount policy violation/);
  });

  it('marks UPI orders as simulated payment', async () => {
    const req = {
      user: { id: 'usr-3', name: 'Tanya Cashier', role: 'Cashier' },
      body: {
        customerName: 'Guest',
        paymentMethod: 'UPI',
        isSimulatedPayment: true,
        items: [
          {
            productId: 'prod-1',
            quantity: 1,
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
    assert.equal(statusCode, 201);
    assert.equal(resData.data.isSimulatedPayment, true);
    assert.equal(resData.data.paymentStatus, 'Paid (Simulated)');
  });

  it('rejects simulated online payments in production even when the demo flag is set', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_DEMO_PAYMENTS = 'true';
    const req = {
      user: { id: 'usr-3', name: 'Tanya Cashier', role: 'Cashier' },
      body: {
        paymentMethod: 'UPI',
        isSimulatedPayment: true,
        items: [{ productId: 'prod-1', quantity: 1 }],
      },
    };
    let statusCode;
    let response;
    const res = {
      status(code) { statusCode = code; return this; },
      json(body) { response = body; return this; },
    };

    await createOrder(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(response.message, /development-only/i);
  });

  it('prevents duplicate inventory restoration when order is cancelled multiple times', async () => {
    // Initial bean stock
    const initialBeans = fallbackStore.inventory.find((i) => i.id === 'ing-1').stock;

    // ord-1082 is currently Preparing with inventoryDeducted: true
    const req = {
      params: { id: 'ord-1082' },
      body: { reason: 'Guest cancelled' },
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

    // First cancellation: succeeds and restores stock
    await cancelOrder(req, res, () => {});
    assert.equal(statusCode, 200);
    assert.equal(resData.data.status, 'Cancelled');
    assert.equal(resData.data.inventoryDeducted, false);

    const beansAfterFirstCancel = fallbackStore.inventory.find((i) => i.id === 'ing-1').stock;
    assert.ok(beansAfterFirstCancel > initialBeans);

    // Second cancellation attempt: must be rejected with 400
    statusCode = null;
    resData = null;
    await cancelOrder(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.match(resData.message, /already cancelled/);

    // Stock should not be duplicated
    const beansAfterSecondCancel = fallbackStore.inventory.find((i) => i.id === 'ing-1').stock;
    assert.equal(beansAfterSecondCancel, beansAfterFirstCancel);
  });
});
