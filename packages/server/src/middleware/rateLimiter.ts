import rateLimit from 'express-rate-limit';
import config from '../config';

const isDevelopment = config.nodeEnv === 'development';

/**
 * General API rate limiter
 * Limits requests to prevent abuse
 * Disabled in development mode for easier testing
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindow, // 15 minutes default
  max: isDevelopment ? 0 : config.rateLimitMax, // Disabled in dev, 100 requests per window in prod
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting in development or for health check endpoint
    return isDevelopment || req.path === '/health';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * Used for authentication and other critical endpoints
 * More lenient in development mode
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 10, // 100 in dev, 10 in production
  message: {
    error: 'Too many attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

/**
 * File upload rate limiter
 * Limits file upload requests to prevent abuse
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
