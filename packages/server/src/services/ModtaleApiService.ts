import logger from '../utils/logger';

const MODTALE_API_BASE = 'https://api.modtale.net/api/v1';

export class ModtaleApiService {
  private apiKey: string | null = null;

  /**
   * Set the Modtale API key
   */
  setApiKey(key: string): void {
    this.apiKey = key;
  }

  /**
   * Get the current API key
   */
  getApiKey(): string | null {
    return this.apiKey;
  }

  /**
   * Transform Modtale API version to match frontend expectations
   */
  private transformVersion(version: any): any {
    return {
      ...version,
      version: version.version || version.versionNumber || '',
      createdAt: version.createdAt || version.createdDate || version.releaseDate || version.publishedAt || '',
      downloads: version.downloadCount || version.downloads || 0,
      gameVersion: version.gameVersion || version.gameVersions?.[0] || '',
      fileSize: version.fileSize || version.size || 0,
      fileName: version.fileName || version.file || '',
    };
  }

  /**
   * Transform Modtale API project to match frontend expectations
   */
  private transformProject(project: any): any {
    // Log the raw tags to debug
    if (project.tags) {
      logger.info(`[Modtale API] Raw tags for project ${project.id}: ${JSON.stringify(project.tags)}`);
    }

    return {
      ...project,
      downloads: project.downloadCount || project.downloads || 0,
      slug: project.slug || project.id,
      iconUrl: project.imageUrl || project.iconUrl,
      author: typeof project.author === 'string'
        ? { name: project.author, id: project.author, username: project.author, displayName: project.author }
        : project.author,
      rating: project.rating || project.averageRating || 0,
      ratingCount: project.favoriteCount || project.ratingCount || 0,
      versions: (project.versions || []).map((v: any) => this.transformVersion(v)),
      latestVersion: project.versions?.[0] ? this.transformVersion(project.versions[0]) : null,
      gameVersions: project.gameVersions || [],
      featured: project.featured || false,
      shortDescription: project.description || project.shortDescription,
      createdAt: project.createdAt || project.createdDate || '',
      updatedAt: project.updatedAt || project.updatedDate || project.modifiedDate || '',
      tags: Array.isArray(project.tags)
        ? project.tags.map((tag: any) => {
            // Handle both string tags and object tags
            if (typeof tag === 'string') {
              return { id: tag, name: tag, slug: tag };
            }
            return {
              id: tag.id || tag.name,
              name: tag.name || tag.id || tag,
              slug: tag.slug || tag.name || tag.id || tag,
            };
          })
        : [],
    };
  }

  /**
   * Map frontend sort field names to API field names
   * Spring Data REST commonly uses field names like downloadCount, createdDate, etc.
   */
  private mapSortField(sortBy: string): string {
    const fieldMapping: Record<string, string> = {
      'downloads': 'downloadCount',
      'rating': 'rating',
      'updated': 'updatedDate',
      'created': 'createdDate',
      'title': 'title',
    };

    return fieldMapping[sortBy] || sortBy;
  }

  /**
   * Make a request to the Modtale API
   */
  private async request<T>(endpoint: string, options: any = {}): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Modtale API key not configured');
    }

    const url = `${MODTALE_API_BASE}${endpoint}`;
    logger.info(`[Modtale API] Fetching: ${url}`);
    logger.info(`[Modtale API] API Key configured: ${this.apiKey ? 'Yes (length: ' + this.apiKey.length + ')' : 'No'}`);

    const headers: Record<string, string> = {
      'X-MODTALE-KEY': this.apiKey,
    };

    // Only add Content-Type for requests with a body
    if (options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase())) {
      headers['Content-Type'] = 'application/json';
    }

    logger.info(`[Modtale API] Request headers: ${JSON.stringify(Object.keys(headers))}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      });

      logger.info(`[Modtale API] Response status: ${response.status}`);
      logger.info(`[Modtale API] Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[Modtale API] Error response: ${errorText.substring(0, 500)}`);

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

        throw new Error(error.message || errorText);
      }

      const data = await response.json();
      logger.info(`[Modtale API] Success response received`);
      return data as T;
    } catch (error: any) {
      logger.error('[Modtale API] Request failed:', error.message);
      throw error;
    }
  }

  /**
   * Search for projects (mods/modpacks)
   */
  async searchProjects(params: any): Promise<any> {
    const queryParams = new URLSearchParams();

    // Search query
    if (params.query) queryParams.append('search', params.query);

    // Filters
    if (params.classification) queryParams.append('classification', params.classification);
    if (params.tags?.length) queryParams.append('tags', params.tags.join(','));
    if (params.gameVersion) queryParams.append('gameVersion', params.gameVersion);
    if (params.minRating !== undefined) queryParams.append('minRating', params.minRating.toString());
    if (params.maxRating !== undefined) queryParams.append('maxRating', params.maxRating.toString());
    if (params.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params.dateTo) queryParams.append('dateTo', params.dateTo);

    // Pagination
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.limit !== undefined) queryParams.append('size', params.limit.toString());

    // Sorting - Spring Data REST format: sort=field,direction
    if (params.sortBy) {
      const sortField = this.mapSortField(params.sortBy);
      const sortDirection = params.sortOrder || 'desc';
      queryParams.append('sort', `${sortField},${sortDirection}`);
      logger.info(`[Modtale API] Sort: ${params.sortBy} -> ${sortField},${sortDirection}`);
    }

    const query = queryParams.toString();
    const endpoint = `/projects${query ? `?${query}` : ''}`;

    logger.info(`[Modtale API] Full endpoint: ${MODTALE_API_BASE}${endpoint}`);

    const response = await this.request<any>(endpoint);

    logger.info(`[Modtale API] Response type: ${typeof response}, has content: ${'content' in response}, has projects: ${'projects' in response}`);

    // Handle Spring Data paginated response format (content, totalElements, totalPages, etc.)
    if (response && typeof response === 'object' && 'content' in response) {
      logger.info(`[Modtale API] Handling paginated response with ${response.content.length} projects`);

      return {
        projects: response.content.map((project: any) => this.transformProject(project)),
        total: response.totalElements || response.content.length,
        page: (response.number || 0) + 1, // Spring page numbers are 0-indexed
        limit: response.size || params.limit || 20,
        hasMore: !response.last,
      };
    }

    // Handle array response
    if (Array.isArray(response)) {
      const page = params.page || 1;
      const limit = params.limit || 20;
      return {
        projects: response,
        total: response.length,
        page,
        limit,
        hasMore: response.length >= limit,
      };
    }

    // Handle already formatted response with 'projects' key
    if (response && typeof response === 'object' && 'projects' in response) {
      return response;
    }

    // Return empty response
    logger.warn('[Modtale API] Unexpected response format, returning empty result');
    return {
      projects: [],
      total: 0,
      page: params.page || 1,
      limit: params.limit || 20,
      hasMore: false,
    };
  }

  /**
   * Get project by ID
   */
  async getProject(id: string): Promise<any> {
    const project = await this.request(`/projects/${id}`);
    return this.transformProject(project);
  }

  /**
   * Get project by slug
   */
  async getProjectBySlug(slug: string): Promise<any> {
    const project = await this.request(`/projects/slug/${slug}`);
    return this.transformProject(project);
  }

  /**
   * Get all tags
   */
  async getTags(): Promise<any> {
    return this.request('/tags');
  }

  /**
   * Get classifications
   */
  async getClassifications(): Promise<any> {
    return this.request('/meta/classifications');
  }

  /**
   * Get download URL for a project version
   */
  getDownloadUrl(projectId: string, versionId: string): string {
    return `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionId}/download`;
  }

  /**
   * Get dependencies for a specific version
   */
  async getVersionDependencies(projectId: string, versionId: string): Promise<any[]> {
    try {
      const project = await this.request<any>(`/projects/${projectId}`);
      const version = project.versions?.find((v: any) => v.id === versionId);
      if (!version) {
        logger.warn(`[Modtale API] Version ${versionId} not found for project ${projectId}`);
        return [];
      }
      const modIds = version.modIds || version.dependencies || [];
      if (!Array.isArray(modIds) || modIds.length === 0) {
        return [];
      }
      return modIds.map((dep: any) => {
        if (typeof dep === 'string') {
          return { projectId: dep, projectName: dep, versionId: null, required: true };
        }
        return {
          projectId: dep.modId || dep.projectId || dep.id,
          projectName: dep.name || dep.projectName || dep.modId || dep.projectId,
          versionId: dep.versionId || null,
          required: dep.required !== false,
        };
      });
    } catch (error: any) {
      logger.error(`[Modtale API] Error getting dependencies for ${projectId}/${versionId}:`, error.message);
      return [];
    }
  }

  /**
   * Download a version file and return a readable stream
   */
  async downloadVersion(projectId: string, versionId: string): Promise<NodeJS.ReadableStream> {
    if (!this.apiKey) {
      throw new Error('Modtale API key not configured');
    }
    const url = `${MODTALE_API_BASE}/projects/${projectId}/versions/${versionId}/download`;
    logger.info(`[Modtale API] Downloading: ${url}`);
    const response = await fetch(url, {
      headers: { 'X-MODTALE-KEY': this.apiKey },
    });
    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`[Modtale API] Download error: ${errorText}`);
      throw new Error(`Download failed: HTTP ${response.status}`);
    }
    if (!response.body) {
      throw new Error('No response body received');
    }
    return response.body as unknown as NodeJS.ReadableStream;
  }
}

// Singleton instance
export const modtaleApiService = new ModtaleApiService();
