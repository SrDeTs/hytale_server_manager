/**
 * Environment Configuration Module
 *
 * Provides type-safe access to environment variables with validation and defaults.
 * All environment variables are validated at module load time to fail fast on
 * misconfiguration.
 *
 * @module config/env
 */

/**
 * Application environment type
 */
export type Environment = 'development' | 'production' | 'test';

/**
 * Log level configuration
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Environment configuration interface
 * All configuration values are readonly to prevent runtime mutations
 */
export interface EnvConfig {
  /** Current application environment */
  readonly NODE_ENV: Environment;

  /** Whether the app is running in development mode */
  readonly isDevelopment: boolean;

  /** Whether the app is running in production mode */
  readonly isProduction: boolean;

  /** Whether the app is running in test mode */
  readonly isTest: boolean;

  /** API Configuration */
  readonly api: {
    /** Base URL for API requests */
    readonly baseUrl: string;
    /** Request timeout in milliseconds */
    readonly timeout: number;
    /** Whether to include credentials in requests */
    readonly withCredentials: boolean;
  };

  /** WebSocket Configuration */
  readonly websocket: {
    /** WebSocket server URL */
    readonly url: string;
    /** Reconnection attempts before giving up */
    readonly reconnectAttempts: number;
    /** Delay between reconnection attempts in milliseconds */
    readonly reconnectDelay: number;
  };

  /** Authentication Configuration */
  readonly auth: {
    /** JWT token storage key */
    readonly tokenKey: string;
    /** Refresh token storage key */
    readonly refreshTokenKey: string;
    /** Token refresh threshold in seconds (refresh when less than this time remains) */
    readonly refreshThreshold: number;
    /** Session timeout in minutes */
    readonly sessionTimeout: number;
  };

  /** Application Configuration */
  readonly app: {
    /** Application name */
    readonly name: string;
    /** Application version */
    readonly version: string;
    /** Base path for routing */
    readonly basePath: string;
    /** Log level */
    readonly logLevel: LogLevel;
  };

  /** Feature Flags */
  readonly features: {
    /** Enable debug tools */
    readonly debugTools: boolean;
    /** Enable analytics */
    readonly analytics: boolean;
  };
}

/**
 * Retrieves an environment variable with type checking
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 * @returns The environment variable value or default
 */
function getEnvVar(key: string, defaultValue: string): string {
  // In Vite, environment variables are exposed via import.meta.env
  const value = import.meta.env[key];
  return value !== undefined ? String(value) : defaultValue;
}

/**
 * Retrieves an environment variable as a number
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set or invalid
 * @returns The environment variable as a number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = getEnvVar(key, '');
  if (value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Retrieves an environment variable as a boolean
 * @param key - The environment variable key
 * @param defaultValue - Default value if not set
 * @returns The environment variable as a boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = getEnvVar(key, '');
  if (value === '') return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Determines the current environment
 * @returns The current environment type
 */
function getEnvironment(): Environment {
  const mode = import.meta.env.MODE;
  if (mode === 'production') return 'production';
  if (mode === 'test') return 'test';
  return 'development';
}

/**
 * Creates and validates the environment configuration
 * @returns Validated environment configuration
 * @throws Error if required configuration is missing or invalid
 */
function createConfig(): EnvConfig {
  const NODE_ENV = getEnvironment();
  const isDevelopment = NODE_ENV === 'development';
  const isProduction = NODE_ENV === 'production';
  const isTest = NODE_ENV === 'test';

  // Determine API base URL based on environment
  // Note: Use localhost for client connections, not 0.0.0.0 (which is only for server binding)
  const defaultApiUrl = isDevelopment
    ? window.location.origin
    : window.location.origin;

  const config: EnvConfig = {
    NODE_ENV,
    isDevelopment,
    isProduction,
    isTest,

    api: {
      baseUrl: getEnvVar('VITE_API_URL', defaultApiUrl),
      timeout: getEnvNumber('VITE_API_TIMEOUT', 30000),
      withCredentials: getEnvBoolean('VITE_API_WITH_CREDENTIALS', true),
    },

    websocket: {
      url: getEnvVar('VITE_WS_URL', window.location.origin.replace('http', 'ws')),
      reconnectAttempts: getEnvNumber('VITE_WS_RECONNECT_ATTEMPTS', 5),
      reconnectDelay: getEnvNumber('VITE_WS_RECONNECT_DELAY', 3000),
    },

    auth: {
      tokenKey: getEnvVar('VITE_AUTH_TOKEN_KEY', 'hytalepanel-token'),
      refreshTokenKey: getEnvVar('VITE_AUTH_REFRESH_TOKEN_KEY', 'hytalepanel-refresh-token'),
      refreshThreshold: getEnvNumber('VITE_AUTH_REFRESH_THRESHOLD', 300), // 5 minutes
      sessionTimeout: getEnvNumber('VITE_AUTH_SESSION_TIMEOUT', 60), // 60 minutes
    },

    app: {
      name: getEnvVar('VITE_APP_NAME', 'Hytale Server Manager'),
      version: getEnvVar('VITE_APP_VERSION', '1.0.0'),
      basePath: getEnvVar('VITE_APP_BASE_PATH', '/'),
      logLevel: getEnvVar('VITE_LOG_LEVEL', isDevelopment ? 'debug' : 'warn') as LogLevel,
    },

    features: {
      debugTools: getEnvBoolean('VITE_DEBUG_TOOLS', isDevelopment),
      analytics: getEnvBoolean('VITE_ANALYTICS', isProduction),
    },
  };

  // Validate configuration
  validateConfig(config);

  return config;
}

/**
 * Validates the environment configuration
 * @param config - Configuration to validate
 * @throws Error if configuration is invalid
 */
function validateConfig(config: EnvConfig): void {
  const errors: string[] = [];

  // Validate API URL format
  try {
    new URL(config.api.baseUrl);
  } catch {
    errors.push(`Invalid API URL: ${config.api.baseUrl}`);
  }

  // Validate timeout values
  if (config.api.timeout < 1000) {
    errors.push('API timeout must be at least 1000ms');
  }

  if (config.websocket.reconnectDelay < 1000) {
    errors.push('WebSocket reconnect delay must be at least 1000ms');
  }

  // Validate auth configuration
  if (config.auth.refreshThreshold < 60) {
    errors.push('Token refresh threshold must be at least 60 seconds');
  }

  if (config.auth.sessionTimeout < 1) {
    errors.push('Session timeout must be at least 1 minute');
  }

  // Log validation errors in development, throw in production
  if (errors.length > 0) {
    const message = `Environment configuration errors:\n${errors.join('\n')}`;
    if (config.isProduction) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
}

/**
 * Frozen environment configuration instance
 * This is the main export that should be used throughout the application
 */
export const env: EnvConfig = Object.freeze(createConfig());

/**
 * Type-safe logger that respects the configured log level
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (['debug'].includes(env.app.logLevel)) {
      console.debug('[DEBUG]', ...args);
    }
  },
  info: (...args: unknown[]) => {
    if (['debug', 'info'].includes(env.app.logLevel)) {
      console.info('[INFO]', ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (['debug', 'info', 'warn'].includes(env.app.logLevel)) {
      console.warn('[WARN]', ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  },
};

export default env;
