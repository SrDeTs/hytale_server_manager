// Modtale API Types based on official API documentation
// https://modtale.net/api-docs

export type ModtaleClassification = 'PLUGIN' | 'DATA' | 'ART' | 'SAVE' | 'MODPACK';

export interface ModtaleTag {
  id: string;
  name: string;
  slug: string;
}

export interface ModtaleAuthor {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}

export interface ModtaleVersion {
  id: string;
  version: string;
  changelog?: string;
  downloads: number;
  gameVersion: string;
  createdAt: string;
  fileSize: number;
  fileName: string;
  dependencies?: ModtaleDependency[];
}

export interface ModtaleDependency {
  projectId: string;
  projectName: string;
  versionId?: string;
  required: boolean;
}

export interface ModtaleProject {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string;
  classification: ModtaleClassification;
  author: ModtaleAuthor;
  tags: ModtaleTag[];
  downloads: number;
  rating: number;
  ratingCount: number;
  iconUrl?: string;
  bannerUrl?: string;
  galleryImages?: string[];
  versions: ModtaleVersion[];
  latestVersion: ModtaleVersion;
  gameVersions: string[];
  createdAt: string;
  updatedAt: string;
  featured: boolean;
}

export interface ModtaleSearchParams {
  query?: string;
  classification?: ModtaleClassification;
  tags?: string[];
  gameVersion?: string;
  minRating?: number;
  maxRating?: number;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'downloads' | 'rating' | 'updated' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface ModtaleSearchResponse {
  projects: ModtaleProject[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ModtaleUser {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  createdAt: string;
  followers: number;
  following: number;
}

export interface ModtaleNotification {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: Record<string, any>;
}

export interface ModtaleApiError {
  error: string;
  message: string;
  statusCode: number;
}
