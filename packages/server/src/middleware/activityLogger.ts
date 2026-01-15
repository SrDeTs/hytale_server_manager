import { Request, Response, NextFunction } from 'express';

/**
 * Request context for activity logging
 */
export interface ActivityContext {
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Extended request with activity context
 */
export interface RequestWithActivityContext extends Request {
  activityContext?: ActivityContext;
}

/**
 * Middleware to capture request context for activity logging
 * Extracts IP address and user agent from incoming requests
 */
export function activityLoggerMiddleware(
  req: RequestWithActivityContext,
  _res: Response,
  next: NextFunction
): void {
  // Get IP address (handle proxies)
  const forwarded = req.headers['x-forwarded-for'];
  let ipAddress: string | null = null;

  if (forwarded) {
    // X-Forwarded-For can be a comma-separated list
    ipAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  } else if (req.socket?.remoteAddress) {
    ipAddress = req.socket.remoteAddress;
  }

  // Normalize IPv6 localhost to IPv4
  if (ipAddress === '::1' || ipAddress === '::ffff:127.0.0.1') {
    ipAddress = '127.0.0.1';
  }

  // Get user agent
  const userAgent = req.headers['user-agent'] || null;

  // Attach context to request
  req.activityContext = {
    ipAddress,
    userAgent,
  };

  next();
}

/**
 * Helper to get activity context from request
 */
export function getActivityContext(req: Request): ActivityContext {
  const reqWithContext = req as RequestWithActivityContext;
  return (
    reqWithContext.activityContext || {
      ipAddress: null,
      userAgent: null,
    }
  );
}
