import {
  ProviderConfig,
  UnifiedProject,
  UnifiedSearchParams,
  UnifiedSearchResponse,
  UnifiedCategory,
  UnifiedDependency,
} from './types';

/**
 * Interface for mod providers.
 *
 * Implementations of this interface allow the system to work with
 * different mod hosting platforms (Modtale, CurseForge, etc.) through
 * a unified API.
 */
export interface IModProvider {
  /**
   * Unique provider identifier (e.g., 'modtale', 'curseforge')
   */
  readonly id: string;

  /**
   * Human-readable provider name for display
   */
  readonly displayName: string;

  /**
   * Optional icon URL for the provider
   */
  readonly iconUrl?: string;

  /**
   * Whether this provider requires an API key to function
   */
  readonly requiresApiKey: boolean;

  /**
   * Initialize the provider with configuration.
   * Called once when the provider is registered.
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * Check if the provider is properly configured.
   * Returns true if the provider has all required configuration (API key, etc.)
   */
  isConfigured(): boolean;

  /**
   * Update the provider's API key.
   * Used when the user changes the API key in settings.
   */
  setApiKey(apiKey: string): void;

  /**
   * Search for projects/mods.
   *
   * @param params Search parameters (query, filters, pagination, sorting)
   * @returns Search results with pagination info
   */
  searchProjects(params: UnifiedSearchParams): Promise<UnifiedSearchResponse>;

  /**
   * Get a single project by its ID.
   *
   * @param projectId The provider-specific project ID
   * @returns The project details
   */
  getProject(projectId: string): Promise<UnifiedProject>;

  /**
   * Get a project by its slug (optional).
   * Not all providers support slug-based lookup.
   *
   * @param slug The project slug
   * @returns The project details
   */
  getProjectBySlug?(slug: string): Promise<UnifiedProject>;

  /**
   * Get available categories/classifications for filtering.
   *
   * @returns List of categories
   */
  getCategories(): Promise<UnifiedCategory[]>;

  /**
   * Get available tags for filtering (optional).
   * Not all providers support tags separately from categories.
   *
   * @returns List of tags
   */
  getTags?(): Promise<{ id: string; name: string; slug: string }[]>;

  /**
   * Get dependencies for a specific version of a project.
   *
   * @param projectId The project ID
   * @param versionId The version ID
   * @returns List of dependencies
   */
  getVersionDependencies(
    projectId: string,
    versionId: string
  ): Promise<UnifiedDependency[]>;

  /**
   * Download a mod file as a stream.
   *
   * @param projectId The project ID
   * @param versionId The version ID
   * @returns A readable stream of the file contents
   */
  downloadVersion(
    projectId: string,
    versionId: string
  ): Promise<NodeJS.ReadableStream>;

  /**
   * Get the direct download URL for a version (optional).
   * Some providers expose direct URLs, others require proxying.
   *
   * @param projectId The project ID
   * @param versionId The version ID
   * @returns The download URL or null if not available
   */
  getDownloadUrl?(projectId: string, versionId: string): string | null;
}
