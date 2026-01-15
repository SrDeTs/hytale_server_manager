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

const MODTALE_API_BASE = 'https://api.modtale.net/api/v1';

/**
 * Modtale mod provider implementation.
 *
 * Handles communication with the Modtale API and transforms
 * responses to the unified format.
 */
export class ModtaleProvider implements IModProvider {
  readonly id = 'modtale';
  readonly displayName = 'Modtale';
  readonly iconUrl = 'https://modtale.net/favicon.ico';
  readonly requiresApiKey = true;

  private apiKey: string | null = null;

  async initialize(config: ProviderConfig): Promise<void> {
    if (config.apiKey) {
      this.apiKey = config.apiKey;
    }
    logger.info(`[ModtaleProvider] Initialized${this.apiKey ? ' with API key' : ''}`);
  }

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    logger.info('[ModtaleProvider] API key updated');
  }

  /**
   * Make a request to the Modtale API.
   */
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Modtale API key not configured');
    }

    const url = `${MODTALE_API_BASE}${endpoint}`;
    logger.info(`[ModtaleProvider] Fetching: ${url}`);

    const headers: Record<string, string> = {
      'X-MODTALE-KEY': this.apiKey,
    };

    if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...(options.headers as Record<string, string>),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[ModtaleProvider] Error response: ${errorText.substring(0, 500)}`);

      let error: { message?: string };
      try {
        error = JSON.parse(errorText);
      } catch {
        error = { message: `HTTP ${response.status}: ${response.statusText}` };
      }

      throw new Error(error.message || errorText);
    }

    return (await response.json()) as T;
  }

  /**
   * Transform Modtale version to unified format.
   */
  private transformVersion(version: Record<string, unknown>): UnifiedVersion {
    return {
      id: String(version.id || ''),
      version: String(version.version || version.versionNumber || ''),
      changelog: version.changelog ? String(version.changelog) : undefined,
      downloads: Number(version.downloadCount || version.downloads || 0),
      gameVersion: String(version.gameVersion || (version.gameVersions as string[])?.[0] || ''),
      releaseDate: String(version.createdAt || version.createdDate || version.releaseDate || version.publishedAt || ''),
      fileSize: Number(version.fileSize || version.size || 0),
      fileName: String(version.fileName || version.file || ''),
    };
  }

  /**
   * Transform Modtale author to unified format.
   */
  private transformAuthor(author: unknown): UnifiedAuthor {
    if (typeof author === 'string') {
      return {
        id: author,
        username: author,
        displayName: author,
      };
    }

    const authorObj = author as Record<string, unknown>;
    return {
      id: String(authorObj.id || authorObj.username || ''),
      username: String(authorObj.username || authorObj.name || ''),
      displayName: String(authorObj.displayName || authorObj.name || authorObj.username || ''),
      avatarUrl: authorObj.avatarUrl ? String(authorObj.avatarUrl) : undefined,
    };
  }

  /**
   * Transform Modtale project to unified format.
   */
  private transformProject(project: Record<string, unknown>): UnifiedProject {
    const versions = Array.isArray(project.versions)
      ? project.versions.map((v) => this.transformVersion(v as Record<string, unknown>))
      : [];

    const tags = Array.isArray(project.tags)
      ? project.tags.map((tag) => {
          if (typeof tag === 'string') {
            return { id: tag, name: tag, slug: tag };
          }
          const tagObj = tag as Record<string, unknown>;
          return {
            id: String(tagObj.id || tagObj.name),
            name: String(tagObj.name || tagObj.id || tag),
            slug: String(tagObj.slug || tagObj.name || tagObj.id || tag),
          };
        })
      : [];

    return {
      id: String(project.id || ''),
      slug: String(project.slug || project.id || ''),
      providerId: this.id,
      title: String(project.title || project.name || ''),
      description: String(project.description || ''),
      shortDescription: project.shortDescription ? String(project.shortDescription) : String(project.description || '').substring(0, 200),
      classification: (project.classification as UnifiedClassification) || 'PLUGIN',
      author: this.transformAuthor(project.author),
      categories: [], // Modtale uses classification instead of categories
      tags,
      downloads: Number(project.downloadCount || project.downloads || 0),
      rating: Number(project.rating || project.averageRating || 0),
      ratingCount: Number(project.favoriteCount || project.ratingCount || 0),
      iconUrl: project.imageUrl ? String(project.imageUrl) : project.iconUrl ? String(project.iconUrl) : undefined,
      bannerUrl: project.bannerUrl ? String(project.bannerUrl) : undefined,
      galleryImages: Array.isArray(project.galleryImages) ? project.galleryImages.map(String) : undefined,
      versions,
      latestVersion: versions[0],
      gameVersions: Array.isArray(project.gameVersions) ? project.gameVersions.map(String) : [],
      createdAt: String(project.createdAt || project.createdDate || ''),
      updatedAt: String(project.updatedAt || project.updatedDate || project.modifiedDate || ''),
      featured: Boolean(project.featured),
      _raw: project,
    };
  }

  /**
   * Map unified sort field to Modtale API field.
   */
  private mapSortField(sortBy: string): string {
    const mapping: Record<string, string> = {
      downloads: 'downloadCount',
      rating: 'rating',
      updated: 'updatedDate',
      created: 'createdDate',
      name: 'title',
    };
    return mapping[sortBy] || sortBy;
  }

  async searchProjects(params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    const queryParams = new URLSearchParams();

    if (params.query) queryParams.append('search', params.query);
    if (params.classification) queryParams.append('classification', params.classification);
    if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
    if (params.gameVersion) queryParams.append('gameVersion', params.gameVersion);

    // Pagination - Modtale uses 0-indexed pages
    const page = (params.page ?? 1) - 1;
    queryParams.append('page', String(page));
    queryParams.append('size', String(params.pageSize ?? 50));

    // Sorting
    if (params.sortBy) {
      const sortField = this.mapSortField(params.sortBy);
      const sortDirection = params.sortOrder || 'desc';
      queryParams.append('sort', `${sortField},${sortDirection}`);
    }

    const query = queryParams.toString();
    const endpoint = `/projects${query ? `?${query}` : ''}`;

    const response = await this.request<Record<string, unknown>>(endpoint);

    // Handle Spring Data paginated response
    if (response && typeof response === 'object' && 'content' in response) {
      const content = response.content as Record<string, unknown>[];
      return {
        projects: content.map((p) => this.transformProject(p)),
        total: Number(response.totalElements || content.length),
        page: Number(response.number || 0) + 1, // Convert to 1-indexed
        pageSize: Number(response.size || params.pageSize || 50),
        hasMore: !response.last,
        providerId: this.id,
      };
    }

    // Handle array response
    if (Array.isArray(response)) {
      return {
        projects: response.map((p) => this.transformProject(p as Record<string, unknown>)),
        total: response.length,
        page: params.page || 1,
        pageSize: params.pageSize || 50,
        hasMore: response.length >= (params.pageSize || 50),
        providerId: this.id,
      };
    }

    // Handle response with 'projects' key
    if (response && typeof response === 'object' && 'projects' in response) {
      const projects = response.projects as Record<string, unknown>[];
      return {
        projects: projects.map((p) => this.transformProject(p)),
        total: Number(response.total || projects.length),
        page: Number(response.page || params.page || 1),
        pageSize: Number(response.limit || params.pageSize || 50),
        hasMore: Boolean(response.hasMore),
        providerId: this.id,
      };
    }

    logger.warn('[ModtaleProvider] Unexpected response format');
    return {
      projects: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 50,
      hasMore: false,
      providerId: this.id,
    };
  }

  async getProject(projectId: string): Promise<UnifiedProject> {
    const project = await this.request<Record<string, unknown>>(`/projects/${projectId}`);
    return this.transformProject(project);
  }

  async getProjectBySlug(slug: string): Promise<UnifiedProject> {
    const project = await this.request<Record<string, unknown>>(`/projects/slug/${slug}`);
    return this.transformProject(project);
  }

  async getCategories(): Promise<UnifiedCategory[]> {
    // Modtale uses classifications, not categories
    const classifications = await this.request<string[]>('/meta/classifications');
    return classifications.map((c) => ({
      id: c,
      name: c.charAt(0) + c.slice(1).toLowerCase(),
      slug: c.toLowerCase(),
    }));
  }

  async getTags(): Promise<{ id: string; name: string; slug: string }[]> {
    const tags = await this.request<Array<Record<string, unknown>>>('/tags');
    return tags.map((tag) => ({
      id: String(tag.id || tag.name),
      name: String(tag.name || tag.id),
      slug: String(tag.slug || tag.name || tag.id),
    }));
  }

  async getVersionDependencies(projectId: string, versionId: string): Promise<UnifiedDependency[]> {
    try {
      const project = await this.request<Record<string, unknown>>(`/projects/${projectId}`);
      const versions = project.versions as Array<Record<string, unknown>> | undefined;
      const version = versions?.find((v) => v.id === versionId);

      if (!version) {
        logger.warn(`[ModtaleProvider] Version ${versionId} not found for project ${projectId}`);
        return [];
      }

      const modIds = (version.modIds || version.dependencies || []) as Array<unknown>;
      if (!Array.isArray(modIds) || modIds.length === 0) {
        return [];
      }

      return modIds.map((dep) => {
        if (typeof dep === 'string') {
          return {
            projectId: dep,
            projectName: dep,
            versionId: undefined,
            required: true,
            type: 'required' as const,
          };
        }

        const depObj = dep as Record<string, unknown>;
        return {
          projectId: String(depObj.modId || depObj.projectId || depObj.id),
          projectName: String(depObj.name || depObj.projectName || depObj.modId || depObj.projectId),
          versionId: depObj.versionId ? String(depObj.versionId) : undefined,
          required: depObj.required !== false,
          type: (depObj.required !== false ? 'required' : 'optional') as 'required' | 'optional',
        };
      });
    } catch (error) {
      logger.error(`[ModtaleProvider] Error getting dependencies for ${projectId}/${versionId}:`, error);
      return [];
    }
  }

  async downloadVersion(projectId: string, versionId: string): Promise<NodeJS.ReadableStream> {
    if (!this.apiKey) {
      throw new Error('Modtale API key not configured');
    }

    const url = `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionId}/download`;
    logger.info(`[ModtaleProvider] Downloading: ${url}`);

    const response = await fetch(url, {
      headers: { 'X-MODTALE-KEY': this.apiKey },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[ModtaleProvider] Download error: ${errorText}`);
      throw new Error(`Download failed: HTTP ${response.status}`);
    }

    if (!response.body) {
      throw new Error('No response body received');
    }

    return response.body as unknown as NodeJS.ReadableStream;
  }

  getDownloadUrl(projectId: string, versionId: string): string {
    return `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionId}/download`;
  }
}
