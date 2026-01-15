import { useAuthStore } from '../stores/authStore';
import { PERMISSIONS } from '../types';
import type { PermissionCode } from '../types';

/**
 * Hook for checking user permissions
 *
 * Provides methods to check if the current user has specific permissions.
 * Admins automatically have all permissions.
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  /**
   * Check if the user has a specific permission
   */
  const hasPermission = (permission: PermissionCode): boolean => {
    if (!user) return false;

    // Admins have all permissions
    if (user.role === 'admin') return true;

    // Check if user has the specific permission
    return user.permissions?.includes(permission) ?? false;
  };

  /**
   * Alias for hasPermission
   */
  const can = hasPermission;

  /**
   * Check if the user has ALL of the specified permissions
   */
  const hasAllPermissions = (...permissions: PermissionCode[]): boolean => {
    return permissions.every(hasPermission);
  };

  /**
   * Check if the user has ANY of the specified permissions
   */
  const hasAnyPermission = (...permissions: PermissionCode[]): boolean => {
    return permissions.some(hasPermission);
  };

  /**
   * Check if user can perform server operations
   */
  const canManageServer = (action: 'view' | 'start' | 'stop' | 'restart' | 'create' | 'delete' | 'update'): boolean => {
    const permissionMap: Record<string, PermissionCode> = {
      view: PERMISSIONS.SERVERS_VIEW,
      start: PERMISSIONS.SERVERS_START,
      stop: PERMISSIONS.SERVERS_STOP,
      restart: PERMISSIONS.SERVERS_RESTART,
      create: PERMISSIONS.SERVERS_CREATE,
      delete: PERMISSIONS.SERVERS_DELETE,
      update: PERMISSIONS.SERVERS_UPDATE,
    };
    return hasPermission(permissionMap[action]);
  };

  /**
   * Check if user can perform backup operations
   */
  const canManageBackups = (action: 'view' | 'create' | 'restore' | 'delete'): boolean => {
    const permissionMap: Record<string, PermissionCode> = {
      view: PERMISSIONS.BACKUPS_VIEW,
      create: PERMISSIONS.BACKUPS_CREATE,
      restore: PERMISSIONS.BACKUPS_RESTORE,
      delete: PERMISSIONS.BACKUPS_DELETE,
    };
    return hasPermission(permissionMap[action]);
  };

  /**
   * Check if user can perform player operations
   */
  const canManagePlayers = (action: 'view' | 'kick' | 'ban' | 'unban'): boolean => {
    const permissionMap: Record<string, PermissionCode> = {
      view: PERMISSIONS.PLAYERS_VIEW,
      kick: PERMISSIONS.PLAYERS_KICK,
      ban: PERMISSIONS.PLAYERS_BAN,
      unban: PERMISSIONS.PLAYERS_UNBAN,
    };
    return hasPermission(permissionMap[action]);
  };

  /**
   * Check if user can perform mod operations
   */
  const canManageMods = (action: 'view' | 'install' | 'uninstall' | 'toggle'): boolean => {
    const permissionMap: Record<string, PermissionCode> = {
      view: PERMISSIONS.MODS_VIEW,
      install: PERMISSIONS.MODS_INSTALL,
      uninstall: PERMISSIONS.MODS_UNINSTALL,
      toggle: PERMISSIONS.MODS_TOGGLE,
    };
    return hasPermission(permissionMap[action]);
  };

  /**
   * Check if user is admin
   */
  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  return {
    hasPermission,
    can,
    hasAllPermissions,
    hasAnyPermission,
    canManageServer,
    canManageBackups,
    canManagePlayers,
    canManageMods,
    isAdmin,
    PERMISSIONS,
  };
}
