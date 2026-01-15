import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../middleware/auth';
import {
  DiscordNotificationService,
  DiscordConfig,
  NotificationEvent,
} from '../services/DiscordNotificationService';
import { FtpStorageService } from '../services/FtpStorageService';
import { SettingsService } from '../services/SettingsService';
import { PERMISSIONS } from '../permissions/definitions';
import logger from '../utils/logger';

export function createSettingsRoutes(
  settingsService: SettingsService,
  discordService: DiscordNotificationService,
  ftpService: FtpStorageService
): Router {
  const router = Router();

  // ============================================
  // General Settings
  // ============================================

  /**
   * GET /api/settings
   * Get all settings (masked)
   */
  router.get('/', requirePermission(PERMISSIONS.SETTINGS_VIEW), async (_req, res: Response) => {
    try {
      const categories = settingsService.getCategories();
      const settings: Record<string, Record<string, string>> = {};

      for (const category of categories) {
        settings[category] = await settingsService.getCategoryMasked(category);
      }

      res.json({ settings, categories });
    } catch (error: any) {
      logger.error('Error getting settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================
  // Discord Settings (must be before /:category)
  // ============================================

  /**
   * GET /api/settings/discord
   * Get Discord notification settings
   */
  router.get(
    '/discord',
    requirePermission(PERMISSIONS.SETTINGS_VIEW),
    async (_req, res: Response) => {
      try {
        const settings = await settingsService.getCategoryMasked('discord');

        const response: DiscordConfig = {
          enabled: settings['discord.enabled'] === 'true',
          webhookUrl: settings['discord.webhookUrl'] || undefined,
          username: settings['discord.username'] || 'Hytale Server Manager',
          avatarUrl: settings['discord.avatarUrl'] || undefined,
          enabledEvents: (await settingsService.getJsonArray(
            'discord.enabledEvents'
          )) as NotificationEvent[],
          mentionRoleId: settings['discord.mentionRoleId'] || undefined,
        };

        res.json(response);
      } catch (error: any) {
        logger.error('Error getting Discord settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * PUT /api/settings/discord
   * Update Discord notification settings
   */
  router.put(
    '/discord',
    requirePermission(PERMISSIONS.SETTINGS_UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const updates: Partial<DiscordConfig> = req.body;

        // Validate webhook URL if provided and not masked
        if (updates.webhookUrl && updates.webhookUrl !== '***') {
          // More permissive regex: accepts discord.com or discordapp.com, and any valid token characters
          const webhookRegex = /^https:\/\/(discord\.com|discordapp\.com|ptb\.discord\.com|canary\.discord\.com)\/api\/webhooks\/\d+\/.+$/;
          if (!webhookRegex.test(updates.webhookUrl)) {
            res.status(400).json({ error: 'Invalid Discord webhook URL. Must be a valid Discord webhook URL (https://discord.com/api/webhooks/...)' });
            return;
          }
        }

        // Build settings object
        const settingsUpdates: Record<string, string> = {};

        if (updates.enabled !== undefined) {
          settingsUpdates['discord.enabled'] = String(updates.enabled);
        }
        if (updates.webhookUrl && updates.webhookUrl !== '***') {
          settingsUpdates['discord.webhookUrl'] = updates.webhookUrl;
        }
        if (updates.username !== undefined) {
          settingsUpdates['discord.username'] = updates.username;
        }
        if (updates.avatarUrl !== undefined) {
          settingsUpdates['discord.avatarUrl'] = updates.avatarUrl;
        }
        if (updates.enabledEvents) {
          settingsUpdates['discord.enabledEvents'] = JSON.stringify(updates.enabledEvents);
        }
        if (updates.mentionRoleId !== undefined) {
          settingsUpdates['discord.mentionRoleId'] = updates.mentionRoleId;
        }

        await settingsService.updateCategory('discord', settingsUpdates, req.user?.id);

        // Apply to Discord service
        await applyDiscordSettings(settingsService, discordService);

        res.json({ success: true, message: 'Discord settings updated successfully' });
      } catch (error: any) {
        logger.error('Error updating Discord settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * POST /api/settings/discord/test
   * Send a test Discord notification
   */
  router.post(
    '/discord/test',
    requirePermission(PERMISSIONS.SETTINGS_UPDATE),
    async (_req, res: Response) => {
      try {
        const result = await discordService.testNotification();

        if (result) {
          res.json({ success: true, message: 'Test notification sent successfully' });
        } else {
          res.status(500).json({ error: 'Failed to send test notification' });
        }
      } catch (error: any) {
        logger.error('Error sending test notification:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ============================================
  // FTP Storage Settings
  // ============================================

  /**
   * GET /api/settings/ftp
   * Get FTP storage settings (credentials masked)
   */
  router.get('/ftp', requirePermission(PERMISSIONS.SETTINGS_VIEW), async (_req, res: Response) => {
    try {
      const settings = await settingsService.getCategoryMasked('ftp');

      const response = {
        enabled: settings['ftp.enabled'] === 'true',
        host: settings['ftp.host'] || '',
        port: parseInt(settings['ftp.port'] || '21', 10),
        username: settings['ftp.username'] || '',
        password: settings['ftp.password'] || '',
        secure: settings['ftp.secure'] === 'true',
        configured: !!(settings['ftp.host'] && settings['ftp.username']),
      };

      res.json(response);
    } catch (error: any) {
      logger.error('Error getting FTP settings:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/settings/ftp
   * Update FTP storage settings
   */
  router.put(
    '/ftp',
    requirePermission(PERMISSIONS.SETTINGS_UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { enabled, host, port, username, password, secure } = req.body;

        const settingsUpdates: Record<string, string> = {};

        if (enabled !== undefined) {
          settingsUpdates['ftp.enabled'] = String(enabled);
        }
        if (host !== undefined) {
          settingsUpdates['ftp.host'] = host;
        }
        if (port !== undefined) {
          settingsUpdates['ftp.port'] = String(port);
        }
        if (username !== undefined) {
          settingsUpdates['ftp.username'] = username;
        }
        if (password && password !== '***') {
          settingsUpdates['ftp.password'] = password;
        }
        if (secure !== undefined) {
          settingsUpdates['ftp.secure'] = String(secure);
        }

        await settingsService.updateCategory('ftp', settingsUpdates, req.user?.id);

        // Apply to FTP service
        await applyFtpSettings(settingsService, ftpService);

        res.json({ success: true, message: 'FTP settings updated successfully' });
      } catch (error: any) {
        logger.error('Error updating FTP settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * GET /api/settings/ftp/status
   * Get FTP connection status
   */
  router.get(
    '/ftp/status',
    requirePermission(PERMISSIONS.SETTINGS_VIEW),
    async (_req, res: Response) => {
      try {
        if (!ftpService.isEnabled()) {
          res.json({
            enabled: false,
            connected: false,
            message: 'FTP is not configured',
          });
          return;
        }

        const result = await ftpService.testConnection();
        res.json({
          enabled: true,
          connected: result.success,
          message: result.message,
        });
      } catch (error: any) {
        logger.error('Error checking FTP status:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * POST /api/settings/ftp/test
   * Test FTP connection with provided credentials
   */
  router.post(
    '/ftp/test',
    requirePermission(PERMISSIONS.SETTINGS_UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { host, port, username, password, secure } = req.body;

        if (!host || !username || !password) {
          res.status(400).json({ error: 'Host, username, and password are required' });
          return;
        }

        // Create temporary service with provided credentials
        const testService = new FtpStorageService({
          host,
          port: port || 21,
          username,
          password,
          secure: secure || false,
        });

        const result = await testService.testConnection();

        res.json({
          success: result.success,
          message: result.message,
        });
      } catch (error: any) {
        logger.error('Error testing FTP connection:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ============================================
  // Modtale Settings
  // ============================================

  /**
   * GET /api/settings/modtale
   * Get Modtale API settings
   */
  router.get(
    '/modtale',
    requirePermission(PERMISSIONS.SETTINGS_VIEW),
    async (_req, res: Response) => {
      try {
        const settings = await settingsService.getCategoryMasked('modtale');

        res.json({
          apiKey: settings['modtale.apiKey'] || '',
          configured: !!settings['modtale.apiKey'],
        });
      } catch (error: any) {
        logger.error('Error getting Modtale settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * PUT /api/settings/modtale
   * Update Modtale API settings
   */
  router.put(
    '/modtale',
    requirePermission(PERMISSIONS.SETTINGS_UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { apiKey } = req.body;

        if (apiKey && apiKey !== '***') {
          await settingsService.set('modtale.apiKey', apiKey, req.user?.id);
        }

        res.json({ success: true, message: 'Modtale settings updated successfully' });
      } catch (error: any) {
        logger.error('Error updating Modtale settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  // ============================================
  // Generic Category Routes (must be LAST - after all specific routes)
  // ============================================

  /**
   * GET /api/settings/:category
   * Get settings for a specific category (masked)
   */
  router.get(
    '/:category',
    requirePermission(PERMISSIONS.SETTINGS_VIEW),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { category } = req.params;
        const settings = await settingsService.getCategoryMasked(category);

        res.json({ category, settings });
      } catch (error: any) {
        logger.error('Error getting settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  /**
   * PUT /api/settings/:category
   * Update settings for a category
   */
  router.put(
    '/:category',
    requirePermission(PERMISSIONS.SETTINGS_UPDATE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { category } = req.params;
        const updates = req.body as Record<string, string>;

        await settingsService.updateCategory(category, updates, req.user?.id);

        // Apply settings to services
        await applySettingsToServices(category, settingsService, discordService, ftpService);

        const settings = await settingsService.getCategoryMasked(category);
        res.json({ success: true, category, settings });
      } catch (error: any) {
        logger.error('Error updating settings:', error);
        res.status(500).json({ error: error.message });
      }
    }
  );

  return router;
}

/**
 * Apply settings to services
 */
async function applySettingsToServices(
  category: string,
  settingsService: SettingsService,
  discordService: DiscordNotificationService,
  ftpService: FtpStorageService
): Promise<void> {
  switch (category) {
    case 'discord':
      await applyDiscordSettings(settingsService, discordService);
      break;
    case 'ftp':
      await applyFtpSettings(settingsService, ftpService);
      break;
  }
}

/**
 * Apply Discord settings to service
 */
async function applyDiscordSettings(
  settingsService: SettingsService,
  discordService: DiscordNotificationService
): Promise<void> {
  const config: DiscordConfig = {
    enabled: await settingsService.getBoolean('discord.enabled'),
    webhookUrl: (await settingsService.get('discord.webhookUrl')) || undefined,
    username: (await settingsService.get('discord.username')) || 'Hytale Server Manager',
    avatarUrl: (await settingsService.get('discord.avatarUrl')) || undefined,
    enabledEvents: (await settingsService.getJsonArray(
      'discord.enabledEvents'
    )) as NotificationEvent[],
    mentionRoleId: (await settingsService.get('discord.mentionRoleId')) || undefined,
  };

  discordService.updateConfig(config);
  logger.info('Applied Discord settings to service');
}

/**
 * Apply FTP settings to service
 */
async function applyFtpSettings(
  settingsService: SettingsService,
  ftpService: FtpStorageService
): Promise<void> {
  const enabled = await settingsService.getBoolean('ftp.enabled');
  const host = await settingsService.get('ftp.host');
  const port = await settingsService.getNumber('ftp.port');
  const username = await settingsService.get('ftp.username');
  const password = await settingsService.get('ftp.password');
  const secure = await settingsService.getBoolean('ftp.secure');

  if (enabled && host && username && password) {
    ftpService.updateConfig({
      host,
      port: port || 21,
      username,
      password,
      secure,
    });
    logger.info('Applied FTP settings to service');
  }
}

// Export for use in app initialization
export { applyDiscordSettings, applyFtpSettings };
