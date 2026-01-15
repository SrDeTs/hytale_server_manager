/**
 * Mod API Hooks
 *
 * React Query hooks for mod-related API operations.
 *
 * @module hooks/api/useMods
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import api from '../../services/api';
import type { Mod } from '../../types';
import { useToast } from '../../stores/toastStore';
import { logger } from '../../config';

/**
 * Query key factory for mods
 */
export const modKeys = {
  all: ['mods'] as const,
  lists: () => [...modKeys.all, 'list'] as const,
  list: (serverId: string) => [...modKeys.lists(), serverId] as const,
  details: () => [...modKeys.all, 'detail'] as const,
  detail: (id: string) => [...modKeys.details(), id] as const,
};

/**
 * Hook to fetch installed mods for a server
 *
 * @param serverId - Server ID
 * @param options - Additional query options
 * @returns Query result with mods list
 */
export function useServerMods(
  serverId: string,
  options?: Omit<UseQueryOptions<Mod[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: modKeys.list(serverId),
    queryFn: async () => {
      logger.debug('Fetching mods for server:', serverId);
      const data = await api.getServerMods(serverId);
      return data as Mod[];
    },
    enabled: !!serverId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

/**
 * Hook to install a mod
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useInstallMod(
  options?: UseMutationOptions<Mod, Error, { serverId: string; metadata: unknown }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, metadata }) => {
      logger.info('Installing mod on server:', serverId);
      const result = await api.installMod(serverId, metadata);
      return result as Mod;
    },
    onSuccess: (mod, { serverId }) => {
      queryClient.invalidateQueries({ queryKey: modKeys.list(serverId) });
      toast.success('Mod installed', `${mod.name} has been installed`);
    },
    onError: (error) => {
      toast.error('Failed to install mod', error.message);
      logger.error('Mod installation failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to uninstall a mod
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useUninstallMod(
  options?: UseMutationOptions<void, Error, { serverId: string; modId: string; modName?: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, modId }) => {
      logger.info('Uninstalling mod:', modId);
      await api.uninstallMod(serverId, modId);
    },
    onSuccess: (_, { serverId, modName }) => {
      queryClient.invalidateQueries({ queryKey: modKeys.list(serverId) });
      toast.success('Mod uninstalled', modName ? `${modName} has been removed` : undefined);
    },
    onError: (error) => {
      toast.error('Failed to uninstall mod', error.message);
    },
    ...options,
  });
}

/**
 * Hook to enable a mod
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useEnableMod(
  options?: Omit<UseMutationOptions<Mod, Error, { serverId: string; modId: string }, { previousMods: Mod[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, modId }) => {
      logger.info('Enabling mod:', modId);
      const result = await api.enableMod(serverId, modId);
      return result as Mod;
    },
    onMutate: async ({ serverId, modId }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: modKeys.list(serverId) });
      const previousMods = queryClient.getQueryData<Mod[]>(modKeys.list(serverId));

      if (previousMods) {
        queryClient.setQueryData(
          modKeys.list(serverId),
          previousMods.map((m) => (m.id === modId ? { ...m, enabled: true } : m))
        );
      }

      return { previousMods };
    },
    onError: (error, { serverId }, context) => {
      if (context?.previousMods) {
        queryClient.setQueryData(modKeys.list(serverId), context.previousMods);
      }
      toast.error('Failed to enable mod', error.message);
    },
    onSuccess: (mod) => {
      toast.success('Mod enabled', `${mod.name} is now enabled`);
    },
    ...options,
  });
}

/**
 * Hook to disable a mod
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useDisableMod(
  options?: Omit<UseMutationOptions<Mod, Error, { serverId: string; modId: string }, { previousMods: Mod[] | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ serverId, modId }) => {
      logger.info('Disabling mod:', modId);
      const result = await api.disableMod(serverId, modId);
      return result as Mod;
    },
    onMutate: async ({ serverId, modId }) => {
      await queryClient.cancelQueries({ queryKey: modKeys.list(serverId) });
      const previousMods = queryClient.getQueryData<Mod[]>(modKeys.list(serverId));

      if (previousMods) {
        queryClient.setQueryData(
          modKeys.list(serverId),
          previousMods.map((m) => (m.id === modId ? { ...m, enabled: false } : m))
        );
      }

      return { previousMods };
    },
    onError: (error, { serverId }, context) => {
      if (context?.previousMods) {
        queryClient.setQueryData(modKeys.list(serverId), context.previousMods);
      }
      toast.error('Failed to disable mod', error.message);
    },
    onSuccess: (mod) => {
      toast.warning('Mod disabled', `${mod.name} is now disabled`);
    },
    ...options,
  });
}
