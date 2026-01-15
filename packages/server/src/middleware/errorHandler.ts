import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import logger from '../utils/logger';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  // Generate a unique error ID for tracking
  const errorId = crypto.randomBytes(4).toString('hex').toUpperCase();

  // Log the full error with ID for debugging
  logger.error(`[${errorId}] Unhandled error:`, err);

  // Return generic message to client (never expose internal details)
  res.status(500).json({
    error: 'Internal server error',
    errorId,
    message: 'An unexpected error occurred. Please try again or contact support with the error ID.',
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
