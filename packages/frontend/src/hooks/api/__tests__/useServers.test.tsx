/**
 * Server Hooks Tests
 *
 * Tests for the server-related React Query hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useServers, useServer, useStartServer, useStopServer, serverKeys } from '../useServers';

// Mock the API service
vi.mock('../../../services/api', () => ({
  default: {
    getServers: vi.fn(),
    getServer: vi.fn(),
    startServer: vi.fn(),
    stopServer: vi.fn(),
    restartServer: vi.fn(),
    killServer: vi.fn(),
    createServer: vi.fn(),
    updateServer: vi.fn(),
    deleteServer: vi.fn(),
    getServerStatus: vi.fn(),
    getServerMetrics: vi.fn(),
  },
}));

// Mock toast store
vi.mock('../../../stores/toastStore', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

// Mock logger
vi.mock('../../../config', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  env: {
    isDevelopment: true,
    isProduction: false,
  },
}));

import api from '../../../services/api';

// Create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const mockServers = [
  {
    id: 'srv-001',
    name: 'Test Server 1',
    status: 'running',
    version: '1.0.0',
  },
  {
    id: 'srv-002',
    name: 'Test Server 2',
    status: 'stopped',
    version: '1.0.0',
  },
];

describe('Server Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serverKeys', () => {
    it('should generate correct query keys', () => {
      expect(serverKeys.all).toEqual(['servers']);
      expect(serverKeys.lists()).toEqual(['servers', 'list']);
      expect(serverKeys.detail('srv-001')).toEqual(['servers', 'detail', 'srv-001']);
      expect(serverKeys.status('srv-001')).toEqual(['servers', 'detail', 'srv-001', 'status']);
      expect(serverKeys.metrics('srv-001')).toEqual(['servers', 'detail', 'srv-001', 'metrics']);
    });
  });

  describe('useServers', () => {
    it('should fetch servers successfully', async () => {
      vi.mocked(api.getServers).mockResolvedValueOnce(mockServers);

      const { result } = renderHook(() => useServers(), {
        wrapper: createWrapper(),
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockServers);
      expect(api.getServers).toHaveBeenCalledTimes(1);
    });

    it('should handle fetch error', async () => {
      const error = new Error('Failed to fetch');
      vi.mocked(api.getServers).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useServers(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useServer', () => {
    it('should fetch a single server', async () => {
      vi.mocked(api.getServer).mockResolvedValueOnce(mockServers[0]);

      const { result } = renderHook(() => useServer('srv-001'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockServers[0]);
      expect(api.getServer).toHaveBeenCalledWith('srv-001');
    });

    it('should not fetch when id is empty', () => {
      const { result } = renderHook(() => useServer(''), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(false);
      expect(api.getServer).not.toHaveBeenCalled();
    });
  });

  describe('useStartServer', () => {
    it('should start a server successfully', async () => {
      vi.mocked(api.startServer).mockResolvedValueOnce({ message: 'Server starting' });

      const { result } = renderHook(() => useStartServer(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('srv-001');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.startServer).toHaveBeenCalledWith('srv-001');
    });

    it('should handle start error', async () => {
      const error = new Error('Failed to start');
      vi.mocked(api.startServer).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useStartServer(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('srv-001');

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });
    });
  });

  describe('useStopServer', () => {
    it('should stop a server successfully', async () => {
      vi.mocked(api.stopServer).mockResolvedValueOnce({ message: 'Server stopping' });

      const { result } = renderHook(() => useStopServer(), {
        wrapper: createWrapper(),
      });

      result.current.mutate('srv-001');

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(api.stopServer).toHaveBeenCalledWith('srv-001');
    });
  });
});
