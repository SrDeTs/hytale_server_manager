/**
 * Authentication Service Tests
 *
 * Comprehensive tests for the JWT authentication service.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService, AuthError } from '../auth';

// Mock import.meta.env
vi.stubGlobal('import.meta', {
  env: {
    MODE: 'development',
    VITE_API_URL: 'http://localhost:3001',
  },
});

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Helper to create mock JWT token
function createMockJWT(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  }));
  const signature = btoa('mock-signature');
  return `${header}.${body}.${signature}`;
}

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      // Note: tokens are now stored in httpOnly cookies, not returned in response body
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: {
            id: 'user-123',
            email: 'admin@example.com',
            username: 'admin',
            role: 'admin',
          },
          expiresIn: 3600,
        }),
      });

      const result = await authService.login({
        identifier: 'admin@example.com',
        password: 'password123',
      });

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe('admin@example.com');
      expect(result.user.role).toBe('admin');
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw AuthError with invalid credentials (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid email or password' }),
      });

      try {
        await authService.login({
          identifier: 'admin@example.com',
          password: 'wrongpassword',
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('INVALID_CREDENTIALS');
      }
    });

    it('should throw AuthError on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ message: 'Internal server error' }),
      });

      await expect(
        authService.login({
          identifier: 'admin@example.com',
          password: 'password123',
        })
      ).rejects.toThrow(AuthError);
    });

    it('should throw AuthError on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await authService.login({
          identifier: 'admin@example.com',
          password: 'password123',
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AuthError);
        expect((error as AuthError).code).toBe('NETWORK_ERROR');
      }
    });

    it('should call login API with correct credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'admin@example.com', username: 'admin', role: 'admin' },
          expiresIn: 3600,
        }),
      });

      await authService.login({
        identifier: 'admin@example.com',
        password: 'password123',
      });

      // Tokens are now stored in httpOnly cookies by the server
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          credentials: expect.any(String),
        })
      );
    });
  });

  describe('logout', () => {
    it('should call logout API', async () => {
      // Mock logout API call
      mockFetch.mockResolvedValueOnce({ ok: true });

      await authService.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should not throw when logging out', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      await expect(authService.logout()).resolves.not.toThrow();
    });

    it('should complete logout even if API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(authService.logout()).resolves.not.toThrow();
    });
  });

  describe('token management', () => {
    // Note: With httpOnly cookies, tokens are not accessible from JavaScript
    it('should return null for access token (tokens are in httpOnly cookies)', () => {
      expect(authService.getAccessToken()).toBeNull();
    });

    it('should return null for refresh token (tokens are in httpOnly cookies)', () => {
      expect(authService.getRefreshToken()).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should validate a valid token', async () => {
      const mockToken = createMockJWT({
        sub: 'user-123',
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin',
        type: 'access',
      });

      const validation = await authService.validateToken(mockToken);

      expect(validation.valid).toBe(true);
      expect(validation.expired).toBe(false);
      expect(validation.payload).toBeDefined();
    });

    it('should detect expired token', async () => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
      const body = btoa(JSON.stringify({
        sub: 'user-123',
        email: 'admin@example.com',
        username: 'admin',
        role: 'admin',
        type: 'access',
        iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
        exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago (expired)
      }));
      const signature = btoa('mock-signature');
      const expiredToken = `${header}.${body}.${signature}`;

      const validation = await authService.validateToken(expiredToken);

      expect(validation.valid).toBe(false);
      expect(validation.expired).toBe(true);
    });

    it('should reject an invalid token', async () => {
      const validation = await authService.validateToken('invalid-token');

      expect(validation.valid).toBe(false);
      expect(validation.error).toBeDefined();
    });
  });

  describe('isSessionValid', () => {
    // Note: isSessionValid now makes an API call to refresh endpoint to check validity
    it('should return false when session is invalid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid token' }),
      });
      const isValid = await authService.isSessionValid();
      expect(isValid).toBe(false);
    });

    it('should return true for valid session', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'admin@example.com', username: 'admin', role: 'admin' },
          expiresIn: 3600,
        }),
      });

      const isValid = await authService.isSessionValid();
      expect(isValid).toBe(true);
    });
  });

  describe('getCurrentUser', () => {
    // Note: getCurrentUser now makes an API call to get user info
    it('should return null when not logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid token' }),
      });
      const user = await authService.getCurrentUser();
      expect(user).toBeNull();
    });

    it('should return user data when logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'admin@example.com', username: 'admin', role: 'admin' },
          expiresIn: 3600,
        }),
      });

      const user = await authService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.email).toBe('admin@example.com');
    });
  });

  describe('hasRole', () => {
    it('should return false when not logged in', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Invalid token' }),
      });
      const hasRole = await authService.hasRole('admin');
      expect(hasRole).toBe(false);
    });

    it('should check role hierarchy correctly for admin', async () => {
      // Mock 3 API calls for 3 hasRole checks
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'admin@example.com', username: 'admin', role: 'admin' },
          expiresIn: 3600,
        }),
      });

      // Admin should have all roles
      expect(await authService.hasRole('admin')).toBe(true);
      expect(await authService.hasRole('moderator')).toBe(true);
      expect(await authService.hasRole('viewer')).toBe(true);
    });

    it('should check role hierarchy correctly for viewer', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'viewer@example.com', username: 'viewer', role: 'viewer' },
          expiresIn: 3600,
        }),
      });

      // Viewer should only have viewer role
      expect(await authService.hasRole('admin')).toBe(false);
      expect(await authService.hasRole('moderator')).toBe(false);
      expect(await authService.hasRole('viewer')).toBe(true);
    });
  });

  describe('refreshAccessToken', () => {
    // Note: With httpOnly cookies, refresh token is sent automatically via cookie
    it('should refresh token successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { id: 'user-123', email: 'admin@example.com', username: 'admin', role: 'admin' },
          expiresIn: 3600,
        }),
      });

      const result = await authService.refreshAccessToken();

      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.expiresIn).toBe(3600);
    });

    it('should throw error on 401 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ message: 'Session expired' }),
      });

      await expect(authService.refreshAccessToken()).rejects.toThrow(AuthError);
    });
  });

  describe('AuthError', () => {
    it('should create error with correct properties', () => {
      const error = new AuthError('Test error', 'INVALID_CREDENTIALS', 401);

      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INVALID_CREDENTIALS');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthError');
    });
  });
});
