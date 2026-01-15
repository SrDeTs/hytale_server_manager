/**
 * Server API Hooks
 *
 * React Query hooks for server-related API operations.
 * Provides caching, automatic refetching, and optimistic updates.
 *
 * @module hooks/api/useServers
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import api from '../../services/api';
import type { Server, ServerStatus } from '../../types';
import { useToast } from '../../stores/toastStore';
import { logger } from '../../config';

/**
 * Query key factory for servers
 */
export const serverKeys = {
  all: ['servers'] as const,
  lists: () => [...serverKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...serverKeys.lists(), filters] as const,
  details: () => [...serverKeys.all, 'detail'] as const,
  detail: (id: string) => [...serverKeys.details(), id] as const,
  status: (id: string) => [...serverKeys.detail(id), 'status'] as const,
  metrics: (id: string) => [...serverKeys.detail(id), 'metrics'] as const,
  config: (id: string) => [...serverKeys.detail(id), 'config'] as const,
};


/**
 * Hook to fetch all servers
 *
 * @param options - Additional query options
 * @returns Query result with servers list
 *
 * @example
 * ```tsx
 * const { data: servers, isLoading, error } = useServers();
 * ```
 */
export function useServers(
  options?: Omit<UseQueryOptions<Server[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serverKeys.lists(),
    queryFn: async () => {
      logger.debug('Fetching servers list');
      const data = await api.getServers();
      return data as Server[];
    },
    staleTime: 30 * 1000, // 30 seconds - servers need fresher data
    ...options,
  });
}

/**
 * Hook to fetch a single server
 *
 * @param id - Server ID
 * @param options - Additional query options
 * @returns Query result with server details
 *
 * @example
 * ```tsx
 * const { data: server, isLoading } = useServer('srv-001');
 * ```
 */
export function useServer(
  id: string,
  options?: Omit<UseQueryOptions<Server, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serverKeys.detail(id),
    queryFn: async () => {
      logger.debug('Fetching server:', id);
      const data = await api.getServer(id);
      return data as Server;
    },
    enabled: !!id,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch server status
 *
 * @param id - Server ID
 * @param options - Additional query options
 * @returns Query result with server status
 */
export function useServerStatus(
  id: string,
  options?: Omit<UseQueryOptions<{ status: ServerStatus; playerCount: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serverKeys.status(id),
    queryFn: async () => {
      const data = await api.getServerStatus(id);
      return data as { status: ServerStatus; playerCount: number };
    },
    enabled: !!id,
    staleTime: 10 * 1000, // 10 seconds - status needs to be fresh
    refetchInterval: 30 * 1000, // Refetch every 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch server metrics
 *
 * @param id - Server ID
 * @param options - Additional query options
 * @returns Query result with server metrics
 */
export function useServerMetrics(
  id: string,
  options?: Omit<UseQueryOptions<{ cpuUsage: number; memoryUsage: number; tps: number; uptime: number }, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: serverKeys.metrics(id),
    queryFn: async () => {
      const data = await api.getServerMetrics(id);
      return data as { cpuUsage: number; memoryUsage: number; tps: number; uptime: number };
    },
    enabled: !!id,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000, // Refetch every 15 seconds
    ...options,
  });
}

/**
 * Server creation data
 */
interface CreateServerData {
  name: string;
  serverPath: string;
  address: string;
  port: number;
  version: string;
  maxPlayers: number;
  gameMode: string;
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
}

/**
 * Hook to create a new server
 *
 * @param options - Mutation options
 * @returns Mutation result
 *
 * @example
 * ```tsx
 * const createServer = useCreateServer();
 * createServer.mutate({ name: 'New Server', ... });
 * ```
 */
export function useCreateServer(
  options?: UseMutationOptions<Server, Error, CreateServerData>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (data: CreateServerData) => {
      logger.info('Creating server:', data.name);
      const result = await api.createServer(data);
      return result as Server;
    },
    onSuccess: (newServer) => {
      // Invalidate and refetch servers list
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() });

      // Add the new server to cache
      queryClient.setQueryData(serverKeys.detail(newServer.id), newServer);

      toast.success('Server created', `${newServer.name} has been created successfully`);
      logger.info('Server created:', newServer.id);
    },
    onError: (error) => {
      toast.error('Failed to create server', error.message);
      logger.error('Server creation failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to update a server
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useUpdateServer(
  options?: Omit<UseMutationOptions<Server, Error, { id: string; data: Partial<Server> }, { previousServer: Server | undefined }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      logger.info('Updating server:', id);
      const result = await api.updateServer(id, data);
      return result as Server;
    },
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: serverKeys.detail(id) });

      // Snapshot previous value
      const previousServer = queryClient.getQueryData<Server>(serverKeys.detail(id));

      // Optimistically update
      if (previousServer) {
        queryClient.setQueryData(serverKeys.detail(id), {
          ...previousServer,
          ...data,
        });
      }

      return { previousServer };
    },
    onError: (error, { id }, context) => {
      // Rollback on error
      if (context?.previousServer) {
        queryClient.setQueryData(serverKeys.detail(id), context.previousServer);
      }
      toast.error('Failed to update server', error.message);
      logger.error('Server update failed:', error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() });
      toast.success('Server updated');
    },
    ...options,
  });
}

/**
 * Hook to delete a server
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useDeleteServer(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('Deleting server:', id);
      await api.deleteServer(id);
    },
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: serverKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: serverKeys.lists() });

      toast.success('Server deleted');
      logger.info('Server deleted:', id);
    },
    onError: (error) => {
      toast.error('Failed to delete server', error.message);
      logger.error('Server deletion failed:', error);
    },
    ...options,
  });
}

/**
 * Hook to start a server
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useStartServer(
  options?: Omit<UseMutationOptions<{ message: string }, Error, string, { previousStatus: unknown }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('Starting server:', id);
      return api.startServer(id);
    },
    onMutate: async (id) => {
      // Optimistically update status to 'starting'
      await queryClient.cancelQueries({ queryKey: serverKeys.status(id) });
      const previousStatus = queryClient.getQueryData(serverKeys.status(id));

      queryClient.setQueryData(serverKeys.status(id), {
        status: 'starting' as ServerStatus,
        playerCount: 0,
      });

      return { previousStatus };
    },
    onError: (error, id, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(serverKeys.status(id), context.previousStatus);
      }
      toast.error('Failed to start server', error.message);
      logger.error('Server start failed:', error);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(id) });
      toast.success('Server starting');
    },
    ...options,
  });
}

/**
 * Hook to stop a server
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useStopServer(
  options?: Omit<UseMutationOptions<{ message: string }, Error, string, { previousStatus: unknown }>, 'mutationFn'>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('Stopping server:', id);
      return api.stopServer(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: serverKeys.status(id) });
      const previousStatus = queryClient.getQueryData(serverKeys.status(id));

      queryClient.setQueryData(serverKeys.status(id), {
        status: 'stopping' as ServerStatus,
        playerCount: 0,
      });

      return { previousStatus };
    },
    onError: (error, id, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(serverKeys.status(id), context.previousStatus);
      }
      toast.error('Failed to stop server', error.message);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(id) });
      toast.warning('Server stopping');
    },
    ...options,
  });
}

/**
 * Hook to restart a server
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useRestartServer(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.info('Restarting server:', id);
      return api.restartServer(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(id) });
      toast.info('Server restarting');
    },
    onError: (error) => {
      toast.error('Failed to restart server', error.message);
    },
    ...options,
  });
}

/**
 * Hook to kill a server
 *
 * @param options - Mutation options
 * @returns Mutation result
 */
export function useKillServer(
  options?: UseMutationOptions<{ message: string }, Error, string>
) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      logger.warn('Killing server:', id);
      return api.killServer(id);
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: serverKeys.detail(id) });
      toast.warning('Server killed');
    },
    onError: (error) => {
      toast.error('Failed to kill server', error.message);
    },
    ...options,
  });
}

/**
 * Hook to prefetch server data
 *
 * @returns Function to prefetch a server
 */
export function usePrefetchServer() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: serverKeys.detail(id),
      queryFn: () => api.getServer(id),
      staleTime: 30 * 1000,
    });
  };
}
