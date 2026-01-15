/**
 * Authentication Service
 *
 * Provides JWT-based authentication with token management, refresh logic,
 * and secure token storage.
 *
 * @module services/auth
 */

import * as jose from 'jose';
import { env, logger } from '../config';
import type { User, UserRole } from '../types';

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  /** User ID */
  sub: string;
  /** User email */
  email: string;
  /** Username */
  username: string;
  /** User role */
  role: UserRole;
  /** Token issued at timestamp */
  iat: number;
  /** Token expiration timestamp */
  exp: number;
  /** Token type (access or refresh) */
  type: 'access' | 'refresh';
}

/**
 * Authentication response from the API
 * Note: Tokens are stored in httpOnly cookies AND returned in response body
 * (the body token is used for WebSocket authentication since WebSockets can't access httpOnly cookies)
 */
export interface AuthResponse {
  /** User information */
  user: User;
  /** Token expiration in seconds */
  expiresIn: number;
  /** Access token for WebSocket authentication */
  accessToken?: string;
}

/**
 * Initial setup status response
 */
export interface SetupStatusResponse {
  setupRequired: boolean;
}

/**
 * Initial admin setup request
 */
export interface SetupAdminRequest {
  email: string;
  username: string;
  password: string;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  /** Username or email address */
  identifier: string;
  password: string;
  /** Remember me - extends session duration */
  rememberMe?: boolean;
}

/**
 * @deprecated Use LoginCredentials with identifier instead
 */
export interface LegacyLoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Token validation result
 */
export interface TokenValidation {
  valid: boolean;
  expired: boolean;
  payload: JWTPayload | null;
  error?: string;
}

/**
 * Authentication error code types
 */
export type AuthErrorCode = 'INVALID_CREDENTIALS' | 'TOKEN_EXPIRED' | 'TOKEN_INVALID' | 'NETWORK_ERROR' | 'UNAUTHORIZED' | 'SERVER_ERROR' | 'PASSWORD_MISMATCH';

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Authentication error class
 */
export class AuthError extends Error {
  code: AuthErrorCode;
  statusCode?: number;

  constructor(
    message: string,
    code: AuthErrorCode,
    statusCode?: number
  ) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Default admin username (reserved for initial setup guidance)
 */
export const DEFAULT_ADMIN_USERNAME = 'admin';

/**
 * Authentication Service Class
 *
 * Handles all authentication-related operations including login, logout,
 * token management, and session handling.
 */
class AuthService {
  private refreshPromise: Promise<AuthResponse> | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Checks whether the initial admin setup is required
   */
  async getSetupStatus(): Promise<SetupStatusResponse> {
    try {
      const response = await fetch(`${env.api.baseUrl}/api/auth/setup`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: env.api.withCredentials ? 'include' : 'same-origin',
      });

      if (!response.ok) {
        throw new AuthError('Failed to load setup status', 'SERVER_ERROR', response.status);
      }

      return response.json() as Promise<SetupStatusResponse>;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Setup status error:', error);
      throw new AuthError('Network error. Please check your connection.', 'NETWORK_ERROR');
    }
  }

  /**
   * Creates the initial admin account
   */
  async createInitialAdmin(request: SetupAdminRequest): Promise<{ message: string }> {
    try {
      const response = await fetch(`${env.api.baseUrl}/api/auth/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: env.api.withCredentials ? 'include' : 'same-origin',
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Setup failed' }));
        throw new AuthError(
          error.message || 'Setup failed',
          'SERVER_ERROR',
          response.status
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Initial admin setup error:', error);
      throw new AuthError('Network error. Please check your connection.', 'NETWORK_ERROR');
    }
  }

  /**
   * Authenticates a user with username/email and password
   *
   * @param credentials - Login credentials
   * @returns Authentication response with tokens and user info
   * @throws AuthError if authentication fails
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    logger.info('Attempting login for:', credentials.identifier);

    try {
      const response = await fetch(`${env.api.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: env.api.withCredentials ? 'include' : 'same-origin',
        body: JSON.stringify({
          identifier: credentials.identifier,
          password: credentials.password,
          rememberMe: credentials.rememberMe,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));

        if (response.status === 401) {
          throw new AuthError(
            error.message || 'Invalid email or password',
            'INVALID_CREDENTIALS',
            401
          );
        }

        throw new AuthError(
          error.message || 'Login failed',
          'SERVER_ERROR',
          response.status
        );
      }

      const data: AuthResponse = await response.json();

      // Tokens are stored in httpOnly cookies by the server
      // Also store access token in localStorage for WebSocket authentication
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }

      // Schedule refresh based on expiry time
      this.scheduleTokenRefresh(data.expiresIn);

      logger.info('Login successful for:', credentials.identifier);
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Login error:', error);
      throw new AuthError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR'
      );
    }
  }

  /**
   * Logs out the current user
   *
   * @param options - Logout options
   */
  async logout(options: { callApi?: boolean } = { callApi: true }): Promise<void> {
    logger.info('Logging out user');

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    if (options.callApi) {
      try {
        // Server will clear httpOnly cookies
        await fetch(`${env.api.baseUrl}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Always include cookies
        });
      } catch (error) {
        // Log but don't throw - logout should complete even if API fails
        logger.warn('Logout API call failed:', error);
      }
    }

    // Clear access token from localStorage (used for WebSocket auth)
    localStorage.removeItem('accessToken');
  }

  /**
   * Refreshes the access token using the refresh token
   *
   * @returns New authentication response
   * @throws AuthError if refresh fails
   */
  async refreshAccessToken(): Promise<AuthResponse> {
    // Prevent concurrent refresh requests
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();

    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Internal token refresh implementation
   * Refresh token is sent via httpOnly cookie automatically
   */
  private async doRefreshToken(): Promise<AuthResponse> {
    logger.debug('Refreshing access token');

    try {
      const response = await fetch(`${env.api.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Always include cookies for refresh
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new AuthError('Session expired. Please login again.', 'TOKEN_EXPIRED', 401);
        }

        throw new AuthError('Token refresh failed', 'SERVER_ERROR', response.status);
      }

      const data: AuthResponse = await response.json();

      // Tokens are stored in httpOnly cookies by the server
      // Also store access token in localStorage for WebSocket authentication
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }

      this.scheduleTokenRefresh(data.expiresIn);

      logger.debug('Token refreshed successfully');
      return data;
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Token refresh error:', error);
      throw new AuthError('Network error during token refresh', 'NETWORK_ERROR');
    }
  }

  /**
   * Validates a JWT token
   *
   * @param token - Token to validate
   * @returns Validation result
   */
  async validateToken(token: string): Promise<TokenValidation> {
    try {
      // Decode without verification (verification happens server-side)
      const decoded = jose.decodeJwt(token) as JWTPayload;
      const now = Math.floor(Date.now() / 1000);

      if (decoded.exp && decoded.exp < now) {
        return {
          valid: false,
          expired: true,
          payload: decoded,
          error: 'Token has expired',
        };
      }

      return {
        valid: true,
        expired: false,
        payload: decoded,
      };
    } catch (error) {
      logger.debug('Token validation failed:', error);
      return {
        valid: false,
        expired: false,
        payload: null,
        error: error instanceof Error ? error.message : 'Invalid token',
      };
    }
  }

  /**
   * Gets the current access token
   * Note: With httpOnly cookies, the frontend cannot access the actual token.
   * This method returns null as tokens are managed via cookies.
   *
   * @returns null (tokens are in httpOnly cookies)
   * @deprecated Tokens are now stored in httpOnly cookies
   */
  getAccessToken(): string | null {
    // Tokens are now stored in httpOnly cookies - frontend can't read them
    // Return null, but the cookie will be sent with requests automatically
    return null;
  }

  /**
   * Gets the current refresh token
   * Note: With httpOnly cookies, the frontend cannot access the actual token.
   *
   * @returns null (tokens are in httpOnly cookies)
   * @deprecated Tokens are now stored in httpOnly cookies
   */
  getRefreshToken(): string | null {
    // Tokens are now stored in httpOnly cookies - frontend can't read them
    return null;
  }

  /**
   * Schedules automatic token refresh
   *
   * @param expiresIn - Token expiration time in seconds
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    // Refresh when less than threshold time remains
    const refreshIn = Math.max(
      (expiresIn - env.auth.refreshThreshold) * 1000,
      60000 // Minimum 1 minute
    );

    logger.debug(`Scheduling token refresh in ${refreshIn / 1000} seconds`);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshAccessToken();
      } catch (error) {
        logger.error('Automatic token refresh failed:', error);
        // Token refresh failed - user will need to login again on next API call
      }
    }, refreshIn);
  }

  /**
   * Checks if the current session is valid by making an API call
   * With httpOnly cookies, we can't check the token directly
   *
   * @returns True if session is valid
   */
  async isSessionValid(): Promise<boolean> {
    try {
      // Try to refresh the token - this will fail if session is invalid
      await this.refreshAccessToken();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the current user by making an API call
   * With httpOnly cookies, we can't read the token directly
   *
   * @returns User object or null if not authenticated
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.refreshAccessToken();
      return response.user;
    } catch {
      return null;
    }
  }

  /**
   * Checks if the current user has a specific role
   *
   * @param requiredRole - Role to check for
   * @returns True if user has the required role
   */
  async hasRole(requiredRole: UserRole): Promise<boolean> {
    const user = await this.getCurrentUser();

    if (!user) {
      return false;
    }

    // Role hierarchy: admin > moderator > viewer
    const roleHierarchy: Record<UserRole, number> = {
      admin: 3,
      moderator: 2,
      viewer: 1,
    };

    return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
  }

  /**
   * Changes the current user's password
   *
   * @param request - Change password request with current and new password
   * @returns Success status
   * @throws AuthError if password change fails
   */
  async changePassword(request: ChangePasswordRequest): Promise<{ success: boolean; message: string }> {
    logger.info('Attempting password change');

    // Validate passwords match
    if (request.newPassword !== request.confirmPassword) {
      throw new AuthError('New passwords do not match', 'PASSWORD_MISMATCH');
    }

    // Validate password strength
    if (request.newPassword.length < 8) {
      throw new AuthError('Password must be at least 8 characters long', 'INVALID_CREDENTIALS');
    }

    if (request.newPassword === request.currentPassword) {
      throw new AuthError('New password must be different from current password', 'INVALID_CREDENTIALS');
    }

    try {
      // Auth is handled via httpOnly cookies - they're sent automatically with credentials: 'include'
      const response = await fetch(`${env.api.baseUrl}/api/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Always include cookies for authenticated requests
        body: JSON.stringify({
          currentPassword: request.currentPassword,
          newPassword: request.newPassword,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Password change failed' }));

        if (response.status === 401) {
          throw new AuthError(
            error.message || 'Current password is incorrect',
            'INVALID_CREDENTIALS',
            401
          );
        }

        throw new AuthError(
          error.message || 'Password change failed',
          'SERVER_ERROR',
          response.status
        );
      }

      logger.info('Password changed successfully');
      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }

      logger.error('Password change error:', error);
      throw new AuthError(
        'Network error. Please check your connection.',
        'NETWORK_ERROR'
      );
    }
  }
}

/**
 * Singleton authentication service instance
 */
export const authService = new AuthService();

export default authService;
