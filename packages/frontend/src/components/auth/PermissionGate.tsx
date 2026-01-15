import type { ReactNode } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import type { PermissionCode } from '../../types';

interface PermissionGateProps {
  /**
   * Permission(s) required to render children
   * Can be a single permission or an array of permissions
   */
  permission: PermissionCode | PermissionCode[];

  /**
   * Mode for checking multiple permissions
   * - 'all': User must have ALL specified permissions (default)
   * - 'any': User must have ANY of the specified permissions
   */
  mode?: 'all' | 'any';

  /**
   * Content to render when user has the required permission(s)
   */
  children: ReactNode;

  /**
   * Optional content to render when user lacks the required permission(s)
   * If not provided, nothing will be rendered
   */
  fallback?: ReactNode;
}

/**
 * Conditionally renders children based on user permissions
 *
 * @example
 * // Single permission
 * <PermissionGate permission={PERMISSIONS.SERVERS_CREATE}>
 *   <CreateServerButton />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (all required)
 * <PermissionGate permission={[PERMISSIONS.SERVERS_DELETE, PERMISSIONS.BACKUPS_DELETE]}>
 *   <DangerZone />
 * </PermissionGate>
 *
 * @example
 * // Multiple permissions (any one is sufficient)
 * <PermissionGate permission={[PERMISSIONS.SERVERS_START, PERMISSIONS.SERVERS_STOP]} mode="any">
 *   <ServerControls />
 * </PermissionGate>
 *
 * @example
 * // With fallback content
 * <PermissionGate
 *   permission={PERMISSIONS.SETTINGS_UPDATE}
 *   fallback={<p>You don't have permission to edit settings</p>}
 * >
 *   <SettingsForm />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  mode = 'all',
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasAllPermissions, hasAnyPermission } = usePermissions();

  const permissions = Array.isArray(permission) ? permission : [permission];

  const hasAccess =
    mode === 'all' ? hasAllPermissions(...permissions) : hasAnyPermission(...permissions);

  if (hasAccess) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Higher-order component version of PermissionGate
 *
 * @example
 * const ProtectedComponent = withPermission(MyComponent, PERMISSIONS.ADMIN_VIEW);
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: PermissionCode | PermissionCode[],
  mode: 'all' | 'any' = 'all'
) {
  return function PermissionWrapper(props: P) {
    return (
      <PermissionGate permission={permission} mode={mode}>
        <Component {...props} />
      </PermissionGate>
    );
  };
}
