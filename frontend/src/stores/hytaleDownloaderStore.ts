/**
 * Hytale Downloader Store
 *
 * Zustand store for managing Hytale Downloader state including
 * binary installation, OAuth authentication, and server downloads.
 */

import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { env, logger } from '../config';

// ==========================================
// Types
// ==========================================

export interface TokenInfo {
  accessTokenExpiresAt: number | null;
  accessTokenExpiresIn: number | null;
  refreshTokenExpiresAt: number | null;
  refreshTokenExpiresIn: number | null;
  isAccessTokenExpired: boolean;
  isRefreshTokenExpired: boolean;
  branch: string | null;
}

export interface AutoRefreshSettings {
  enabled: boolean;
  intervalSeconds: number;
  lastRefresh: Date | null;
}

export interface HytaleDownloaderStatus {
  binaryInstalled: boolean;
  binaryVersion: string | null;
  binaryPath: string | null;
  isAuthenticated: boolean;
  accountEmail: string | null;
  lastBinaryCheck: Date | null;
  tokenInfo: TokenInfo | null;
  autoRefresh: AutoRefreshSettings;
}

export interface GameVersionInfo {
  version: string;
  patchline: string;
  checkedAt: Date;
}

export interface OAuthSession {
  sessionId: string;
  deviceCode: string;
  verificationUrl: string;
  expiresAt: Date;
  status: 'pending' | 'polling' | 'completed' | 'expired' | 'failed';
  error?: string;
}

export interface DownloadSession {
  sessionId: string;
  destinationPath: string;
  patchline: string;
  status: 'downloading' | 'extracting' | 'validating' | 'complete' | 'failed';
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  error?: string;
}

interface HytaleDownloaderState {
  // Status
  status: HytaleDownloaderStatus | null;
  isLoading: boolean;
  error: string | null;

  // OAuth
  oauthSession: OAuthSession | null;
  isStartingOAuth: boolean;
  isRefreshingToken: boolean;

  // Auto-refresh
  isUpdatingAutoRefresh: boolean;

  // Download
  downloadSession: DownloadSession | null;
  isStartingDownload: boolean;

  // Version
  gameVersion: GameVersionInfo | null;
  isCheckingVersion: boolean;

  // WebSocket
  socket: Socket | null;
  isConnected: boolean;
}

interface HytaleDownloaderActions {
  // Status
  fetchStatus: () => Promise<void>;
  clearError: () => void;

  // Binary management
  installBinary: () => Promise<void>;
  updateBinary: () => Promise<void>;

  // OAuth
  startOAuth: () => Promise<void>;
  cancelOAuth: () => void;
  clearCredentials: () => Promise<void>;
  refreshToken: () => Promise<void>;

  // Auto-refresh
  setAutoRefresh: (enabled: boolean, intervalSeconds?: number) => Promise<void>;

  // Download
  startDownload: (destinationPath: string, patchline?: string) => Promise<void>;
  cancelDownload: () => void;

  // Version
  checkVersion: (patchline?: string) => Promise<void>;

  // WebSocket
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;

  // Reset
  reset: () => void;
}

type HytaleDownloaderStore = HytaleDownloaderState & HytaleDownloaderActions;

// ==========================================
// API Helpers
// ==========================================

const API_BASE = env.api.baseUrl;

async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

// ==========================================
// Store
// ==========================================

const initialState: HytaleDownloaderState = {
  status: null,
  isLoading: false,
  error: null,
  oauthSession: null,
  isStartingOAuth: false,
  isRefreshingToken: false,
  isUpdatingAutoRefresh: false,
  downloadSession: null,
  isStartingDownload: false,
  gameVersion: null,
  isCheckingVersion: false,
  socket: null,
  isConnected: false,
};

export const useHytaleDownloaderStore = create<HytaleDownloaderStore>((set, get) => ({
  ...initialState,

  // ==========================================
  // Status Actions
  // ==========================================

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await apiRequest<HytaleDownloaderStatus>('/api/hytale-downloader/status');
      set({ status, isLoading: false });
    } catch (error: any) {
      logger.error('Failed to fetch hytale-downloader status:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  // ==========================================
  // Binary Management
  // ==========================================

  installBinary: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRequest<{ success: boolean; status: HytaleDownloaderStatus }>(
        '/api/hytale-downloader/install',
        { method: 'POST' }
      );
      set({ status: result.status, isLoading: false });
    } catch (error: any) {
      logger.error('Failed to install hytale-downloader:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateBinary: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await apiRequest<{ success: boolean; status: HytaleDownloaderStatus }>(
        '/api/hytale-downloader/update',
        { method: 'POST' }
      );
      set({ status: result.status, isLoading: false });
    } catch (error: any) {
      logger.error('Failed to update hytale-downloader:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  // ==========================================
  // OAuth Actions
  // ==========================================

  startOAuth: async () => {
    set({ isStartingOAuth: true, error: null, oauthSession: null });
    try {
      // Connect WebSocket first to receive events
      get().connectWebSocket();

      const session = await apiRequest<OAuthSession>(
        '/api/hytale-downloader/auth/start',
        { method: 'POST' }
      );
      set({ oauthSession: session, isStartingOAuth: false });
    } catch (error: any) {
      logger.error('Failed to start OAuth:', error);
      set({ error: error.message, isStartingOAuth: false });
      throw error;
    }
  },

  cancelOAuth: () => {
    const { oauthSession } = get();
    if (oauthSession?.sessionId) {
      apiRequest(`/api/hytale-downloader/auth/cancel/${oauthSession.sessionId}`, { method: 'POST' })
        .catch((e) => logger.warn('Failed to cancel OAuth:', e));
    }
    set({ oauthSession: null });
  },

  clearCredentials: async () => {
    set({ isLoading: true, error: null });
    try {
      await apiRequest('/api/hytale-downloader/auth/clear', { method: 'POST' });
      // Refresh status
      await get().fetchStatus();
      set({ isLoading: false });
    } catch (error: any) {
      logger.error('Failed to clear credentials:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  refreshToken: async () => {
    set({ isRefreshingToken: true, error: null });
    try {
      await apiRequest('/api/hytale-downloader/auth/refresh', { method: 'POST' });
      // Refresh status to get updated token info
      await get().fetchStatus();
      set({ isRefreshingToken: false });
    } catch (error: any) {
      logger.error('Failed to refresh token:', error);
      set({ error: error.message, isRefreshingToken: false });
      throw error;
    }
  },

  // ==========================================
  // Auto-refresh Actions
  // ==========================================

  setAutoRefresh: async (enabled: boolean, intervalSeconds?: number) => {
    set({ isUpdatingAutoRefresh: true, error: null });
    try {
      await apiRequest<{ success: boolean; settings: { enabled: boolean; intervalSeconds: number; lastRefresh: Date | null } }>(
        '/api/hytale-downloader/auth/auto-refresh',
        {
          method: 'POST',
          body: JSON.stringify({ enabled, intervalSeconds }),
        }
      );
      // Refresh status to get updated settings
      await get().fetchStatus();
      set({ isUpdatingAutoRefresh: false });
    } catch (error: any) {
      logger.error('Failed to update auto-refresh settings:', error);
      set({ error: error.message, isUpdatingAutoRefresh: false });
      throw error;
    }
  },

  // ==========================================
  // Download Actions
  // ==========================================

  startDownload: async (destinationPath: string, patchline?: string) => {
    set({ isStartingDownload: true, error: null, downloadSession: null });
    try {
      // Connect WebSocket to receive progress
      get().connectWebSocket();

      const session = await apiRequest<DownloadSession>(
        '/api/hytale-downloader/download',
        {
          method: 'POST',
          body: JSON.stringify({ destinationPath, patchline }),
        }
      );
      set({ downloadSession: session, isStartingDownload: false });
    } catch (error: any) {
      logger.error('Failed to start download:', error);
      set({ error: error.message, isStartingDownload: false });
      throw error;
    }
  },

  cancelDownload: () => {
    const { downloadSession } = get();
    if (downloadSession?.sessionId) {
      apiRequest(`/api/hytale-downloader/download/${downloadSession.sessionId}/cancel`, { method: 'POST' })
        .catch((e) => logger.warn('Failed to cancel download:', e));
    }
    set({ downloadSession: null });
  },

  // ==========================================
  // Version Actions
  // ==========================================

  checkVersion: async (patchline?: string) => {
    set({ isCheckingVersion: true, error: null });
    try {
      const params = patchline ? `?patchline=${patchline}` : '';
      const version = await apiRequest<GameVersionInfo>(`/api/hytale-downloader/versions${params}`);
      set({ gameVersion: version, isCheckingVersion: false });
    } catch (error: any) {
      logger.error('Failed to check version:', error);
      set({ error: error.message, isCheckingVersion: false });
    }
  },

  // ==========================================
  // WebSocket Actions
  // ==========================================

  connectWebSocket: () => {
    const { socket, isConnected } = get();

    if (socket && isConnected) {
      return; // Already connected
    }

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    logger.debug('Connecting to hytale-downloader WebSocket');

    const newSocket = io(`${env.websocket.url}/hytale-downloader`, {
      withCredentials: true,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      logger.info('Hytale downloader WebSocket connected');
      set({ isConnected: true });
      newSocket.emit('subscribe');
    });

    newSocket.on('disconnect', () => {
      logger.info('Hytale downloader WebSocket disconnected');
      set({ isConnected: false });
    });

    // OAuth events
    newSocket.on('oauth:device-code', (data: any) => {
      logger.debug('Received oauth:device-code', data);
      set((state) => ({
        oauthSession: state.oauthSession
          ? {
              ...state.oauthSession,
              deviceCode: data.deviceCode,
              verificationUrl: data.verificationUrl,
              expiresAt: new Date(data.expiresAt),
              status: 'polling',
            }
          : {
              sessionId: data.sessionId,
              deviceCode: data.deviceCode,
              verificationUrl: data.verificationUrl,
              expiresAt: new Date(data.expiresAt),
              status: 'polling',
            },
      }));
    });

    newSocket.on('oauth:status', (data: any) => {
      logger.debug('Received oauth:status', data);
      set((state) => {
        if (!state.oauthSession || state.oauthSession.sessionId !== data.sessionId) {
          return state;
        }
        return {
          oauthSession: {
            ...state.oauthSession,
            status: data.status,
            error: data.error,
          },
        };
      });

      // Refresh status on completion
      if (data.status === 'completed') {
        get().fetchStatus();
      }
    });

    // Download events
    newSocket.on('download:progress', (data: any) => {
      set((state) => {
        if (!state.downloadSession || state.downloadSession.sessionId !== data.sessionId) {
          return state;
        }
        return {
          downloadSession: {
            ...state.downloadSession,
            status: data.status,
            progress: data.progress,
            bytesDownloaded: data.bytesDownloaded,
            totalBytes: data.totalBytes,
            speed: data.speed,
          },
        };
      });
    });

    newSocket.on('download:complete', (data: any) => {
      logger.info('Download complete', data);
      set((state) => {
        if (!state.downloadSession || state.downloadSession.sessionId !== data.sessionId) {
          return state;
        }
        return {
          downloadSession: {
            ...state.downloadSession,
            status: 'complete',
            progress: 100,
          },
        };
      });
    });

    newSocket.on('download:error', (data: any) => {
      logger.error('Download error', data);
      set((state) => {
        if (!state.downloadSession || state.downloadSession.sessionId !== data.sessionId) {
          return state;
        }
        return {
          downloadSession: {
            ...state.downloadSession,
            status: 'failed',
            error: data.error,
          },
        };
      });
    });

    set({ socket: newSocket });
  },

  disconnectWebSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.emit('unsubscribe');
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  // ==========================================
  // Reset
  // ==========================================

  reset: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
    }
    set(initialState);
  },
}));

// Selector hooks for convenience
export const useHytaleDownloaderStatus = () => useHytaleDownloaderStore((s) => s.status);
export const useHytaleDownloaderOAuth = () => useHytaleDownloaderStore((s) => s.oauthSession);
export const useHytaleDownloaderDownload = () => useHytaleDownloaderStore((s) => s.downloadSession);
export const useHytaleDownloaderLoading = () => useHytaleDownloaderStore((s) => s.isLoading);
export const useHytaleDownloaderError = () => useHytaleDownloaderStore((s) => s.error);
