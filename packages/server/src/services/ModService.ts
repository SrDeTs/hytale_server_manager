import { PrismaClient, Mod as PrismaMod, ModFile as PrismaModFile } from '@prisma/client';
import { IServerAdapter } from '../adapters/IServerAdapter';
import { ModMetadata } from '../types';
import logger from '../utils/logger';

// Type for mod with files included
export type ModWithFiles = PrismaMod & { files: PrismaModFile[] };

export class ModService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Get all mods for a server (with files)
   */
  async getServerMods(serverId: string): Promise<ModWithFiles[]> {
    return this.prisma.mod.findMany({
      where: { serverId },
      include: { files: true },
      orderBy: { installedAt: 'desc' },
    });
  }

  /**
   * Get a single mod by ID (with files)
   */
  async getMod(modId: string): Promise<ModWithFiles | null> {
    return this.prisma.mod.findUnique({
      where: { id: modId },
      include: { files: true },
    });
  }

  /**
   * Install a mod
   */
  async installMod(
    adapter: IServerAdapter,
    serverId: string,
    modFile: Buffer,
    metadata: ModMetadata
  ): Promise<ModWithFiles> {
    logger.info(`Installing mod ${metadata.projectTitle} on server ${serverId}`);

    // Check if this mod is already installed on this server
    const existingMod = await this.prisma.mod.findFirst({
      where: {
        serverId,
        projectId: metadata.projectId,
        providerId: metadata.providerId || 'modtale',
      },
    });

    if (existingMod) {
      throw new Error(`Mod "${metadata.projectTitle}" is already installed on this server`);
    }

    // Install via adapter - now returns list of installed files
    const installedFiles = await adapter.installMod(modFile, metadata);

    logger.info(`Adapter installed ${installedFiles.length} files for ${metadata.projectTitle}`);

    // Save to database with file records
    const mod = await this.prisma.mod.create({
      data: {
        serverId,
        providerId: metadata.providerId || 'modtale',  // Default to modtale for backward compatibility
        projectId: metadata.projectId,
        projectTitle: metadata.projectTitle,
        projectIconUrl: metadata.projectIconUrl,
        versionId: metadata.versionId,
        versionName: metadata.versionName,
        classification: metadata.classification,
        archiveSize: metadata.fileSize,
        fileHash: metadata.fileHash,
        enabled: true,
        files: {
          create: installedFiles.map(f => ({
            fileName: f.fileName,
            filePath: f.filePath,
            fileSize: f.fileSize,
            fileType: f.fileType,
          })),
        },
      },
      include: { files: true },
    });

    logger.info(`Mod ${metadata.projectTitle} installed successfully (${mod.id}) with ${mod.files.length} files`);

    return mod;
  }

  /**
   * Uninstall a mod - deletes all associated files
   */
  async uninstallMod(adapter: IServerAdapter, modId: string): Promise<void> {
    // Get mod with all its files
    const mod = await this.prisma.mod.findUnique({
      where: { id: modId },
      include: { files: true },
    });

    if (!mod) {
      throw new Error(`Mod ${modId} not found`);
    }

    logger.info(`Uninstalling mod ${mod.projectTitle} (${modId}) - ${mod.files.length} files to delete`);

    // Delete all files from filesystem using the new deleteModFiles method
    if (mod.files.length > 0) {
      const filePaths = mod.files.map(f => f.filePath);
      await adapter.deleteModFiles(filePaths);
      logger.info(`Deleted ${filePaths.length} files from server filesystem`);
    }

    // Remove from database (cascades to ModFile records)
    await this.prisma.mod.delete({
      where: { id: modId },
    });

    logger.info(`Mod ${mod.projectTitle} uninstalled successfully`);
  }

  /**
   * Enable a mod
   */
  async enableMod(adapter: IServerAdapter, modId: string): Promise<PrismaMod> {
    const mod = await this.getMod(modId);
    if (!mod) {
      throw new Error(`Mod ${modId} not found`);
    }

    logger.info(`Enabling mod ${mod.projectTitle} (${modId})`);

    await adapter.enableMod(modId);

    const updatedMod = await this.prisma.mod.update({
      where: { id: modId },
      data: { enabled: true },
    });

    return updatedMod;
  }

  /**
   * Disable a mod
   */
  async disableMod(adapter: IServerAdapter, modId: string): Promise<PrismaMod> {
    const mod = await this.getMod(modId);
    if (!mod) {
      throw new Error(`Mod ${modId} not found`);
    }

    logger.info(`Disabling mod ${mod.projectTitle} (${modId})`);

    await adapter.disableMod(modId);

    const updatedMod = await this.prisma.mod.update({
      where: { id: modId },
      data: { enabled: false },
    });

    return updatedMod;
  }

  /**
   * Update a mod to a new version.
   * Deletes old files from disk, installs new version files, and atomically updates the DB record.
   * Preserves mod id, installedAt, and enabled state.
   */
  async updateMod(
    adapter: IServerAdapter,
    modId: string,
    modFile: Buffer,
    metadata: ModMetadata
  ): Promise<ModWithFiles> {
    const mod = await this.getMod(modId);
    if (!mod) {
      throw new Error(`Mod ${modId} not found`);
    }

    logger.info(`Updating mod ${mod.projectTitle} (${modId}) from v${mod.versionName} to v${metadata.versionName}`);

    // Delete old files from disk
    if (mod.files.length > 0) {
      const filePaths = mod.files.map(f => f.filePath);
      await adapter.deleteModFiles(filePaths);
      logger.info(`Deleted ${filePaths.length} old files from server filesystem`);
    }

    // Install new version files via adapter
    const installedFiles = await adapter.installMod(modFile, metadata);
    logger.info(`Adapter installed ${installedFiles.length} new files for ${metadata.projectTitle}`);

    // Atomically update DB: replace version fields + file records, preserve id/installedAt/enabled
    const updatedMod = await this.prisma.mod.update({
      where: { id: modId },
      data: {
        versionId: metadata.versionId,
        versionName: metadata.versionName,
        archiveSize: metadata.fileSize,
        fileHash: metadata.fileHash,
        projectTitle: metadata.projectTitle,
        projectIconUrl: metadata.projectIconUrl,
        files: {
          deleteMany: {},
          create: installedFiles.map(f => ({
            fileName: f.fileName,
            filePath: f.filePath,
            fileSize: f.fileSize,
            fileType: f.fileType,
          })),
        },
      },
      include: { files: true },
    });

    logger.info(`Mod ${metadata.projectTitle} updated successfully to v${metadata.versionName} with ${updatedMod.files.length} files`);

    return updatedMod;
  }

  /**
   * Check if a mod is already installed
   */
  async isModInstalled(serverId: string, projectId: string, versionId: string): Promise<boolean> {
    const count = await this.prisma.mod.count({
      where: {
        serverId,
        projectId,
        versionId,
      },
    });

    return count > 0;
  }

  /**
   * Get mod installation stats
   */
  async getModStats(serverId: string) {
    const total = await this.prisma.mod.count({ where: { serverId } });
    const enabled = await this.prisma.mod.count({ where: { serverId, enabled: true } });
    const disabled = total - enabled;

    const byClassification = await this.prisma.mod.groupBy({
      by: ['classification'],
      where: { serverId },
      _count: true,
    });

    return {
      total,
      enabled,
      disabled,
      byClassification: byClassification.reduce((acc, item) => {
        acc[item.classification] = item._count;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}
