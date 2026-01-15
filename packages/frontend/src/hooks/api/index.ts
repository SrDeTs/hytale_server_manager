/**
 * API Hooks Index
 *
 * Central export point for all React Query API hooks.
 *
 * @module hooks/api
 */

// Server hooks
export {
  serverKeys,
  useServers,
  useServer,
  useServerStatus,
  useServerMetrics,
  useCreateServer,
  useUpdateServer,
  useDeleteServer,
  useStartServer,
  useStopServer,
  useRestartServer,
  useKillServer,
  usePrefetchServer,
} from './useServers';

// Backup hooks
export {
  backupKeys,
  useServerBackups,
  useBackupStats,
  useCreateBackup,
  useRestoreBackup,
  useDeleteBackup,
} from './useBackups';

// Player hooks
export {
  playerKeys,
  useServerPlayers,
  useKickPlayer,
  useBanPlayer,
  useUnbanPlayer,
} from './usePlayers';

// Mod hooks
export {
  modKeys,
  useServerMods,
  useInstallMod,
  useUninstallMod,
  useEnableMod,
  useDisableMod,
} from './useMods';

// Activity log hooks
export {
  activityKeys,
  useActivityLogs,
  useRecentActivity,
  useActivityStats,
  useServerActivity,
  useUserActivity,
  useActivityEntry,
  type ActivityLogEntry,
  type ActivityLogFilters,
  type ActivityStats,
  type PaginatedResult,
} from './useActivityLog';
