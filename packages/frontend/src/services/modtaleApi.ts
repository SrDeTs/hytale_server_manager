/**
 * Modtale API Service
 *
 * Official API documentation: https://modtale.net/api-docs
 *
 * Rate Limits:
 * - Enterprise: 1,000 req/min per IP
 * - Standard/Personal: 60 req/min per IP
 *
 * Authentication:
 * - API Key required in header: X-MODTALE-KEY
 */

import type {
  ModtaleProject,
  ModtaleSearchParams,
  ModtaleSearchResponse,
  ModtaleTag,
  ModtaleClassification,
  ModtaleVersion,
  ModtaleDependency,
  ModtaleUser,
  ModtaleNotification,
} from '../types/modtale';
import { authService } from './auth';

const MODTALE_API_BASE = '/api/modtale';
const DEFAULT_LIMIT = 20;

// API Key is now managed on the backend
let API_KEY = import.meta.env.VITE_MODTALE_API_KEY || '';

export const setModtaleApiKey = async (key: string) => {
  API_KEY = key;
  // Send API key to backend with auth token
  const token = authService.getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch('/api/modtale/set-key', {
    method: 'POST',
    headers,
    body: JSON.stringify({ apiKey: key }),
  });

  if (!response.ok) {
    throw new Error('Failed to configure API key on backend');
  }
};

export const getModtaleApiKey = () => API_KEY;

export class ModtaleApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ModtaleApiError';
  }
}

/**
 * Make authenticated request to Modtale API via backend proxy
 */
async function fetchModtale<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_KEY) {
    throw new Error('Modtale API key not configured. Please set your API key in Settings.');
  }

  const url = `${MODTALE_API_BASE}${endpoint}`;

  const headers: Record<string, string> = {};

  // Add auth token
  const token = authService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only add Content-Type for requests with a body (POST, PUT, PATCH)
  if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Modtale API] Error response:', errorText);

    let error: any;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = {
        error: 'Unknown Error',
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      };
    }
    throw new ModtaleApiError(error.statusCode || response.status, error.message || errorText);
  }

  const data = await response.json();
  return data;
}

/**
 * Build query string from search parameters
 */
function buildSearchQuery(params: ModtaleSearchParams): string {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.append('q', params.query);
  if (params.classification) queryParams.append('classification', params.classification);
  if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
  if (params.gameVersion) queryParams.append('gameVersion', params.gameVersion);
  if (params.minRating !== undefined) queryParams.append('minRating', params.minRating.toString());
  if (params.maxRating !== undefined) queryParams.append('maxRating', params.maxRating.toString());
  if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
  if (params.dateTo) queryParams.append('dateTo', params.dateTo);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  return queryParams.toString();
}

/**
 * Search for mods and modpacks
 */
export async function searchProjects(
  params: ModtaleSearchParams = {}
): Promise<ModtaleSearchResponse> {
  const query = buildSearchQuery({ ...params, limit: params.limit || DEFAULT_LIMIT });
  const endpoint = `/projects${query ? `?${query}` : ''}`;

  const response = await fetchModtale<any>(endpoint);

  // Handle different response formats
  // If the API returns an array directly, wrap it
  if (Array.isArray(response)) {
    const page = params.page || 1;
    const limit = params.limit || DEFAULT_LIMIT;
    return {
      projects: response,
      total: response.length,
      page,
      limit,
      hasMore: response.length >= limit,
    };
  }

  // If the API returns an object with projects array
  if (response && typeof response === 'object' && 'projects' in response) {
    return response as ModtaleSearchResponse;
  }

  // If the API returns an object but not in expected format
  return {
    projects: [],
    total: 0,
    page: params.page || 1,
    limit: params.limit || DEFAULT_LIMIT,
    hasMore: false,
  };
}

/**
 * Get all available tags/categories
 */
export async function getTags(): Promise<ModtaleTag[]> {
  return fetchModtale<ModtaleTag[]>('/tags');
}

/**
 * Get all classification types
 */
export async function getClassifications(): Promise<ModtaleClassification[]> {
  return fetchModtale<ModtaleClassification[]>('/meta/classifications');
}

/**
 * Get project by ID
 */
export async function getProject(id: string): Promise<ModtaleProject> {
  return fetchModtale<ModtaleProject>(`/projects/${id}`);
}

/**
 * Get project by slug
 */
export async function getProjectBySlug(slug: string): Promise<ModtaleProject> {
  return fetchModtale<ModtaleProject>(`/projects/slug/${slug}`);
}

/**
 * Get all versions for a project
 */
export async function getProjectVersions(projectId: string): Promise<ModtaleVersion[]> {
  const project = await getProject(projectId);
  return project.versions;
}

/**
 * Get specific version of a project
 */
export async function getProjectVersion(
  projectId: string,
  versionId: string
): Promise<ModtaleVersion> {
  const versions = await getProjectVersions(projectId);
  const version = versions.find(v => v.id === versionId);
  if (!version) {
    throw new Error(`Version ${versionId} not found for project ${projectId}`);
  }
  return version;
}

/**
 * Get dependencies for a specific version
 */
export async function getVersionDependencies(
  projectId: string,
  versionId: string
): Promise<ModtaleDependency[]> {
  return fetchModtale<ModtaleDependency[]>(
    `/projects/${projectId}/versions/${versionId}/dependencies`
  );
}

/**
 * Get download URL for a specific version (via backend proxy)
 */
export function getDownloadUrl(projectId: string, versionId: string): string {
  return `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionId}/download`;
}

/**
 * Download a mod/modpack file via backend proxy
 * Returns the blob for download handling
 */
export async function downloadProject(
  projectId: string,
  versionId: string
): Promise<Blob> {
  if (!API_KEY) {
    throw new Error('Modtale API key not configured');
  }

  const url = getDownloadUrl(projectId, versionId);
  const response = await fetch(url);

  if (!response.ok) {
    throw new ModtaleApiError(response.status, `Download failed: ${response.statusText}`);
  }

  return response.blob();
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<ModtaleUser> {
  return fetchModtale<ModtaleUser>('/user/me');
}

/**
 * Get user notifications
 */
export async function getNotifications(): Promise<ModtaleNotification[]> {
  return fetchModtale<ModtaleNotification[]>('/notifications');
}

/**
 * Follow a user
 */
export async function followUser(username: string): Promise<void> {
  await fetchModtale(`/user/follow/${username}`, { method: 'POST' });
}

/**
 * Unfollow a user
 */
export async function unfollowUser(username: string): Promise<void> {
  await fetchModtale(`/user/follow/${username}`, { method: 'DELETE' });
}

/**
 * Create a new project (for future use)
 */
export async function createProject(data: {
  title: string;
  description: string;
  version: string;
  tags: string[];
  gameVersion: string;
  classification: ModtaleClassification;
}): Promise<ModtaleProject> {
  return fetchModtale<ModtaleProject>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update a project (for future use)
 */
export async function updateProject(
  projectId: string,
  data: Partial<{
    title: string;
    description: string;
    tags: string[];
  }>
): Promise<ModtaleProject> {
  return fetchModtale<ModtaleProject>(`/projects/${projectId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete a project (for future use)
 */
export async function deleteProject(projectId: string): Promise<void> {
  await fetchModtale(`/projects/${projectId}`, { method: 'DELETE' });
}

// Cache for tags and classifications (rarely change)
let tagsCache: ModtaleTag[] | null = null;
let classificationsCache: ModtaleClassification[] | null = null;

/**
 * Get tags with caching
 */
export async function getCachedTags(): Promise<ModtaleTag[]> {
  if (tagsCache) return tagsCache;
  tagsCache = await getTags();
  return tagsCache;
}

/**
 * Get classifications with caching
 */
export async function getCachedClassifications(): Promise<ModtaleClassification[]> {
  if (classificationsCache) return classificationsCache;
  classificationsCache = await getClassifications();
  return classificationsCache;
}

/**
 * Clear caches
 */
export function clearCache(): void {
  tagsCache = null;
  classificationsCache = null;
}
