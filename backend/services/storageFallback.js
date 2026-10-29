/**
 * In-memory fallback repository for FUSION backend
 * Used when MongoDB connection is establishing or when MONGODB_URI is absent in local dev/tests.
 */

import {
  initialSettings,
  initialSuppliers,
  initialInventory,
  initialProducts,
  initialCustomers,
  initialStaff,
  initialAttendance,
  initialOrders,
  initialExpenses,
} from '../../src/data/initialData.js';

class FallbackStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.settings = JSON.parse(JSON.stringify(initialSettings));
    this.suppliers = JSON.parse(JSON.stringify(initialSuppliers));
    this.inventory = JSON.parse(JSON.stringify(initialInventory));
    this.products = JSON.parse(JSON.stringify(initialProducts));
    this.customers = JSON.parse(JSON.stringify(initialCustomers));
    this.staff = JSON.parse(JSON.stringify(initialStaff));
    this.attendance = JSON.parse(JSON.stringify(initialAttendance));
    this.orders = JSON.parse(JSON.stringify(initialOrders));
    this.expenses = JSON.parse(JSON.stringify(initialExpenses));
    this.paymentAttempts = [];
    // Default staff users with genuine bcrypt hash for 'password123'
    // Stored hash: $2b$10$ZhRAcJb0Sgh9XgZ86BR.SOmGChFAQBHyi0kGa6E48PRsgdBFSD4W2
    this.users = [
      {
        id: 'usr-1',
        name: 'Kavita Menon',
        email: 'owner@fusioncoffee.in',
        password: '$2b$10$ZhRAcJb0Sgh9XgZ86BR.SOmGChFAQBHyi0kGa6E48PRsgdBFSD4W2',
        role: 'Owner',
        phone: '+91 98765 00001',
        shift: 'Full Day',
        status: 'Active',
      },
      {
        id: 'usr-2',
        name: 'Nikhil Rao',
        email: 'manager@fusioncoffee.in',
        password: '$2b$10$ZhRAcJb0Sgh9XgZ86BR.SOmGChFAQBHyi0kGa6E48PRsgdBFSD4W2',
        role: 'Manager',
        phone: '+91 98765 00002',
        shift: 'Morning (07:00 - 15:00)',
        status: 'Active',
      },
      {
        id: 'usr-3',
        name: 'Tanya Fernandez',
        email: 'cashier@fusioncoffee.in',
        password: '$2b$10$ZhRAcJb0Sgh9XgZ86BR.SOmGChFAQBHyi0kGa6E48PRsgdBFSD4W2',
        role: 'Cashier',
        phone: '+91 98765 00004',
        shift: 'Evening (14:30 - 22:30)',
        status: 'Active',
      },
      {
        id: 'usr-4',
        name: 'Aarav Sharma',
        email: 'barista@fusioncoffee.in',
        password: '$2b$10$ZhRAcJb0Sgh9XgZ86BR.SOmGChFAQBHyi0kGa6E48PRsgdBFSD4W2',
        role: 'Barista',
        phone: '+91 98765 00003',
        shift: 'Morning (07:00 - 15:00)',
        status: 'Active',
      },
    ];
  }
}

export const fallbackStore = new FallbackStore();
export default fallbackStore;
