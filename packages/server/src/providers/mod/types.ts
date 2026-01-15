/**
 * Multi-Provider Mod System - Unified Types
 *
 * These types provide a common interface for all mod providers,
 * allowing the system to work with different APIs (Modtale, CurseForge, etc.)
 * through a unified abstraction.
 */

// ==========================================
// Configuration
// ==========================================

export interface ProviderConfig {
  apiKey?: string;
  rateLimit?: number;
  timeout?: number;
}

export interface ProviderInfo {
  id: string;
  displayName: string;
  iconUrl?: string;
  requiresApiKey: boolean;
  isConfigured: boolean;
  description?: string;
}

// ==========================================
// Unified Project/Mod Types
// ==========================================

export interface UnifiedAuthor {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
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
  iconUrl?: string;
}

export interface UnifiedDependency {
  projectId: string;
  projectName: string;
  versionId?: string;
  required: boolean;
  type: 'required' | 'optional' | 'incompatible' | 'embedded';
}

export type UnifiedClassification = 'PLUGIN' | 'DATA' | 'ART' | 'SAVE' | 'MODPACK';

export interface UnifiedProject {
  // Core identification
  id: string;
  slug: string;
  providerId: string;

  // Basic info
  title: string;
  description: string;
  shortDescription?: string;
  classification: UnifiedClassification;

  // Author
  author: UnifiedAuthor;

  // Categorization
  categories: UnifiedCategory[];
  tags?: { id: string; name: string; slug: string }[];

  // Stats
  downloads: number;
  rating?: number;
  ratingCount?: number;
  followers?: number;

  // Media
  iconUrl?: string;
  bannerUrl?: string;
  galleryImages?: string[];

  // Versions
  versions: UnifiedVersion[];
  latestVersion?: UnifiedVersion;
  gameVersions: string[];

  // Metadata
  createdAt: string;
  updatedAt: string;
  featured?: boolean;

  // Provider-specific raw data (for edge cases)
  _raw?: unknown;
}

// ==========================================
// Search Types
// ==========================================

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

// ==========================================
// Multi-Provider Search
// ==========================================

export interface MultiProviderSearchResponse {
  results: UnifiedSearchResponse[];
  totalAcrossProviders: number;
}

// ==========================================
// Installation Metadata
// ==========================================

export interface UnifiedModMetadata {
  providerId: string;
  projectId: string;
  projectTitle: string;
  projectIconUrl?: string;
  versionId: string;
  versionName: string;
  classification: UnifiedClassification;
  fileSize?: number;
  fileHash?: string;
}
