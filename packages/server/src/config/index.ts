import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  // Database
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',

  // Paths
  serversBasePath: path.resolve(process.env.SERVERS_BASE_PATH || './servers'),
  backupsBasePath: path.resolve(process.env.BACKUPS_BASE_PATH || './backups'),

  // WebSocket
  wsPingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000', 10),
  wsPingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000', 10),

  // Development
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

export default config;
