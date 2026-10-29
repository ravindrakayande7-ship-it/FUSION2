import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import dotenv from 'dotenv';
import app from './backend/app.js';
import { connectDB } from './backend/config/db.js';
import { seedDatabase } from './backend/services/seedService.js';
import { validateJWTConfig } from './backend/config/jwt.js';
import { validatePaymentConfig } from './backend/config/payment.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

async function start() {
  try {
    validateJWTConfig();
    validatePaymentConfig();
    const isConnected = await connectDB();
    if (isConnected) {
      try {
        await seedDatabase(false);
      } catch (e) {
        console.warn('[FUSION] Seed check:', e.message);
      }
    }

    if (!isProduction) {
      const { createServer } = await import('vite');
      const vite = await createServer({
        server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      app.use(express.static(path.resolve(__dirname, 'dist')));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
      });
    }

    app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[FUSION Full-Stack] Startup failed:', err.message);
    process.exit(1);
  }
}

start();
