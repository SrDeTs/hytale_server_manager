/**
 * usePermissions Hook Tests
 *
 * Tests for the permissions checking hook.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePermissions } from '../usePermissions';
import { useAuthStore } from '../../stores/authStore';
import { PERMISSIONS } from '../../types';
import type { PermissionCode, User } from '../../types';

// Mock the auth store
vi.mock('../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('usePermissions', () => {
  const mockModeratorUser: User = {
    id: 'user-001',
    email: 'mod@example.com',
    username: 'moderator',
    role: 'moderator',
    permissions: [
      PERMISSIONS.SERVERS_VIEW,
      PERMISSIONS.SERVERS_START,
      PERMISSIONS.SERVERS_STOP,
      PERMISSIONS.BACKUPS_VIEW,
      PERMISSIONS.PLAYERS_VIEW,
      PERMISSIONS.PLAYERS_KICK,
    ] as PermissionCode[],
  };

  const mockAdminUser: User = {
    id: 'user-002',
    email: 'admin@example.com',
    username: 'admin',
    role: 'admin',
    permissions: [], // Admin gets all permissions regardless
  };

  const mockViewerUser: User = {
    id: 'user-003',
    email: 'viewer@example.com',
    username: 'viewer',
    role: 'viewer',
    permissions: [
      PERMISSIONS.SERVERS_VIEW,
      PERMISSIONS.BACKUPS_VIEW,
    ] as PermissionCode[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true for admin regardless of specific permissions', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockAdminUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.SERVERS_DELETE)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.USERS_DELETE)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.PERMISSIONS_MANAGE)).toBe(true);
    });

    it('should return true when user has the permission', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.SERVERS_VIEW)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.SERVERS_START)).toBe(true);
      expect(result.current.hasPermission(PERMISSIONS.PLAYERS_KICK)).toBe(true);
    });

    it('should return false when user lacks the permission', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.SERVERS_DELETE)).toBe(false);
      expect(result.current.hasPermission(PERMISSIONS.USERS_CREATE)).toBe(false);
    });

    it('should return false when user is not logged in', () => {
      vi.mocked(useAuthStore).mockReturnValue(null);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.hasPermission(PERMISSIONS.SERVERS_VIEW)).toBe(false);
    });
  });

  describe('can (alias)', () => {
    it('should work the same as hasPermission', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.can(PERMISSIONS.SERVERS_VIEW)).toBe(true);
      expect(result.current.can(PERMISSIONS.SERVERS_DELETE)).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAllPermissions(
          PERMISSIONS.SERVERS_VIEW,
          PERMISSIONS.SERVERS_START,
          PERMISSIONS.SERVERS_STOP
        )
      ).toBe(true);
    });

    it('should return false when user lacks any permission', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAllPermissions(
          PERMISSIONS.SERVERS_VIEW,
          PERMISSIONS.SERVERS_DELETE // Missing this one
        )
      ).toBe(false);
    });

    it('should return true for admin for any permissions', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockAdminUser);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAllPermissions(
          PERMISSIONS.USERS_DELETE,
          PERMISSIONS.PERMISSIONS_MANAGE,
          PERMISSIONS.SETTINGS_UPDATE
        )
      ).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockViewerUser);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAnyPermission(
          PERMISSIONS.SERVERS_VIEW,
          PERMISSIONS.SERVERS_DELETE // Doesn't have this
        )
      ).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockViewerUser);

      const { result } = renderHook(() => usePermissions());

      expect(
        result.current.hasAnyPermission(
          PERMISSIONS.SERVERS_DELETE,
          PERMISSIONS.USERS_CREATE
        )
      ).toBe(false);
    });
  });

  describe('canManageServer', () => {
    it('should check correct permission for each action', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageServer('view')).toBe(true);
      expect(result.current.canManageServer('start')).toBe(true);
      expect(result.current.canManageServer('stop')).toBe(true);
      expect(result.current.canManageServer('delete')).toBe(false);
      expect(result.current.canManageServer('create')).toBe(false);
    });
  });

  describe('canManageBackups', () => {
    it('should check correct permission for each action', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageBackups('view')).toBe(true);
      expect(result.current.canManageBackups('create')).toBe(false);
      expect(result.current.canManageBackups('delete')).toBe(false);
    });
  });

  describe('canManagePlayers', () => {
    it('should check correct permission for each action', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManagePlayers('view')).toBe(true);
      expect(result.current.canManagePlayers('kick')).toBe(true);
      expect(result.current.canManagePlayers('ban')).toBe(false);
    });
  });

  describe('canManageMods', () => {
    it('should check correct permission for each action', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockViewerUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.canManageMods('view')).toBe(false); // Viewer doesn't have mods view
      expect(result.current.canManageMods('install')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockAdminUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin()).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin()).toBe(false);
    });

    it('should return false when not logged in', () => {
      vi.mocked(useAuthStore).mockReturnValue(null);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.isAdmin()).toBe(false);
    });
  });

  describe('PERMISSIONS constant', () => {
    it('should expose PERMISSIONS constant', () => {
      vi.mocked(useAuthStore).mockReturnValue(mockModeratorUser);

      const { result } = renderHook(() => usePermissions());

      expect(result.current.PERMISSIONS).toBeDefined();
      expect(result.current.PERMISSIONS.SERVERS_VIEW).toBe('servers:view');
    });
  });
});
