import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Server, Users, Settings, FileText, Package, Database, DollarSign, Shield, Activity, X } from 'lucide-react';
import { useSearchStore } from '../../stores/searchStore';
import { mockServers, mockPlayers } from '../../data/mockData';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'server' | 'player' | 'page';
  icon: React.ReactNode;
  path: string;
}

export const CommandPalette = () => {
  const { isOpen, closeSearch } = useSearchStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();

  // Define all searchable items
  const allItems: SearchResult[] = useMemo(() => {
    const items: SearchResult[] = [];

    // Pages
    items.push(
      { id: 'dashboard', title: 'Dashboard', description: 'Overview and statistics', category: 'page', icon: <Activity size={18} />, path: '/dashboard' },
      { id: 'servers', title: 'Servers', description: 'Manage your servers', category: 'page', icon: <Server size={18} />, path: '/servers' },
      { id: 'players', title: 'Players', description: 'View and manage players', category: 'page', icon: <Users size={18} />, path: '/players' },
      { id: 'mods', title: 'Mods', description: 'Browse and install mods', category: 'page', icon: <Package size={18} />, path: '/mods' },
      { id: 'modpacks', title: 'Modpacks', description: 'Pre-configured mod collections', category: 'page', icon: <Package size={18} />, path: '/modpacks' },
      { id: 'backups', title: 'Backups', description: 'Manage server backups', category: 'page', icon: <Database size={18} />, path: '/backups' },
      { id: 'console', title: 'Console', description: 'Server console and logs', category: 'page', icon: <FileText size={18} />, path: '/console' },
      { id: 'automation', title: 'Automation', description: 'Scheduled tasks', category: 'page', icon: <Activity size={18} />, path: '/automation' },
      { id: 'analytics', title: 'Analytics', description: 'Performance metrics', category: 'page', icon: <Activity size={18} />, path: '/analytics' },
      { id: 'files', title: 'File Manager', description: 'Browse server files', category: 'page', icon: <FileText size={18} />, path: '/files' },
      { id: 'permissions', title: 'Permissions', description: 'Manage user permissions', category: 'page', icon: <Shield size={18} />, path: '/permissions' },
      { id: 'economy', title: 'Economy', description: 'Manage server economy', category: 'page', icon: <DollarSign size={18} />, path: '/economy' },
      { id: 'bridge', title: 'Hytale Bridge', description: 'In-game integration', category: 'page', icon: <Activity size={18} />, path: '/bridge' },
      { id: 'settings', title: 'Settings', description: 'Panel configuration', category: 'page', icon: <Settings size={18} />, path: '/settings' }
    );

    // Servers
    mockServers.forEach((server) => {
      items.push({
        id: `server-${server.id}`,
        title: server.name,
        description: `${server.version} • ${server.currentPlayers}/${server.maxPlayers} players`,
        category: 'server',
        icon: <Server size={18} />,
        path: `/servers/${server.id}`,
      });
    });

    // Players
    mockPlayers.forEach((player) => {
      items.push({
        id: `player-${player.uuid}`,
        title: player.username,
        description: `${player.role} • ${player.status}`,
        category: 'player',
        icon: <Users size={18} />,
        path: `/players/${player.uuid}`,
      });
    });

    return items;
  }, []);

  // Filter results based on query
  const results = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);

    const lowerQuery = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.description.toLowerCase().includes(lowerQuery) ||
        item.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [query, allItems]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useSearchStore.getState().toggleSearch();
      }

      if (!isOpen) return;

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        closeSearch();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, closeSearch]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    closeSearch();
  };

  const categoryColors = {
    page: 'text-accent-primary',
    server: 'text-success',
    player: 'text-accent-secondary',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[10vh]">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeSearch}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Command Palette */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="relative w-full max-w-2xl mx-4 bg-white dark:bg-primary-bg-secondary border-2 border-gray-300 dark:border-gray-800 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-300 dark:border-gray-800">
            <Search size={20} className="text-text-light-muted dark:text-text-muted flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search servers, players, pages..."
              className="flex-1 bg-transparent text-text-light-primary dark:text-text-primary placeholder-text-muted dark:placeholder-text-muted outline-none text-lg"
              autoFocus
            />
            <button
              onClick={closeSearch}
              className="text-text-light-muted dark:text-text-muted hover:text-text-primary dark:hover:text-text-primary transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {results.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-text-light-muted dark:text-text-muted">No results found</p>
              </div>
            ) : (
              <div className="py-2">
                {results.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${
                      index === selectedIndex
                        ? 'bg-accent-primary/10 border-l-2 border-accent-primary'
                        : 'border-l-2 border-transparent hover:bg-primary-bg/50 dark:hover:bg-primary-bg/50'
                    }`}
                  >
                    <div className={categoryColors[result.category]}>
                      {result.icon}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-text-light-primary dark:text-text-primary truncate">
                        {result.title}
                      </p>
                      <p className="text-xs text-text-light-muted dark:text-text-muted truncate">
                        {result.description}
                      </p>
                    </div>
                    <span className="text-xs text-text-light-muted dark:text-text-muted capitalize px-2 py-1 rounded bg-gray-800/50 dark:bg-gray-800/50">
                      {result.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-300 dark:border-gray-800 flex items-center justify-between text-xs text-text-light-muted dark:text-text-muted">
            <div className="flex items-center gap-4">
              <span>↑↓ Navigate</span>
              <span>↵ Select</span>
              <span>Esc Close</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-2 py-1 rounded bg-gray-800 dark:bg-gray-800 font-mono">⌘K</kbd>
              <span>to toggle</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
