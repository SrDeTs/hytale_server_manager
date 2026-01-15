import { IModProvider } from './IModProvider';
import {
  UnifiedSearchParams,
  UnifiedSearchResponse,
  MultiProviderSearchResponse,
  ProviderInfo,
} from './types';
import logger from '../../utils/logger';

/**
 * Registry for mod providers.
 *
 * Manages registration, lookup, and multi-provider operations.
 */
export class ModProviderRegistry {
  private providers: Map<string, IModProvider> = new Map();

  /**
   * Register a mod provider.
   */
  registerProvider(provider: IModProvider): void {
    if (this.providers.has(provider.id)) {
      logger.warn(`[ModProviderRegistry] Provider ${provider.id} already registered, replacing`);
    }
    this.providers.set(provider.id, provider);
    logger.info(`[ModProviderRegistry] Registered provider: ${provider.displayName} (${provider.id})`);
  }

  /**
   * Unregister a mod provider.
   */
  unregisterProvider(providerId: string): void {
    if (this.providers.delete(providerId)) {
      logger.info(`[ModProviderRegistry] Unregistered provider: ${providerId}`);
    }
  }

  /**
   * Get a provider by ID.
   */
  getProvider(providerId: string): IModProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers.
   */
  getAllProviders(): IModProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get all providers that are properly configured.
   */
  getConfiguredProviders(): IModProvider[] {
    return this.getAllProviders().filter((p) => p.isConfigured());
  }

  /**
   * Get provider info for all providers.
   */
  getProviderInfo(): ProviderInfo[] {
    return this.getAllProviders().map((p) => ({
      id: p.id,
      displayName: p.displayName,
      iconUrl: p.iconUrl,
      requiresApiKey: p.requiresApiKey,
      isConfigured: p.isConfigured(),
    }));
  }

  /**
   * Check if a provider exists.
   */
  hasProvider(providerId: string): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Search across all configured providers.
   *
   * Returns aggregated results from all providers that are properly configured.
   * Results are returned per-provider to allow the frontend to display them
   * appropriately.
   */
  async searchAll(params: UnifiedSearchParams): Promise<MultiProviderSearchResponse> {
    const configuredProviders = this.getConfiguredProviders();

    if (configuredProviders.length === 0) {
      return {
        results: [],
        totalAcrossProviders: 0,
      };
    }

    // Search all providers in parallel
    const searchPromises = configuredProviders.map(async (provider) => {
      try {
        const result = await provider.searchProjects(params);
        return result;
      } catch (error) {
        logger.error(`[ModProviderRegistry] Search failed for ${provider.id}:`, error);
        // Return empty result for failed providers
        return {
          projects: [],
          total: 0,
          page: params.page || 1,
          pageSize: params.pageSize || 50,
          hasMore: false,
          providerId: provider.id,
        } as UnifiedSearchResponse;
      }
    });

    const results = await Promise.all(searchPromises);

    // Calculate total across all providers
    const totalAcrossProviders = results.reduce((sum, r) => sum + r.total, 0);

    return {
      results,
      totalAcrossProviders,
    };
  }

  /**
   * Get the number of registered providers.
   */
  get count(): number {
    return this.providers.size;
  }
}
