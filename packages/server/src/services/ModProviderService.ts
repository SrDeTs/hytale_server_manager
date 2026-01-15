import { SettingsService } from './SettingsService';
import {
  ModProviderRegistry,
  ModtaleProvider,
  CurseForgeProvider,
  UnifiedSearchParams,
  UnifiedSearchResponse,
  MultiProviderSearchResponse,
  UnifiedProject,
  UnifiedCategory,
  UnifiedDependency,
  ProviderInfo,
  UnifiedModMetadata,
} from '../providers/mod';
import logger from '../utils/logger';

/**
 * High-level service for mod provider operations.
 *
 * Coordinates between the settings service, provider registry,
 * and individual providers to provide a unified interface for
 * mod operations.
 */
export class ModProviderService {
  private registry: ModProviderRegistry;
  private settingsService: SettingsService;
  private initialized = false;

  constructor(settingsService: SettingsService) {
    this.settingsService = settingsService;
    this.registry = new ModProviderRegistry();
  }

  /**
   * Initialize the mod provider service.
   * Registers all providers and configures them with API keys from settings.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logger.info('[ModProviderService] Initializing...');

    // Register providers
    const modtaleProvider = new ModtaleProvider();
    const curseForgeProvider = new CurseForgeProvider();

    this.registry.registerProvider(modtaleProvider);
    this.registry.registerProvider(curseForgeProvider);

    // Load API keys from settings and initialize providers
    await this.loadProviderConfigs();

    this.initialized = true;
    logger.info('[ModProviderService] Initialized with providers:',
      this.registry.getAllProviders().map(p => p.id).join(', '));
  }

  /**
   * Load provider configurations from settings.
   */
  private async loadProviderConfigs(): Promise<void> {
    // Load Modtale API key
    const modtaleKey = await this.settingsService.get('modtale.apiKey');
    if (modtaleKey) {
      const provider = this.registry.getProvider('modtale');
      if (provider) {
        await provider.initialize({ apiKey: modtaleKey });
      }
    }

    // Load CurseForge API key
    const curseForgeKey = await this.settingsService.get('curseforge.apiKey');
    if (curseForgeKey) {
      const provider = this.registry.getProvider('curseforge');
      if (provider) {
        await provider.initialize({ apiKey: curseForgeKey });
      }
    }
  }

  /**
   * Get list of all providers with their configuration status.
   */
  getProviders(): ProviderInfo[] {
    return this.registry.getProviderInfo();
  }

  /**
   * Get a specific provider by ID.
   */
  getProvider(providerId: string) {
    return this.registry.getProvider(providerId);
  }

  /**
   * Check if a provider exists.
   */
  hasProvider(providerId: string): boolean {
    return this.registry.hasProvider(providerId);
  }

  /**
   * Set the API key for a provider.
   */
  async setProviderApiKey(providerId: string, apiKey: string, userId?: string): Promise<void> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Save to settings
    await this.settingsService.set(`${providerId}.apiKey`, apiKey, userId);

    // Update the provider
    provider.setApiKey(apiKey);

    // Re-initialize if needed (some providers need to fetch metadata on init)
    await provider.initialize({ apiKey });

    logger.info(`[ModProviderService] API key updated for provider: ${providerId}`);
  }

  /**
   * Search projects in a specific provider.
   */
  async search(providerId: string, params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    return provider.searchProjects(params);
  }

  /**
   * Search projects across all configured providers.
   */
  async searchAll(params: UnifiedSearchParams): Promise<MultiProviderSearchResponse> {
    return this.registry.searchAll(params);
  }

  /**
   * Get project details from a specific provider.
   */
  async getProject(providerId: string, projectId: string): Promise<UnifiedProject> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    return provider.getProject(projectId);
  }

  /**
   * Get project by slug from a specific provider.
   */
  async getProjectBySlug(providerId: string, slug: string): Promise<UnifiedProject> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    if (!provider.getProjectBySlug) {
      throw new Error(`Provider ${providerId} does not support slug-based lookup`);
    }

    return provider.getProjectBySlug(slug);
  }

  /**
   * Get categories from a specific provider.
   */
  async getCategories(providerId: string): Promise<UnifiedCategory[]> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    return provider.getCategories();
  }

  /**
   * Get tags from a specific provider.
   */
  async getTags(providerId: string): Promise<{ id: string; name: string; slug: string }[]> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    if (!provider.getTags) {
      return []; // Not all providers support tags
    }

    return provider.getTags();
  }

  /**
   * Get version dependencies from a specific provider.
   */
  async getVersionDependencies(
    providerId: string,
    projectId: string,
    versionId: string
  ): Promise<UnifiedDependency[]> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    return provider.getVersionDependencies(projectId, versionId);
  }

  /**
   * Download a mod file from a specific provider.
   */
  async downloadVersion(
    providerId: string,
    projectId: string,
    versionId: string
  ): Promise<NodeJS.ReadableStream> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    return provider.downloadVersion(projectId, versionId);
  }

  /**
   * Download a mod for installation, returning the stream and metadata.
   */
  async downloadForInstallation(
    providerId: string,
    projectId: string,
    versionId: string
  ): Promise<{ stream: NodeJS.ReadableStream; metadata: UnifiedModMetadata }> {
    const provider = this.registry.getProvider(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${providerId} is not configured. Please set up the API key.`);
    }

    // Get project details for metadata
    const project = await provider.getProject(projectId);
    const version = project.versions.find(v => v.id === versionId) || project.latestVersion;

    if (!version) {
      throw new Error(`Version ${versionId} not found for project ${projectId}`);
    }

    // Download the file
    const stream = await provider.downloadVersion(projectId, versionId);

    const metadata: UnifiedModMetadata = {
      providerId,
      projectId,
      projectTitle: project.title,
      projectIconUrl: project.iconUrl,
      versionId,
      versionName: version.version,
      classification: project.classification,
      fileSize: version.fileSize,
    };

    return { stream, metadata };
  }

  /**
   * Get the registry for advanced operations.
   */
  getRegistry(): ModProviderRegistry {
    return this.registry;
  }
}
