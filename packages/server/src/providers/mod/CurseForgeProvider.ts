import { IModProvider } from './IModProvider';
import {
  ProviderConfig,
  UnifiedProject,
  UnifiedSearchParams,
  UnifiedSearchResponse,
  UnifiedCategory,
  UnifiedDependency,
  UnifiedVersion,
  UnifiedAuthor,
  UnifiedClassification,
} from './types';
import logger from '../../utils/logger';

const CURSEFORGE_API_BASE = 'https://api.curseforge.com';

/**
 * CurseForge API response types
 */
interface CurseForgeGame {
  id: number;
  name: string;
  slug: string;
  dateModified: string;
  assets: {
    iconUrl: string;
    tileUrl: string;
    coverUrl: string;
  };
  status: number;
  apiStatus: number;
}

interface CurseForgeCategory {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  url: string;
  iconUrl: string;
  dateModified: string;
  isClass: boolean;
  classId?: number;
  parentCategoryId?: number;
  displayIndex: number;
}

interface CurseForgeAuthor {
  id: number;
  name: string;
  url: string;
}

interface CurseForgeFile {
  id: number;
  gameId: number;
  modId: number;
  isAvailable: boolean;
  displayName: string;
  fileName: string;
  releaseType: number; // 1=release, 2=beta, 3=alpha
  fileStatus: number;
  hashes: { value: string; algo: number }[];
  fileDate: string;
  fileLength: number;
  downloadCount: number;
  downloadUrl: string | null;
  gameVersions: string[];
  sortableGameVersions: { gameVersionName: string; gameVersionPadded: string; gameVersion: string; gameVersionReleaseDate: string; gameVersionTypeId: number }[];
  dependencies: { modId: number; relationType: number }[];
  exposeAsAlternative?: boolean;
  parentProjectFileId?: number;
  alternateFileId?: number;
  isServerPack?: boolean;
  serverPackFileId?: number;
  fileFingerprint: number;
  modules: { name: string; fingerprint: number }[];
}

interface CurseForgeMod {
  id: number;
  gameId: number;
  name: string;
  slug: string;
  links: {
    websiteUrl: string;
    wikiUrl: string;
    issuesUrl: string;
    sourceUrl: string;
  };
  summary: string;
  status: number;
  downloadCount: number;
  isFeatured: boolean;
  primaryCategoryId: number;
  categories: CurseForgeCategory[];
  classId?: number;
  authors: CurseForgeAuthor[];
  logo: { id: number; modId: number; title: string; description: string; thumbnailUrl: string; url: string } | null;
  screenshots: { id: number; modId: number; title: string; description: string; thumbnailUrl: string; url: string }[];
  mainFileId: number;
  latestFiles: CurseForgeFile[];
  latestFilesIndexes: { gameVersion: string; fileId: number; filename: string; releaseType: number; gameVersionTypeId?: number; modLoader?: number }[];
  dateCreated: string;
  dateModified: string;
  dateReleased: string;
  allowModDistribution: boolean | null;
  gamePopularityRank: number;
  isAvailable: boolean;
  thumbsUpCount: number;
  rating?: number;
}

interface CurseForgePagination {
  index: number;
  pageSize: number;
  resultCount: number;
  totalCount: number;
}

/**
 * CurseForge mod provider implementation.
 */
export class CurseForgeProvider implements IModProvider {
  readonly id = 'curseforge';
  readonly displayName = 'CurseForge';
  readonly iconUrl = 'https://www.curseforge.com/favicon.ico';
  readonly requiresApiKey = true;

  private apiKey: string | null = null;
  private hytaleGameId: number | null = null;
  private categories: CurseForgeCategory[] = [];
  private classificationMap: Map<number, UnifiedClassification> = new Map();

  // Known Hytale game ID on CurseForge (fallback if not found in games list)
  private static readonly HYTALE_GAME_ID = 70216;

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.apiKey) {
      this.apiKey = config.apiKey;
      await this.discoverHytaleGame();
    }
    logger.info(`[CurseForgeProvider] Initialized${this.apiKey ? ' with API key' : ''}`);
  }

  isConfigured(): boolean {
    // Only require API key - hytaleGameId will be discovered on first use if not already set
    return !!this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    // Re-discover Hytale game ID when API key changes
    this.discoverHytaleGame().catch((err) => {
      logger.error('[CurseForgeProvider] Failed to discover Hytale game:', err);
    });
    logger.info('[CurseForgeProvider] API key updated');
  }

  /**
   * Make a request to the CurseForge API.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('CurseForge API key not configured');
    }

    const url = `${CURSEFORGE_API_BASE}${endpoint}`;
    logger.info(`[CurseForgeProvider] Fetching: ${url}`);

    const response = await fetch(url, {
      ...options,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[CurseForgeProvider] Error response: ${errorText.substring(0, 500)}`);
      throw new Error(`CurseForge API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data as T;
  }

  /**
   * Discover Hytale's game ID from CurseForge.
   */
  private async discoverHytaleGame(): Promise<void> {
    if (!this.apiKey) return;

    try {
      logger.info('[CurseForgeProvider] Fetching games list from CurseForge API...');
      const response = await this.request<{ data: CurseForgeGame[] }>('/v1/games');

      logger.info(`[CurseForgeProvider] Found ${response.data.length} games in CurseForge`);

      // Try multiple possible matches for Hytale
      const hytale = response.data.find(
        (g) => g.slug === 'hytale' ||
               g.name.toLowerCase() === 'hytale' ||
               g.slug.includes('hytale') ||
               g.name.toLowerCase().includes('hytale') ||
               g.id === CurseForgeProvider.HYTALE_GAME_ID
      );

      if (hytale) {
        this.hytaleGameId = hytale.id;
        logger.info(`[CurseForgeProvider] Discovered Hytale game ID: ${this.hytaleGameId} (name: ${hytale.name}, slug: ${hytale.slug})`);
        await this.loadCategories();
      } else {
        // Use the known Hytale game ID as fallback
        logger.warn('[CurseForgeProvider] Hytale not found in games list, using known game ID');
        this.hytaleGameId = CurseForgeProvider.HYTALE_GAME_ID;
        logger.info(`[CurseForgeProvider] Using known Hytale game ID: ${this.hytaleGameId}`);
        await this.loadCategories();
      }
    } catch (error) {
      logger.error('[CurseForgeProvider] Failed to discover Hytale game:', error);
      // Still use the known ID as a last resort
      this.hytaleGameId = CurseForgeProvider.HYTALE_GAME_ID;
      logger.info(`[CurseForgeProvider] Using fallback Hytale game ID: ${this.hytaleGameId}`);
    }
  }

  /**
   * Load categories for the Hytale game.
   */
  private async loadCategories(): Promise<void> {
    if (!this.hytaleGameId) return;

    try {
      const response = await this.request<{ data: CurseForgeCategory[] }>(
        `/v1/categories?gameId=${this.hytaleGameId}`
      );
      this.categories = response.data;

      // Build classification map based on category names
      // This maps CurseForge class IDs to our unified classifications
      for (const cat of this.categories) {
        if (cat.isClass) {
          const name = cat.name.toLowerCase();
          if (name.includes('mod') && !name.includes('modpack')) {
            this.classificationMap.set(cat.id, 'PLUGIN');
          } else if (name.includes('modpack') || name.includes('pack')) {
            this.classificationMap.set(cat.id, 'MODPACK');
          } else if (name.includes('resource') || name.includes('texture') || name.includes('art')) {
            this.classificationMap.set(cat.id, 'ART');
          } else if (name.includes('world') || name.includes('save') || name.includes('map')) {
            this.classificationMap.set(cat.id, 'SAVE');
          } else if (name.includes('data')) {
            this.classificationMap.set(cat.id, 'DATA');
          }
        }
      }

      logger.info(`[CurseForgeProvider] Loaded ${this.categories.length} categories`);
    } catch (error) {
      logger.error('[CurseForgeProvider] Failed to load categories:', error);
    }
  }

  /**
   * Map CurseForge class ID to unified classification.
   */
  private getClassification(classId: number | undefined): UnifiedClassification {
    if (!classId) return 'PLUGIN';
    return this.classificationMap.get(classId) || 'PLUGIN';
  }

  /**
   * Transform CurseForge file to unified version.
   */
  private transformFile(file: CurseForgeFile): UnifiedVersion {
    return {
      id: String(file.id),
      version: file.displayName || file.fileName,
      changelog: undefined, // CurseForge doesn't include changelog in file object
      downloads: file.downloadCount,
      gameVersion: file.gameVersions[0] || '',
      releaseDate: file.fileDate,
      fileSize: file.fileLength,
      fileName: file.fileName,
    };
  }

  /**
   * Transform CurseForge mod to unified project.
   */
  private transformMod(mod: CurseForgeMod): UnifiedProject {
    const author: UnifiedAuthor = mod.authors[0]
      ? {
          id: String(mod.authors[0].id),
          username: mod.authors[0].name,
          displayName: mod.authors[0].name,
        }
      : { id: 'unknown', username: 'Unknown', displayName: 'Unknown' };

    const versions = mod.latestFiles.map((f) => this.transformFile(f));
    const latestVersion = versions[0];

    const categories: UnifiedCategory[] = mod.categories.map((c) => ({
      id: String(c.id),
      name: c.name,
      slug: c.slug,
      iconUrl: c.iconUrl,
    }));

    const gameVersions = [
      ...new Set(mod.latestFilesIndexes.map((f) => f.gameVersion).filter(Boolean)),
    ];

    return {
      id: String(mod.id),
      slug: mod.slug,
      providerId: this.id,
      title: mod.name,
      description: mod.summary,
      shortDescription: mod.summary.substring(0, 200),
      classification: this.getClassification(mod.classId),
      author,
      categories,
      downloads: mod.downloadCount,
      rating: mod.rating,
      ratingCount: mod.thumbsUpCount,
      iconUrl: mod.logo?.url,
      bannerUrl: mod.screenshots[0]?.url,
      galleryImages: mod.screenshots.map((s) => s.url),
      versions,
      latestVersion,
      gameVersions,
      createdAt: mod.dateCreated,
      updatedAt: mod.dateModified,
      featured: mod.isFeatured,
      _raw: mod,
    };
  }

  /**
   * Map unified sort field to CurseForge API field.
   */
  private mapSortField(sortBy: string): number {
    // CurseForge uses numeric sort fields
    const mapping: Record<string, number> = {
      downloads: 2, // TotalDownloads
      rating: 3, // Rating
      updated: 4, // LastUpdated
      created: 11, // DateCreated
      name: 1, // Name
    };
    return mapping[sortBy] || 2;
  }

  async searchProjects(params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    // Try to discover Hytale game if not already done
    if (!this.hytaleGameId) {
      await this.discoverHytaleGame();
    }

    if (!this.hytaleGameId) {
      // Return empty results instead of throwing - Hytale may not be fully available on CurseForge yet
      logger.warn('[CurseForgeProvider] Cannot search - Hytale game ID not found');
      return {
        projects: [],
        total: 0,
        page: params.page || 1,
        pageSize: params.pageSize || 20,
        hasMore: false,
        providerId: this.id,
      };
    }

    const queryParams = new URLSearchParams();
    queryParams.append('gameId', String(this.hytaleGameId));

    if (params.query) {
      queryParams.append('searchFilter', params.query);
    }

    // Map classification to classId
    if (params.classification) {
      for (const [classId, classification] of this.classificationMap) {
        if (classification === params.classification) {
          queryParams.append('classId', String(classId));
          break;
        }
      }
    }

    // Categories
    if (params.categories?.length) {
      queryParams.append('categoryIds', `[${params.categories.join(',')}]`);
    }

    // Game version
    if (params.gameVersion) {
      queryParams.append('gameVersion', params.gameVersion);
    }

    // Pagination - CurseForge uses 0-indexed
    const page = params.page ?? 1;
    const pageSize = Math.min(params.pageSize ?? 50, 50); // Max 50
    queryParams.append('index', String((page - 1) * pageSize));
    queryParams.append('pageSize', String(pageSize));

    // Sorting
    if (params.sortBy) {
      queryParams.append('sortField', String(this.mapSortField(params.sortBy)));
      queryParams.append('sortOrder', params.sortOrder === 'asc' ? 'asc' : 'desc');
    }

    const endpoint = `/v1/mods/search?${queryParams.toString()}`;
    const response = await this.request<{ data: CurseForgeMod[]; pagination: CurseForgePagination }>(endpoint);

    return {
      projects: response.data.map((m) => this.transformMod(m)),
      total: response.pagination.totalCount,
      page,
      pageSize,
      hasMore: response.pagination.index + response.pagination.resultCount < response.pagination.totalCount,
      providerId: this.id,
    };
  }

  async getProject(projectId: string): Promise<UnifiedProject> {
    const response = await this.request<{ data: CurseForgeMod }>(`/v1/mods/${projectId}`);
    return this.transformMod(response.data);
  }

  async getCategories(): Promise<UnifiedCategory[]> {
    if (this.categories.length === 0 && this.hytaleGameId) {
      await this.loadCategories();
    }

    return this.categories
      .filter((c) => c.isClass)
      .map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        iconUrl: c.iconUrl,
      }));
  }

  async getVersionDependencies(projectId: string, versionId: string): Promise<UnifiedDependency[]> {
    try {
      const response = await this.request<{ data: CurseForgeFile }>(
        `/v1/mods/${projectId}/files/${versionId}`
      );

      const deps = response.data.dependencies || [];
      const results: UnifiedDependency[] = [];

      for (const dep of deps) {
        // Fetch the dependent mod to get its name
        try {
          const modResponse = await this.request<{ data: CurseForgeMod }>(`/v1/mods/${dep.modId}`);
          results.push({
            projectId: String(dep.modId),
            projectName: modResponse.data.name,
            versionId: undefined,
            required: dep.relationType === 3, // 3 = Required
            type: dep.relationType === 3 ? 'required' : dep.relationType === 2 ? 'optional' : 'optional',
          });
        } catch {
          // If we can't fetch the mod, just use the ID
          results.push({
            projectId: String(dep.modId),
            projectName: `Mod #${dep.modId}`,
            versionId: undefined,
            required: dep.relationType === 3,
            type: dep.relationType === 3 ? 'required' : 'optional',
          });
        }
      }

      return results;
    } catch (error) {
      logger.error(`[CurseForgeProvider] Error getting dependencies for ${projectId}/${versionId}:`, error);
      return [];
    }
  }

  async downloadVersion(projectId: string, versionId: string): Promise<NodeJS.ReadableStream> {
    if (!this.apiKey) {
      throw new Error('CurseForge API key not configured');
    }

    // First get the file to get the download URL
    const fileResponse = await this.request<{ data: CurseForgeFile }>(
      `/v1/mods/${projectId}/files/${versionId}`
    );

    let downloadUrl = fileResponse.data.downloadUrl;

    // If downloadUrl is null, try to get it from the download-url endpoint
    // This can return 403 if the mod author has disabled third-party downloads
    if (!downloadUrl) {
      try {
        const urlResponse = await this.request<{ data: string }>(
          `/v1/mods/${projectId}/files/${versionId}/download-url`
        );
        downloadUrl = urlResponse.data;
      } catch (urlError: any) {
        logger.warn(`[CurseForgeProvider] download-url endpoint failed for ${projectId}/${versionId}: ${urlError.message}`);
      }
    }

    if (!downloadUrl) {
      const fileName = fileResponse.data.fileName || 'this file';
      throw new Error(`Download not available for "${fileName}". The mod author has disabled third-party downloads. Please download it manually from CurseForge and install via the file manager.`);
    }

    logger.info(`[CurseForgeProvider] Downloading from: ${downloadUrl}`);

    const response = await fetch(downloadUrl, {
      headers: { 'x-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    return response.body as unknown as NodeJS.ReadableStream;
  }

  getDownloadUrl(_projectId: string, _versionId: string): string | null {
    // CurseForge doesn't expose direct URLs without fetching first
    return null;
  }
}
