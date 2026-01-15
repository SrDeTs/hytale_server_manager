import { PrismaClient, Player as PrismaPlayer } from '@prisma/client';
import { IServerAdapter } from '../adapters/IServerAdapter';
import logger from '../utils/logger';
import { DiscordNotificationService } from './DiscordNotificationService';

export class PlayerService {
  private prisma: PrismaClient;
  private discordService?: DiscordNotificationService;

  constructor(prisma: PrismaClient, discordService?: DiscordNotificationService) {
    this.prisma = prisma;
    this.discordService = discordService;
  }

  /**
   * Get all players for a server
   */
  async getServerPlayers(serverId: string, onlineOnly: boolean = false): Promise<PrismaPlayer[]> {
    const where: any = { serverId };
    if (onlineOnly) {
      where.isOnline = true;
    }

    return this.prisma.player.findMany({
      where,
      orderBy: { lastSeen: 'desc' },
    });
  }

  /**
   * Get a single player by ID
   */
  async getPlayer(playerId: string): Promise<PrismaPlayer | null> {
    return this.prisma.player.findUnique({
      where: { id: playerId },
    });
  }

  /**
   * Get a player by UUID
   */
  async getPlayerByUuid(uuid: string): Promise<PrismaPlayer | null> {
    return this.prisma.player.findUnique({
      where: { uuid },
    });
  }

  /**
   * Update or create a player (called when player joins)
   */
  async upsertPlayer(serverId: string, uuid: string, username: string): Promise<PrismaPlayer> {
    const existingPlayer = await this.getPlayerByUuid(uuid);

    if (existingPlayer) {
      // Update existing player
      return this.prisma.player.update({
        where: { uuid },
        data: {
          username,
          isOnline: true,
          lastSeen: new Date(),
        },
      });
    } else {
      // Create new player
      return this.prisma.player.create({
        data: {
          serverId,
          uuid,
          username,
          isOnline: true,
          firstJoined: new Date(),
          lastSeen: new Date(),
        },
      });
    }
  }

  /**
   * Mark player as offline
   */
  async setPlayerOffline(uuid: string, playtime?: number): Promise<PrismaPlayer> {
    const data: any = {
      isOnline: false,
      lastSeen: new Date(),
    };

    if (playtime !== undefined) {
      data.playtime = playtime;
    }

    return this.prisma.player.update({
      where: { uuid },
      data,
    });
  }

  /**
   * Kick a player
   */
  async kickPlayer(adapter: IServerAdapter, uuid: string, reason?: string): Promise<void> {
    const player = await this.getPlayerByUuid(uuid);
    logger.info(`Kicking player ${uuid}: ${reason || 'No reason'}`);
    await adapter.kickPlayer(uuid, reason);
    await this.setPlayerOffline(uuid);

    // Send Discord notification
    if (this.discordService && player) {
      const server = await this.prisma.server.findUnique({
        where: { id: player.serverId },
      });
      await this.discordService.notify('player_kick', {
        playerName: player.username,
        serverName: server?.name,
        reason,
      });
    }
  }

  /**
   * Ban a player
   */
  async banPlayer(
    adapter: IServerAdapter,
    uuid: string,
    reason?: string,
    duration?: number
  ): Promise<PrismaPlayer> {
    logger.info(`Banning player ${uuid}: ${reason || 'No reason'}`);

    await adapter.banPlayer(uuid, reason, duration);

    const bannedUntil = duration ? new Date(Date.now() + duration * 1000) : undefined;

    const player = await this.prisma.player.update({
      where: { uuid },
      data: {
        isBanned: true,
        banReason: reason,
        bannedAt: new Date(),
        bannedUntil,
        isOnline: false,
      },
    });

    // Send Discord notification
    if (this.discordService) {
      const server = await this.prisma.server.findUnique({
        where: { id: player.serverId },
      });
      await this.discordService.notify('player_ban', {
        playerName: player.username,
        serverName: server?.name,
        reason,
      });
    }

    return player;
  }

  /**
   * Unban a player
   */
  async unbanPlayer(adapter: IServerAdapter, uuid: string): Promise<PrismaPlayer> {
    logger.info(`Unbanning player ${uuid}`);

    await adapter.unbanPlayer(uuid);

    const player = await this.prisma.player.update({
      where: { uuid },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
        bannedUntil: null,
      },
    });

    // Send Discord notification
    if (this.discordService) {
      const server = await this.prisma.server.findUnique({
        where: { id: player.serverId },
      });
      await this.discordService.notify('player_unban', {
        playerName: player.username,
        serverName: server?.name,
      });
    }

    return player;
  }

  /**
   * Whitelist a player
   */
  async whitelistPlayer(adapter: IServerAdapter, uuid: string): Promise<PrismaPlayer> {
    logger.info(`Whitelisting player ${uuid}`);

    await adapter.whitelistPlayer(uuid);

    const player = await this.prisma.player.update({
      where: { uuid },
      data: { isWhitelisted: true },
    });

    return player;
  }

  /**
   * Remove player from whitelist
   */
  async unwhitelistPlayer(adapter: IServerAdapter, uuid: string): Promise<PrismaPlayer> {
    logger.info(`Removing player ${uuid} from whitelist`);

    await adapter.unwhitelistPlayer(uuid);

    const player = await this.prisma.player.update({
      where: { uuid },
      data: { isWhitelisted: false },
    });

    return player;
  }

  /**
   * Get player statistics for a server
   */
  async getPlayerStats(serverId: string) {
    const total = await this.prisma.player.count({ where: { serverId } });
    const online = await this.prisma.player.count({ where: { serverId, isOnline: true } });
    const banned = await this.prisma.player.count({ where: { serverId, isBanned: true } });
    const whitelisted = await this.prisma.player.count({ where: { serverId, isWhitelisted: true } });

    return {
      total,
      online,
      banned,
      whitelisted,
    };
  }
}
