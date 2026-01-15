import { PrismaClient } from '@prisma/client';
import fs from 'fs-extra';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export interface WorldInfo {
  id: string;
  serverId: string;
  name: string;
  folderPath: string;
  sizeBytes: number;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  lastPlayed?: Date;
}

export class WorldsService {
  /**
   * List all worlds for a server
   */
  async listWorlds(serverId: string): Promise<WorldInfo[]> {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    // Scan server directory for world folders
    const serverPath = server.serverPath;
    const worldsInDB = await prisma.world.findMany({
      where: { serverId },
    });

    // Also scan filesystem for worlds not in DB
    const worldsInFS = await this.scanWorldFolders(serverPath);

    // Merge and update database
    const allWorlds: WorldInfo[] = [];

    for (const worldFolder of worldsInFS) {
      let world = worldsInDB.find(w => w.folderPath === worldFolder.path);

      if (!world) {
        // Create new world entry
        world = await prisma.world.create({
          data: {
            serverId,
            name: worldFolder.name,
            folderPath: worldFolder.path,
            sizeBytes: worldFolder.size,
            isActive: worldFolder.name === path.basename(server.worldPath),
          },
        });
      } else {
        // Update size
        world = await prisma.world.update({
          where: { id: world.id },
          data: {
            sizeBytes: worldFolder.size,
          },
        });
      }

      allWorlds.push({
        id: world.id,
        serverId: world.serverId,
        name: world.name,
        folderPath: world.folderPath,
        sizeBytes: world.sizeBytes,
        isActive: world.isActive,
        description: world.description || undefined,
        createdAt: world.createdAt,
        lastPlayed: world.lastPlayed || undefined,
      });
    }

    return allWorlds;
  }

  /**
   * Scan server directory for world folders
   */
  private async scanWorldFolders(serverPath: string): Promise<Array<{ name: string; path: string; size: number }>> {
    const worlds: Array<{ name: string; path: string; size: number }> = [];

    try {
      if (!await fs.pathExists(serverPath)) {
        return worlds;
      }

      const items = await fs.readdir(serverPath);

      for (const item of items) {
        const itemPath = path.join(serverPath, item);
        const stats = await fs.stat(itemPath);

        if (stats.isDirectory()) {
          // Check if it looks like a world folder (contains level.dat or similar)
          const isWorld = await this.isWorldFolder(itemPath);

          if (isWorld) {
            const size = await this.getDirectorySize(itemPath);
            worlds.push({
              name: item,
              path: itemPath,
              size,
            });
          }
        }
      }
    } catch (error: any) {
      logger.error('Error scanning world folders:', error);
    }

    return worlds;
  }

  /**
   * Check if a directory is a world folder
   */
  private async isWorldFolder(dirPath: string): Promise<boolean> {
    // Common world file indicators
    const indicators = ['level.dat', 'world.dat', 'region', 'data'];

    for (const indicator of indicators) {
      if (await fs.pathExists(path.join(dirPath, indicator))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get total size of a directory
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    try {
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          totalSize += stats.size;
        } else if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        }
      }
    } catch (error) {
      // Ignore errors
    }

    return totalSize;
  }

  /**
   * Get world details
   */
  async getWorld(worldId: string): Promise<WorldInfo | null> {
    const world = await prisma.world.findUnique({
      where: { id: worldId },
    });

    if (!world) return null;

    return {
      id: world.id,
      serverId: world.serverId,
      name: world.name,
      folderPath: world.folderPath,
      sizeBytes: world.sizeBytes,
      isActive: world.isActive,
      description: world.description || undefined,
      createdAt: world.createdAt,
      lastPlayed: world.lastPlayed || undefined,
    };
  }

  /**
   * Set active world
   */
  async setActiveWorld(serverId: string, worldId: string): Promise<void> {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status === 'running') {
      throw new Error('Cannot change world while server is running');
    }

    const world = await prisma.world.findUnique({
      where: { id: worldId },
    });

    if (!world || world.serverId !== serverId) {
      throw new Error('World not found');
    }

    // Deactivate all worlds for this server
    await prisma.world.updateMany({
      where: { serverId },
      data: { isActive: false },
    });

    // Activate the selected world
    await prisma.world.update({
      where: { id: worldId },
      data: {
        isActive: true,
        lastPlayed: new Date(),
      },
    });

    // Update server worldPath
    await prisma.server.update({
      where: { id: serverId },
      data: {
        worldPath: world.folderPath,
      },
    });

    logger.info(`Set active world for server ${serverId} to ${world.name}`);
  }

  /**
   * Create world archive (zip)
   */
  async exportWorld(worldId: string, outputPath: string): Promise<void> {
    const world = await prisma.world.findUnique({
      where: { id: worldId },
    });

    if (!world) {
      throw new Error('World not found');
    }

    if (!await fs.pathExists(world.folderPath)) {
      throw new Error('World folder not found');
    }

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      output.on('close', () => {
        logger.info(`World ${world.name} exported: ${archive.pointer()} bytes`);
        resolve();
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(world.folderPath, false);
      archive.finalize();
    });
  }

  /**
   * Import world from archive (zip)
   */
  async importWorld(serverId: string, name: string, archivePath: string): Promise<WorldInfo> {
    const server = await prisma.server.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw new Error('Server not found');
    }

    if (server.status === 'running') {
      throw new Error('Cannot import world while server is running');
    }

    const worldPath = path.join(server.serverPath, name);

    if (await fs.pathExists(worldPath)) {
      throw new Error('World with this name already exists');
    }

    // Extract archive to world folder
    await fs.ensureDir(worldPath);

    try {
      await fs.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: worldPath }))
        .promise();

      const size = await this.getDirectorySize(worldPath);

      const world = await prisma.world.create({
        data: {
          serverId,
          name,
          folderPath: worldPath,
          sizeBytes: size,
          isActive: false,
        },
      });

      logger.info(`World ${name} imported successfully`);

      return {
        id: world.id,
        serverId: world.serverId,
        name: world.name,
        folderPath: world.folderPath,
        sizeBytes: world.sizeBytes,
        isActive: world.isActive,
        description: world.description || undefined,
        createdAt: world.createdAt,
        lastPlayed: world.lastPlayed || undefined,
      };
    } catch (error: any) {
      // Clean up on error
      await fs.remove(worldPath);
      throw error;
    }
  }

  /**
   * Delete a world
   */
  async deleteWorld(worldId: string): Promise<void> {
    const world = await prisma.world.findUnique({
      where: { id: worldId },
      include: {
        server: true,
      },
    });

    if (!world) {
      throw new Error('World not found');
    }

    if (world.server.status === 'running') {
      throw new Error('Cannot delete world while server is running');
    }

    if (world.isActive) {
      throw new Error('Cannot delete active world');
    }

    // Delete from filesystem
    if (await fs.pathExists(world.folderPath)) {
      await fs.remove(world.folderPath);
    }

    // Delete from database
    await prisma.world.delete({
      where: { id: worldId },
    });

    logger.info(`World ${world.name} deleted`);
  }

  /**
   * Update world metadata
   */
  async updateWorld(worldId: string, data: { name?: string; description?: string }): Promise<WorldInfo> {
    const world = await prisma.world.findUnique({
      where: { id: worldId },
    });

    if (!world) {
      throw new Error('World not found');
    }

    const updated = await prisma.world.update({
      where: { id: worldId },
      data,
    });

    return {
      id: updated.id,
      serverId: updated.serverId,
      name: updated.name,
      folderPath: updated.folderPath,
      sizeBytes: updated.sizeBytes,
      isActive: updated.isActive,
      description: updated.description || undefined,
      createdAt: updated.createdAt,
      lastPlayed: updated.lastPlayed || undefined,
    };
  }
}
