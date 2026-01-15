import helmet from 'helmet';
import { Express } from 'express';
import config from '../config';

/**
 * Configure security headers using Helmet
 */
export function configureSecurityHeaders(app: Express): void {
  // Use Helmet with HSTS disabled by default (requires explicit opt-in via ENABLE_HSTS)
  // Also disable cross-origin policies that can cause issues with HTTP connections
  app.use(helmet({
    hsts: false, // Disabled by default - enable via ENABLE_HSTS env var
    contentSecurityPolicy: false, // We configure CSP separately below
    crossOriginOpenerPolicy: false, // Disable COOP - causes issues with HTTP
    crossOriginEmbedderPolicy: false, // Disable COEP - causes issues with HTTP
  }));

  // Content Security Policy (without upgrade-insecure-requests to allow HTTP)
  app.use(
    helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'http:'],
        connectSrc: ["'self'", 'ws:', 'wss:'], // Allow WebSocket connections
        fontSrc: ["'self'", 'https://fonts.gstatic.com'], // Google Fonts are served from gstatic
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        upgradeInsecureRequests: null, // Explicitly disable - allows HTTP
      },
    })
  );

  // HTTP Strict Transport Security (HSTS)
  // Only enable if explicitly configured (requires proper SSL setup)
  if (process.env.ENABLE_HSTS === 'true') {
    app.use(
      helmet.hsts({
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      })
    );
  }

  // Prevent clickjacking
  app.use(helmet.frameguard({ action: 'deny' }));

  // Prevent MIME type sniffing
  app.use(helmet.noSniff());

  // Hide X-Powered-By header
  app.use(helmet.hidePoweredBy());

  // Set X-Content-Type-Options
  app.use(helmet.xssFilter());

  // Set Referrer Policy
  app.use(
    helmet.referrerPolicy({
      policy: 'strict-origin-when-cross-origin',
    })
  );

  // Set Permissions Policy (formerly Feature Policy)
  app.use((_req, res, next) => {
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=()'
    );
    next();
  });
}

/**
 * HTTPS redirect middleware for production
 * Only enabled when ENFORCE_HTTPS=true (for use behind SSL-terminating proxy)
 */
export function enforceHTTPS(app: Express): void {
  if (config.nodeEnv === 'production' && process.env.ENFORCE_HTTPS === 'true') {
    app.use((req, res, next) => {
      if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect(`https://${req.get('host')}${req.url}`);
      }
      next();
    });
  }
}
