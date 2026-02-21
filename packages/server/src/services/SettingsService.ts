import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import logger from '../utils/logger';

/**
 * Setting definition for initialization
 */
interface SettingDefinition {
  key: string;
  category: string;
  encrypted: boolean;
  description: string;
  defaultValue?: string;
  envVar?: string; // Environment variable to migrate from
}

/**
 * All available settings
 */
const SETTING_DEFINITIONS: SettingDefinition[] = [
  // Discord settings
  { key: 'discord.enabled', category: 'discord', encrypted: false, description: 'Enable Discord notifications', defaultValue: 'false', envVar: 'DISCORD_ENABLED' },
  { key: 'discord.webhookUrl', category: 'discord', encrypted: true, description: 'Discord webhook URL', envVar: 'DISCORD_WEBHOOK_URL' },
  { key: 'discord.username', category: 'discord', encrypted: false, description: 'Bot username', defaultValue: 'Hytale Server Manager', envVar: 'DISCORD_USERNAME' },
  { key: 'discord.avatarUrl', category: 'discord', encrypted: false, description: 'Bot avatar URL', envVar: 'DISCORD_AVATAR_URL' },
  { key: 'discord.enabledEvents', category: 'discord', encrypted: false, description: 'Enabled notification events (JSON array)', defaultValue: '["server_start","server_stop","server_crash","server_update_started","server_update_completed","server_update_failed","alert_critical"]', envVar: 'DISCORD_ENABLED_EVENTS' },
  { key: 'discord.mentionRoleId', category: 'discord', encrypted: false, description: 'Discord role ID to mention for alerts', envVar: 'DISCORD_MENTION_ROLE_ID' },

  // FTP settings
  { key: 'ftp.enabled', category: 'ftp', encrypted: false, description: 'Enable FTP storage', defaultValue: 'false', envVar: 'FTP_ENABLED' },
  { key: 'ftp.host', category: 'ftp', encrypted: false, description: 'FTP server hostname', envVar: 'FTP_HOST' },
  { key: 'ftp.port', category: 'ftp', encrypted: false, description: 'FTP server port', defaultValue: '21', envVar: 'FTP_PORT' },
  { key: 'ftp.username', category: 'ftp', encrypted: false, description: 'FTP username', envVar: 'FTP_USERNAME' },
  { key: 'ftp.password', category: 'ftp', encrypted: true, description: 'FTP password', envVar: 'FTP_PASSWORD' },
  { key: 'ftp.secure', category: 'ftp', encrypted: false, description: 'Use FTPS/TLS', defaultValue: 'false', envVar: 'FTP_SECURE' },

  // Modtale settings
  { key: 'modtale.apiKey', category: 'modtale', encrypted: true, description: 'Modtale API key', envVar: 'MODTALE_API_KEY' },

  // CurseForge settings
  { key: 'curseforge.apiKey', category: 'curseforge', encrypted: true, description: 'CurseForge API key', envVar: 'CURSEFORGE_API_KEY' },

  // System settings
  { key: 'system.migrated', category: 'system', encrypted: false, description: 'Whether settings have been migrated from env vars', defaultValue: 'false' },
];

/**
 * Keys that should be encrypted
 */
const SENSITIVE_KEYS = new Set([
  'discord.webhookUrl',
  'ftp.password',
  'modtale.apiKey',
  'curseforge.apiKey',
]);

/**
 * Settings Service
 *
 * Manages global application settings with database persistence and encryption.
 */
export class SettingsService {
  private prisma: PrismaClient;
  private cache: Map<string, string> = new Map();
  private encryptionKey: Buffer;
  private initialized = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;

    // Get encryption key from environment - REQUIRED for production
    const keyString = process.env.SETTINGS_ENCRYPTION_KEY;
    if (!keyString) {
      logger.error('CRITICAL: SETTINGS_ENCRYPTION_KEY environment variable is required!');
      logger.error('Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
      process.exit(1);
    }
    // Create a 32-byte key from the string
    this.encryptionKey = crypto.createHash('sha256').update(keyString).digest();
  }

  /**
   * Initialize the settings system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing settings system...');

    // Load all settings into cache
    await this.loadSettings();

    this.initialized = true;
    logger.info('Settings system initialized');
  }

  /**
   * Migrate settings from environment variables (one-time)
   */
  async migrateFromEnvVars(): Promise<void> {
    const migrated = await this.get('system.migrated');
    if (migrated === 'true') {
      logger.info('Settings already migrated from environment variables');
      return;
    }

    logger.info('Migrating settings from environment variables...');

    let migratedCount = 0;

    for (const def of SETTING_DEFINITIONS) {
      if (def.envVar && process.env[def.envVar]) {
        const value = process.env[def.envVar]!;
        await this.set(def.key, value);
        migratedCount++;
        logger.info(`Migrated setting: ${def.key} from ${def.envVar}`);
      } else if (def.defaultValue !== undefined) {
        // Set default value if not already set
        const existing = await this.get(def.key);
        if (existing === null) {
          await this.set(def.key, def.defaultValue);
        }
      }
    }

    // Mark as migrated
    await this.set('system.migrated', 'true');

    logger.info(`Migrated ${migratedCount} settings from environment variables`);
  }

  /**
   * Load all settings into cache
   */
  private async loadSettings(): Promise<void> {
    this.cache.clear();

    const settings = await this.prisma.globalSetting.findMany();

    for (const setting of settings) {
      let value = setting.value;

      // Decrypt if encrypted
      if (setting.encrypted) {
        try {
          value = this.decrypt(value);
        } catch (error) {
          logger.error(`Failed to decrypt setting: ${setting.key}`);
          continue;
        }
      }

      this.cache.set(setting.key, value);
    }

    logger.info(`Loaded ${settings.length} settings`);
  }

  /**
   * Get a setting value
   */
  async get(key: string): Promise<string | null> {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Load from database
    const setting = await this.prisma.globalSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return null;
    }

    let value = setting.value;

    // Decrypt if encrypted
    if (setting.encrypted) {
      try {
        value = this.decrypt(value);
      } catch (error) {
        logger.error(`Failed to decrypt setting: ${key}`);
        return null;
      }
    }

    // Update cache
    this.cache.set(key, value);

    return value;
  }

  /**
   * Get a setting as boolean
   */
  async getBoolean(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value === 'true';
  }

  /**
   * Get a setting as number
   */
  async getNumber(key: string): Promise<number | null> {
    const value = await this.get(key);
    if (value === null) return null;
    const num = parseInt(value, 10);
    return isNaN(num) ? null : num;
  }

  /**
   * Get a setting as JSON array
   */
  async getJsonArray(key: string): Promise<string[]> {
    const value = await this.get(key);
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Set a setting value
   */
  async set(key: string, value: string, userId?: string): Promise<void> {
    const isEncrypted = SENSITIVE_KEYS.has(key);
    const storedValue = isEncrypted ? this.encrypt(value) : value;

    // Find category from definitions
    const def = SETTING_DEFINITIONS.find((d) => d.key === key);
    const category = def?.category || 'general';

    await this.prisma.globalSetting.upsert({
      where: { key },
      create: {
        key,
        value: storedValue,
        encrypted: isEncrypted,
        category,
        updatedBy: userId,
      },
      update: {
        value: storedValue,
        encrypted: isEncrypted,
        updatedBy: userId,
      },
    });

    // Update cache with decrypted value
    this.cache.set(key, value);

    logger.info(`Setting updated: ${key}`);
  }

  /**
   * Get all settings in a category
   */
  async getCategory(category: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    // Get all keys in this category from definitions
    const categoryDefs = SETTING_DEFINITIONS.filter((d) => d.category === category);

    for (const def of categoryDefs) {
      const value = await this.get(def.key);
      if (value !== null) {
        result[def.key] = value;
      }
    }

    return result;
  }

  /**
   * Get all settings in a category (masked for API response)
   */
  async getCategoryMasked(category: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};

    const categoryDefs = SETTING_DEFINITIONS.filter((d) => d.category === category);

    for (const def of categoryDefs) {
      const value = await this.get(def.key);
      if (value !== null) {
        // Mask sensitive values
        if (SENSITIVE_KEYS.has(def.key) && value) {
          result[def.key] = '***';
        } else {
          result[def.key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Update multiple settings in a category
   */
  async updateCategory(
    category: string,
    settings: Record<string, string>,
    userId?: string
  ): Promise<void> {
    const categoryDefs = SETTING_DEFINITIONS.filter((d) => d.category === category);
    const validKeys = new Set(categoryDefs.map((d) => d.key));

    for (const [key, value] of Object.entries(settings)) {
      if (validKeys.has(key)) {
        // Skip masked values (don't overwrite with ***)
        if (value === '***') {
          continue;
        }
        await this.set(key, value, userId);
      }
    }

    logger.info(`Updated settings category: ${category}`);
  }

  /**
   * Get all setting definitions
   */
  getDefinitions(): SettingDefinition[] {
    return SETTING_DEFINITIONS;
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    const categories = new Set(SETTING_DEFINITIONS.map((d) => d.category));
    return Array.from(categories).filter((c) => c !== 'system');
  }

  /**
   * Encrypt a value
   */
  private encrypt(value: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    let encrypted = cipher.update(value, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt a value
   */
  private decrypt(value: string): string {
    const [ivHex, encrypted] = value.split(':');
    if (!ivHex || !encrypted) {
      throw new Error('Invalid encrypted value format');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
