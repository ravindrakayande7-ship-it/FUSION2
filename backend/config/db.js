import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

let isConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  const isProduction = process.env.NODE_ENV === 'production';
  const allowFallback = process.env.ALLOW_IN_MEMORY_FALLBACK === 'true' && !isProduction;

  if (!uri) {
    if (isProduction || !allowFallback) {
      const msg =
        '[FATAL DATABASE ERROR] MONGODB_URI is required in production mode. In-memory fallback is disabled in production to prevent data loss on server restarts. Provide a valid MongoDB connection string.';
      console.error(msg);
      throw new Error(msg);
    }
    console.warn(
      '[FUSION Backend] MONGODB_URI is not set. Running with development in-memory fallback store.'
    );
    return false;
  }

  if (isConnected) {
    return true;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = conn.connection.readyState === 1;
    console.log(`[FUSION Backend] MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[FUSION Backend] MongoDB Connection Error: ${error.message}`);
    if (isProduction || !allowFallback) {
      const msg = `[FATAL DATABASE ERROR] Failed to connect to MongoDB in production mode (${error.message}). Server cannot start without persistent database.`;
      console.error(msg);
      throw new Error(msg, { cause: error });
    }
    console.warn(
      '[FUSION Backend] Falling back to development in-memory fallback store.'
    );
    return false;
  }
};

export const getDBStatus = () => {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host || 'none',
  };
};

export default {
  connectDB,
  getDBStatus,
};
