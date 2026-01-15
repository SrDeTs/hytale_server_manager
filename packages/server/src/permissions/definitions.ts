/**
 * Permission System Definitions
 *
 * This file defines all available permissions and default role mappings.
 * Permissions follow the format: "category:action"
 */

export const PERMISSIONS = {
  // Server Management
  SERVERS_VIEW: 'servers:view',
  SERVERS_CREATE: 'servers:create',
  SERVERS_UPDATE: 'servers:update',
  SERVERS_DELETE: 'servers:delete',
  SERVERS_START: 'servers:start',
  SERVERS_STOP: 'servers:stop',
  SERVERS_RESTART: 'servers:restart',
  SERVERS_KILL: 'servers:kill',
  SERVERS_CONSOLE: 'servers:console',
  SERVERS_FILES: 'servers:files',
  SERVERS_FILES_WRITE: 'servers:files:write',

  // Backup Management
  BACKUPS_VIEW: 'backups:view',
  BACKUPS_CREATE: 'backups:create',
  BACKUPS_RESTORE: 'backups:restore',
  BACKUPS_DELETE: 'backups:delete',

  // Player Management
  PLAYERS_VIEW: 'players:view',
  PLAYERS_KICK: 'players:kick',
  PLAYERS_BAN: 'players:ban',
  PLAYERS_UNBAN: 'players:unban',

  // Mod Management
  MODS_VIEW: 'mods:view',
  MODS_INSTALL: 'mods:install',
  MODS_UNINSTALL: 'mods:uninstall',
  MODS_TOGGLE: 'mods:toggle',

  // World Management
  WORLDS_VIEW: 'worlds:view',
  WORLDS_UPDATE: 'worlds:update',
  WORLDS_DELETE: 'worlds:delete',
  WORLDS_ACTIVATE: 'worlds:activate',

  // Automation & Tasks
  AUTOMATION_VIEW: 'automation:view',
  AUTOMATION_CREATE: 'automation:create',
  AUTOMATION_UPDATE: 'automation:update',
  AUTOMATION_DELETE: 'automation:delete',
  AUTOMATION_EXECUTE: 'automation:execute',

  // Alerts
  ALERTS_VIEW: 'alerts:view',
  ALERTS_MANAGE: 'alerts:manage',

  // Networks
  NETWORKS_VIEW: 'networks:view',
  NETWORKS_CREATE: 'networks:create',
  NETWORKS_UPDATE: 'networks:update',
  NETWORKS_DELETE: 'networks:delete',
  NETWORKS_MANAGE: 'networks:manage',

  // User Management
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // Settings & Permissions
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_UPDATE: 'settings:update',
  PERMISSIONS_VIEW: 'permissions:view',
  PERMISSIONS_MANAGE: 'permissions:manage',

  // Activity Log
  ACTIVITY_VIEW: 'activity:view',
  ACTIVITY_VIEW_ALL: 'activity:view:all',

  // Hytale Downloader
  HYTALE_DL_VIEW: 'hytale-downloader:view',
  HYTALE_DL_AUTH: 'hytale-downloader:auth',
  HYTALE_DL_DOWNLOAD: 'hytale-downloader:download',
  HYTALE_DL_MANAGE: 'hytale-downloader:manage',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission metadata for UI display
 */
export interface PermissionDefinition {
  code: PermissionCode;
  name: string;
  description: string;
  category: string;
}

/**
 * All permission definitions with metadata
 */
export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // Servers
  { code: PERMISSIONS.SERVERS_VIEW, name: 'View Servers', description: 'View server list and details', category: 'servers' },
  { code: PERMISSIONS.SERVERS_CREATE, name: 'Create Servers', description: 'Create new servers', category: 'servers' },
  { code: PERMISSIONS.SERVERS_UPDATE, name: 'Update Servers', description: 'Modify server settings', category: 'servers' },
  { code: PERMISSIONS.SERVERS_DELETE, name: 'Delete Servers', description: 'Remove servers', category: 'servers' },
  { code: PERMISSIONS.SERVERS_START, name: 'Start Servers', description: 'Start server processes', category: 'servers' },
  { code: PERMISSIONS.SERVERS_STOP, name: 'Stop Servers', description: 'Stop server processes', category: 'servers' },
  { code: PERMISSIONS.SERVERS_RESTART, name: 'Restart Servers', description: 'Restart server processes', category: 'servers' },
  { code: PERMISSIONS.SERVERS_KILL, name: 'Kill Servers', description: 'Force kill server processes', category: 'servers' },
  { code: PERMISSIONS.SERVERS_CONSOLE, name: 'Server Console', description: 'Access server console and execute commands', category: 'servers' },
  { code: PERMISSIONS.SERVERS_FILES, name: 'View Files', description: 'View server files', category: 'servers' },
  { code: PERMISSIONS.SERVERS_FILES_WRITE, name: 'Write Files', description: 'Create, edit, and delete server files', category: 'servers' },

  // Backups
  { code: PERMISSIONS.BACKUPS_VIEW, name: 'View Backups', description: 'View backup list', category: 'backups' },
  { code: PERMISSIONS.BACKUPS_CREATE, name: 'Create Backups', description: 'Create new backups', category: 'backups' },
  { code: PERMISSIONS.BACKUPS_RESTORE, name: 'Restore Backups', description: 'Restore from backups', category: 'backups' },
  { code: PERMISSIONS.BACKUPS_DELETE, name: 'Delete Backups', description: 'Remove backups', category: 'backups' },

  // Players
  { code: PERMISSIONS.PLAYERS_VIEW, name: 'View Players', description: 'View player list and details', category: 'players' },
  { code: PERMISSIONS.PLAYERS_KICK, name: 'Kick Players', description: 'Kick players from servers', category: 'players' },
  { code: PERMISSIONS.PLAYERS_BAN, name: 'Ban Players', description: 'Ban players from servers', category: 'players' },
  { code: PERMISSIONS.PLAYERS_UNBAN, name: 'Unban Players', description: 'Unban players from servers', category: 'players' },

  // Mods
  { code: PERMISSIONS.MODS_VIEW, name: 'View Mods', description: 'View installed mods', category: 'mods' },
  { code: PERMISSIONS.MODS_INSTALL, name: 'Install Mods', description: 'Install new mods', category: 'mods' },
  { code: PERMISSIONS.MODS_UNINSTALL, name: 'Uninstall Mods', description: 'Remove mods', category: 'mods' },
  { code: PERMISSIONS.MODS_TOGGLE, name: 'Toggle Mods', description: 'Enable or disable mods', category: 'mods' },

  // Worlds
  { code: PERMISSIONS.WORLDS_VIEW, name: 'View Worlds', description: 'View world list', category: 'worlds' },
  { code: PERMISSIONS.WORLDS_UPDATE, name: 'Update Worlds', description: 'Modify world settings', category: 'worlds' },
  { code: PERMISSIONS.WORLDS_DELETE, name: 'Delete Worlds', description: 'Remove worlds', category: 'worlds' },
  { code: PERMISSIONS.WORLDS_ACTIVATE, name: 'Activate Worlds', description: 'Set active world', category: 'worlds' },

  // Automation
  { code: PERMISSIONS.AUTOMATION_VIEW, name: 'View Automation', description: 'View automation rules and tasks', category: 'automation' },
  { code: PERMISSIONS.AUTOMATION_CREATE, name: 'Create Automation', description: 'Create automation rules', category: 'automation' },
  { code: PERMISSIONS.AUTOMATION_UPDATE, name: 'Update Automation', description: 'Modify automation rules', category: 'automation' },
  { code: PERMISSIONS.AUTOMATION_DELETE, name: 'Delete Automation', description: 'Remove automation rules', category: 'automation' },
  { code: PERMISSIONS.AUTOMATION_EXECUTE, name: 'Execute Automation', description: 'Manually run automation tasks', category: 'automation' },

  // Alerts
  { code: PERMISSIONS.ALERTS_VIEW, name: 'View Alerts', description: 'View system alerts', category: 'alerts' },
  { code: PERMISSIONS.ALERTS_MANAGE, name: 'Manage Alerts', description: 'Mark alerts as read or resolved', category: 'alerts' },

  // Networks
  { code: PERMISSIONS.NETWORKS_VIEW, name: 'View Networks', description: 'View server networks', category: 'networks' },
  { code: PERMISSIONS.NETWORKS_CREATE, name: 'Create Networks', description: 'Create server networks', category: 'networks' },
  { code: PERMISSIONS.NETWORKS_UPDATE, name: 'Update Networks', description: 'Modify network settings', category: 'networks' },
  { code: PERMISSIONS.NETWORKS_DELETE, name: 'Delete Networks', description: 'Remove networks', category: 'networks' },
  { code: PERMISSIONS.NETWORKS_MANAGE, name: 'Manage Networks', description: 'Add/remove servers from networks', category: 'networks' },

  // Users
  { code: PERMISSIONS.USERS_VIEW, name: 'View Users', description: 'View user list', category: 'users' },
  { code: PERMISSIONS.USERS_CREATE, name: 'Create Users', description: 'Create new users', category: 'users' },
  { code: PERMISSIONS.USERS_UPDATE, name: 'Update Users', description: 'Modify user settings', category: 'users' },
  { code: PERMISSIONS.USERS_DELETE, name: 'Delete Users', description: 'Remove users', category: 'users' },

  // Settings
  { code: PERMISSIONS.SETTINGS_VIEW, name: 'View Settings', description: 'View system settings', category: 'settings' },
  { code: PERMISSIONS.SETTINGS_UPDATE, name: 'Update Settings', description: 'Modify system settings', category: 'settings' },
  { code: PERMISSIONS.PERMISSIONS_VIEW, name: 'View Permissions', description: 'View role permissions', category: 'settings' },
  { code: PERMISSIONS.PERMISSIONS_MANAGE, name: 'Manage Permissions', description: 'Modify role permissions', category: 'settings' },

  // Activity Log
  { code: PERMISSIONS.ACTIVITY_VIEW, name: 'View Activity', description: 'View activity log', category: 'activity' },
  { code: PERMISSIONS.ACTIVITY_VIEW_ALL, name: 'View All Activity', description: 'View all users\' activity', category: 'activity' },

  // Hytale Downloader
  { code: PERMISSIONS.HYTALE_DL_VIEW, name: 'View Hytale Downloader', description: 'View Hytale downloader status and versions', category: 'hytale-downloader' },
  { code: PERMISSIONS.HYTALE_DL_AUTH, name: 'Authenticate Hytale', description: 'Connect and authenticate with Hytale account', category: 'hytale-downloader' },
  { code: PERMISSIONS.HYTALE_DL_DOWNLOAD, name: 'Download Hytale Server', description: 'Download Hytale server files', category: 'hytale-downloader' },
  { code: PERMISSIONS.HYTALE_DL_MANAGE, name: 'Manage Hytale Downloader', description: 'Install, update, and manage hytale-downloader tool', category: 'hytale-downloader' },
];

/**
 * Default permissions for each role
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  admin: Object.values(PERMISSIONS) as PermissionCode[], // All permissions

  moderator: [
    // Server operations (not create/delete)
    PERMISSIONS.SERVERS_VIEW,
    PERMISSIONS.SERVERS_UPDATE,
    PERMISSIONS.SERVERS_START,
    PERMISSIONS.SERVERS_STOP,
    PERMISSIONS.SERVERS_RESTART,
    PERMISSIONS.SERVERS_CONSOLE,
    PERMISSIONS.SERVERS_FILES,
    PERMISSIONS.SERVERS_FILES_WRITE,

    // Backups (not delete)
    PERMISSIONS.BACKUPS_VIEW,
    PERMISSIONS.BACKUPS_CREATE,
    PERMISSIONS.BACKUPS_RESTORE,

    // Players
    PERMISSIONS.PLAYERS_VIEW,
    PERMISSIONS.PLAYERS_KICK,
    PERMISSIONS.PLAYERS_BAN,
    PERMISSIONS.PLAYERS_UNBAN,

    // Mods
    PERMISSIONS.MODS_VIEW,
    PERMISSIONS.MODS_INSTALL,
    PERMISSIONS.MODS_UNINSTALL,
    PERMISSIONS.MODS_TOGGLE,

    // Worlds (not delete)
    PERMISSIONS.WORLDS_VIEW,
    PERMISSIONS.WORLDS_UPDATE,
    PERMISSIONS.WORLDS_ACTIVATE,

    // Automation (not delete)
    PERMISSIONS.AUTOMATION_VIEW,
    PERMISSIONS.AUTOMATION_CREATE,
    PERMISSIONS.AUTOMATION_UPDATE,
    PERMISSIONS.AUTOMATION_EXECUTE,

    // Alerts
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.ALERTS_MANAGE,

    // Networks (view and manage, not create/delete)
    PERMISSIONS.NETWORKS_VIEW,
    PERMISSIONS.NETWORKS_MANAGE,

    // Activity (view own, not all users)
    PERMISSIONS.ACTIVITY_VIEW,

    // Hytale Downloader (can auth and download, not manage)
    PERMISSIONS.HYTALE_DL_VIEW,
    PERMISSIONS.HYTALE_DL_AUTH,
    PERMISSIONS.HYTALE_DL_DOWNLOAD,
  ],

  viewer: [
    // Read-only access to everything
    PERMISSIONS.SERVERS_VIEW,
    PERMISSIONS.BACKUPS_VIEW,
    PERMISSIONS.PLAYERS_VIEW,
    PERMISSIONS.MODS_VIEW,
    PERMISSIONS.WORLDS_VIEW,
    PERMISSIONS.AUTOMATION_VIEW,
    PERMISSIONS.ALERTS_VIEW,
    PERMISSIONS.NETWORKS_VIEW,
    PERMISSIONS.SETTINGS_VIEW,
    PERMISSIONS.ACTIVITY_VIEW,
    PERMISSIONS.HYTALE_DL_VIEW,
  ],
};

/**
 * Get all permission categories
 */
export function getPermissionCategories(): string[] {
  const categories = new Set(PERMISSION_DEFINITIONS.map((p) => p.category));
  return Array.from(categories);
}

/**
 * Get permissions by category
 */
export function getPermissionsByCategory(category: string): PermissionDefinition[] {
  return PERMISSION_DEFINITIONS.filter((p) => p.category === category);
}

/**
 * Check if a permission code is valid
 */
export function isValidPermission(code: string): code is PermissionCode {
  return Object.values(PERMISSIONS).includes(code as PermissionCode);
}
