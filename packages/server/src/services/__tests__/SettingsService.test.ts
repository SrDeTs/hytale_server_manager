import { SettingsService } from '../SettingsService';
import { PrismaClient } from '@prisma/client';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    globalSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock crypto module
jest.mock('crypto', () => {
  const mockHashDigest = jest.fn(() => Buffer.alloc(32, 'k'));
  const mockHashUpdate = jest.fn(() => ({ digest: mockHashDigest }));
  const mockCreateHash = jest.fn(() => ({ update: mockHashUpdate }));

  return {
    __esModule: true,
    default: {
      randomBytes: jest.fn(() => Buffer.alloc(16, 'i')),
      createHash: mockCreateHash,
      createCipheriv: jest.fn(() => ({
        update: jest.fn(() => Buffer.from('encrypted')),
        final: jest.fn(() => Buffer.from('')),
      })),
      createDecipheriv: jest.fn(() => ({
        update: jest.fn(() => Buffer.from('decrypted')),
        final: jest.fn(() => Buffer.from('')),
      })),
    },
    randomBytes: jest.fn(() => Buffer.alloc(16, 'i')),
    createHash: mockCreateHash,
    createCipheriv: jest.fn(() => ({
      update: jest.fn(() => Buffer.from('encrypted')),
      final: jest.fn(() => Buffer.from('')),
    })),
    createDecipheriv: jest.fn(() => ({
      update: jest.fn(() => Buffer.from('decrypted')),
      final: jest.fn(() => Buffer.from('')),
    })),
  };
});

describe('SettingsService', () => {
  let service: SettingsService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set encryption key for tests
    process.env.SETTINGS_ENCRYPTION_KEY = 'test-encryption-key-32-chars!!!';
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new SettingsService(mockPrisma);
  });

  afterEach(() => {
    delete process.env.SETTINGS_ENCRYPTION_KEY;
  });

  describe('get', () => {
    it('should return value from cache if available', async () => {
      // First, set a value to populate cache
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'test.key',
        value: 'test-value',
        encrypted: false,
      });

      await service.set('test.key', 'test-value');

      // Now get should return from cache without DB call
      const value = await service.get('test.key');
      expect(value).toBe('test-value');
    });

    it('should return value from database if not in cache', async () => {
      (mockPrisma.globalSetting.findUnique as jest.Mock).mockResolvedValue({
        key: 'db.key',
        value: 'db-value',
        encrypted: false,
      });

      const value = await service.get('db.key');
      expect(value).toBe('db-value');
      expect(mockPrisma.globalSetting.findUnique).toHaveBeenCalledWith({
        where: { key: 'db.key' },
      });
    });

    it('should return null for non-existent key', async () => {
      (mockPrisma.globalSetting.findUnique as jest.Mock).mockResolvedValue(null);

      const value = await service.get('nonexistent.key');
      expect(value).toBeNull();
    });
  });

  describe('set', () => {
    it('should store value in database and cache', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'test.key',
        value: 'test-value',
        encrypted: false,
      });

      await service.set('test.key', 'test-value', 'user-123');

      expect(mockPrisma.globalSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'test.key' },
          create: expect.objectContaining({
            key: 'test.key',
            value: 'test-value',
            updatedBy: 'user-123',
          }),
          update: expect.objectContaining({
            value: 'test-value',
            updatedBy: 'user-123',
          }),
        })
      );

      // Verify value is in cache
      const cachedValue = await service.get('test.key');
      expect(cachedValue).toBe('test-value');
    });

    it('should encrypt sensitive settings', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'discord.webhookUrl',
        value: 'encrypted-value',
        encrypted: true,
      });

      await service.set('discord.webhookUrl', 'https://discord.com/webhook');

      expect(mockPrisma.globalSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            encrypted: true,
          }),
          update: expect.objectContaining({
            encrypted: true,
          }),
        })
      );
    });
  });

  describe('getBoolean', () => {
    it('should return true for "true" string', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'feature.enabled',
        value: 'true',
        encrypted: false,
      });

      await service.set('feature.enabled', 'true');
      const value = await service.getBoolean('feature.enabled');
      expect(value).toBe(true);
    });

    it('should return false for other values', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'feature.disabled',
        value: 'false',
        encrypted: false,
      });

      await service.set('feature.disabled', 'false');
      const value = await service.getBoolean('feature.disabled');
      expect(value).toBe(false);
    });

    it('should return false for non-existent key', async () => {
      (mockPrisma.globalSetting.findUnique as jest.Mock).mockResolvedValue(null);

      const value = await service.getBoolean('nonexistent');
      expect(value).toBe(false);
    });
  });

  describe('getNumber', () => {
    it('should parse numeric string', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'port',
        value: '3000',
        encrypted: false,
      });

      await service.set('port', '3000');
      const value = await service.getNumber('port');
      expect(value).toBe(3000);
    });

    it('should return null for non-numeric value', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'invalid',
        value: 'not-a-number',
        encrypted: false,
      });

      await service.set('invalid', 'not-a-number');
      const value = await service.getNumber('invalid');
      expect(value).toBeNull();
    });
  });

  describe('getJsonArray', () => {
    it('should parse JSON array string', async () => {
      const array = ['item1', 'item2', 'item3'];
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'array.setting',
        value: JSON.stringify(array),
        encrypted: false,
      });

      await service.set('array.setting', JSON.stringify(array));
      const value = await service.getJsonArray('array.setting');
      expect(value).toEqual(array);
    });

    it('should return empty array for invalid JSON', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
        key: 'invalid.json',
        value: 'not-json',
        encrypted: false,
      });

      await service.set('invalid.json', 'not-json');
      const value = await service.getJsonArray('invalid.json');
      expect(value).toEqual([]);
    });
  });

  describe('getCategory', () => {
    it('should return all settings for a category', async () => {
      // First populate the cache via initialize
      (mockPrisma.globalSetting.findMany as jest.Mock).mockResolvedValue([
        { key: 'discord.enabled', value: 'true', encrypted: false },
        { key: 'discord.webhookUrl', value: 'https://webhook', encrypted: false },
        { key: 'discord.username', value: 'Bot', encrypted: false },
      ]);

      await service.initialize();

      const settings = await service.getCategory('discord');

      expect(settings).toEqual({
        'discord.enabled': 'true',
        'discord.webhookUrl': 'https://webhook',
        'discord.username': 'Bot',
      });
    });
  });

  describe('getCategoryMasked', () => {
    it('should mask sensitive values', async () => {
      // First populate the cache via initialize
      (mockPrisma.globalSetting.findMany as jest.Mock).mockResolvedValue([
        { key: 'discord.enabled', value: 'true', encrypted: false },
        { key: 'discord.webhookUrl', value: 'https://webhook', encrypted: true },
      ]);

      await service.initialize();

      const settings = await service.getCategoryMasked('discord');

      expect(settings['discord.enabled']).toBe('true');
      expect(settings['discord.webhookUrl']).toBe('***');
    });
  });

  describe('updateCategory', () => {
    it('should update multiple settings at once', async () => {
      (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({});

      const updates = {
        'discord.enabled': 'true',
        'discord.username': 'NewBot',
      };

      await service.updateCategory('discord', updates, 'user-123');

      expect(mockPrisma.globalSetting.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCategories', () => {
    it('should return all category names', () => {
      const categories = service.getCategories();
      expect(categories).toContain('discord');
      expect(categories).toContain('ftp');
      expect(categories).toContain('modtale');
      expect(categories).toHaveLength(3);
    });
  });

  describe('initialize', () => {
    it('should load settings from database into cache', async () => {
      (mockPrisma.globalSetting.findMany as jest.Mock).mockResolvedValue([
        { key: 'setting1', value: 'value1', encrypted: false },
        { key: 'setting2', value: 'value2', encrypted: false },
      ]);

      await service.initialize();

      // Settings should be in cache
      const value1 = await service.get('setting1');
      const value2 = await service.get('setting2');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');
    });
  });

  describe('isSensitiveKey', () => {
    it('should identify sensitive keys correctly', async () => {
      // Test indirectly through set behavior
      const sensitiveKeys = [
        'discord.webhookUrl',
        'ftp.password',
        'modtale.apiKey',
      ];

      for (const key of sensitiveKeys) {
        (mockPrisma.globalSetting.upsert as jest.Mock).mockClear();
        (mockPrisma.globalSetting.upsert as jest.Mock).mockResolvedValue({
          key,
          value: 'test',
          encrypted: true,
        });

        await service.set(key, 'test');

        expect(mockPrisma.globalSetting.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({ encrypted: true }),
          })
        );
      }
    });
  });
});
