/**
 * Auth Store Tests
 *
 * Tests for the authentication Zustand store.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAuthStore } from '../authStore';
import { authService } from '../../services/auth';

// Mock the auth service
vi.mock('../../services/auth', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshAccessToken: vi.fn(),
    isSessionValid: vi.fn(),
    getCurrentUser: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    getSetupStatus: vi.fn(),
  },
  AuthError: class AuthError extends Error {
    code: string;
    statusCode?: number;
    constructor(message: string, code: string, statusCode?: number) {
      super(message);
      this.name = 'AuthError';
      this.code = code;
      this.statusCode = statusCode;
    }
  },
}));

// Mock config
vi.mock('../../config', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  env: {
    isDevelopment: true,
  },
}));

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the store state
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isInitializing: true,
      setupRequired: null,
      isSetupLoading: true,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();

      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isInitializing).toBe(true);
      expect(state.setupRequired).toBeNull();
      expect(state.isSetupLoading).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    const mockUser = {
      id: 'user-001',
      email: 'test@example.com',
      username: 'testuser',
      role: 'admin' as const,
    };

    const mockAuthResponse = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      user: mockUser,
      expiresIn: 3600,
    };

    it('should login successfully', async () => {
      vi.mocked(authService.login).mockResolvedValueOnce(mockAuthResponse);

      const { login } = useAuthStore.getState();
      const result = await login({ identifier: 'test@example.com', password: 'password' });

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set loading state during login', async () => {
      let resolveLogin: (value: typeof mockAuthResponse) => void;
      const loginPromise = new Promise<typeof mockAuthResponse>((resolve) => {
        resolveLogin = resolve;
      });

      vi.mocked(authService.login).mockReturnValueOnce(loginPromise);

      const { login } = useAuthStore.getState();
      const loginResultPromise = login({ identifier: 'test@example.com', password: 'password' });

      // Check loading state
      expect(useAuthStore.getState().isLoading).toBe(true);

      // Resolve login
      resolveLogin!(mockAuthResponse);
      await loginResultPromise;

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('should handle login failure', async () => {
      const error = new Error('Invalid credentials');
      vi.mocked(authService.login).mockRejectedValueOnce(error);

      const { login } = useAuthStore.getState();
      const result = await login({ identifier: 'test@example.com', password: 'wrong' });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Set up logged in state
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', username: 'test', role: 'admin' },
        isAuthenticated: true,
      });

      vi.mocked(authService.logout).mockResolvedValueOnce(undefined);

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should still clear state even if logout API fails', async () => {
      useAuthStore.setState({
        user: { id: '1', email: 'test@example.com', username: 'test', role: 'admin' },
        isAuthenticated: true,
      });

      vi.mocked(authService.logout).mockRejectedValueOnce(new Error('Network error'));

      const { logout } = useAuthStore.getState();
      await logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('should return true and update state for valid session', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'test',
        role: 'admin' as const,
      };

      vi.mocked(authService.isSessionValid).mockResolvedValueOnce(true);
      vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser);

      const { checkAuth } = useAuthStore.getState();
      const result = await checkAuth();

      expect(result).toBe(true);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('should return false for invalid session', async () => {
      vi.mocked(authService.isSessionValid).mockResolvedValueOnce(false);

      const { checkAuth } = useAuthStore.getState();
      const result = await checkAuth();

      expect(result).toBe(false);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize with valid session', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        username: 'test',
        role: 'admin' as const,
      };

      vi.mocked(authService.getSetupStatus).mockResolvedValueOnce({ setupRequired: false });
      vi.mocked(authService.isSessionValid).mockResolvedValueOnce(true);
      vi.mocked(authService.getCurrentUser).mockResolvedValueOnce(mockUser);

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
      expect(state.setupRequired).toBe(false);
      expect(state.isSetupLoading).toBe(false);
    });

    it('should initialize with no session', async () => {
      vi.mocked(authService.getSetupStatus).mockResolvedValueOnce({ setupRequired: false });
      vi.mocked(authService.isSessionValid).mockResolvedValueOnce(false);

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.setupRequired).toBe(false);
      expect(state.isSetupLoading).toBe(false);
    });

    it('should handle initialization error', async () => {
      vi.mocked(authService.getSetupStatus).mockRejectedValueOnce(new Error('Network error'));
      vi.mocked(authService.isSessionValid).mockRejectedValueOnce(new Error('Network error'));

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.setupRequired).toBe(false);
      expect(state.isSetupLoading).toBe(false);
    });

    it('should initialize with setup required', async () => {
      vi.mocked(authService.getSetupStatus).mockResolvedValueOnce({ setupRequired: true });

      const { initialize } = useAuthStore.getState();
      await initialize();

      const state = useAuthStore.getState();
      expect(state.isInitializing).toBe(false);
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.setupRequired).toBe(true);
      expect(state.isSetupLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error state', () => {
      useAuthStore.setState({ error: 'Some error' });

      const { clearError } = useAuthStore.getState();
      clearError();

      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});
