import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, DataTable, Input, SearchableSelect } from '../../components/ui';
import type { Column } from '../../components/ui';
import { Download, AlertCircle, ExternalLink, Grid, List, Settings, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import type { ModType } from '../../types';
import { motion } from 'framer-motion';
import { useModProviderStore, useIsCurrentProviderConfigured } from '../../stores/modProviderStore';
import { useToast } from '../../stores/toastStore';
import { useInstallationQueueStore } from '../../stores/installationQueueStore';
import * as modProviderApi from '../../services/modProviderApi';
import type { UnifiedProject, UnifiedClassification } from '../../types/modProvider';
import { ServerSelectionModal } from '../../components/modals/ServerSelectionModal';
import { ProviderSelector, ProviderBadge } from '../../components/mods/ProviderSelector';
import api from '../../services/api';

export const ModsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    selectedProvider,
    providers,
    loadProviders,
    searchResults,
    multiSearchResults,
    searchLoading,
    searchError,
    search,
    setSearchQuery: setStoreSearchQuery,
    setSearchClassification,
    setSearchPage,
    searchClassification,
    searchPage,
  } = useModProviderStore();
  const isProviderConfigured = useIsCurrentProviderConfigured();
  const { addToQueue } = useInstallationQueueStore();

  const [filterTags, setFilterTags] = useState<string[]>([]);
  const [filterAuthor, setFilterAuthor] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'downloads' | 'rating' | 'updated'>('downloads');
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<UnifiedProject | null>(null);
  const [servers, setServers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const CARD_PAGE_SIZE = 9;

  // Map classification to mod type for display
  const mapClassificationToType = (classification: UnifiedClassification): ModType => {
    const mapping: Record<UnifiedClassification, ModType> = {
      'PLUGIN': 'plugin',
      'DATA': 'data-asset',
      'ART': 'art-asset',
      'SAVE': 'world-save',
      'MODPACK': 'plugin',
    };
    return mapping[classification] || 'plugin';
  };

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
    loadProviders();
  }, []);

  // Clear classification (to not filter by MODPACK from other page) and trigger search
  useEffect(() => {
    if (isProviderConfigured) {
      // Clear classification to show all mods (not just modpacks)
      setSearchClassification(null);
      search();
    }
  }, [selectedProvider, isProviderConfigured]);

  const fetchServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  // Get projects from search results
  const allProjects = useMemo(() => {
    if (selectedProvider === 'all' && multiSearchResults) {
      return modProviderApi.mergeSearchResults(multiSearchResults);
    }
    return searchResults?.projects || [];
  }, [selectedProvider, searchResults, multiSearchResults]);

  // Get total count
  const totalResults = useMemo(() => {
    if (selectedProvider === 'all' && multiSearchResults) {
      return multiSearchResults.totalAcrossProviders;
    }
    return searchResults?.total || 0;
  }, [selectedProvider, searchResults, multiSearchResults]);

  // Extract unique tags and authors for filter dropdowns (client-side filtering on loaded results)
  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    allProjects.forEach(project => {
      project.categories?.forEach(cat => tagSet.add(cat.name));
    });
    return Array.from(tagSet).sort();
  }, [allProjects]);

  const uniqueAuthors = useMemo(() => {
    const authorSet = new Set<string>();
    allProjects.forEach(project => {
      if (project.author?.username) {
        authorSet.add(project.author.username);
      }
    });
    return Array.from(authorSet).sort();
  }, [allProjects]);

  // Filter mods client-side based on local filters
  const filteredMods = useMemo(() => {
    let filtered = allProjects;

    // Filter out modpacks - this page is for mods only
    filtered = filtered.filter(p => p.classification !== 'MODPACK');

    // Filter by local search query (additional to API search)
    if (localSearchQuery.trim()) {
      const query = localSearchQuery.toLowerCase();
      filtered = filtered.filter(mod =>
        mod.title.toLowerCase().includes(query) ||
        mod.description.toLowerCase().includes(query) ||
        mod.author?.username?.toLowerCase().includes(query)
      );
    }

    // Filter by tags (categories)
    if (filterTags.length > 0) {
      filtered = filtered.filter(mod =>
        filterTags.every(filterTag =>
          mod.categories?.some(cat => cat.name === filterTag)
        )
      );
    }

    // Filter by author
    if (filterAuthor !== 'all') {
      filtered = filtered.filter(mod => mod.author?.username === filterAuthor);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'downloads') return b.downloads - a.downloads;
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'updated') {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      }
      return 0;
    });

    return filtered;
  }, [allProjects, localSearchQuery, filterTags, filterAuthor, sortBy]);

  // Paginate mods for card view
  const cardPage = Math.ceil(searchPage);
  const paginatedMods = useMemo(() => {
    const startIndex = (cardPage - 1) * CARD_PAGE_SIZE;
    return filteredMods.slice(startIndex, startIndex + CARD_PAGE_SIZE);
  }, [filteredMods, cardPage]);

  const totalCardPages = Math.ceil(filteredMods.length / CARD_PAGE_SIZE);

  const handleSearch = () => {
    setStoreSearchQuery(localSearchQuery);
    search();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInstallClick = (project: UnifiedProject) => {
    setSelectedProject(project);
    setShowInstallModal(true);
  };

  const handleInstall = async (serverId: string, projectId: string, versionId: string, _providerId: string) => {
    if (!selectedProject) return;

    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    const version = selectedProject.versions?.find(v => v.id === versionId) || selectedProject.latestVersion;

    // Add to installation queue for UI feedback
    const queueId = addToQueue({
      serverId,
      serverName: server.name,
      projectId,
      projectTitle: selectedProject.title,
      projectIconUrl: selectedProject.iconUrl,
      versionId,
      versionName: version?.version || 'Latest',
      classification: selectedProject.classification,
    });

    // Update status to downloading
    const { updateStatus, removeFromQueue } = useInstallationQueueStore.getState();
    updateStatus(queueId, 'downloading');

    toast.success(
      'Installing...',
      `${selectedProject.title} is being installed to ${server.name}`
    );

    // Call backend API to actually install the mod
    try {
      updateStatus(queueId, 'installing');
      await api.installMod(serverId, {
        providerId: selectedProject.providerId,
        projectId,
        projectTitle: selectedProject.title,
        projectIconUrl: selectedProject.iconUrl,
        versionId,
        versionName: version?.version || 'Latest',
        classification: selectedProject.classification,
        fileSize: version?.fileSize || 0,
        fileName: version?.fileName,
      });
      updateStatus(queueId, 'completed');
      toast.success('Installation complete', `${selectedProject.title} has been installed`);

      // Remove from queue after a short delay so user can see completion
      setTimeout(() => removeFromQueue(queueId), 2000);
    } catch (error: any) {
      console.error('Error installing mod:', error);
      updateStatus(queueId, 'failed', error.message);
      toast.error('Installation failed', error.message);

      // Remove failed items after showing error
      setTimeout(() => removeFromQueue(queueId), 5000);
    }
  };

  // Generate project URL based on provider
  const getProjectUrl = (project: UnifiedProject) => {
    if (project.providerId === 'modtale') {
      const titleSlug = project.title.toLowerCase().replace(/\s+/g, '-');
      return `https://modtale.net/mod/${titleSlug}-${project.id}`;
    } else if (project.providerId === 'curseforge') {
      return `https://www.curseforge.com/hytale/mods/${project.slug}`;
    }
    return '#';
  };

  const modTypeColors: Record<ModType, string> = {
    plugin: 'bg-accent-primary/20 text-accent-primary border-accent-primary/30',
    'data-asset': 'bg-success/20 text-success border-success/30',
    'art-asset': 'bg-accent-secondary/20 text-accent-secondary border-accent-secondary/30',
    'world-save': 'bg-warning/20 text-warning border-warning/30',
  };

  // DataTable columns
  const columns: Column<UnifiedProject>[] = [
    {
      key: 'title',
      label: 'Mod',
      sortable: true,
      render: (mod) => (
        <div className="flex items-center gap-3">
          <img
            src={mod.iconUrl || `https://via.placeholder.com/48/6366f1/ffffff?text=${mod.title[0]}`}
            alt={mod.title}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-text-light-primary dark:text-text-primary truncate">{mod.title}</p>
              {selectedProvider === 'all' && <ProviderBadge providerId={mod.providerId} />}
            </div>
            <p className="text-sm text-text-light-muted dark:text-text-muted truncate">{mod.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      sortable: true,
      render: (mod) => (
        <span className="whitespace-nowrap">{mod.author.username}</span>
      ),
    },
    {
      key: 'classification',
      label: 'Type',
      sortable: true,
      className: 'hidden lg:table-cell',
      render: (mod) => {
        const modType = mapClassificationToType(mod.classification);
        return (
          <Badge size="sm" className={modTypeColors[modType]}>
            {mod.classification}
          </Badge>
        );
      },
    },
    {
      key: 'categories',
      label: 'Categories',
      sortable: false,
      className: 'hidden md:table-cell',
      render: (mod) => (
        <div className="flex flex-wrap gap-1">
          {mod.categories.slice(0, 2).map((cat) => (
            <Badge key={cat.id} size="sm" variant="info">
              {cat.name}
            </Badge>
          ))}
          {mod.categories.length > 2 && (
            <Badge size="sm" variant="default">
              +{mod.categories.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'downloads',
      label: 'Downloads',
      sortable: true,
      className: 'text-right',
      render: (mod) => (
        <span className="whitespace-nowrap">{mod.downloads.toLocaleString()}</span>
      ),
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      className: 'text-right',
      render: (mod) => (
        <span className="whitespace-nowrap">{mod.rating?.toFixed(1) || '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      className: 'text-right',
      render: (mod) => (
        <div className="flex gap-2 justify-end">
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={() => handleInstallClick(mod)}
          >
            Install
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink size={14} />}
            onClick={() => window.open(getProjectUrl(mod), '_blank')}
          >
            View
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">Mods</h1>
          <p className="text-text-light-muted dark:text-text-muted mt-1">
            Browse and install mods {totalResults > 0 && `(${totalResults.toLocaleString()} available)`}
          </p>
        </div>
        <ProviderSelector />
      </div>

      {/* Search and Filters */}
      {isProviderConfigured && (
        <Card variant="glass" className="relative z-10 overflow-visible">
          <CardContent className="py-4 overflow-visible">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-light-muted dark:text-text-muted" size={20} />
                <Input
                  type="text"
                  placeholder="Search mods..."
                  value={localSearchQuery}
                  onChange={(e) => setLocalSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 pr-10"
                />
                {localSearchQuery && (
                  <button
                    onClick={() => setLocalSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-light-muted dark:text-text-muted hover:text-text-light-primary dark:hover:text-text-primary"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {/* Filter Row */}
              <div className="flex flex-col md:flex-row gap-4 relative z-20">
                {/* Type Filter */}
                <div className="w-full md:w-48">
                  <select
                    value={searchClassification || 'all'}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchClassification(val === 'all' ? null : val as UnifiedClassification);
                      search();
                    }}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="all">All Types</option>
                    <option value="PLUGIN">Plugins</option>
                    <option value="DATA">Data Assets</option>
                    <option value="ART">Art Assets</option>
                    <option value="SAVE">World Saves</option>
                  </select>
                </div>

                {/* Tags Filter */}
                <div className="w-full md:w-48">
                  <SearchableSelect
                    options={uniqueTags}
                    value={filterTags}
                    onChange={(value) => setFilterTags(value as string[])}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    multiple={true}
                    allLabel="All Categories"
                  />
                </div>

                {/* Author Filter */}
                <div className="w-full md:w-48">
                  <SearchableSelect
                    options={uniqueAuthors}
                    value={filterAuthor}
                    onChange={(value) => setFilterAuthor(value as string)}
                    placeholder="All Authors"
                    searchPlaceholder="Search authors..."
                    multiple={false}
                    allLabel="All Authors"
                  />
                </div>

                {/* Sort Dropdown */}
                <div className="w-full md:w-48">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'downloads' | 'rating' | 'updated')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  >
                    <option value="downloads">Most Downloads</option>
                    <option value="rating">Highest Rated</option>
                    <option value="updated">Recently Updated</option>
                  </select>
                </div>

                {/* View Toggle */}
                <div className="flex gap-2 md:ml-auto">
                  <button
                    onClick={() => setViewMode('card')}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === 'card'
                        ? 'bg-accent-primary text-white border-accent-primary'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-text-light-muted dark:text-text-muted hover:text-text-light-primary dark:hover:text-text-primary'
                    }`}
                    title="Card view"
                  >
                    <Grid size={20} />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg border transition-colors ${
                      viewMode === 'table'
                        ? 'bg-accent-primary text-white border-accent-primary'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-text-light-muted dark:text-text-muted hover:text-text-light-primary dark:hover:text-text-primary'
                    }`}
                    title="Table view"
                  >
                    <List size={20} />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Provider Not Configured Warning */}
      {!isProviderConfigured && (
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center gap-4 py-4">
              <AlertCircle size={32} className="text-warning" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-text-light-primary dark:text-text-primary">
                  {selectedProvider === 'all'
                    ? 'No Mod Providers Configured'
                    : `${providers.find(p => p.id === selectedProvider)?.displayName || 'Provider'} Not Configured`}
                </h3>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Configure API keys for mod providers in settings to browse and install mods.
                </p>
              </div>
              <Button
                variant="primary"
                icon={<Settings size={18} />}
                onClick={() => navigate('/settings')}
              >
                Configure Providers
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {searchLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-accent-primary border-t-transparent"></div>
          <p className="text-text-light-muted dark:text-text-muted mt-4">Loading mods...</p>
        </div>
      )}

      {/* Error State */}
      {searchError && !searchLoading && (
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center gap-4 py-4">
              <AlertCircle size={32} className="text-danger" />
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-text-light-primary dark:text-text-primary">
                  Failed to Load Mods
                </h3>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">{searchError}</p>
              </div>
              <Button variant="secondary" onClick={() => search()}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mods Grid */}
      {isProviderConfigured && !searchLoading && !searchError && (
        <>
          {/* Card View */}
          {viewMode === 'card' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedMods.map((mod) => {
                  const modType = mapClassificationToType(mod.classification);
                  return (
                    <motion.div
                      key={`${mod.providerId}-${mod.id}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Card variant="glass" hover>
                        <CardHeader>
                          <div className="flex items-start gap-3">
                            <img
                              src={mod.iconUrl || `https://via.placeholder.com/64/6366f1/ffffff?text=${mod.title[0]}`}
                              alt={mod.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CardTitle className="truncate">{mod.title}</CardTitle>
                                {selectedProvider === 'all' && <ProviderBadge providerId={mod.providerId} />}
                              </div>
                              <CardDescription className="truncate">by {mod.author.username}</CardDescription>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <p className="text-sm text-text-light-muted dark:text-text-muted line-clamp-2">
                            {mod.description}
                          </p>

                          <div className="flex flex-wrap gap-2">
                            <Badge size="sm" className={modTypeColors[modType]}>
                              {mod.classification}
                            </Badge>
                            {mod.latestVersion && (
                              <Badge size="sm" variant="default">v{mod.latestVersion.version}</Badge>
                            )}
                            {mod.categories.slice(0, 2).map((cat) => (
                              <Badge key={cat.id} size="sm" variant="info">
                                {cat.name}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs text-text-light-muted dark:text-text-muted">
                            <span>{mod.downloads.toLocaleString()} downloads</span>
                            <span>{mod.rating?.toFixed(1) || '-'}</span>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Download size={14} />}
                              className="flex-1"
                              onClick={() => handleInstallClick(mod)}
                            >
                              Install
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<ExternalLink size={14} />}
                              onClick={() => window.open(getProjectUrl(mod), '_blank')}
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>

              {/* Card View Pagination */}
              {totalCardPages > 1 && (
                <div className="flex items-center justify-between mt-6 px-2">
                  <span className="text-sm text-text-light-muted dark:text-text-muted">
                    Showing {(cardPage - 1) * CARD_PAGE_SIZE + 1} to{' '}
                    {Math.min(cardPage * CARD_PAGE_SIZE, filteredMods.length)} of {filteredMods.length} mods
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronLeft size={16} />}
                      onClick={() => setSearchPage(Math.max(1, cardPage - 1))}
                      disabled={cardPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-text-light-muted dark:text-text-muted px-2">
                      Page {cardPage} of {totalCardPages}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<ChevronRight size={16} />}
                      onClick={() => setSearchPage(Math.min(totalCardPages, cardPage + 1))}
                      disabled={cardPage === totalCardPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Table View */}
          {viewMode === 'table' && (
            <DataTable
              data={filteredMods}
              columns={columns}
              keyExtractor={(mod) => `${mod.providerId}-${mod.id}`}
              itemsPerPage={10}
              searchable={true}
              exportable={true}
            />
          )}

          {filteredMods.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-light-muted dark:text-text-muted">No mods found matching your criteria</p>
            </div>
          )}
        </>
      )}

      {/* Server Selection Modal */}
      <ServerSelectionModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        project={selectedProject}
        onInstall={handleInstall}
      />
    </div>
  );
};
