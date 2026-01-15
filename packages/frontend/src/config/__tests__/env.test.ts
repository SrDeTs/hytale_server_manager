/**
 * Environment Configuration Tests
 *
 * Tests for the environment configuration module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock import.meta.env before importing the module
vi.stubGlobal('import.meta', {
  env: {
    MODE: 'test',
    VITE_API_URL: 'http://test-api.example.com',
    VITE_API_TIMEOUT: '5000',
    VITE_APP_NAME: 'Test App',
    VITE_APP_VERSION: '1.0.0-test',
  },
});

describe('Environment Configuration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should export env configuration', async () => {
    const { env } = await import('../env');
    expect(env).toBeDefined();
  });

  it('should have correct environment type', async () => {
    const { env } = await import('../env');
    expect(env.NODE_ENV).toBe('test');
    expect(env.isTest).toBe(true);
    expect(env.isDevelopment).toBe(false);
    expect(env.isProduction).toBe(false);
  });

  it('should parse API configuration correctly', async () => {
    const { env } = await import('../env');
    expect(env.api.baseUrl).toBe('http://test-api.example.com');
    expect(env.api.timeout).toBe(5000);
    expect(typeof env.api.withCredentials).toBe('boolean');
  });

  it('should parse feature flags correctly', async () => {
    const { env } = await import('../env');
    expect(typeof env.features.debugTools).toBe('boolean');
    expect(typeof env.features.analytics).toBe('boolean');
  });

  it('should parse app configuration correctly', async () => {
    const { env } = await import('../env');
    expect(env.app.name).toBe('Test App');
    expect(env.app.version).toBe('1.0.0-test');
    expect(typeof env.app.basePath).toBe('string');
    expect(env.app.logLevel).toBeDefined();
  });

  it('should parse auth configuration correctly', async () => {
    const { env } = await import('../env');
    expect(typeof env.auth.tokenKey).toBe('string');
    expect(typeof env.auth.refreshTokenKey).toBe('string');
    expect(typeof env.auth.refreshThreshold).toBe('number');
    expect(typeof env.auth.sessionTimeout).toBe('number');
  });

  it('should parse websocket configuration correctly', async () => {
    const { env } = await import('../env');
    expect(typeof env.websocket.url).toBe('string');
    expect(typeof env.websocket.reconnectAttempts).toBe('number');
    expect(typeof env.websocket.reconnectDelay).toBe('number');
  });

  it('should be frozen and immutable', async () => {
    const { env } = await import('../env');

    expect(() => {
      // @ts-expect-error - Testing immutability
      env.NODE_ENV = 'production';
    }).toThrow();
  });

  describe('logger', () => {
    it('should export logger functions', async () => {
      const { logger } = await import('../env');

      expect(typeof logger.debug).toBe('function');
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
    });

    it('should not throw when calling logger functions', async () => {
      const { logger } = await import('../env');

      expect(() => logger.debug('test')).not.toThrow();
      expect(() => logger.info('test')).not.toThrow();
      expect(() => logger.warn('test')).not.toThrow();
      expect(() => logger.error('test')).not.toThrow();
    });
  });
});
