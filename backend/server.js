import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './services/seedService.js';
import { validateJWTConfig } from './config/jwt.js';
import { validatePaymentConfig } from './config/payment.js';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  try {
    validateJWTConfig();
    validatePaymentConfig();
    const isConnected = await connectDB();
    if (isConnected) {
      try {
        await seedDatabase(false);
      } catch (e) {
        console.warn('[FUSION Backend] Seed check warning:', e.message);
      }
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `[FUSION Backend] Server running on port ${PORT} in ${
          process.env.NODE_ENV || 'development'
        } mode`
      );
      console.log(`[FUSION Backend] Health check available at http://localhost:${PORT}/api/health`);
    });
  } catch (err) {
    console.error('[FUSION Backend] Startup failed:', err.message);
    process.exit(1);
  }
};

startServer();
