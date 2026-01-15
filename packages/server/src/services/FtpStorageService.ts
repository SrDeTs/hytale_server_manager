import * as ftp from 'basic-ftp';
import fs from 'fs-extra';
import path from 'path';
import config from '../config';
import logger from '../utils/logger';

export interface FtpConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export class FtpStorageService {
  private config: FtpConfig;

  constructor(ftpConfig?: FtpConfig) {
    this.config = ftpConfig || {
      host: config.ftp.host,
      port: config.ftp.port,
      username: config.ftp.username,
      password: config.ftp.password,
      secure: config.ftp.secure,
    };
  }

  /**
   * Check if FTP is enabled and configured
   */
  isEnabled(): boolean {
    return config.ftp.enabled && !!this.config.host;
  }

  /**
   * Update FTP configuration
   */
  updateConfig(ftpConfig: FtpConfig): void {
    this.config = ftpConfig;
    logger.info('FTP configuration updated');
  }

  /**
   * Create a new FTP client and connect
   */
  private async connect(): Promise<ftp.Client> {
    const client = new ftp.Client();
    client.ftp.verbose = config.nodeEnv === 'development';

    try {
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        secure: this.config.secure,
        secureOptions: this.config.secure ? { rejectUnauthorized: false } : undefined,
      });
      logger.debug(`FTP connected to ${this.config.host}:${this.config.port}`);
      return client;
    } catch (error: any) {
      logger.error('FTP connection failed:', error.message);
      throw new Error(`FTP connection failed: ${error.message}`);
    }
  }

  /**
   * Test FTP connection
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const client = new ftp.Client();
    try {
      await client.access({
        host: this.config.host,
        port: this.config.port,
        user: this.config.username,
        password: this.config.password,
        secure: this.config.secure,
        secureOptions: this.config.secure ? { rejectUnauthorized: false } : undefined,
      });
      const pwd = await client.pwd();
      client.close();
      return { success: true, message: `Connected successfully. Current directory: ${pwd}` };
    } catch (error: any) {
      client.close();
      return { success: false, message: error.message };
    }
  }

  /**
   * Upload a file to FTP
   * @param localPath - Local file path
   * @param remotePath - Remote FTP path (including filename)
   */
  async upload(localPath: string, remotePath: string): Promise<void> {
    if (!fs.existsSync(localPath)) {
      throw new Error(`Local file not found: ${localPath}`);
    }

    const client = await this.connect();
    try {
      // Ensure remote directory exists
      const remoteDir = path.dirname(remotePath).replace(/\\/g, '/');
      await client.ensureDir(remoteDir);
      await client.cd('/'); // Reset to root

      logger.info(`Uploading ${localPath} to FTP: ${remotePath}`);
      await client.uploadFrom(localPath, remotePath);
      logger.info(`Upload complete: ${remotePath}`);
    } finally {
      client.close();
    }
  }

  /**
   * Download a file from FTP
   * @param remotePath - Remote FTP path
   * @param localPath - Local destination path
   */
  async download(remotePath: string, localPath: string): Promise<void> {
    const client = await this.connect();
    try {
      // Ensure local directory exists
      await fs.ensureDir(path.dirname(localPath));

      logger.info(`Downloading from FTP: ${remotePath} to ${localPath}`);
      await client.downloadTo(localPath, remotePath);
      logger.info(`Download complete: ${localPath}`);
    } finally {
      client.close();
    }
  }

  /**
   * Delete a file from FTP
   * @param remotePath - Remote FTP path
   */
  async delete(remotePath: string): Promise<void> {
    const client = await this.connect();
    try {
      logger.info(`Deleting from FTP: ${remotePath}`);
      await client.remove(remotePath);
      logger.info(`Delete complete: ${remotePath}`);
    } catch (error: any) {
      // Ignore "file not found" errors
      if (!error.message.includes('550')) {
        throw error;
      }
      logger.warn(`File not found on FTP (already deleted?): ${remotePath}`);
    } finally {
      client.close();
    }
  }

  /**
   * Check if a file exists on FTP
   * @param remotePath - Remote FTP path
   */
  async exists(remotePath: string): Promise<boolean> {
    const client = await this.connect();
    try {
      const size = await client.size(remotePath);
      client.close();
      return size > 0;
    } catch {
      client.close();
      return false;
    }
  }

  /**
   * Get file size on FTP
   * @param remotePath - Remote FTP path
   */
  async getSize(remotePath: string): Promise<number> {
    const client = await this.connect();
    try {
      const size = await client.size(remotePath);
      client.close();
      return size;
    } catch {
      client.close();
      return 0;
    }
  }

  /**
   * List files in a remote directory
   * @param remotePath - Remote FTP directory path
   */
  async list(remotePath: string): Promise<ftp.FileInfo[]> {
    const client = await this.connect();
    try {
      const list = await client.list(remotePath);
      client.close();
      return list;
    } catch {
      client.close();
      return [];
    }
  }

  /**
   * Ensure a remote directory exists
   * @param remotePath - Remote FTP directory path
   */
  async ensureDir(remotePath: string): Promise<void> {
    const client = await this.connect();
    try {
      await client.ensureDir(remotePath.replace(/\\/g, '/'));
    } finally {
      client.close();
    }
  }
}

// Singleton instance using global config
export const ftpStorageService = new FtpStorageService();
