import { PermissionService } from '../PermissionService';
import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, PermissionCode } from '../../permissions/definitions';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    permission: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
    },
    rolePermission: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('PermissionService', () => {
  let service: PermissionService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    service = new PermissionService(mockPrisma);
  });

  describe('hasPermission', () => {
    beforeEach(async () => {
      // Setup mock data for loading permissions
      (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue([
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_VIEW } },
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_CREATE } },
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_DELETE } },
        { role: 'moderator', permission: { code: PERMISSIONS.SERVERS_VIEW } },
        { role: 'moderator', permission: { code: PERMISSIONS.SERVERS_START } },
        { role: 'viewer', permission: { code: PERMISSIONS.SERVERS_VIEW } },
      ]);

      await service.loadPermissions();
    });

    it('should return true when role has the permission', () => {
      expect(service.hasPermission('admin', PERMISSIONS.SERVERS_VIEW)).toBe(true);
      expect(service.hasPermission('admin', PERMISSIONS.SERVERS_CREATE)).toBe(true);
      expect(service.hasPermission('moderator', PERMISSIONS.SERVERS_VIEW)).toBe(true);
    });

    it('should return false when role does not have the permission', () => {
      expect(service.hasPermission('viewer', PERMISSIONS.SERVERS_CREATE)).toBe(false);
      expect(service.hasPermission('moderator', PERMISSIONS.SERVERS_DELETE)).toBe(false);
    });

    it('should return false for unknown role', () => {
      expect(service.hasPermission('unknown', PERMISSIONS.SERVERS_VIEW)).toBe(false);
    });
  });

  describe('getPermissions', () => {
    beforeEach(async () => {
      (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue([
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_VIEW } },
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_CREATE } },
        { role: 'moderator', permission: { code: PERMISSIONS.SERVERS_VIEW } },
      ]);

      await service.loadPermissions();
    });

    it('should return all permissions for a role', () => {
      const adminPerms = service.getPermissions('admin');
      expect(adminPerms).toContain(PERMISSIONS.SERVERS_VIEW);
      expect(adminPerms).toContain(PERMISSIONS.SERVERS_CREATE);
      expect(adminPerms).toHaveLength(2);
    });

    it('should return empty array for unknown role', () => {
      const unknownPerms = service.getPermissions('unknown');
      expect(unknownPerms).toEqual([]);
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permission definitions', () => {
      const allPerms = service.getAllPermissions();
      expect(allPerms).toHaveLength(47); // 47 permissions defined
      expect(allPerms[0]).toHaveProperty('code');
      expect(allPerms[0]).toHaveProperty('name');
      expect(allPerms[0]).toHaveProperty('description');
      expect(allPerms[0]).toHaveProperty('category');
    });
  });

  describe('getCategories', () => {
    it('should return all unique categories', () => {
      const categories = service.getCategories();
      expect(categories).toContain('servers');
      expect(categories).toContain('backups');
      expect(categories).toContain('players');
      expect(categories).toContain('mods');
      expect(categories).toContain('users');
      expect(categories).toContain('settings');
    });
  });

  describe('getPermissionsByCategory', () => {
    it('should group permissions by category', () => {
      const grouped = service.getPermissionsByCategory();

      expect(grouped).toHaveProperty('servers');
      expect(grouped).toHaveProperty('backups');
      expect(grouped.servers.length).toBeGreaterThan(0);
      expect(grouped.servers[0]).toHaveProperty('code');
    });
  });

  describe('updateRolePermissions', () => {
    beforeEach(() => {
      (mockPrisma.permission.findUnique as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve({ id: `perm-${where.code}`, code: where.code });
      });
      (mockPrisma.rolePermission.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.rolePermission.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should delete existing permissions and create new ones', async () => {
      const newPerms: PermissionCode[] = [PERMISSIONS.SERVERS_VIEW, PERMISSIONS.SERVERS_START];

      await service.updateRolePermissions('moderator', newPerms);

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { role: 'moderator' },
      });
      expect(mockPrisma.rolePermission.create).toHaveBeenCalledTimes(2);
    });

    it('should reload permissions after update', async () => {
      const newPerms: PermissionCode[] = [PERMISSIONS.SERVERS_VIEW];

      await service.updateRolePermissions('moderator', newPerms);

      expect(mockPrisma.rolePermission.findMany).toHaveBeenCalled();
    });

    it('should filter out invalid permission codes', async () => {
      const mixedPerms = [PERMISSIONS.SERVERS_VIEW, 'invalid:permission' as PermissionCode];

      await service.updateRolePermissions('moderator', mixedPerms);

      // Only valid permission should be created
      expect(mockPrisma.rolePermission.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('getAllRolePermissions', () => {
    beforeEach(async () => {
      (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue([
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_VIEW } },
        { role: 'admin', permission: { code: PERMISSIONS.SERVERS_CREATE } },
        { role: 'moderator', permission: { code: PERMISSIONS.SERVERS_VIEW } },
      ]);

      await service.loadPermissions();
    });

    it('should return permissions for all roles', async () => {
      const rolePerms = await service.getAllRolePermissions();

      expect(rolePerms).toHaveProperty('admin');
      expect(rolePerms).toHaveProperty('moderator');
      expect(rolePerms.admin).toContain(PERMISSIONS.SERVERS_VIEW);
      expect(rolePerms.admin).toContain(PERMISSIONS.SERVERS_CREATE);
    });
  });

  describe('resetRoleToDefaults', () => {
    beforeEach(() => {
      (mockPrisma.permission.findUnique as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve({ id: `perm-${where.code}`, code: where.code });
      });
      (mockPrisma.rolePermission.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });
      (mockPrisma.rolePermission.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should reset role permissions to defaults', async () => {
      await service.resetRoleToDefaults('moderator');

      expect(mockPrisma.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { role: 'moderator' },
      });

      const defaultModeratorPerms = DEFAULT_ROLE_PERMISSIONS['moderator'];
      expect(mockPrisma.rolePermission.create).toHaveBeenCalledTimes(defaultModeratorPerms.length);
    });

    it('should throw error for unknown role', async () => {
      await expect(service.resetRoleToDefaults('unknown')).rejects.toThrow('Unknown role');
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      (mockPrisma.permission.upsert as jest.Mock).mockResolvedValue({});
      (mockPrisma.rolePermission.count as jest.Mock).mockResolvedValue(0);
      (mockPrisma.permission.findUnique as jest.Mock).mockImplementation(({ where }) => {
        return Promise.resolve({ id: `perm-${where.code}`, code: where.code });
      });
      (mockPrisma.rolePermission.create as jest.Mock).mockResolvedValue({});
      (mockPrisma.rolePermission.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should seed permissions and default role permissions', async () => {
      await service.initialize();

      // Should upsert all permissions
      expect(mockPrisma.permission.upsert).toHaveBeenCalledTimes(47);

      // Should create default role permissions for roles with 0 existing
      expect(mockPrisma.rolePermission.count).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      await service.initialize(); // Second call

      // Upsert should only be called once per permission (47 times)
      expect(mockPrisma.permission.upsert).toHaveBeenCalledTimes(47);
    });
  });
});
