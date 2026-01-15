import { Rcon } from 'rcon-client';
import crypto from 'crypto';
import logger from '../utils/logger';

interface RconConnection {
  client: Rcon;
  serverId: string;
  host: string;
  port: number;
  lastActivity: Date;
}

/**
 * Service for managing RCON (Remote Console) connections to game servers.
 * RCON allows sending commands to running servers without needing direct process access.
 */
export class RconService {
  private connections: Map<string, RconConnection> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private readonly maxReconnectAttempts = 3;

  /**
   * Connect to a server's RCON
   */
  async connect(
    serverId: string,
    host: string,
    port: number,
    password: string
  ): Promise<void> {
    // Disconnect existing connection if any
    if (this.connections.has(serverId)) {
      await this.disconnect(serverId);
    }

    try {
      logger.info(`[RCON] Connecting to server ${serverId} at ${host}:${port}`);

      const client = await Rcon.connect({
        host,
        port,
        password,
        timeout: 10000, // 10 second timeout
      });

      this.connections.set(serverId, {
        client,
        serverId,
        host,
        port,
        lastActivity: new Date(),
      });

      this.reconnectAttempts.set(serverId, 0);

      // Handle disconnection
      client.on('end', () => {
        logger.warn(`[RCON] Connection ended for server ${serverId}`);
        this.connections.delete(serverId);
      });

      client.on('error', (error) => {
        logger.error(`[RCON] Error for server ${serverId}:`, error);
      });

      logger.info(`[RCON] Connected to server ${serverId}`);
    } catch (error) {
      logger.error(`[RCON] Failed to connect to server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Send a command via RCON
   */
  async sendCommand(serverId: string, command: string): Promise<string> {
    const connection = this.connections.get(serverId);

    if (!connection) {
      throw new Error(`No RCON connection for server ${serverId}`);
    }

    try {
      logger.debug(`[RCON] Sending command to ${serverId}: ${command}`);
      const response = await connection.client.send(command);
      connection.lastActivity = new Date();
      this.reconnectAttempts.set(serverId, 0);
      return response;
    } catch (error) {
      logger.error(`[RCON] Command failed for server ${serverId}:`, error);

      // Try to reconnect if command failed
      const attempts = this.reconnectAttempts.get(serverId) || 0;
      if (attempts < this.maxReconnectAttempts) {
        this.reconnectAttempts.set(serverId, attempts + 1);
        logger.info(`[RCON] Attempting reconnect for server ${serverId} (attempt ${attempts + 1})`);

        // Remove dead connection
        this.connections.delete(serverId);
      }

      throw error;
    }
  }

  /**
   * Disconnect from a server's RCON
   */
  async disconnect(serverId: string): Promise<void> {
    const connection = this.connections.get(serverId);

    if (connection) {
      try {
        await connection.client.end();
        logger.info(`[RCON] Disconnected from server ${serverId}`);
      } catch (error) {
        logger.warn(`[RCON] Error disconnecting from server ${serverId}:`, error);
      } finally {
        this.connections.delete(serverId);
        this.reconnectAttempts.delete(serverId);
      }
    }
  }

  /**
   * Check if connected to a server
   */
  isConnected(serverId: string): boolean {
    const connection = this.connections.get(serverId);
    return !!connection && connection.client.authenticated;
  }

  /**
   * Get connection info for a server
   */
  getConnectionInfo(serverId: string): { host: string; port: number; lastActivity: Date } | null {
    const connection = this.connections.get(serverId);
    if (!connection) return null;

    return {
      host: connection.host,
      port: connection.port,
      lastActivity: connection.lastActivity,
    };
  }

  /**
   * Disconnect all connections (for cleanup)
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(
      (serverId) => this.disconnect(serverId)
    );
    await Promise.all(disconnectPromises);
  }

  /**
   * Generate a cryptographically secure random RCON password
   */
  static generatePassword(length: number = 24): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    const randomBytes = crypto.randomBytes(length);
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(randomBytes[i] % chars.length);
    }
    return password;
  }
}
