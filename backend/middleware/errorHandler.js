export const errorHandler = (err, req, res, _next) => {
  // Safe logging without leaking sensitive credentials
  const safeMessage = (err.message || 'Internal Server Error')
    .replace(/mongodb(\+srv)?:\/\/[^\s]+/gi, 'mongodb://[REDACTED]')
    .replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, 'Bearer [REDACTED]');

  console.error('[FUSION Error]', err.name || 'Error', safeMessage);

  let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = safeMessage;

  // Handle Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Resource not found with specified ID format';
  }

  // Handle Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate value entered for ${field}. Please use another value.`;
  }

  // Handle Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((val) => val.message)
      .join(', ');
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token is invalid or expired. Please log in again.';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

export const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `API Route Not Found: ${req.method} ${req.originalUrl}`,
  });
};

export default errorHandler;
