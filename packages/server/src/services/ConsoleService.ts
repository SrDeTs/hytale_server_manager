import { PrismaClient } from '@prisma/client';
import { IServerAdapter } from '../adapters/IServerAdapter';
import { LogEntry, CommandResponse } from '../types';
import logger from '../utils/logger';

export class ConsoleService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Send a command to the server
   */
  async sendCommand(adapter: IServerAdapter, command: string): Promise<CommandResponse> {
    logger.info(`Sending command: ${command}`);
    const response = await adapter.sendCommand(command);
    return response;
  }

  /**
   * Get historical logs from database
   */
  async getLogs(
    serverId: string,
    limit: number = 100,
    offset: number = 0,
    level?: string
  ): Promise<LogEntry[]> {
    const where: any = { serverId };
    if (level) {
      where.level = level;
    }

    const logs = await this.prisma.consoleLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
      skip: offset,
    });

    return logs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      level: log.level as 'info' | 'warn' | 'error' | 'debug',
      message: log.message,
      source: log.source || undefined,
    }));
  }

  /**
   * Save a log entry to the database
   */
  async saveLog(serverId: string, log: LogEntry): Promise<void> {
    try {
      await this.prisma.consoleLog.create({
        data: {
          serverId,
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          source: log.source || 'server',
        },
      });
    } catch (error) {
      // Don't throw errors for log saving failures
      logger.error('Failed to save log to database:', error);
    }
  }

  /**
   * Clear old logs (housekeeping)
   */
  async clearOldLogs(serverId: string, olderThanDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.prisma.consoleLog.deleteMany({
      where: {
        serverId,
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    logger.info(`Cleared ${result.count} old logs for server ${serverId}`);

    return result.count;
  }

  /**
   * Stream logs from the adapter
   */
  streamLogs(adapter: IServerAdapter, callback: (log: LogEntry) => void): void {
    adapter.streamLogs(callback);
  }

  /**
   * Stop streaming logs
   */
  stopStreamLogs(adapter: IServerAdapter): void {
    adapter.stopLogStream();
  }
}
