/**
 * Unified Mod Provider API Service
 *
 * Provides a unified interface for interacting with multiple mod providers
 * (Modtale, CurseForge, etc.) through the backend API.
 */

import type {
  ProviderInfo,
  UnifiedProject,
  UnifiedSearchParams,
  UnifiedSearchResponse,
  MultiProviderSearchResponse,
  UnifiedCategory,
  UnifiedDependency,
} from '../types/modProvider';
import { authService } from './auth';

const API_BASE = '/api/mods';

export class ModProviderApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ModProviderApiError';
  }
}

/**
 * Make authenticated request to the mod provider API
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const headers: Record<string, string> = {};

  // Add auth token
  const token = authService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only add Content-Type for requests with a body
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
    console.error('[ModProvider API] Error response:', errorText);

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
    throw new ModProviderApiError(error.statusCode || response.status, error.message || errorText);
  }

  const data = await response.json();
  return data;
}

/**
 * Build query string from search parameters
 */
function buildSearchQuery(params: UnifiedSearchParams): string {
  const queryParams = new URLSearchParams();

  if (params.query) queryParams.append('q', params.query);
  if (params.classification) queryParams.append('classification', params.classification);
  if (params.categories?.length) queryParams.append('categories', params.categories.join(','));
  if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
  if (params.gameVersion) queryParams.append('gameVersion', params.gameVersion);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
  if (params.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

  return queryParams.toString();
}

// ============================================
// Provider Management
// ============================================

/**
 * Get list of all available mod providers with their status
 */
export async function getProviders(): Promise<ProviderInfo[]> {
  return fetchApi<ProviderInfo[]>('/providers');
}

/**
 * Configure API key for a specific provider
 */
export async function configureProvider(providerId: string, apiKey: string): Promise<void> {
  await fetchApi(`/providers/${providerId}/configure`, {
    method: 'POST',
    body: JSON.stringify({ apiKey }),
  });
}

// ============================================
// Search & Browse
// ============================================

/**
 * Search for projects in a specific provider
 */
export async function searchProvider(
  providerId: string,
  params: UnifiedSearchParams = {}
): Promise<UnifiedSearchResponse> {
  const query = buildSearchQuery(params);
  return fetchApi<UnifiedSearchResponse>(
    `/providers/${providerId}/search${query ? `?${query}` : ''}`
  );
}

/**
 * Search across all configured providers
 */
export async function searchAllProviders(
  params: UnifiedSearchParams = {}
): Promise<MultiProviderSearchResponse> {
  const query = buildSearchQuery(params);
  return fetchApi<MultiProviderSearchResponse>(`/search${query ? `?${query}` : ''}`);
}

// ============================================
// Project Details
// ============================================

/**
 * Get project details from a specific provider
 */
export async function getProject(
  providerId: string,
  projectId: string
): Promise<UnifiedProject> {
  return fetchApi<UnifiedProject>(`/providers/${providerId}/projects/${projectId}`);
}

/**
 * Get project by slug from a specific provider
 */
export async function getProjectBySlug(
  providerId: string,
  slug: string
): Promise<UnifiedProject> {
  return fetchApi<UnifiedProject>(`/providers/${providerId}/projects/slug/${slug}`);
}

// ============================================
// Categories & Tags
// ============================================

/**
 * Get categories for a specific provider
 */
export async function getCategories(providerId: string): Promise<UnifiedCategory[]> {
  return fetchApi<UnifiedCategory[]>(`/providers/${providerId}/categories`);
}

/**
 * Get tags for a specific provider
 */
export async function getTags(
  providerId: string
): Promise<{ id: string; name: string; slug: string }[]> {
  return fetchApi<{ id: string; name: string; slug: string }[]>(
    `/providers/${providerId}/tags`
  );
}

// ============================================
// Dependencies
// ============================================

/**
 * Get dependencies for a specific version
 */
export async function getVersionDependencies(
  providerId: string,
  projectId: string,
  versionId: string
): Promise<UnifiedDependency[]> {
  return fetchApi<UnifiedDependency[]>(
    `/providers/${providerId}/projects/${projectId}/versions/${versionId}/dependencies`
  );
}

// ============================================
// Downloads
// ============================================

/**
 * Get download URL for a specific version
 */
export function getDownloadUrl(
  providerId: string,
  projectId: string,
  versionId: string
): string {
  return `${API_BASE}/providers/${providerId}/projects/${projectId}/versions/${versionId}/download`;
}

/**
 * Download a mod file from a provider
 * Returns the blob for download handling
 */
export async function downloadProject(
  providerId: string,
  projectId: string,
  versionId: string
): Promise<Blob> {
  const url = getDownloadUrl(providerId, projectId, versionId);

  const headers: Record<string, string> = {};
  const token = authService.getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new ModProviderApiError(response.status, `Download failed: ${response.statusText}`);
  }

  return response.blob();
}

// ============================================
// Caching
// ============================================

// Cache for providers, categories, and tags
let providersCache: ProviderInfo[] | null = null;
const categoriesCache = new Map<string, UnifiedCategory[]>();
const tagsCache = new Map<string, { id: string; name: string; slug: string }[]>();

/**
 * Get providers with caching
 */
export async function getCachedProviders(): Promise<ProviderInfo[]> {
  if (providersCache) return providersCache;
  providersCache = await getProviders();
  return providersCache;
}

/**
 * Get categories with caching
 */
export async function getCachedCategories(providerId: string): Promise<UnifiedCategory[]> {
  if (categoriesCache.has(providerId)) {
    return categoriesCache.get(providerId)!;
  }
  const categories = await getCategories(providerId);
  categoriesCache.set(providerId, categories);
  return categories;
}

/**
 * Get tags with caching
 */
export async function getCachedTags(
  providerId: string
): Promise<{ id: string; name: string; slug: string }[]> {
  if (tagsCache.has(providerId)) {
    return tagsCache.get(providerId)!;
  }
  const tags = await getTags(providerId);
  tagsCache.set(providerId, tags);
  return tags;
}

/**
 * Clear all caches
 */
export function clearCache(): void {
  providersCache = null;
  categoriesCache.clear();
  tagsCache.clear();
}

/**
 * Clear provider cache only (e.g., after configuring API key)
 */
export function clearProvidersCache(): void {
  providersCache = null;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Merge search results from multiple providers into a flat list
 */
export function mergeSearchResults(
  response: MultiProviderSearchResponse
): UnifiedProject[] {
  return response.results.flatMap(r => r.projects);
}

/**
 * Get configured providers only
 */
export async function getConfiguredProviders(): Promise<ProviderInfo[]> {
  const providers = await getCachedProviders();
  return providers.filter(p => p.isConfigured);
}

/**
 * Check if any provider is configured
 */
export async function hasConfiguredProvider(): Promise<boolean> {
  const providers = await getCachedProviders();
  return providers.some(p => p.isConfigured);
}
