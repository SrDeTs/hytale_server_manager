import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProviderInfo,
  UnifiedSearchParams,
  UnifiedSearchResponse,
  MultiProviderSearchResponse,
  UnifiedClassification,
} from '../types/modProvider';
import * as modProviderApi from '../services/modProviderApi';

interface ModProviderState {
  // Provider selection
  selectedProvider: string | 'all';
  providers: ProviderInfo[];
  providersLoading: boolean;
  providersError: string | null;

  // Search state
  searchQuery: string;
  searchClassification: UnifiedClassification | null;
  searchCategories: string[];
  searchTags: string[];
  searchPage: number;
  searchPageSize: number;
  searchSortBy: UnifiedSearchParams['sortBy'];
  searchSortOrder: 'asc' | 'desc';

  // Search results
  searchResults: UnifiedSearchResponse | null;
  multiSearchResults: MultiProviderSearchResponse | null;
  searchLoading: boolean;
  searchError: string | null;

  // Actions - Provider management
  setSelectedProvider: (provider: string | 'all') => void;
  loadProviders: () => Promise<void>;
  configureProvider: (providerId: string, apiKey: string) => Promise<void>;

  // Actions - Search
  setSearchQuery: (query: string) => void;
  setSearchClassification: (classification: UnifiedClassification | null) => void;
  setSearchCategories: (categories: string[]) => void;
  setSearchTags: (tags: string[]) => void;
  setSearchPage: (page: number) => void;
  setSearchPageSize: (pageSize: number) => void;
  setSearchSort: (sortBy: UnifiedSearchParams['sortBy'], sortOrder: 'asc' | 'desc') => void;
  search: () => Promise<void>;
  clearSearch: () => void;
  resetFilters: () => void;
}

const DEFAULT_PAGE_SIZE = 20;

export const useModProviderStore = create<ModProviderState>()(
  persist(
    (set, get) => ({
      // Initial state - Provider selection
      selectedProvider: 'modtale',
      providers: [],
      providersLoading: false,
      providersError: null,

      // Initial state - Search
      searchQuery: '',
      searchClassification: null,
      searchCategories: [],
      searchTags: [],
      searchPage: 1,
      searchPageSize: DEFAULT_PAGE_SIZE,
      searchSortBy: 'downloads',
      searchSortOrder: 'desc',

      // Initial state - Results
      searchResults: null,
      multiSearchResults: null,
      searchLoading: false,
      searchError: null,

      // Actions - Provider management
      setSelectedProvider: (provider: string | 'all') => {
        set({
          selectedProvider: provider,
          searchResults: null,
          multiSearchResults: null,
          searchPage: 1,
        });
      },

      loadProviders: async () => {
        set({ providersLoading: true, providersError: null });
        try {
          const providers = await modProviderApi.getProviders();
          set({ providers, providersLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to load providers';
          set({ providersError: message, providersLoading: false });
        }
      },

      configureProvider: async (providerId: string, apiKey: string) => {
        try {
          await modProviderApi.configureProvider(providerId, apiKey);
          // Clear cache and reload providers to get updated status
          modProviderApi.clearProvidersCache();
          await get().loadProviders();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to configure provider';
          throw new Error(message);
        }
      },

      // Actions - Search
      setSearchQuery: (query: string) => {
        set({ searchQuery: query, searchPage: 1 });
      },

      setSearchClassification: (classification: UnifiedClassification | null) => {
        set({ searchClassification: classification, searchPage: 1 });
      },

      setSearchCategories: (categories: string[]) => {
        set({ searchCategories: categories, searchPage: 1 });
      },

      setSearchTags: (tags: string[]) => {
        set({ searchTags: tags, searchPage: 1 });
      },

      setSearchPage: (page: number) => {
        set({ searchPage: page });
      },

      setSearchPageSize: (pageSize: number) => {
        set({ searchPageSize: pageSize, searchPage: 1 });
      },

      setSearchSort: (sortBy: UnifiedSearchParams['sortBy'], sortOrder: 'asc' | 'desc') => {
        set({ searchSortBy: sortBy, searchSortOrder: sortOrder, searchPage: 1 });
      },

      search: async () => {
        const state = get();
        set({ searchLoading: true, searchError: null });

        const params: UnifiedSearchParams = {
          query: state.searchQuery || undefined,
          classification: state.searchClassification || undefined,
          categories: state.searchCategories.length > 0 ? state.searchCategories : undefined,
          tags: state.searchTags.length > 0 ? state.searchTags : undefined,
          page: state.searchPage,
          pageSize: state.searchPageSize,
          sortBy: state.searchSortBy,
          sortOrder: state.searchSortOrder,
        };

        try {
          if (state.selectedProvider === 'all') {
            const results = await modProviderApi.searchAllProviders(params);
            set({
              multiSearchResults: results,
              searchResults: null,
              searchLoading: false,
            });
          } else {
            const results = await modProviderApi.searchProvider(state.selectedProvider, params);
            set({
              searchResults: results,
              multiSearchResults: null,
              searchLoading: false,
            });
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Search failed';
          set({ searchError: message, searchLoading: false });
        }
      },

      clearSearch: () => {
        set({
          searchResults: null,
          multiSearchResults: null,
          searchError: null,
        });
      },

      resetFilters: () => {
        set({
          searchQuery: '',
          searchClassification: null,
          searchCategories: [],
          searchTags: [],
          searchPage: 1,
          searchSortBy: 'downloads',
          searchSortOrder: 'desc',
          searchResults: null,
          multiSearchResults: null,
        });
      },
    }),
    {
      name: 'hytale-panel-mod-provider',
      // Only persist UI preferences, not search results
      partialize: (state) => ({
        selectedProvider: state.selectedProvider,
        searchPageSize: state.searchPageSize,
        searchSortBy: state.searchSortBy,
        searchSortOrder: state.searchSortOrder,
      }),
    }
  )
);

// Selector hooks for common state slices
export const useSelectedProvider = () =>
  useModProviderStore((state) => state.selectedProvider);

export const useProviders = () =>
  useModProviderStore((state) => ({
    providers: state.providers,
    loading: state.providersLoading,
    error: state.providersError,
  }));

export const useSearchResults = () =>
  useModProviderStore((state) => ({
    results: state.searchResults,
    multiResults: state.multiSearchResults,
    loading: state.searchLoading,
    error: state.searchError,
  }));

export const useSearchFilters = () =>
  useModProviderStore((state) => ({
    query: state.searchQuery,
    classification: state.searchClassification,
    categories: state.searchCategories,
    tags: state.searchTags,
    page: state.searchPage,
    pageSize: state.searchPageSize,
    sortBy: state.searchSortBy,
    sortOrder: state.searchSortOrder,
  }));

// Helper to get configured providers only
export const useConfiguredProviders = () =>
  useModProviderStore((state) => state.providers.filter((p) => p.isConfigured));

// Helper to check if current provider is configured
export const useIsCurrentProviderConfigured = () =>
  useModProviderStore((state) => {
    if (state.selectedProvider === 'all') {
      return state.providers.some((p) => p.isConfigured);
    }
    return state.providers.find((p) => p.id === state.selectedProvider)?.isConfigured ?? false;
  });
