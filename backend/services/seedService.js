import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Settings } from '../models/Settings.js';
import { Supplier } from '../models/Supplier.js';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Staff } from '../models/Staff.js';
import { Attendance } from '../models/Attendance.js';
import { Order } from '../models/Order.js';
import { Expense } from '../models/Expense.js';
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

export const seedDatabase = async (forceClean = false) => {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (forceClean) {
      if (isProduction && process.env.ALLOW_PROD_RESET !== 'true') {
        throw new Error('Database wipe/reset is forbidden in production environment.');
      }
      await Promise.all([
        Settings.deleteMany({}),
        Supplier.deleteMany({}),
        Inventory.deleteMany({}),
        Product.deleteMany({}),
        Customer.deleteMany({}),
        Staff.deleteMany({}),
        Attendance.deleteMany({}),
        Order.deleteMany({}),
        Expense.deleteMany({}),
      ]);
      console.log('[FUSION Seed] Cleared existing cafe documents.');
    }

    // 1. Settings
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create(initialSettings);
      console.log('[FUSION Seed] Seeded Settings');
    }

    // 2. Suppliers
    const suppliersCount = await Supplier.countDocuments();
    if (suppliersCount === 0) {
      await Supplier.insertMany(initialSuppliers);
      console.log('[FUSION Seed] Seeded Suppliers');
    }

    // 3. Inventory
    const invCount = await Inventory.countDocuments();
    if (invCount === 0) {
      await Inventory.insertMany(initialInventory);
      console.log('[FUSION Seed] Seeded Inventory');
    }

    // 4. Products
    const prodCount = await Product.countDocuments();
    if (prodCount === 0) {
      await Product.insertMany(initialProducts);
      console.log('[FUSION Seed] Seeded Products');
    }

    // 5. Customers
    const custCount = await Customer.countDocuments();
    if (custCount === 0) {
      await Customer.insertMany(initialCustomers);
      console.log('[FUSION Seed] Seeded Customers');
    }

    // 6. Staff
    const staffCount = await Staff.countDocuments();
    if (staffCount === 0) {
      await Staff.insertMany(initialStaff);
      console.log('[FUSION Seed] Seeded Staff');
    }

    // 7. Attendance
    const attCount = await Attendance.countDocuments();
    if (attCount === 0) {
      await Attendance.insertMany(initialAttendance);
      console.log('[FUSION Seed] Seeded Attendance');
    }

    // 8. Orders
    const orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      await Order.insertMany(initialOrders);
      console.log('[FUSION Seed] Seeded Orders');
    }

    // 9. Expenses
    const expCount = await Expense.countDocuments();
    if (expCount === 0) {
      await Expense.insertMany(initialExpenses);
      console.log('[FUSION Seed] Seeded Expenses');
    }

    // 10. Default Accounts
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      // Production bootstrap creates one owner only, never public demo staff accounts.
      if (isProduction && !process.env.INITIAL_ADMIN_PASSWORD) {
        console.warn(
          '[FUSION Seed] Production mode: no users were created. Configure INITIAL_ADMIN_PASSWORD (16+ characters) to create the bootstrap owner.'
        );
        return true;
      }

      const seedPassword = process.env.INITIAL_ADMIN_PASSWORD || 'password123';
      if (isProduction && seedPassword.trim().length < 16) {
        throw new Error('INITIAL_ADMIN_PASSWORD must contain at least 16 characters in production.');
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(seedPassword, salt);

      const defaultUsers = isProduction ? [
        {
          name: 'FUSION Owner',
          email: 'owner@fusioncoffee.in',
          password: hashedPassword,
          role: 'Owner',
          status: 'Active',
        },
      ] : [
        {
          name: 'Kavita Menon',
          email: 'owner@fusioncoffee.in',
          password: hashedPassword,
          role: 'Owner',
          phone: '+91 98765 00001',
          shift: 'Full Day',
          status: 'Active',
        },
        {
          name: 'Nikhil Rao',
          email: 'manager@fusioncoffee.in',
          password: hashedPassword,
          role: 'Manager',
          phone: '+91 98765 00002',
          shift: 'Morning (07:00 - 15:00)',
          status: 'Active',
        },
        {
          name: 'Tanya Fernandez',
          email: 'cashier@fusioncoffee.in',
          password: hashedPassword,
          role: 'Cashier',
          phone: '+91 98765 00004',
          shift: 'Evening (14:30 - 22:30)',
          status: 'Active',
        },
        {
          name: 'Aarav Sharma',
          email: 'barista@fusioncoffee.in',
          password: hashedPassword,
          role: 'Barista',
          phone: '+91 98765 00003',
          shift: 'Morning (07:00 - 15:00)',
          status: 'Active',
        },
      ];

      await User.insertMany(defaultUsers);
      console.log(`[FUSION Seed] Seeded ${isProduction ? 'production bootstrap owner' : 'development staff accounts'} with bcrypt hashing`);
    }

    return true;
  } catch (error) {
    console.error('[FUSION Seed Error]', error.message);
    throw error;
  }
};

export default seedDatabase;
