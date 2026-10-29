import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { getDBStatus } from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { verifyCsrf } from './middleware/csrf.js';
import { razorpayWebhookHandler } from './controllers/paymentWebhookController.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import staffRoutes from './routes/staffRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';

dotenv.config();

const app = express();

// Trust proxy configuration:
// In production behind reverse proxies (Cloud Run, Render, Nginx), trust the first hop.
// Otherwise disabled in local development.
const trustProxySetting =
  process.env.TRUST_PROXY !== undefined
    ? process.env.TRUST_PROXY === 'true'
      ? 1
      : process.env.TRUST_PROXY === 'false'
      ? false
      : Number(process.env.TRUST_PROXY) || 1
    : process.env.NODE_ENV === 'production'
    ? 1
    : false;

app.set('trust proxy', trustProxySetting);

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(cookieParser());

const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((u) => u.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. same-origin SSR/SPA, curl, mobile clients)
      if (!origin) return callback(null, true);

      // In development mode, permit local dev preview environments
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      // In production mode, strictly require matching configured CLIENT_URL origin(s)
      if (allowedOrigins.length > 0 && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS violation: Origin '${origin}' is not authorized.`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
  })
);

// Razorpay webhooks must receive the untouched raw request body for HMAC verification.
app.post(
  '/api/webhooks/razorpay',
  rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }),
  express.raw({ type: 'application/json', limit: '1mb' }),
  razorpayWebhookHandler
);

// Payload size limit to prevent memory DoS attacks
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// General Rate Limiter (300 requests per 15 minutes)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: {
    success: false,
    message: 'Too many requests from this IP address, please try again after 15 minutes.',
  },
});
app.use('/api', apiLimiter);

// Strict Rate Limiter for Login (20 attempts per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false,
    xForwardedForHeader: false,
    forwardedHeader: false,
  },
  message: {
    success: false,
    message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  },
});
app.use('/api/auth/login', loginLimiter);

// Health Endpoint (before CSRF check)
app.get('/api/health', (_req, res) => {
  const dbStatus = getDBStatus();
  res.status(200).json({
    status: 'ok',
    service: 'FUSION Coffee Shop Backend API',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.connected,
      host: dbStatus.host,
      state: dbStatus.readyState === 1 ? 'connected' : 'in-memory-fallback',
    },
  });
});

// CSRF Protection for state-changing requests
app.use('/api', verifyCsrf);

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Catch unmatched /api routes
app.use('/api/*', notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
