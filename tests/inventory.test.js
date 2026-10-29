import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkIngredientsStock,
  deductRecipeStock,
  restoreRecipeStock,
} from '../src/utils/orderLogic.js';

describe('Inventory & Recipe Deductions', () => {
  const sampleProducts = [
    {
      id: 'prod-cappuccino',
      name: 'Artisan Cappuccino',
      recipe: [
        { ingredientId: 'ing-beans', quantity: 18 }, // 18g espresso beans
        { ingredientId: 'ing-milk', quantity: 180 }, // 180ml milk
      ],
    },
    {
      id: 'prod-americano',
      name: 'Americano',
      recipe: [
        { ingredientId: 'ing-beans', quantity: 18 }, // 18g beans
      ],
    },
  ];

  it('reports sufficient stock when inventory satisfies recipe requirements', () => {
    const inventory = [
      { id: 'ing-beans', name: 'Arabica Beans', stock: 1000, unit: 'g' },
      { id: 'ing-milk', name: 'Fresh Milk', stock: 2000, unit: 'ml' },
    ];
    const items = [
      { productId: 'prod-cappuccino', quantity: 2 }, // requires 36g beans, 360ml milk
    ];
    const result = checkIngredientsStock(items, inventory, sampleProducts);
    assert.equal(result.sufficient, true);
    assert.equal(result.missing.length, 0);
  });

  it('detects insufficient stock across aggregated items and returns missing ingredient details', () => {
    const inventory = [
      { id: 'ing-beans', name: 'Arabica Beans', stock: 30, unit: 'g' }, // only 30g available
      { id: 'ing-milk', name: 'Fresh Milk', stock: 1000, unit: 'ml' },
    ];
    // 2 cappuccinos (36g beans) + 1 americano (18g beans) = 54g beans needed
    const items = [
      { productId: 'prod-cappuccino', quantity: 2 },
      { productId: 'prod-americano', quantity: 1 },
    ];
    const result = checkIngredientsStock(items, inventory, sampleProducts);
    assert.equal(result.sufficient, false);
    assert.equal(result.missing.length, 1);
    assert.equal(result.missing[0].name, 'Arabica Beans');
    assert.equal(result.missing[0].required, 54);
    assert.equal(result.missing[0].available, 30);
  });

  it('correctly deducts recipe ingredient stock on order creation', () => {
    const inventory = [
      { id: 'ing-beans', name: 'Arabica Beans', stock: 500, unit: 'g' },
      { id: 'ing-milk', name: 'Fresh Milk', stock: 1000, unit: 'ml' },
    ];
    const items = [{ productId: 'prod-cappuccino', quantity: 2 }];
    const updated = deductRecipeStock(inventory, items, sampleProducts);
    const updatedBeans = updated.find((i) => i.id === 'ing-beans');
    const updatedMilk = updated.find((i) => i.id === 'ing-milk');
    assert.equal(updatedBeans.stock, 500 - 36); // 464g
    assert.equal(updatedMilk.stock, 1000 - 360); // 640ml
  });

  it('clamps deducted stock to zero and does not yield negative inventory', () => {
    const inventory = [
      { id: 'ing-beans', name: 'Arabica Beans', stock: 20, unit: 'g' },
    ];
    const items = [{ productId: 'prod-cappuccino', quantity: 2 }]; // needs 36g
    const updated = deductRecipeStock(inventory, items, sampleProducts);
    const updatedBeans = updated.find((i) => i.id === 'ing-beans');
    assert.equal(updatedBeans.stock, 0);
  });

  it('restores recipe ingredient stock when an order is cancelled', () => {
    const currentInventory = [
      { id: 'ing-beans', name: 'Arabica Beans', stock: 464, unit: 'g' },
      { id: 'ing-milk', name: 'Fresh Milk', stock: 640, unit: 'ml' },
    ];
    const items = [{ productId: 'prod-cappuccino', quantity: 2 }];
    const restored = restoreRecipeStock(currentInventory, items, sampleProducts);
    const restoredBeans = restored.find((i) => i.id === 'ing-beans');
    const restoredMilk = restored.find((i) => i.id === 'ing-milk');
    assert.equal(restoredBeans.stock, 500);
    assert.equal(restoredMilk.stock, 1000);
  });
});
