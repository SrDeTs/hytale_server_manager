import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Shield, Save, RotateCcw, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionDefinition {
  code: string;
  name: string;
  description: string;
  category: string;
}

interface PermissionsData {
  permissions: PermissionDefinition[];
  grouped: Record<string, PermissionDefinition[]>;
  categories: string[];
}

type RoleType = 'admin' | 'moderator' | 'viewer';

const ROLE_COLORS: Record<RoleType, 'danger' | 'warning' | 'info'> = {
  admin: 'danger',
  moderator: 'warning',
  viewer: 'info',
};

const ROLE_DESCRIPTIONS: Record<RoleType, string> = {
  admin: 'Full access to all features',
  moderator: 'Manage servers and players',
  viewer: 'Read-only access',
};

const CATEGORY_LABELS: Record<string, string> = {
  servers: 'Server Management',
  backups: 'Backup Management',
  players: 'Player Management',
  mods: 'Mod Management',
  worlds: 'World Management',
  automation: 'Automation & Tasks',
  alerts: 'Alerts',
  networks: 'Networks',
  users: 'User Management',
  settings: 'Settings & Permissions',
};

export const PermissionsPage = () => {
  const { can, PERMISSIONS } = usePermissions();
  const canManagePermissions = can(PERMISSIONS.PERMISSIONS_MANAGE);

  const [permissionsData, setPermissionsData] = useState<PermissionsData | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [originalRolePermissions, setOriginalRolePermissions] = useState<Record<string, string[]>>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [permsData, rolesData] = await Promise.all([
        api.getAllPermissions<PermissionsData>(),
        api.getRolePermissions(),
      ]);

      setPermissionsData(permsData);
      setRoles(rolesData.roles);
      setRolePermissions(rolesData.rolePermissions);
      setOriginalRolePermissions(JSON.parse(JSON.stringify(rolesData.rolePermissions)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const hasChanges = (role: string): boolean => {
    const current = rolePermissions[role] || [];
    const original = originalRolePermissions[role] || [];
    if (current.length !== original.length) return true;
    return current.some((p) => !original.includes(p)) || original.some((p) => !current.includes(p));
  };

  const hasAnyChanges = roles.some((role) => hasChanges(role));

  const togglePermission = (role: string, permissionCode: string) => {
    if (role === 'admin') return; // Admin always has all permissions

    setRolePermissions((prev) => {
      const current = prev[role] || [];
      const hasPermission = current.includes(permissionCode);

      return {
        ...prev,
        [role]: hasPermission
          ? current.filter((p) => p !== permissionCode)
          : [...current, permissionCode],
      };
    });
  };

  const handleSave = async (role: string) => {
    if (role === 'admin') return;

    try {
      setSaving(role);
      setError(null);

      const permissions = rolePermissions[role] || [];
      await api.updateRolePermissions(role, permissions);

      // Update original to match saved
      setOriginalRolePermissions((prev) => ({
        ...prev,
        [role]: [...permissions],
      }));

      setSuccessMessage(`${role} permissions saved successfully`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to save ${role} permissions`);
    } finally {
      setSaving(null);
    }
  };

  const handleReset = async (role: string) => {
    if (role === 'admin') return;

    if (!confirm(`Reset ${role} permissions to defaults? This cannot be undone.`)) {
      return;
    }

    try {
      setResetting(role);
      setError(null);

      const result = await api.resetRolePermissions(role);

      // Update both current and original
      setRolePermissions((prev) => ({
        ...prev,
        [role]: result.permissions,
      }));
      setOriginalRolePermissions((prev) => ({
        ...prev,
        [role]: result.permissions,
      }));

      setSuccessMessage(`${role} permissions reset to defaults`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to reset ${role} permissions`);
    } finally {
      setResetting(null);
    }
  };

  const handleSaveAll = async () => {
    const rolesToSave = roles.filter((role) => role !== 'admin' && hasChanges(role));

    for (const role of rolesToSave) {
      await handleSave(role);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent-primary" size={48} />
      </div>
    );
  }

  if (!permissionsData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto text-danger mb-4" size={48} />
          <p className="text-text-light-muted dark:text-text-muted">
            {error || 'Failed to load permissions data'}
          </p>
          <Button variant="secondary" onClick={fetchData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">
            Role Permissions
          </h1>
          <p className="text-text-light-muted dark:text-text-muted mt-1">
            Configure what each role can access and manage
          </p>
        </div>
        {canManagePermissions && hasAnyChanges && (
          <Button variant="primary" icon={<Save size={18} />} onClick={handleSaveAll}>
            Save All Changes
          </Button>
        )}
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg flex items-center gap-3">
          <AlertCircle className="text-danger" size={20} />
          <p className="text-danger">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-success/10 border border-success/20 rounded-lg flex items-center gap-3">
          <Check className="text-success" size={20} />
          <p className="text-success">{successMessage}</p>
        </div>
      )}

      {/* Role Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {roles.map((role) => {
          const roleKey = role as RoleType;
          const permissions = rolePermissions[role] || [];
          const isAdmin = role === 'admin';
          const modified = hasChanges(role);

          return (
            <Card key={role} variant="glass">
              <CardContent>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Shield className={`text-${ROLE_COLORS[roleKey]}`} size={28} />
                    <div>
                      <h3 className="font-heading font-semibold text-text-light-primary dark:text-text-primary capitalize">
                        {role}
                        {modified && (
                          <span className="ml-2 text-xs text-warning">(modified)</span>
                        )}
                      </h3>
                      <p className="text-sm text-text-light-muted dark:text-text-muted">
                        {ROLE_DESCRIPTIONS[roleKey]}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ROLE_COLORS[roleKey]}>
                    {isAdmin ? 'All' : permissions.length} permissions
                  </Badge>
                </div>

                {canManagePermissions && !isAdmin && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Save size={14} />}
                      loading={saving === role}
                      onClick={() => handleSave(role)}
                      disabled={saving !== null || resetting !== null || !modified}
                      className="flex-1"
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<RotateCcw size={14} />}
                      loading={resetting === role}
                      onClick={() => handleReset(role)}
                      disabled={saving !== null || resetting !== null}
                    >
                      Reset
                    </Button>
                  </div>
                )}

                {isAdmin && (
                  <p className="text-xs text-text-light-muted dark:text-text-muted mt-4 italic">
                    Admin permissions cannot be modified
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Permission Matrix by Category */}
      {permissionsData.categories.map((category) => {
        const categoryPermissions = permissionsData.grouped[category] || [];
        if (categoryPermissions.length === 0) return null;

        return (
          <Card key={category} variant="glass">
            <CardHeader>
              <CardTitle>{CATEGORY_LABELS[category] || category}</CardTitle>
              <CardDescription>
                {categoryPermissions.length} permission{categoryPermissions.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-300 dark:border-gray-800">
                      <th className="text-left py-3 px-4 text-sm font-heading font-semibold text-text-light-muted dark:text-text-muted">
                        Permission
                      </th>
                      {roles.map((role) => (
                        <th key={role} className="text-center py-3 px-4 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-heading font-semibold text-text-light-primary dark:text-text-primary capitalize">
                              {role}
                            </span>
                            <Badge variant={ROLE_COLORS[role as RoleType]} size="sm">
                              {role === 'admin' ? 'All' : (rolePermissions[role] || []).length}
                            </Badge>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryPermissions.map((perm) => (
                      <tr
                        key={perm.code}
                        className="border-b border-gray-300 dark:border-gray-800/50 hover:bg-white/50 dark:hover:bg-primary-bg/50"
                      >
                        <td className="py-3 px-4">
                          <p className="text-sm font-medium text-text-light-primary dark:text-text-primary">
                            {perm.name}
                          </p>
                          <p className="text-xs text-text-light-muted dark:text-text-muted mt-0.5">
                            {perm.description}
                          </p>
                          <p className="text-xs font-mono text-text-light-muted/60 dark:text-text-muted/60 mt-1">
                            {perm.code}
                          </p>
                        </td>
                        {roles.map((role) => {
                          const isAdmin = role === 'admin';
                          const hasPermission = isAdmin || (rolePermissions[role] || []).includes(perm.code);
                          const canToggle = canManagePermissions && !isAdmin;

                          return (
                            <td key={`${role}-${perm.code}`} className="text-center py-3 px-4">
                              <button
                                onClick={() => canToggle && togglePermission(role, perm.code)}
                                className={`p-2 rounded-lg transition-colors ${
                                  hasPermission
                                    ? 'bg-success/20 text-success hover:bg-success/30'
                                    : 'bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700'
                                } ${!canToggle ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                                disabled={!canToggle}
                                title={
                                  isAdmin
                                    ? 'Admin has all permissions'
                                    : canToggle
                                    ? hasPermission
                                      ? 'Click to remove permission'
                                      : 'Click to grant permission'
                                    : 'You cannot modify permissions'
                                }
                              >
                                {hasPermission ? <Check size={18} /> : <X size={18} />}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Help Section */}
      <Card variant="glass">
        <CardContent>
          <div className="flex items-start gap-3">
            <Shield className="text-info mt-1" size={20} />
            <div>
              <h4 className="font-heading font-semibold text-text-light-primary dark:text-text-primary mb-2">
                About Role Permissions
              </h4>
              <ul className="text-sm text-text-light-muted dark:text-text-muted space-y-1">
                <li>
                  <strong>Admin:</strong> Has full access to all features. These permissions cannot be modified.
                </li>
                <li>
                  <strong>Moderator:</strong> Can manage servers, players, and most day-to-day operations.
                </li>
                <li>
                  <strong>Viewer:</strong> Read-only access to view information without making changes.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
