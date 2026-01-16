/**
 * Activity Log Action Constants
 * Format: CATEGORY:ACTION
 */

// ==========================================
// Action Categories
// ==========================================

export const ACTION_CATEGORIES = {
  AUTH: 'auth',
  SERVER: 'server',
  BACKUP: 'backup',
  PLAYER: 'player',
  MOD: 'mod',
  WORLD: 'world',
  AUTOMATION: 'automation',
  NETWORK: 'network',
  USER: 'user',
  SETTINGS: 'settings',
  TEMPLATE: 'template',
  VERSION: 'version',
} as const;

export type ActionCategory = typeof ACTION_CATEGORIES[keyof typeof ACTION_CATEGORIES];

// ==========================================
// Resource Types
// ==========================================

export const RESOURCE_TYPES = {
  SERVER: 'server',
  BACKUP: 'backup',
  PLAYER: 'player',
  MOD: 'mod',
  WORLD: 'world',
  TASK: 'task',
  TASK_GROUP: 'task_group',
  AUTOMATION: 'automation',
  NETWORK: 'network',
  USER: 'user',
  TEMPLATE: 'template',
  VERSION: 'version',
  SOFTWARE: 'software',
} as const;

export type ResourceType = typeof RESOURCE_TYPES[keyof typeof RESOURCE_TYPES];

// ==========================================
// Activity Actions
// ==========================================

export const ACTIVITY_ACTIONS = {
  // Auth actions
  AUTH_LOGIN: 'auth:login',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_PASSWORD_CHANGE: 'auth:password_change',
  AUTH_LOGIN_FAILED: 'auth:login_failed',

  // Server actions
  SERVER_CREATE: 'server:create',
  SERVER_UPDATE: 'server:update',
  SERVER_DELETE: 'server:delete',
  SERVER_START: 'server:start',
  SERVER_STOP: 'server:stop',
  SERVER_RESTART: 'server:restart',
  SERVER_KILL: 'server:kill',
  SERVER_COMMAND: 'server:command',

  // Backup actions
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_DELETE: 'backup:delete',

  // Player actions
  PLAYER_KICK: 'player:kick',
  PLAYER_BAN: 'player:ban',
  PLAYER_UNBAN: 'player:unban',
  PLAYER_WHITELIST_ADD: 'player:whitelist_add',
  PLAYER_WHITELIST_REMOVE: 'player:whitelist_remove',
  PLAYER_OP_ADD: 'player:op_add',
  PLAYER_OP_REMOVE: 'player:op_remove',

  // Mod actions
  MOD_INSTALL: 'mod:install',
  MOD_UNINSTALL: 'mod:uninstall',
  MOD_ENABLE: 'mod:enable',
  MOD_DISABLE: 'mod:disable',
  MOD_UPDATE: 'mod:update',

  // World actions
  WORLD_CREATE: 'world:create',
  WORLD_DELETE: 'world:delete',
  WORLD_ACTIVATE: 'world:activate',
  WORLD_UPDATE: 'world:update',

  // Automation actions
  AUTOMATION_CREATE: 'automation:create',
  AUTOMATION_UPDATE: 'automation:update',
  AUTOMATION_DELETE: 'automation:delete',
  AUTOMATION_ENABLE: 'automation:enable',
  AUTOMATION_DISABLE: 'automation:disable',
  AUTOMATION_EXECUTE: 'automation:execute',

  // Task actions
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_ENABLE: 'task:enable',
  TASK_DISABLE: 'task:disable',
  TASK_EXECUTE: 'task:execute',

  // Task Group actions
  TASK_GROUP_CREATE: 'task_group:create',
  TASK_GROUP_UPDATE: 'task_group:update',
  TASK_GROUP_DELETE: 'task_group:delete',
  TASK_GROUP_ENABLE: 'task_group:enable',
  TASK_GROUP_DISABLE: 'task_group:disable',
  TASK_GROUP_RUN: 'task_group:run',

  // Network actions
  NETWORK_CREATE: 'network:create',
  NETWORK_UPDATE: 'network:update',
  NETWORK_DELETE: 'network:delete',
  NETWORK_ADD_SERVER: 'network:add_server',
  NETWORK_REMOVE_SERVER: 'network:remove_server',
  NETWORK_START_ALL: 'network:start_all',
  NETWORK_STOP_ALL: 'network:stop_all',

  // User actions
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  USER_ROLE_CHANGE: 'user:role_change',

  // Settings actions
  SETTINGS_UPDATE: 'settings:update',
  SETTINGS_DISCORD: 'settings:discord',
  SETTINGS_FTP: 'settings:ftp',
  SETTINGS_MODTALE: 'settings:modtale',

  // Template actions (future)
  TEMPLATE_CREATE: 'template:create',
  TEMPLATE_UPDATE: 'template:update',
  TEMPLATE_DELETE: 'template:delete',
  TEMPLATE_USE: 'template:use',

  // Version actions (future)
  VERSION_ADD: 'version:add',
  VERSION_DELETE: 'version:delete',
  VERSION_DOWNLOAD: 'version:download',
  SOFTWARE_ADD: 'software:add',
  SOFTWARE_DELETE: 'software:delete',
} as const;

export type ActivityAction = typeof ACTIVITY_ACTIONS[keyof typeof ACTIVITY_ACTIONS];

// ==========================================
// Action to Category Mapping
// ==========================================

export function getActionCategory(action: string): ActionCategory {
  const prefix = action.split(':')[0];

  switch (prefix) {
    case 'auth':
      return ACTION_CATEGORIES.AUTH;
    case 'server':
      return ACTION_CATEGORIES.SERVER;
    case 'backup':
      return ACTION_CATEGORIES.BACKUP;
    case 'player':
      return ACTION_CATEGORIES.PLAYER;
    case 'mod':
      return ACTION_CATEGORIES.MOD;
    case 'world':
      return ACTION_CATEGORIES.WORLD;
    case 'automation':
    case 'task':
    case 'task_group':
      return ACTION_CATEGORIES.AUTOMATION;
    case 'network':
      return ACTION_CATEGORIES.NETWORK;
    case 'user':
      return ACTION_CATEGORIES.USER;
    case 'settings':
      return ACTION_CATEGORIES.SETTINGS;
    case 'template':
      return ACTION_CATEGORIES.TEMPLATE;
    case 'version':
    case 'software':
      return ACTION_CATEGORIES.VERSION;
    default:
      return ACTION_CATEGORIES.SERVER;
  }
}

// ==========================================
// Human-readable Action Labels
// ==========================================

export const ACTION_LABELS: Record<string, string> = {
  // Auth
  [ACTIVITY_ACTIONS.AUTH_LOGIN]: 'Logged in',
  [ACTIVITY_ACTIONS.AUTH_LOGOUT]: 'Logged out',
  [ACTIVITY_ACTIONS.AUTH_PASSWORD_CHANGE]: 'Changed password',
  [ACTIVITY_ACTIONS.AUTH_LOGIN_FAILED]: 'Login failed',

  // Server
  [ACTIVITY_ACTIONS.SERVER_CREATE]: 'Created server',
  [ACTIVITY_ACTIONS.SERVER_UPDATE]: 'Updated server',
  [ACTIVITY_ACTIONS.SERVER_DELETE]: 'Deleted server',
  [ACTIVITY_ACTIONS.SERVER_START]: 'Started server',
  [ACTIVITY_ACTIONS.SERVER_STOP]: 'Stopped server',
  [ACTIVITY_ACTIONS.SERVER_RESTART]: 'Restarted server',
  [ACTIVITY_ACTIONS.SERVER_KILL]: 'Force killed server',
  [ACTIVITY_ACTIONS.SERVER_COMMAND]: 'Executed command',

  // Backup
  [ACTIVITY_ACTIONS.BACKUP_CREATE]: 'Created backup',
  [ACTIVITY_ACTIONS.BACKUP_RESTORE]: 'Restored backup',
  [ACTIVITY_ACTIONS.BACKUP_DELETE]: 'Deleted backup',

  // Player
  [ACTIVITY_ACTIONS.PLAYER_KICK]: 'Kicked player',
  [ACTIVITY_ACTIONS.PLAYER_BAN]: 'Banned player',
  [ACTIVITY_ACTIONS.PLAYER_UNBAN]: 'Unbanned player',
  [ACTIVITY_ACTIONS.PLAYER_WHITELIST_ADD]: 'Added to whitelist',
  [ACTIVITY_ACTIONS.PLAYER_WHITELIST_REMOVE]: 'Removed from whitelist',
  [ACTIVITY_ACTIONS.PLAYER_OP_ADD]: 'Made operator',
  [ACTIVITY_ACTIONS.PLAYER_OP_REMOVE]: 'Removed operator',

  // Mod
  [ACTIVITY_ACTIONS.MOD_INSTALL]: 'Installed mod',
  [ACTIVITY_ACTIONS.MOD_UNINSTALL]: 'Uninstalled mod',
  [ACTIVITY_ACTIONS.MOD_ENABLE]: 'Enabled mod',
  [ACTIVITY_ACTIONS.MOD_DISABLE]: 'Disabled mod',
  [ACTIVITY_ACTIONS.MOD_UPDATE]: 'Updated mod',

  // World
  [ACTIVITY_ACTIONS.WORLD_CREATE]: 'Created world',
  [ACTIVITY_ACTIONS.WORLD_DELETE]: 'Deleted world',
  [ACTIVITY_ACTIONS.WORLD_ACTIVATE]: 'Activated world',
  [ACTIVITY_ACTIONS.WORLD_UPDATE]: 'Updated world',

  // Automation
  [ACTIVITY_ACTIONS.AUTOMATION_CREATE]: 'Created automation rule',
  [ACTIVITY_ACTIONS.AUTOMATION_UPDATE]: 'Updated automation rule',
  [ACTIVITY_ACTIONS.AUTOMATION_DELETE]: 'Deleted automation rule',
  [ACTIVITY_ACTIONS.AUTOMATION_ENABLE]: 'Enabled automation rule',
  [ACTIVITY_ACTIONS.AUTOMATION_DISABLE]: 'Disabled automation rule',
  [ACTIVITY_ACTIONS.AUTOMATION_EXECUTE]: 'Executed automation rule',

  // Task
  [ACTIVITY_ACTIONS.TASK_CREATE]: 'Created scheduled task',
  [ACTIVITY_ACTIONS.TASK_UPDATE]: 'Updated scheduled task',
  [ACTIVITY_ACTIONS.TASK_DELETE]: 'Deleted scheduled task',
  [ACTIVITY_ACTIONS.TASK_ENABLE]: 'Enabled scheduled task',
  [ACTIVITY_ACTIONS.TASK_DISABLE]: 'Disabled scheduled task',
  [ACTIVITY_ACTIONS.TASK_EXECUTE]: 'Executed scheduled task',

  // Task Group
  [ACTIVITY_ACTIONS.TASK_GROUP_CREATE]: 'Created task group',
  [ACTIVITY_ACTIONS.TASK_GROUP_UPDATE]: 'Updated task group',
  [ACTIVITY_ACTIONS.TASK_GROUP_DELETE]: 'Deleted task group',
  [ACTIVITY_ACTIONS.TASK_GROUP_ENABLE]: 'Enabled task group',
  [ACTIVITY_ACTIONS.TASK_GROUP_DISABLE]: 'Disabled task group',
  [ACTIVITY_ACTIONS.TASK_GROUP_RUN]: 'Executed task group',

  // Network
  [ACTIVITY_ACTIONS.NETWORK_CREATE]: 'Created network',
  [ACTIVITY_ACTIONS.NETWORK_UPDATE]: 'Updated network',
  [ACTIVITY_ACTIONS.NETWORK_DELETE]: 'Deleted network',
  [ACTIVITY_ACTIONS.NETWORK_ADD_SERVER]: 'Added server to network',
  [ACTIVITY_ACTIONS.NETWORK_REMOVE_SERVER]: 'Removed server from network',
  [ACTIVITY_ACTIONS.NETWORK_START_ALL]: 'Started all servers in network',
  [ACTIVITY_ACTIONS.NETWORK_STOP_ALL]: 'Stopped all servers in network',

  // User
  [ACTIVITY_ACTIONS.USER_CREATE]: 'Created user',
  [ACTIVITY_ACTIONS.USER_UPDATE]: 'Updated user',
  [ACTIVITY_ACTIONS.USER_DELETE]: 'Deleted user',
  [ACTIVITY_ACTIONS.USER_ROLE_CHANGE]: 'Changed user role',

  // Settings
  [ACTIVITY_ACTIONS.SETTINGS_UPDATE]: 'Updated settings',
  [ACTIVITY_ACTIONS.SETTINGS_DISCORD]: 'Updated Discord settings',
  [ACTIVITY_ACTIONS.SETTINGS_FTP]: 'Updated FTP settings',
  [ACTIVITY_ACTIONS.SETTINGS_MODTALE]: 'Updated Modtale settings',

  // Template
  [ACTIVITY_ACTIONS.TEMPLATE_CREATE]: 'Created template',
  [ACTIVITY_ACTIONS.TEMPLATE_UPDATE]: 'Updated template',
  [ACTIVITY_ACTIONS.TEMPLATE_DELETE]: 'Deleted template',
  [ACTIVITY_ACTIONS.TEMPLATE_USE]: 'Created server from template',

  // Version
  [ACTIVITY_ACTIONS.VERSION_ADD]: 'Added version',
  [ACTIVITY_ACTIONS.VERSION_DELETE]: 'Deleted version',
  [ACTIVITY_ACTIONS.VERSION_DOWNLOAD]: 'Downloaded version',
  [ACTIVITY_ACTIONS.SOFTWARE_ADD]: 'Added software',
  [ACTIVITY_ACTIONS.SOFTWARE_DELETE]: 'Deleted software',
};

export function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}
