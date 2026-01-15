import {
  ServerStatus,
  ServerMetrics,
  ServerConfig,
  LogEntry,
  CommandResponse,
  Player,
  Mod,
  ModMetadata,
  InstalledFile,
  Backup,
} from '../types';

/**
 * Server Adapter Interface
 *
 * This interface defines the contract for all server adapters.
 * Adapters allow the system to work with different server implementations
 * (mock servers for development, real Hytale servers in production).
 *
 * To add a new server type, implement this interface.
 */
export interface IServerAdapter {
  // ============================================
  // Lifecycle Management
  // ============================================

  /**
   * Start the server
   */
  start(): Promise<void>;

  /**
   * Stop the server gracefully
   */
  stop(): Promise<void>;

  /**
   * Restart the server
   */
  restart(): Promise<void>;

  /**
   * Force kill the server process
   */
  kill(): Promise<void>;

  // ============================================
  // Process Persistence (for manager restarts)
  // ============================================

  /**
   * Reconnect to an existing server process after manager restart
   * @param pid The process ID of the running server
   * @returns true if reconnection successful, false if process not found or incompatible
   */
  reconnect(pid: number): Promise<boolean>;

  /**
   * Disconnect from server without killing it (for graceful manager shutdown)
   * Stops log streaming and RCON but leaves process running
   */
  disconnect(): Promise<void>;

  /**
   * Check if the adapter is connected to a running process
   */
  isConnected(): boolean;

  /**
   * Get the current process ID (if running)
   */
  getPid(): number | null;

  // ============================================
  // Status & Monitoring
  // ============================================

  /**
   * Get current server status
   */
  getStatus(): Promise<ServerStatus>;

  /**
   * Get server performance metrics
   */
  getMetrics(): Promise<ServerMetrics>;

  // ============================================
  // Configuration
  // ============================================

  /**
   * Get server configuration
   */
  getConfig(): Promise<ServerConfig>;

  /**
   * Update server configuration
   */
  updateConfig(config: Partial<ServerConfig>): Promise<void>;

  // ============================================
  // Console & Logging
  // ============================================

  /**
   * Send a command to the server console
   */
  sendCommand(command: string): Promise<CommandResponse>;

  /**
   * Start streaming server logs
   * @param callback Function to call for each log entry
   */
  streamLogs(callback: (log: LogEntry) => void): void;

  /**
   * Stop streaming server logs
   */
  stopLogStream(): void;

  /**
   * Get historical logs
   */
  getLogs(limit?: number, offset?: number): Promise<LogEntry[]>;

  // ============================================
  // Player Management
  // ============================================

  /**
   * Get list of online players
   */
  getPlayers(): Promise<Player[]>;

  /**
   * Kick a player from the server
   */
  kickPlayer(uuid: string, reason?: string): Promise<void>;

  /**
   * Ban a player
   */
  banPlayer(uuid: string, reason?: string, duration?: number): Promise<void>;

  /**
   * Unban a player
   */
  unbanPlayer(uuid: string): Promise<void>;

  /**
   * Add player to whitelist
   */
  whitelistPlayer(uuid: string): Promise<void>;

  /**
   * Remove player from whitelist
   */
  unwhitelistPlayer(uuid: string): Promise<void>;

  // ============================================
  // Mod Management
  // ============================================

  /**
   * Install a mod on the server
   * @returns Array of installed files for database tracking
   */
  installMod(modFile: Buffer, metadata: ModMetadata): Promise<InstalledFile[]>;

  /**
   * Delete specific mod files from the server
   * @param filePaths Array of relative file paths to delete
   */
  deleteModFiles(filePaths: string[]): Promise<void>;

  /**
   * Uninstall a mod from the server (legacy - use deleteModFiles instead)
   * @deprecated Use deleteModFiles for better control
   */
  uninstallMod(modId: string): Promise<void>;

  /**
   * Enable a mod
   */
  enableMod(modId: string): Promise<void>;

  /**
   * Disable a mod
   */
  disableMod(modId: string): Promise<void>;

  /**
   * List installed mods
   */
  listInstalledMods(): Promise<Mod[]>;

  // ============================================
  // Backup Management
  // ============================================

  /**
   * Create a backup of the server
   */
  createBackup(name: string, description?: string): Promise<Backup>;

  /**
   * Restore server from a backup
   */
  restoreBackup(backupId: string): Promise<void>;

  /**
   * Delete a backup
   */
  deleteBackup(backupId: string): Promise<void>;

  // ============================================
  // File Management
  // ============================================

  /**
   * Read a file from the server directory
   */
  readFile(relativePath: string): Promise<string>;

  /**
   * Write a file to the server directory
   */
  writeFile(relativePath: string, content: string): Promise<void>;

  /**
   * Delete a file from the server directory
   */
  deleteFile(relativePath: string): Promise<void>;

  /**
   * List files in a directory
   */
  listFiles(relativePath: string): Promise<string[]>;
}
