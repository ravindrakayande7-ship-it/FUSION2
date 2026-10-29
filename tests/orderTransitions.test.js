import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateOrderTransition,
  generateNextOrderNumber,
} from '../src/utils/orderLogic.js';

describe('Order Status Transitions & Validation', () => {
  it('allows valid sequential status progression', () => {
    assert.deepEqual(validateOrderTransition('Pending', 'Confirmed'), { valid: true });
    assert.deepEqual(validateOrderTransition('Pending', 'Preparing'), { valid: true });
    assert.deepEqual(validateOrderTransition('Confirmed', 'Preparing'), { valid: true });
    assert.deepEqual(validateOrderTransition('Preparing', 'Ready'), { valid: true });
    assert.deepEqual(validateOrderTransition('Ready', 'Completed'), { valid: true });
  });

  it('allows cancellation from active non-terminal states', () => {
    assert.deepEqual(validateOrderTransition('Pending', 'Cancelled'), { valid: true });
    assert.deepEqual(validateOrderTransition('Confirmed', 'Cancelled'), { valid: true });
    assert.deepEqual(validateOrderTransition('Preparing', 'Cancelled'), { valid: true });
    assert.deepEqual(validateOrderTransition('Ready', 'Cancelled'), { valid: true });
  });

  it('rejects any status transition from terminal Completed state', () => {
    const res1 = validateOrderTransition('Completed', 'Pending');
    assert.equal(res1.valid, false);
    assert.match(res1.error, /terminal state/);

    const res2 = validateOrderTransition('Completed', 'Cancelled');
    assert.equal(res2.valid, false);
  });

  it('rejects any status transition from terminal Cancelled state', () => {
    const res1 = validateOrderTransition('Cancelled', 'Pending');
    assert.equal(res1.valid, false);
    assert.match(res1.error, /terminal state/);

    const res2 = validateOrderTransition('Cancelled', 'Completed');
    assert.equal(res2.valid, false);
  });

  it('rejects skipping stages (e.g. Pending directly to Completed)', () => {
    const res = validateOrderTransition('Pending', 'Completed');
    assert.equal(res.valid, false);
    assert.match(res.error, /not allowed/);
  });

  it('rejects backward transitions (e.g. Ready back to Preparing)', () => {
    const res = validateOrderTransition('Ready', 'Preparing');
    assert.equal(res.valid, false);
  });

  it('rejects invalid or unknown statuses', () => {
    const res = validateOrderTransition('UnknownStatus', 'Confirmed');
    assert.equal(res.valid, false);
    assert.match(res.error, /Invalid current status/);
  });
});

describe('Collision-Free Order Number Generation', () => {
  it('generates FUS-1081 when no orders exist', () => {
    assert.equal(generateNextOrderNumber([], 1080), 'FUS-1081');
  });

  it('identifies highest order number and increments strictly without collisions', () => {
    const existingOrders = [
      { orderNumber: 'FUS-1081' },
      { orderNumber: 'FUS-1084' },
      { orderNumber: 'FUS-1082' },
    ];
    // Next should be 1085, NOT 1084 (even though count is 3)
    assert.equal(generateNextOrderNumber(existingOrders, 1080), 'FUS-1085');
  });

  it('prevents collision even when orders are deleted or cancelled out of order', () => {
    const existingOrders = [{ orderNumber: 'FUS-1088' }];
    assert.equal(generateNextOrderNumber(existingOrders, 1080), 'FUS-1089');
  });
});
