import { Router, Response } from 'express';
import { AuthenticatedRequest, requirePermission } from '../middleware/auth';
import { PermissionService } from '../services/PermissionService';
import { PERMISSIONS, PermissionCode, isValidPermission } from '../permissions/definitions';
import logger from '../utils/logger';

export function createPermissionRoutes(permissionService: PermissionService): Router {
  const router = Router();

  /**
   * GET /api/permissions
   * Get all permission definitions
   */
  router.get('/', requirePermission(PERMISSIONS.PERMISSIONS_VIEW), async (_req, res: Response) => {
    try {
      const permissions = permissionService.getAllPermissions();
      const grouped = permissionService.getPermissionsByCategory();
      const categories = permissionService.getCategories();

      res.json({
        permissions,
        grouped,
        categories,
      });
    } catch (error) {
      logger.error('Failed to get permissions:', error);
      res.status(500).json({ message: 'Failed to get permissions' });
    }
  });

  /**
   * GET /api/permissions/me
   * Get current user's permissions
   */
  router.get('/me', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const permissions = permissionService.getPermissions(req.user.role);

      res.json({
        role: req.user.role,
        permissions,
      });
    } catch (error) {
      logger.error('Failed to get user permissions:', error);
      res.status(500).json({ message: 'Failed to get user permissions' });
    }
  });

  /**
   * GET /api/permissions/roles
   * Get all role-permission mappings
   */
  router.get(
    '/roles',
    requirePermission(PERMISSIONS.PERMISSIONS_VIEW),
    async (_req, res: Response) => {
      try {
        const rolePermissions = await permissionService.getAllRolePermissions();

        res.json({
          roles: ['admin', 'moderator', 'viewer'],
          rolePermissions,
        });
      } catch (error) {
        logger.error('Failed to get role permissions:', error);
        res.status(500).json({ message: 'Failed to get role permissions' });
      }
    }
  );

  /**
   * GET /api/permissions/roles/:role
   * Get permissions for a specific role
   */
  router.get(
    '/roles/:role',
    requirePermission(PERMISSIONS.PERMISSIONS_VIEW),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { role } = req.params;

        if (!['admin', 'moderator', 'viewer'].includes(role)) {
          res.status(400).json({ message: 'Invalid role' });
          return;
        }

        const permissions = permissionService.getPermissions(role);

        res.json({
          role,
          permissions,
        });
      } catch (error) {
        logger.error('Failed to get role permissions:', error);
        res.status(500).json({ message: 'Failed to get role permissions' });
      }
    }
  );

  /**
   * PUT /api/permissions/roles/:role
   * Update permissions for a role
   */
  router.put(
    '/roles/:role',
    requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { role } = req.params;
        const { permissions } = req.body as { permissions: string[] };

        if (!['admin', 'moderator', 'viewer'].includes(role)) {
          res.status(400).json({ message: 'Invalid role' });
          return;
        }

        // Cannot modify admin permissions
        if (role === 'admin') {
          res.status(400).json({ message: 'Cannot modify admin permissions' });
          return;
        }

        if (!Array.isArray(permissions)) {
          res.status(400).json({ message: 'Permissions must be an array' });
          return;
        }

        // Validate all permission codes
        const invalidPerms = permissions.filter((p) => !isValidPermission(p));
        if (invalidPerms.length > 0) {
          res.status(400).json({
            message: 'Invalid permission codes',
            invalid: invalidPerms,
          });
          return;
        }

        await permissionService.updateRolePermissions(role, permissions as PermissionCode[]);

        res.json({
          message: 'Permissions updated',
          role,
          permissions: permissionService.getPermissions(role),
        });
      } catch (error) {
        logger.error('Failed to update role permissions:', error);
        res.status(500).json({ message: 'Failed to update role permissions' });
      }
    }
  );

  /**
   * POST /api/permissions/roles/:role/reset
   * Reset role permissions to defaults
   */
  router.post(
    '/roles/:role/reset',
    requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { role } = req.params;

        if (!['admin', 'moderator', 'viewer'].includes(role)) {
          res.status(400).json({ message: 'Invalid role' });
          return;
        }

        await permissionService.resetRoleToDefaults(role);

        res.json({
          message: 'Permissions reset to defaults',
          role,
          permissions: permissionService.getPermissions(role),
        });
      } catch (error) {
        logger.error('Failed to reset role permissions:', error);
        res.status(500).json({ message: 'Failed to reset role permissions' });
      }
    }
  );

  /**
   * POST /api/permissions/sync
   * Force sync all permissions (adds any missing permissions to roles)
   * Admin only
   */
  router.post(
    '/sync',
    requirePermission(PERMISSIONS.PERMISSIONS_MANAGE),
    async (_req: AuthenticatedRequest, res: Response) => {
      try {
        const result = await permissionService.forceSync();

        res.json({
          message: 'Permissions synced successfully',
          ...result,
        });
      } catch (error) {
        logger.error('Failed to sync permissions:', error);
        res.status(500).json({ message: 'Failed to sync permissions' });
      }
    }
  );

  return router;
}
