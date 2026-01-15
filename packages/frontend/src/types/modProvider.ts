/**
 * Unified Mod Provider Types
 *
 * These types are used to interact with multiple mod providers
 * (Modtale, CurseForge, etc.) through a unified API.
 */

export type UnifiedClassification = 'PLUGIN' | 'DATA' | 'ART' | 'SAVE' | 'MODPACK';

export interface UnifiedAuthor {
  id: string;
  username: string;
  displayName?: string;
}

export interface UnifiedVersion {
  id: string;
  version: string;
  changelog?: string;
  downloads: number;
  gameVersion: string;
  releaseDate: string;
  fileSize: number;
  fileName: string;
}

export interface UnifiedCategory {
  id: string;
  name: string;
  slug: string;
}

export interface UnifiedDependency {
  projectId: string;
  projectName: string;
  versionId?: string;
  required: boolean;
}

export interface UnifiedProject {
  id: string;
  slug: string;
  providerId: string;
  title: string;
  description: string;
  shortDescription?: string;
  classification: UnifiedClassification;
  author: UnifiedAuthor;
  categories: UnifiedCategory[];
  downloads: number;
  rating?: number;
  ratingCount?: number;
  iconUrl?: string;
  bannerUrl?: string;
  versions: UnifiedVersion[];
  latestVersion?: UnifiedVersion;
  gameVersions: string[];
  createdAt: string;
  updatedAt: string;
  featured?: boolean;
}

export interface UnifiedSearchParams {
  query?: string;
  classification?: UnifiedClassification;
  categories?: string[];
  tags?: string[];
  gameVersion?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'downloads' | 'rating' | 'updated' | 'created' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface UnifiedSearchResponse {
  projects: UnifiedProject[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  providerId: string;
}

export interface MultiProviderSearchResponse {
  results: UnifiedSearchResponse[];
  totalAcrossProviders: number;
}

/**
 * Provider information returned by the API
 */
export interface ProviderInfo {
  id: string;
  displayName: string;
  iconUrl?: string;
  requiresApiKey: boolean;
  isConfigured: boolean;
}

/**
 * Parameters for configuring a provider API key
 */
export interface ConfigureProviderParams {
  apiKey: string;
}

/**
 * Provider status with configuration info
 */
export type ProviderStatus = 'configured' | 'not_configured' | 'error';

/**
 * Combined search results when searching across all providers
 */
export interface CombinedSearchResults {
  projects: UnifiedProject[];
  total: number;
  byProvider: Record<string, {
    count: number;
    hasMore: boolean;
  }>;
}

/**
 * Metadata for installing a mod
 */
export interface UnifiedModMetadata {
  providerId: string;
  projectId: string;
  projectTitle: string;
  projectIconUrl?: string;
  versionId: string;
  versionName: string;
  classification: UnifiedClassification;
  fileSize: number;
  fileHash?: string;
}
