/**
 * Player API Hooks
 *
 * React Query hooks for player-related API operations.
 *
 * @module hooks/api/usePlayers
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import api from '../../services/api';
import type { Player } from '../../types';
import { useToast } from '../../stores/toastStore';
import { logger } from '../../config';

/**
 * Query key factory for players
 */
export const playerKeys = {
  all: ['players'] as const,
  lists: () => [...playerKeys.all, 'list'] as const,
  list: (serverId: string, onlineOnly?: boolean) =>
    [...playerKeys.lists(), serverId, { onlineOnly }] as const,
  details: () => [...playerKeys.all, 'detail'] as const,
  detail: (uuid: string) => [...playerKeys.details(), uuid] as const,
};

/**
 * Hook to fetch players for a server
 *
 * @param serverId - Server ID
 * @param onlineOnly - Only fetch online players
 * @param options - Additional query options
 * @returns Query result with players list
 */
export function useServerPlayers(
  serverId: string,
  onlineOnly = false,
  options?: Omit<UseQueryOptions<Player[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: playerKeys.list(serverId, onlineOnly),
    queryFn: async () => {
      logger.debug('Fetching players for server:', serverId);
      const data = await api.getServerPlayers(serverId, onlineOnly);
      return data as Player[];
    },
    enabled: !!serverId,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: onlineOnly ? 30 * 1000 : false, // Auto-refresh online players
    ...options,
  });
}

/**
 * Hook to kick a player
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useKickPlayer(
  options?: UseMutationOptions<
    { message: string },
    Error,
    { serverId: string; uuid: string; reason?: string }
  >
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, uuid, reason }) => {
      logger.info('Kicking player:', uuid);
      return api.kickPlayer(serverId, uuid, reason);
    },
    onSuccess: (_, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.list(serverId) });
      toast.warning('Player kicked');
    },
    onError: (error) => {
      toast.error('Failed to kick player', error.message);
    },
    ...options,
  });
}

/**
 * Hook to ban a player
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useBanPlayer(
  options?: UseMutationOptions<
    Player,
    Error,
    { serverId: string; uuid: string; reason?: string; duration?: number }
  >
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, uuid, reason, duration }) => {
      logger.info('Banning player:', uuid);
      const result = await api.banPlayer(serverId, uuid, reason, duration);
      return result as Player;
    },
    onSuccess: (_, { serverId, uuid }) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.list(serverId) });
      queryClient.invalidateQueries({ queryKey: playerKeys.detail(uuid) });
      toast.error('Player banned');
    },
    onError: (error) => {
      toast.error('Failed to ban player', error.message);
    },
    ...options,
  });
}

/**
 * Hook to unban a player
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useUnbanPlayer(
  options?: UseMutationOptions<Player, Error, { serverId: string; uuid: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, uuid }) => {
      logger.info('Unbanning player:', uuid);
      const result = await api.unbanPlayer(serverId, uuid);
      return result as Player;
    },
    onSuccess: (_, { serverId, uuid }) => {
      queryClient.invalidateQueries({ queryKey: playerKeys.list(serverId) });
      queryClient.invalidateQueries({ queryKey: playerKeys.detail(uuid) });
      toast.success('Player unbanned');
    },
    onError: (error) => {
      toast.error('Failed to unban player', error.message);
    },
    ...options,
  });
}
