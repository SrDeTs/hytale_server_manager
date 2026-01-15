import { PrismaClient } from '@prisma/client';
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
  PermissionCode,
  PermissionDefinition,
} from '../permissions/definitions';
import logger from '../utils/logger';

/**
 * Permission Service
 *
 * Manages role-based permissions with database persistence and in-memory caching.
 * Permissions are loaded into a cache on startup for fast lookups.
 */
export class PermissionService {
  private prisma: PrismaClient;
  private cache: Map<string, Set<PermissionCode>> = new Map();
  private initialized = false;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Initialize the permission system
   * - Seeds permission definitions to database
   * - Creates default role permissions if not exist
   * - Loads permissions into cache
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('Initializing permission system...');

    // Seed all permission definitions to database
    await this.seedPermissions();

    // Create default role permissions if not exist
    await this.seedDefaultRolePermissions();

    // Load permissions into cache
    await this.loadPermissions();

    this.initialized = true;
    logger.info('Permission system initialized');
  }

  /**
   * Force re-sync all permissions - useful after adding new permissions
   */
  async forceSync(): Promise<{ permissions: number; rolePermissions: Record<string, number> }> {
    logger.info('Force syncing permissions...');

    // Re-seed all permission definitions
    await this.seedPermissions();

    // Re-sync role permissions
    const results: Record<string, number> = {};
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      const existingRolePerms = await this.prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      });

      const existingPermCodes = new Set(existingRolePerms.map(rp => rp.permission.code));
      let addedCount = 0;

      for (const permCode of permissions) {
        if (!existingPermCodes.has(permCode)) {
          const permission = await this.prisma.permission.findUnique({
            where: { code: permCode },
          });

          if (permission) {
            await this.prisma.rolePermission.create({
              data: {
                role,
                permissionId: permission.id,
                granted: true,
              },
            });
            addedCount++;
            logger.info(`Added permission ${permCode} to role ${role}`);
          } else {
            logger.warn(`Permission ${permCode} not found in database`);
          }
        }
      }

      results[role] = addedCount;
    }

    // Reload cache
    await this.loadPermissions();

    logger.info('Permission force sync complete');
    return { permissions: PERMISSION_DEFINITIONS.length, rolePermissions: results };
  }

  /**
   * Seed permission definitions to database
   */
  private async seedPermissions(): Promise<void> {
    for (const def of PERMISSION_DEFINITIONS) {
      await this.prisma.permission.upsert({
        where: { code: def.code },
        create: {
          code: def.code,
          name: def.name,
          description: def.description,
          category: def.category,
        },
        update: {
          name: def.name,
          description: def.description,
          category: def.category,
        },
      });
    }

    logger.info(`Seeded ${PERMISSION_DEFINITIONS.length} permissions`);
  }

  /**
   * Seed default role permissions
   * Also syncs any new permissions that were added to DEFAULT_ROLE_PERMISSIONS
   */
  private async seedDefaultRolePermissions(): Promise<void> {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      // Get existing permissions for this role
      const existingRolePerms = await this.prisma.rolePermission.findMany({
        where: { role },
        include: { permission: true },
      });

      const existingPermCodes = new Set(existingRolePerms.map(rp => rp.permission.code));
      let addedCount = 0;
      const missingPerms: string[] = [];

      // Add any missing permissions
      for (const permCode of permissions) {
        if (!existingPermCodes.has(permCode)) {
          const permission = await this.prisma.permission.findUnique({
            where: { code: permCode },
          });

          if (permission) {
            await this.prisma.rolePermission.create({
              data: {
                role,
                permissionId: permission.id,
                granted: true,
              },
            });
            addedCount++;
            missingPerms.push(permCode);
          } else {
            logger.warn(`Permission definition not found in DB: ${permCode}`);
          }
        }
      }

      if (addedCount > 0) {
        logger.info(`Added ${addedCount} new permissions to role ${role}: ${missingPerms.join(', ')}`);
      } else if (existingRolePerms.length === 0) {
        logger.info(`Created default permissions for role: ${role} (${permissions.length} permissions)`);
      } else {
        logger.debug(`Role ${role} has ${existingRolePerms.length} permissions, no new ones to add`);
      }
    }
  }

  /**
   * Load all role permissions into cache
   */
  async loadPermissions(): Promise<void> {
    this.cache.clear();

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { granted: true },
      include: { permission: true },
    });

    for (const rp of rolePermissions) {
      if (!this.cache.has(rp.role)) {
        this.cache.set(rp.role, new Set());
      }
      this.cache.get(rp.role)!.add(rp.permission.code as PermissionCode);
    }

    logger.info(`Loaded permissions for ${this.cache.size} roles`);
  }

  /**
   * Check if a role has a specific permission
   */
  hasPermission(role: string, permission: PermissionCode): boolean {
    const rolePerms = this.cache.get(role);
    if (!rolePerms) {
      return false;
    }
    return rolePerms.has(permission);
  }

  /**
   * Get all permissions for a role
   */
  getPermissions(role: string): PermissionCode[] {
    const rolePerms = this.cache.get(role);
    if (!rolePerms) {
      return [];
    }
    return Array.from(rolePerms);
  }

  /**
   * Get all permission definitions
   */
  getAllPermissions(): PermissionDefinition[] {
    return PERMISSION_DEFINITIONS;
  }

  /**
   * Get all role-permission mappings
   */
  async getAllRolePermissions(): Promise<Record<string, PermissionCode[]>> {
    const result: Record<string, PermissionCode[]> = {};

    for (const [role, perms] of this.cache.entries()) {
      result[role] = Array.from(perms);
    }

    return result;
  }

  /**
   * Update permissions for a role
   */
  async updateRolePermissions(role: string, permissions: PermissionCode[]): Promise<void> {
    // Validate all permission codes
    const validPermissions = permissions.filter((p) =>
      PERMISSION_DEFINITIONS.some((def) => def.code === p)
    );

    // Delete all existing permissions for role
    await this.prisma.rolePermission.deleteMany({
      where: { role },
    });

    // Create new permissions
    for (const permCode of validPermissions) {
      const permission = await this.prisma.permission.findUnique({
        where: { code: permCode },
      });

      if (permission) {
        await this.prisma.rolePermission.create({
          data: {
            role,
            permissionId: permission.id,
            granted: true,
          },
        });
      }
    }

    // Reload cache
    await this.loadPermissions();

    logger.info(`Updated permissions for role: ${role} (${validPermissions.length} permissions)`);
  }

  /**
   * Reset role permissions to defaults
   */
  async resetRoleToDefaults(role: string): Promise<void> {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[role];
    if (!defaultPerms) {
      throw new Error(`Unknown role: ${role}`);
    }

    await this.updateRolePermissions(role, defaultPerms);
    logger.info(`Reset role ${role} to default permissions`);
  }

  /**
   * Get permission categories
   */
  getCategories(): string[] {
    const categories = new Set(PERMISSION_DEFINITIONS.map((p) => p.category));
    return Array.from(categories);
  }

  /**
   * Get permissions grouped by category
   */
  getPermissionsByCategory(): Record<string, PermissionDefinition[]> {
    const grouped: Record<string, PermissionDefinition[]> = {};

    for (const perm of PERMISSION_DEFINITIONS) {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    }

    return grouped;
  }
}
