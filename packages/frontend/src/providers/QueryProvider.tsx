/**
 * React Query Provider
 *
 * Configures and provides the React Query client for the application.
 * Handles global query settings, caching, and error handling.
 *
 * @module providers/QueryProvider
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { env } from '../config';
import { AuthError } from '../services/auth';

/**
 * Default stale time for queries (5 minutes)
 */
const DEFAULT_STALE_TIME = 5 * 60 * 1000;

/**
 * Default cache time for queries (30 minutes)
 */
const DEFAULT_GC_TIME = 30 * 60 * 1000;

/**
 * Create Query Client with default options
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Time until data is considered stale
        staleTime: DEFAULT_STALE_TIME,

        // Time until inactive queries are garbage collected
        gcTime: DEFAULT_GC_TIME,

        // Retry configuration
        retry: (failureCount, error) => {
          // Don't retry on auth errors
          if (error instanceof AuthError) {
            return false;
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },

        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch on window focus in production only
        refetchOnWindowFocus: env.isProduction,

        // Don't refetch on mount if data is fresh
        refetchOnMount: 'always',

        // Network mode: always attempt fetches
        networkMode: 'always',
      },

      mutations: {
        // Retry mutations once
        retry: 1,

        // Network mode for mutations
        networkMode: 'always',
      },
    },
  });
}

/**
 * Singleton query client instance
 */
let queryClient: QueryClient | null = null;

/**
 * Gets or creates the query client singleton
 */
export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = createQueryClient();
  }
  return queryClient;
}

/**
 * Query Provider Props
 */
interface QueryProviderProps {
  children: ReactNode;
}

/**
 * Query Provider Component
 *
 * Wraps the application with React Query context and provides
 * global error handling for queries and mutations.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const client = getQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Hook to get the query client
 */
export function useQueryClient(): QueryClient {
  return getQueryClient();
}

export default QueryProvider;
