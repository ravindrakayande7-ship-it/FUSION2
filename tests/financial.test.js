import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderTotals } from '../src/utils/orderLogic.js';

describe('Financial Calculations', () => {
  it('correctly calculates subtotal for multiple items with quantities', () => {
    const items = [
      { name: 'Espresso', price: 160, quantity: 2, totalItemPrice: 320 },
      { name: 'Croissant', price: 180, quantity: 1, totalItemPrice: 180 },
    ];
    const result = calculateOrderTotals(items, 0, 5.0);
    assert.equal(result.subtotal, 500);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.discountedSubtotal, 500);
    assert.equal(result.taxAmount, 25); // 5% of 500 = 25
    assert.equal(result.grandTotal, 525);
  });

  it('correctly applies percentage discounts and rounds to 2 decimals', () => {
    const items = [
      { name: 'Cappuccino', price: 210, quantity: 2, totalItemPrice: 420 },
    ];
    // 10% discount on 420 = 42.00
    // Discounted subtotal = 378.00
    // 5% GST on 378 = 18.90
    // Grand Total = 396.90
    const result = calculateOrderTotals(items, 10, 5.0);
    assert.equal(result.subtotal, 420);
    assert.equal(result.discountAmount, 42);
    assert.equal(result.discountedSubtotal, 378);
    assert.equal(result.taxAmount, 18.9);
    assert.equal(result.grandTotal, 396.9);
  });

  it('handles 0% discount and custom tax rate', () => {
    const items = [{ name: 'Cold Brew', price: 230, quantity: 1, totalItemPrice: 230 }];
    const result = calculateOrderTotals(items, 0, 18.0);
    assert.equal(result.subtotal, 230);
    assert.equal(result.taxAmount, 41.4); // 18% of 230 = 41.4
    assert.equal(result.grandTotal, 271.4);
  });

  it('safely handles empty cart and negative / invalid inputs', () => {
    const result = calculateOrderTotals([], -5, -2);
    assert.equal(result.subtotal, 0);
    assert.equal(result.discountAmount, 0);
    assert.equal(result.taxAmount, 0);
    assert.equal(result.grandTotal, 0);
  });

  it('clamps discount percentage above 100% to 100%', () => {
    const items = [{ name: 'Test Coffee', price: 200, quantity: 1, totalItemPrice: 200 }];
    const result = calculateOrderTotals(items, 150, 5.0);
    assert.equal(result.subtotal, 200);
    assert.equal(result.discountAmount, 200);
    assert.equal(result.discountedSubtotal, 0);
    assert.equal(result.taxAmount, 0);
    assert.equal(result.grandTotal, 0);
  });
});
