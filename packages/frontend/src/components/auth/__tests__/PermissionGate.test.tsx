/**
 * PermissionGate Component Tests
 *
 * Tests for the conditional rendering permission gate component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PermissionGate, withPermission } from '../PermissionGate';
import { usePermissions } from '../../../hooks/usePermissions';
import { PERMISSIONS } from '../../../types';

// Mock the usePermissions hook
vi.mock('../../../hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

describe('PermissionGate', () => {
  const mockHasAllPermissions = vi.fn();
  const mockHasAnyPermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn(),
      can: vi.fn(),
      hasAllPermissions: mockHasAllPermissions,
      hasAnyPermission: mockHasAnyPermission,
      canManageServer: vi.fn(),
      canManageBackups: vi.fn(),
      canManagePlayers: vi.fn(),
      canManageMods: vi.fn(),
      isAdmin: vi.fn(),
      PERMISSIONS,
    });
  });

  describe('single permission', () => {
    it('should render children when user has the permission', () => {
      mockHasAllPermissions.mockReturnValue(true);

      render(
        <PermissionGate permission={PERMISSIONS.SERVERS_VIEW}>
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not render children when user lacks the permission', () => {
      mockHasAllPermissions.mockReturnValue(false);

      render(
        <PermissionGate permission={PERMISSIONS.SERVERS_DELETE}>
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render fallback when user lacks permission', () => {
      mockHasAllPermissions.mockReturnValue(false);

      render(
        <PermissionGate
          permission={PERMISSIONS.SERVERS_DELETE}
          fallback={<div data-testid="fallback">No Access</div>}
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
      expect(screen.getByTestId('fallback')).toBeInTheDocument();
    });
  });

  describe('multiple permissions with mode="all"', () => {
    it('should render children when user has all permissions', () => {
      mockHasAllPermissions.mockReturnValue(true);

      render(
        <PermissionGate
          permission={[PERMISSIONS.SERVERS_VIEW, PERMISSIONS.SERVERS_START]}
          mode="all"
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(mockHasAllPermissions).toHaveBeenCalledWith(
        PERMISSIONS.SERVERS_VIEW,
        PERMISSIONS.SERVERS_START
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not render children when user lacks any permission', () => {
      mockHasAllPermissions.mockReturnValue(false);

      render(
        <PermissionGate
          permission={[PERMISSIONS.SERVERS_VIEW, PERMISSIONS.SERVERS_DELETE]}
          mode="all"
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('multiple permissions with mode="any"', () => {
    it('should render children when user has at least one permission', () => {
      mockHasAnyPermission.mockReturnValue(true);

      render(
        <PermissionGate
          permission={[PERMISSIONS.SERVERS_VIEW, PERMISSIONS.SERVERS_DELETE]}
          mode="any"
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(mockHasAnyPermission).toHaveBeenCalledWith(
        PERMISSIONS.SERVERS_VIEW,
        PERMISSIONS.SERVERS_DELETE
      );
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('should not render children when user has none of the permissions', () => {
      mockHasAnyPermission.mockReturnValue(false);

      render(
        <PermissionGate
          permission={[PERMISSIONS.USERS_CREATE, PERMISSIONS.USERS_DELETE]}
          mode="any"
        >
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });
  });

  describe('default mode', () => {
    it('should default to mode="all"', () => {
      mockHasAllPermissions.mockReturnValue(true);

      render(
        <PermissionGate permission={[PERMISSIONS.SERVERS_VIEW, PERMISSIONS.SERVERS_START]}>
          <div data-testid="protected-content">Protected Content</div>
        </PermissionGate>
      );

      expect(mockHasAllPermissions).toHaveBeenCalled();
      expect(mockHasAnyPermission).not.toHaveBeenCalled();
    });
  });

  describe('complex children', () => {
    it('should render complex nested children', () => {
      mockHasAllPermissions.mockReturnValue(true);

      render(
        <PermissionGate permission={PERMISSIONS.SERVERS_VIEW}>
          <div data-testid="container">
            <h1>Title</h1>
            <p>Description</p>
            <button>Action</button>
          </div>
        </PermissionGate>
      );

      expect(screen.getByTestId('container')).toBeInTheDocument();
      expect(screen.getByRole('heading')).toBeInTheDocument();
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});

describe('withPermission HOC', () => {
  const mockHasAllPermissions = vi.fn();
  const mockHasAnyPermission = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: vi.fn(),
      can: vi.fn(),
      hasAllPermissions: mockHasAllPermissions,
      hasAnyPermission: mockHasAnyPermission,
      canManageServer: vi.fn(),
      canManageBackups: vi.fn(),
      canManagePlayers: vi.fn(),
      canManageMods: vi.fn(),
      isAdmin: vi.fn(),
      PERMISSIONS,
    });
  });

  it('should wrap component with permission check', () => {
    mockHasAllPermissions.mockReturnValue(true);

    const TestComponent = ({ message }: { message: string }) => (
      <div data-testid="test-component">{message}</div>
    );

    const ProtectedComponent = withPermission(TestComponent, PERMISSIONS.SERVERS_VIEW);

    render(<ProtectedComponent message="Hello" />);

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should not render component when lacking permission', () => {
    mockHasAllPermissions.mockReturnValue(false);

    const TestComponent = () => <div data-testid="test-component">Content</div>;

    const ProtectedComponent = withPermission(TestComponent, PERMISSIONS.SERVERS_DELETE);

    render(<ProtectedComponent />);

    expect(screen.queryByTestId('test-component')).not.toBeInTheDocument();
  });

  it('should support array of permissions', () => {
    mockHasAllPermissions.mockReturnValue(true);

    const TestComponent = () => <div data-testid="test-component">Content</div>;

    const ProtectedComponent = withPermission(TestComponent, [
      PERMISSIONS.SERVERS_VIEW,
      PERMISSIONS.SERVERS_START,
    ]);

    render(<ProtectedComponent />);

    expect(mockHasAllPermissions).toHaveBeenCalledWith(
      PERMISSIONS.SERVERS_VIEW,
      PERMISSIONS.SERVERS_START
    );
  });

  it('should support mode parameter', () => {
    mockHasAnyPermission.mockReturnValue(true);

    const TestComponent = () => <div data-testid="test-component">Content</div>;

    const ProtectedComponent = withPermission(
      TestComponent,
      [PERMISSIONS.SERVERS_VIEW, PERMISSIONS.SERVERS_DELETE],
      'any'
    );

    render(<ProtectedComponent />);

    expect(mockHasAnyPermission).toHaveBeenCalled();
  });
});
