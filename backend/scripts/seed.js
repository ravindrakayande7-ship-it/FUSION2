import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { seedDatabase } from '../services/seedService.js';

dotenv.config();

const runSeed = async () => {
  console.log('[FUSION CLI Seed] Connecting to MongoDB...');
  const connected = await connectDB();
  if (!connected) {
    console.error(
      '[FUSION CLI Seed] Failed to connect to MongoDB. Please ensure MONGODB_URI is provided in .env'
    );
    process.exit(1);
  }

  try {
    console.log('[FUSION CLI Seed] Resetting and seeding fresh cafe dataset...');
    await seedDatabase(true);
    console.log('[FUSION CLI Seed] Seed completed successfully!');
    if (process.env.NODE_ENV !== 'production') {
      console.log('[FUSION CLI Seed] Default dev accounts created:');
      console.log('  Owner:   owner@fusioncoffee.in   / password123');
      console.log('  Manager: manager@fusioncoffee.in / password123');
      console.log('  Cashier: cashier@fusioncoffee.in / password123');
      console.log('  Barista: barista@fusioncoffee.in / password123');
    }
  } catch (error) {
    console.error('[FUSION CLI Seed] Error seeding database:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
};

runSeed();
