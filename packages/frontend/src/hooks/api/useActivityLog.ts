/**
 * Activity Log API Hooks
 *
 * React Query hooks for activity log-related API operations.
 *
 * @module hooks/api/useActivityLog
 */

import {
  useQuery,
  type UseQueryOptions,
} from '@tanstack/react-query';
import api from '../../services/api';
import { logger } from '../../config';

/**
 * Activity log entry type
 */
export interface ActivityLogEntry {
  id: string;
  userId: string;
  username: string;
  userRole: string;
  action: string;
  actionCategory: string;
  resourceType: string;
  resourceId: string | null;
  resourceName: string | null;
  status: 'success' | 'failed';
  errorMessage: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  timestamp: string;
}

/**
 * Activity log filters
 */
export interface ActivityLogFilters {
  userId?: string;
  action?: string;
  actionCategory?: string;
  resourceType?: string;
  resourceId?: string;
  status?: 'success' | 'failed';
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'action' | 'username';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Activity stats type
 */
export interface ActivityStats {
  totalActions: number;
  actionsByCategory: Record<string, number>;
  actionsByStatus: Record<string, number>;
  topUsers: Array<{ username: string; count: number }>;
}

/**
 * Query key factory for activity logs
 */
export const activityKeys = {
  all: ['activity'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  list: (filters: ActivityLogFilters) => [...activityKeys.lists(), filters] as const,
  recent: (limit: number) => [...activityKeys.all, 'recent', limit] as const,
  stats: (startDate?: string, endDate?: string) => [...activityKeys.all, 'stats', startDate, endDate] as const,
  server: (serverId: string, limit: number) => [...activityKeys.all, 'server', serverId, limit] as const,
  user: (userId: string, limit: number) => [...activityKeys.all, 'user', userId, limit] as const,
  detail: (id: string) => [...activityKeys.all, 'detail', id] as const,
};

/**
 * Hook to fetch activity logs with filters and pagination
 *
 * @param filters - Query filters
 * @param options - Additional query options
 * @returns Query result with paginated activity logs
 */
export function useActivityLogs(
  filters: ActivityLogFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResult<ActivityLogEntry>, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: activityKeys.list(filters),
    queryFn: async () => {
      logger.debug('Fetching activity logs with filters:', filters);
      return api.getActivityLogs<ActivityLogEntry>(filters);
    },
    staleTime: 30 * 1000, // 30 seconds
    ...options,
  });
}

/**
 * Hook to fetch recent activity for dashboard
 *
 * @param limit - Number of entries to fetch
 * @param options - Additional query options
 * @returns Query result with recent activity entries
 */
export function useRecentActivity(
  limit = 10,
  options?: Omit<UseQueryOptions<ActivityLogEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: activityKeys.recent(limit),
    queryFn: async () => {
      logger.debug('Fetching recent activity, limit:', limit);
      return api.getRecentActivity<ActivityLogEntry>(limit);
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    ...options,
  });
}

/**
 * Hook to fetch activity statistics
 *
 * @param startDate - Optional start date filter
 * @param endDate - Optional end date filter
 * @param options - Additional query options
 * @returns Query result with activity stats
 */
export function useActivityStats(
  startDate?: string,
  endDate?: string,
  options?: Omit<UseQueryOptions<ActivityStats, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: activityKeys.stats(startDate, endDate),
    queryFn: async () => {
      logger.debug('Fetching activity stats');
      return api.getActivityStats(startDate, endDate);
    },
    staleTime: 60 * 1000, // 1 minute
    ...options,
  });
}

/**
 * Hook to fetch activity for a specific server
 *
 * @param serverId - Server ID
 * @param limit - Number of entries to fetch
 * @param options - Additional query options
 * @returns Query result with server activity entries
 */
export function useServerActivity(
  serverId: string,
  limit = 50,
  options?: Omit<UseQueryOptions<ActivityLogEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: activityKeys.server(serverId, limit),
    queryFn: async () => {
      logger.debug('Fetching activity for server:', serverId);
      return api.getServerActivity<ActivityLogEntry>(serverId, limit);
    },
    enabled: !!serverId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch activity for a specific user
 *
 * @param userId - User ID
 * @param limit - Number of entries to fetch
 * @param options - Additional query options
 * @returns Query result with user activity entries
 */
export function useUserActivity(
  userId: string,
  limit = 50,
  options?: Omit<UseQueryOptions<ActivityLogEntry[], Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: activityKeys.user(userId, limit),
    queryFn: async () => {
      logger.debug('Fetching activity for user:', userId);
      return api.getUserActivity<ActivityLogEntry>(userId, limit);
    },
    enabled: !!userId,
    staleTime: 30 * 1000,
    ...options,
  });
}

/**
 * Hook to fetch a single activity log entry
 *
 * @param id - Activity log entry ID
 * @param options - Additional query options
 * @returns Query result with activity entry
 */
export function useActivityEntry(
  id: string,
  options?: Omit<UseQueryOptions<ActivityLogEntry, Error>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: activityKeys.detail(id),
    queryFn: async () => {
      logger.debug('Fetching activity entry:', id);
      return api.getActivityEntry<ActivityLogEntry>(id);
    },
    enabled: !!id,
    staleTime: 60 * 1000,
    ...options,
  });
}
