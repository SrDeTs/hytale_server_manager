import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to check validation results
 */
export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

/**
 * Server creation validation rules
 */
export const validateServerCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 64 })
    .withMessage('Server name must be between 1 and 64 characters')
    .matches(/^[a-zA-Z0-9\s-_]+$/)
    .withMessage('Server name contains invalid characters'),
  body('address')
    .trim()
    .custom((value) => {
      // Check if it's a valid IP or domain
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      const domainRegex = /^[a-zA-Z0-9.-]+$/;
      if (!ipRegex.test(value) && !domainRegex.test(value)) {
        throw new Error('Invalid address format');
      }
      return true;
    }),
  body('port')
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be between 1 and 65535'),
  body('version')
    .trim()
    .isLength({ min: 1, max: 32 })
    .withMessage('Version must be between 1 and 32 characters'),
  body('maxPlayers')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max players must be between 1 and 10000'),
  body('gameMode')
    .trim()
    .isLength({ min: 1, max: 32 })
    .withMessage('Game mode must be between 1 and 32 characters'),
  validateRequest,
];

/**
 * Server update validation rules
 */
export const validateServerUpdate = [
  param('id').isUUID().withMessage('Invalid server ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 64 })
    .withMessage('Server name must be between 1 and 64 characters'),
  body('address')
    .optional()
    .trim()
    .matches(/^[a-zA-Z0-9.-]+$/)
    .withMessage('Invalid address format'),
  body('port')
    .optional()
    .isInt({ min: 1, max: 65535 })
    .withMessage('Port must be between 1 and 65535'),
  body('maxPlayers')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .withMessage('Max players must be between 1 and 10000'),
  validateRequest,
];

/**
 * Server ID parameter validation
 */
export const validateServerId = [
  param('id').isUUID().withMessage('Invalid server ID'),
  validateRequest,
];

/**
 * Player ban validation
 */
export const validatePlayerBan = [
  param('serverId').isUUID().withMessage('Invalid server ID'),
  param('playerId').isUUID().withMessage('Invalid player ID'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  body('duration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Duration must be a positive number'),
  validateRequest,
];

/**
 * Backup creation validation
 */
export const validateBackupCreation = [
  body('serverId').isUUID().withMessage('Invalid server ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description must not exceed 200 characters'),
  validateRequest,
];

/**
 * Command execution validation
 */
export const validateCommand = [
  param('serverId').isUUID().withMessage('Invalid server ID'),
  body('command')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Command must be between 1 and 500 characters')
    .custom((value) => {
      // Prevent potentially dangerous commands
      const dangerousPatterns = [
        /rm\s+-rf/i,
        /dd\s+if=/i,
        /mkfs/i,
        />\s*\/dev\/sd/i,
        /fork\s+bomb/i,
      ];
      for (const pattern of dangerousPatterns) {
        if (pattern.test(value)) {
          throw new Error('Command contains potentially dangerous operation');
        }
      }
      return true;
    }),
  validateRequest,
];

/**
 * File path validation
 */
export const validateFilePath = [
  param('serverId').isUUID().withMessage('Invalid server ID'),
  body('path')
    .trim()
    .custom((value) => {
      // Prevent path traversal
      if (value.includes('../') || value.includes('..\\')) {
        throw new Error('Path traversal detected');
      }
      // Prevent absolute paths
      if (value.startsWith('/') || /^[a-zA-Z]:/.test(value)) {
        throw new Error('Absolute paths not allowed');
      }
      return true;
    })
    .isLength({ min: 1, max: 500 })
    .withMessage('Path must be between 1 and 500 characters'),
  validateRequest,
];

/**
 * Discord webhook URL validation
 */
export const validateDiscordWebhook = [
  body('webhookUrl')
    .optional()
    .trim()
    .matches(/^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/)
    .withMessage('Invalid Discord webhook URL'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage('Username must be between 1 and 80 characters'),
  body('enabledEvents')
    .optional()
    .isArray()
    .withMessage('Enabled events must be an array'),
  validateRequest,
];

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  let sanitized = filename.replace(/^.*[\\\/]/, '');

  // Replace dangerous characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized;
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.substring(sanitized.lastIndexOf('.'));
    sanitized = sanitized.substring(0, 255 - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Validate and sanitize file path to prevent traversal
 */
export function sanitizePath(userPath: string, baseDir: string): string {
  const path = require('path');

  // Remove any path traversal attempts
  const normalized = path.normalize(userPath).replace(/^(\.\.(\/|\\|$))+/, '');

  // Resolve the full path
  const resolved = path.resolve(baseDir, normalized);

  // Ensure the resolved path is within the base directory
  if (!resolved.startsWith(baseDir)) {
    throw new Error('Path traversal attempt detected');
  }

  return resolved;
}
