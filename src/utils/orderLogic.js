/**
 * Business logic utilities for FUSION Coffee Shop Management System
 * Pure functions for order calculations, state transitions, inventory tracking, and ID generation.
 */

export const VALID_ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready',
  'Completed',
  'Cancelled',
];

export const VALID_ORDER_TRANSITIONS = {
  Pending: ['Confirmed', 'Preparing', 'Cancelled'],
  Confirmed: ['Preparing', 'Cancelled'],
  Preparing: ['Ready', 'Cancelled'],
  Ready: ['Completed', 'Cancelled'],
  Completed: [], // Terminal state
  Cancelled: [], // Terminal state
};

/**
 * Validates whether an order status transition is allowed.
 * @param {string} currentStatus
 * @param {string} nextStatus
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateOrderTransition = (currentStatus, nextStatus) => {
  if (!VALID_ORDER_STATUSES.includes(currentStatus)) {
    return { valid: false, error: `Invalid current status: "${currentStatus}"` };
  }
  if (!VALID_ORDER_STATUSES.includes(nextStatus)) {
    return { valid: false, error: `Invalid target status: "${nextStatus}"` };
  }
  if (currentStatus === nextStatus) {
    return { valid: true };
  }
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: `Transition from "${currentStatus}" to "${nextStatus}" is not allowed. Allowed next states: ${
        allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'
      }.`,
    };
  }
  return { valid: true };
};

/**
 * Calculates subtotal, discount, tax, and grand total for an order or cart.
 * @param {Array} items
 * @param {number} discountPercent
 * @param {number} taxRatePercent
 * @returns {{ subtotal: number, discountAmount: number, discountedSubtotal: number, taxAmount: number, grandTotal: number }}
 */
export const calculateOrderTotals = (items = [], discountPercent = 0, taxRatePercent = 5.0) => {
  const subtotal = items.reduce((acc, item) => {
    const itemTotal =
      Number(item.totalItemPrice) ||
      (Number(item.price) || 0) * (Number(item.quantity) || 1);
    return acc + itemTotal;
  }, 0);

  const safeDiscountPct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = Math.round(((subtotal * safeDiscountPct) / 100) * 100) / 100;
  const discountedSubtotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  const safeTaxRate = Math.max(0, Number(taxRatePercent) || 0);
  const taxAmount = Math.round(((discountedSubtotal * safeTaxRate) / 100) * 100) / 100;
  const grandTotal = Math.round((discountedSubtotal + taxAmount) * 100) / 100;

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    taxAmount,
    grandTotal,
  };
};

/**
 * Checks if inventory contains sufficient stock for the given list of items and products.
 * @param {Array} items - Items with productId and quantity
 * @param {Array} inventory - Current inventory items
 * @param {Array} products - Catalog of products with recipe definitions
 * @returns {{ sufficient: boolean, missing: Array<{ ingredientId: string, name: string, required: number, available: number, unit: string }> }}
 */
export const checkIngredientsStock = (items = [], inventory = [], products = []) => {
  const requiredMap = {};

  for (const item of items) {
    const product = products.find(
      (p) => p.id === item.productId || (p._id && p._id.toString() === item.productId)
    );
    if (product && Array.isArray(product.recipe)) {
      const orderQty = Number(item.quantity) || 1;
      for (const recipeItem of product.recipe) {
        const id = recipeItem.ingredientId;
        const reqQty = Number(recipeItem.quantity) || 0;
        requiredMap[id] = (requiredMap[id] || 0) + reqQty * orderQty;
      }
    }
  }

  const missing = [];
  for (const [ingredientId, neededQty] of Object.entries(requiredMap)) {
    const invItem = inventory.find((i) => i.id === ingredientId || (i._id && i._id.toString() === ingredientId));
    const available = invItem ? Number(invItem.stock) || 0 : 0;
    if (available < neededQty) {
      missing.push({
        ingredientId,
        name: invItem ? invItem.name : ingredientId,
        required: neededQty,
        available,
        unit: invItem ? invItem.unit : 'units',
      });
    }
  }

  return {
    sufficient: missing.length === 0,
    missing,
  };
};

/**
 * Deducts recipe ingredients for the ordered items.
 * @param {Array} inventory
 * @param {Array} items
 * @param {Array} products
 * @returns {Array} updated inventory array
 */
export const deductRecipeStock = (inventory = [], items = [], products = []) => {
  let updatedInventory = [...inventory];
  const dateStr = new Date().toISOString().split('T')[0];

  for (const item of items) {
    const product = products.find(
      (p) => p.id === item.productId || (p._id && p._id.toString() === item.productId)
    );
    if (product && Array.isArray(product.recipe)) {
      const orderQty = Number(item.quantity) || 1;
      for (const recipeItem of product.recipe) {
        const reqTotal = (Number(recipeItem.quantity) || 0) * orderQty;
        updatedInventory = updatedInventory.map((invItem) => {
          if (invItem.id === recipeItem.ingredientId || (invItem._id && invItem._id.toString() === recipeItem.ingredientId)) {
            return {
              ...invItem,
              stock: Math.max(0, Math.round(((Number(invItem.stock) || 0) - reqTotal) * 100) / 100),
              lastUpdated: dateStr,
            };
          }
          return invItem;
        });
      }
    }
  }

  return updatedInventory;
};

/**
 * Restores recipe ingredients when an order is cancelled.
 * @param {Array} inventory
 * @param {Array} items
 * @param {Array} products
 * @returns {Array} updated inventory array
 */
export const restoreRecipeStock = (inventory = [], items = [], products = []) => {
  let updatedInventory = [...inventory];
  const dateStr = new Date().toISOString().split('T')[0];

  for (const item of items) {
    const product = products.find(
      (p) => p.id === item.productId || (p._id && p._id.toString() === item.productId)
    );
    if (product && Array.isArray(product.recipe)) {
      const orderQty = Number(item.quantity) || 1;
      for (const recipeItem of product.recipe) {
        const restoreTotal = (Number(recipeItem.quantity) || 0) * orderQty;
        updatedInventory = updatedInventory.map((invItem) => {
          if (invItem.id === recipeItem.ingredientId || (invItem._id && invItem._id.toString() === recipeItem.ingredientId)) {
            return {
              ...invItem,
              stock: Math.round(((Number(invItem.stock) || 0) + restoreTotal) * 100) / 100,
              lastUpdated: dateStr,
            };
          }
          return invItem;
        });
      }
    }
  }

  return updatedInventory;
};

/**
 * Aggregates the total ingredient requirements for an array of order items.
 * @param {Array} items - Items with productId and quantity
 * @param {Array} products - Catalog products
 * @returns {Object.<string, number>} Map of ingredientId to required quantity
 */
export const getRecipeIngredientTotals = (items = [], products = []) => {
  const totals = {};
  for (const item of items) {
    const product = products.find(
      (p) => p.id === item.productId || (p._id && p._id.toString() === item.productId)
    );
    if (product && Array.isArray(product.recipe)) {
      const orderQty = Number(item.quantity) || 1;
      for (const recipeItem of product.recipe) {
        const id = recipeItem.ingredientId;
        const reqQty = Number(recipeItem.quantity) || 0;
        totals[id] = Math.round(((totals[id] || 0) + reqQty * orderQty) * 100) / 100;
      }
    }
  }
  return totals;
};

/**
 * Generates the next sequential unique order number without collisions.
 * @param {Array} orders - Existing orders
 * @param {number} baseStartingSeq - Fallback starting sequence (default: 1080)
 * @returns {string} Next order number (e.g. "FUS-1089")
 */
export const generateNextOrderNumber = (orders = [], baseStartingSeq = 1080) => {
  let maxSeq = baseStartingSeq;
  if (Array.isArray(orders)) {
    for (const ord of orders) {
      if (ord && typeof ord.orderNumber === 'string') {
        const match = ord.orderNumber.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }
  return `FUS-${maxSeq + 1}`;
};

export default {
  VALID_ORDER_STATUSES,
  VALID_ORDER_TRANSITIONS,
  validateOrderTransition,
  calculateOrderTotals,
  checkIngredientsStock,
  deductRecipeStock,
  restoreRecipeStock,
  getRecipeIngredientTotals,
  generateNextOrderNumber,
};
