/**
 * Backup API Hooks
 *
 * React Query hooks for backup-related API operations.
 *
 * @module hooks/api/useBackups
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import api from '../../services/api';
import type { Backup } from '../../types';
import { useToast } from '../../stores/toastStore';
import { logger } from '../../config';

/**
 * Query key factory for backups
 */
export const backupKeys = {
  all: ['backups'] as const,
  lists: () => [...backupKeys.all, 'list'] as const,
  list: (serverId: string) => [...backupKeys.lists(), serverId] as const,
  details: () => [...backupKeys.all, 'detail'] as const,
  detail: (id: string) => [...backupKeys.details(), id] as const,
  stats: (serverId: string) => [...backupKeys.all, 'stats', serverId] as const,
};

/**
 * Hook to fetch backups for a server
 *
 * @param serverId - Server ID
 * @param options - Additional query options
 * @returns Query result with backups list
 */
export function useServerBackups(
  serverId: string,
  options?: Omit<UseQueryOptions<Backup[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: backupKeys.list(serverId),
    queryFn: async () => {
      logger.debug('Fetching backups for server:', serverId);
      const data = await api.getServerBackups(serverId);
      return data as Backup[];
    },
    enabled: !!serverId,
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Hook to fetch backup statistics
 *
 * @param serverId - Server ID
 * @param options - Additional query options
 * @returns Query result with backup stats
 */
export function useBackupStats(
  serverId: string,
  options?: Omit<UseQueryOptions<{ totalSize: number; backupCount: number; lastBackup: Date | null }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: backupKeys.stats(serverId),
    queryFn: async () => {
      const data = await api.getBackupStats(serverId);
      return data as { totalSize: number; backupCount: number; lastBackup: Date | null };
    },
    enabled: !!serverId,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Hook to create a backup
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useCreateBackup(
  options?: UseMutationOptions<Backup, Error, { serverId: string; description?: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, description }) => {
      logger.info('Creating backup for server:', serverId);
      const result = await api.createBackup(serverId, description);
      return result as Backup;
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: backupKeys.list(serverId) });
      queryClient.invalidateQueries({ queryKey: backupKeys.stats(serverId) });
      toast.success('Backup started', 'Your backup is being created');
    },
    onError: (error) => {
      toast.error('Failed to create backup', error.message);
      logger.error('Backup creation failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to restore a backup
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useRestoreBackup(
  options?: UseMutationOptions<{ message: string }, Error, { backupId: string; serverId: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ backupId }) => {
      logger.info('Restoring backup:', backupId);
      return api.restoreBackup(backupId);
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: backupKeys.list(serverId) });
      toast.success('Backup restore started');
    },
    onError: (error) => {
      toast.error('Failed to restore backup', error.message);
    },
    ...options,
  });
}

/**
 * Hook to delete a backup
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useDeleteBackup(
  options?: UseMutationOptions<void, Error, { backupId: string; serverId: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ backupId }) => {
      logger.info('Deleting backup:', backupId);
      await api.deleteBackup(backupId);
    },
    onSuccess: (_, { backupId, serverId }) => {
      queryClient.removeQueries({ queryKey: backupKeys.detail(backupId) });
      queryClient.invalidateQueries({ queryKey: backupKeys.list(serverId) });
      queryClient.invalidateQueries({ queryKey: backupKeys.stats(serverId) });
      toast.success('Backup deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete backup', error.message);
    },
    ...options,
  });
}
