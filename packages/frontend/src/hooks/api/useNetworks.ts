/**
 * Network API Hooks
 *
 * React Query hooks for network-related API operations.
 * Provides caching, automatic refetching, and optimistic updates.
 *
 * @module hooks/api/useNetworks
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import api from '../../services/api';
import type {
  NetworkWithMembers,
  NetworkStatus,
  AggregatedMetrics,
  NetworkPlayerInfo,
  BulkOperationResult,
  CreateNetworkDto,
  UpdateNetworkDto,
  NetworkBackup,
} from '../../types';
import { useToast } from '../../stores/toastStore';
import { logger } from '../../config';

/**
 * Query key factory for networks
 */
export const networkKeys = {
  all: ['networks'] as const,
  lists: () => [...networkKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...networkKeys.lists(), filters] as const,
  details: () => [...networkKeys.all, 'detail'] as const,
  detail: (id: string) => [...networkKeys.details(), id] as const,
  status: (id: string) => [...networkKeys.detail(id), 'status'] as const,
  metrics: (id: string) => [...networkKeys.detail(id), 'metrics'] as const,
  players: (id: string) => [...networkKeys.detail(id), 'players'] as const,
  backups: (id: string) => [...networkKeys.detail(id), 'backups'] as const,
  ungrouped: () => [...networkKeys.all, 'ungrouped'] as const,
};

/**
 * Hook to fetch all networks with their members
 */
export function useNetworks(
  options?: Omit<UseQueryOptions<NetworkWithMembers[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.lists(),
    queryFn: async () => {
      logger.debug('Fetching networks list');
      const data = await api.getNetworks<NetworkWithMembers>();
      return data;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch ungrouped servers (not in any network)
 */
export function useUngroupedServers(
  options?: Omit<UseQueryOptions<{ id: string; name: string; status: string }[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.ungrouped(),
    queryFn: async () => {
      logger.debug('Fetching ungrouped servers');
      const data = await api.getUngroupedServers<{ id: string; name: string; status: string }>();
      return data;
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch a single network with members
 */
export function useNetwork(
  id: string,
  options?: Omit<UseQueryOptions<NetworkWithMembers, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.detail(id),
    queryFn: async () => {
      logger.debug('Fetching network:', id);
      const data = await api.getNetwork<NetworkWithMembers>(id);
      return data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch network status
 */
export function useNetworkStatus(
  id: string,
  options?: Omit<UseQueryOptions<NetworkStatus, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.status(id),
    queryFn: async () => {
      const data = await api.getNetworkStatus<NetworkStatus>(id);
      return data;
    },
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch network metrics
 */
export function useNetworkMetrics(
  id: string,
  options?: Omit<UseQueryOptions<AggregatedMetrics, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.metrics(id),
    queryFn: async () => {
      const data = await api.getNetworkMetrics<AggregatedMetrics>(id);
      return data;
    },
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch network players
 */
export function useNetworkPlayers(
  id: string,
  options?: Omit<UseQueryOptions<NetworkPlayerInfo[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.players(id),
    queryFn: async () => {
      const data = await api.getNetworkPlayers<NetworkPlayerInfo>(id);
      return data;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch network backups
 */
export function useNetworkBackups(
  id: string,
  options?: Omit<UseQueryOptions<NetworkBackup[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: networkKeys.backups(id),
    queryFn: async () => {
      const data = await api.getNetworkBackups<NetworkBackup>(id);
      return data;
    },
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}

/**
 * Hook to create a new network
 */
export function useCreateNetwork(
  options?: UseMutationOptions<NetworkWithMembers, Error, CreateNetworkDto>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreateNetworkDto) => {
      logger.info('Creating network:', data.name);
      const result = await api.createNetwork<NetworkWithMembers>(data);
      return result;
    },
    onSuccess: (newNetwork) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: networkKeys.ungrouped() });
      queryClient.setQueryData(networkKeys.detail(newNetwork.id), newNetwork);
      toast.success('Network created', `${newNetwork.name} has been created successfully`);
      logger.info('Network created:', newNetwork.id);
    },
    onError: (error) => {
      toast.error('Failed to create network', error.message);
      logger.error('Network creation failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to update a network
 */
export function useUpdateNetwork(
  options?: Omit<UseMutationOptions<NetworkWithMembers, Error, { id: string; data: UpdateNetworkDto }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      logger.info('Updating network:', id);
      const result = await api.updateNetwork<NetworkWithMembers>(id, data);
      return result;
    },
    onSuccess: (updatedNetwork) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });
      queryClient.setQueryData(networkKeys.detail(updatedNetwork.id), updatedNetwork);
      toast.success('Network updated');
    },
    onError: (error) => {
      toast.error('Failed to update network', error.message);
      logger.error('Network update failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to delete a network
 */
export function useDeleteNetwork(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('Deleting network:', id);
      return api.deleteNetwork(id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: networkKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: networkKeys.ungrouped() });
      toast.success('Network deleted');
      logger.info('Network deleted:', id);
    },
    onError: (error) => {
      toast.error('Failed to delete network', error.message);
      logger.error('Network deletion failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to add a server to a network
 */
export function useAddServerToNetwork(
  options?: UseMutationOptions<{ message: string }, Error, { networkId: string; serverId: string; role?: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ networkId, serverId, role }) => {
      return api.addServerToNetwork(networkId, serverId, role);
    },
    onSuccess: (_, { networkId }) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.detail(networkId) });
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: networkKeys.ungrouped() });
      toast.success('Server added to network');
    },
    onError: (error) => {
      toast.error('Failed to add server', error.message);
    },
    ...options,
  });
}

/**
 * Hook to remove a server from a network
 */
export function useRemoveServerFromNetwork(
  options?: UseMutationOptions<{ message: string }, Error, { networkId: string; serverId: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ networkId, serverId }) => {
      return api.removeServerFromNetwork(networkId, serverId);
    },
    onSuccess: (_, { networkId }) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.detail(networkId) });
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });
      queryClient.invalidateQueries({ queryKey: networkKeys.ungrouped() });
      toast.success('Server removed from network');
    },
    onError: (error) => {
      toast.error('Failed to remove server', error.message);
    },
    ...options,
  });
}

/**
 * Hook to start all servers in a network
 */
export function useStartNetwork(
  options?: UseMutationOptions<BulkOperationResult, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (networkId: string) => {
      logger.info('Starting network:', networkId);
      return api.startNetwork(networkId);
    },
    onSuccess: (result, networkId) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.status(networkId) });
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });

      const successCount = result.results.filter(r => r.success).length;
      const totalCount = result.results.length;

      if (result.success) {
        toast.success('Network starting', `All ${totalCount} servers are starting`);
      } else {
        toast.warning('Network partially started', `${successCount}/${totalCount} servers started`);
      }
    },
    onError: (error) => {
      toast.error('Failed to start network', error.message);
    },
    ...options,
  });
}

/**
 * Hook to stop all servers in a network
 */
export function useStopNetwork(
  options?: UseMutationOptions<BulkOperationResult, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (networkId: string) => {
      logger.info('Stopping network:', networkId);
      return api.stopNetwork(networkId);
    },
    onSuccess: (result, networkId) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.status(networkId) });
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });

      const successCount = result.results.filter(r => r.success).length;
      const totalCount = result.results.length;

      if (result.success) {
        toast.warning('Network stopping', `All ${totalCount} servers are stopping`);
      } else {
        toast.warning('Network partially stopped', `${successCount}/${totalCount} servers stopped`);
      }
    },
    onError: (error) => {
      toast.error('Failed to stop network', error.message);
    },
    ...options,
  });
}

/**
 * Hook to restart all servers in a network
 */
export function useRestartNetwork(
  options?: UseMutationOptions<BulkOperationResult, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (networkId: string) => {
      logger.info('Restarting network:', networkId);
      return api.restartNetwork(networkId);
    },
    onSuccess: (result, networkId) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.status(networkId) });
      queryClient.invalidateQueries({ queryKey: networkKeys.lists() });

      const successCount = result.results.filter(r => r.success).length;
      const totalCount = result.results.length;

      if (result.success) {
        toast.info('Network restarting', `All ${totalCount} servers are restarting`);
      } else {
        toast.warning('Network partially restarted', `${successCount}/${totalCount} servers restarted`);
      }
    },
    onError: (error) => {
      toast.error('Failed to restart network', error.message);
    },
    ...options,
  });
}

/**
 * Hook to create a network backup
 */
export function useCreateNetworkBackup(
  options?: UseMutationOptions<{ id: string; name: string }, Error, { networkId: string; description?: string }>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ networkId, description }) => {
      logger.info('Creating network backup:', networkId);
      return api.createNetworkBackup<{ id: string; name: string }>(networkId, description);
    },
    onSuccess: (result, { networkId }) => {
      queryClient.invalidateQueries({ queryKey: networkKeys.backups(networkId) });
      toast.success('Network backup started', `Backup ${result.name} is being created`);
    },
    onError: (error) => {
      toast.error('Failed to create network backup', error.message);
    },
    ...options,
  });
}
