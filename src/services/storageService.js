/**
 * Storage Service for FUSION Cafe Management System
 * UI preferences and safe cache cleanup.
 * Authoritative business data is NEVER assumed from localStorage in production.
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
} from '../data/initialData.js';

const STORAGE_KEYS = {
  SETTINGS: 'fusion_cafe_settings_v1',
  SUPPLIERS: 'fusion_cafe_suppliers_v1',
  INVENTORY: 'fusion_cafe_inventory_v1',
  PRODUCTS: 'fusion_cafe_products_v1',
  CUSTOMERS: 'fusion_cafe_customers_v1',
  STAFF: 'fusion_cafe_staff_v1',
  ATTENDANCE: 'fusion_cafe_attendance_v1',
  ORDERS: 'fusion_cafe_orders_v1',
  EXPENSES: 'fusion_cafe_expenses_v1',
  SIDEBAR_COLLAPSED: 'fusion_cafe_sidebar_collapsed_v1',
};

function getStoredItem(key, defaultValue) {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

function setStoredItem(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save to storage key ${key}:`, e);
  }
}

export const storageService = {
  getSettings: () => getStoredItem(STORAGE_KEYS.SETTINGS, initialSettings),
  saveSettings: (settings) => setStoredItem(STORAGE_KEYS.SETTINGS, settings),
  getSuppliers: () => getStoredItem(STORAGE_KEYS.SUPPLIERS, initialSuppliers),
  saveSuppliers: (suppliers) => setStoredItem(STORAGE_KEYS.SUPPLIERS, suppliers),
  getInventory: () => getStoredItem(STORAGE_KEYS.INVENTORY, initialInventory),
  saveInventory: (inventory) => setStoredItem(STORAGE_KEYS.INVENTORY, inventory),
  getProducts: () => getStoredItem(STORAGE_KEYS.PRODUCTS, initialProducts),
  saveProducts: (products) => setStoredItem(STORAGE_KEYS.PRODUCTS, products),
  getCustomers: () => getStoredItem(STORAGE_KEYS.CUSTOMERS, initialCustomers),
  saveCustomers: (customers) => setStoredItem(STORAGE_KEYS.CUSTOMERS, customers),
  getStaff: () => getStoredItem(STORAGE_KEYS.STAFF, initialStaff),
  saveStaff: (staff) => setStoredItem(STORAGE_KEYS.STAFF, staff),
  getAttendance: () => getStoredItem(STORAGE_KEYS.ATTENDANCE, initialAttendance),
  saveAttendance: (attendance) => setStoredItem(STORAGE_KEYS.ATTENDANCE, attendance),
  getOrders: () => getStoredItem(STORAGE_KEYS.ORDERS, initialOrders),
  saveOrders: (orders) => setStoredItem(STORAGE_KEYS.ORDERS, orders),
  getExpenses: () => getStoredItem(STORAGE_KEYS.EXPENSES, initialExpenses),
  saveExpenses: (expenses) => setStoredItem(STORAGE_KEYS.EXPENSES, expenses),

  clearAllSessionData: () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('fusion_cafe_jwt_token_v1');
      localStorage.removeItem('fusion_cafe_active_role_v1');
      localStorage.removeItem('fusion_cafe_auth_user_v1');
    } catch (e) {
      console.error('Failed to clear session data:', e);
    }
  },

  resetAllToDefault: () => {
    try {
      sessionStorage.clear();
      setStoredItem(STORAGE_KEYS.SETTINGS, initialSettings);
      setStoredItem(STORAGE_KEYS.SUPPLIERS, initialSuppliers);
      setStoredItem(STORAGE_KEYS.INVENTORY, initialInventory);
      setStoredItem(STORAGE_KEYS.PRODUCTS, initialProducts);
      setStoredItem(STORAGE_KEYS.CUSTOMERS, initialCustomers);
      setStoredItem(STORAGE_KEYS.STAFF, initialStaff);
      setStoredItem(STORAGE_KEYS.ATTENDANCE, initialAttendance);
      setStoredItem(STORAGE_KEYS.ORDERS, initialOrders);
      setStoredItem(STORAGE_KEYS.EXPENSES, initialExpenses);
    } catch (e) {
      console.error('Failed to reset storage:', e);
    }
  },

  exportFullBackupJSON: () => {
    return JSON.stringify(
      {
        version: '1.0',
        timestamp: new Date().toISOString(),
        settings: storageService.getSettings(),
        suppliers: storageService.getSuppliers(),
        inventory: storageService.getInventory(),
        products: storageService.getProducts(),
        customers: storageService.getCustomers(),
        staff: storageService.getStaff(),
        attendance: storageService.getAttendance(),
        orders: storageService.getOrders(),
        expenses: storageService.getExpenses(),
      },
      null,
      2
    );
  },
};

export default storageService;
