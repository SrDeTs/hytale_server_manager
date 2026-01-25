import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '../../components/ui';
import { Globe, Trash2, RefreshCw, ArrowLeft, Settings } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../stores/toastStore';
import { HytaleWorldConfigModal } from '../../components/modals/HytaleWorldConfigModal';

interface Server {
  id: string;
  name: string;
  status: string;
}

interface World {
  id: string;
  serverId: string;
  name: string;
  folderPath: string;
  sizeBytes: number;
  isActive: boolean;
  description?: string;
  createdAt: Date;
  lastPlayed?: Date;
}

export const ServerWorldsPage = () => {
  const { id: serverId } = useParams<{ id: string }>();
  const toast = useToast();

  const [server, setServer] = useState<Server | null>(null);
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configModalWorld, setConfigModalWorld] = useState<World | null>(null);

  useEffect(() => {
    if (serverId) {
      loadServer();
      loadWorlds();
    }
  }, [serverId]);

  const loadServer = async () => {
    if (!serverId) return;
    try {
      const data = await api.getServer<Server>(serverId);
      setServer(data);
    } catch (err: any) {
      console.error('Failed to load server:', err);
    }
  };

  const loadWorlds = async () => {
    if (!serverId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.listWorlds<World>(serverId);
      setWorlds(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load worlds');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorld = async (worldId: string, worldName: string) => {
    if (!serverId) return;

    if (!confirm(`Are you sure you want to delete world "${worldName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteWorld(serverId, worldId);
      toast.success('World deleted', `${worldName} has been removed`);
      loadWorlds();
    } catch (err: any) {
      toast.error('Failed to delete world', err.message || 'An error occurred');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) {
      return bytes + ' B';
    }
    const kb = bytes / 1024;
    if (kb < 1024) {
      return kb.toFixed(1) + ' KB';
    }
    const mb = kb / 1024;
    if (mb < 1024) {
      return mb.toFixed(2) + ' MB';
    }
    return (mb / 1024).toFixed(2) + ' GB';
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to={`/servers/${serverId}`}>
            <Button variant="ghost" icon={<ArrowLeft size={18} />}>
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">
              Worlds
            </h1>
            {server && (
              <p className="text-sm sm:text-base text-text-light-muted dark:text-text-muted mt-1">
                {server.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<RefreshCw size={16} className={loading ? 'animate-spin' : ''} />}
            onClick={loadWorlds}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Worlds List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe size={20} />
            Universe Worlds
          </CardTitle>
          <CardDescription>
            Manage worlds in this server's universe. Each world has its own configuration and can be activated independently.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-500/10 text-red-500 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-primary border-t-transparent" />
            </div>
          ) : worlds.length === 0 ? (
            <div className="text-center py-12">
              <Globe size={48} className="mx-auto text-text-light-muted dark:text-text-muted mb-3 opacity-50" />
              <p className="text-text-light-muted dark:text-text-muted mb-2">No worlds found</p>
              <p className="text-sm text-text-light-muted dark:text-text-muted opacity-75">
                Worlds will appear here once the server has created them
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {worlds.map(world => (
                <div
                  key={world.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-accent-primary/50 transition-colors gap-4"
                >
                  <div className="flex items-start sm:items-center gap-4 flex-1">
                    <Globe
                      size={24}
                      className="flex-shrink-0 mt-1 sm:mt-0 text-text-light-muted dark:text-text-muted"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-text-light-primary dark:text-text-primary">
                        {world.name}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-light-muted dark:text-text-muted mt-1">
                        <span>Size: {formatSize(world.sizeBytes)}</span>
                        {world.lastPlayed && (
                          <span>Last played: {formatDate(world.lastPlayed)}</span>
                        )}
                      </div>
                      {world.description && (
                        <p className="text-sm text-text-light-muted dark:text-text-muted mt-2 line-clamp-2">
                          {world.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 sm:flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Settings size={16} />}
                      title="World settings"
                      onClick={() => setConfigModalWorld(world)}
                    >
                      <span className="hidden sm:inline">Config</span>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
                      onClick={() => handleDeleteWorld(world.id, world.name)}
                      title="Delete world"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>About Universes & Worlds</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-text-light-muted dark:text-text-muted space-y-2">
          <p>
            In Hytale, a <strong className="text-text-light-primary dark:text-text-primary">universe</strong> contains
            multiple <strong className="text-text-light-primary dark:text-text-primary">worlds</strong>, each with their
            own configuration files and settings.
          </p>
          <p>
            Each world can have different settings for PvP, fall damage, NPC spawning, game time, and more.
          </p>
        </CardContent>
      </Card>

      {/* World Config Modal */}
      {configModalWorld && (
        <HytaleWorldConfigModal
          world={configModalWorld}
          serverStatus={server?.status || 'stopped'}
          isOpen={!!configModalWorld}
          onClose={() => setConfigModalWorld(null)}
          onSaved={loadWorlds}
        />
      )}
    </div>
  );
};
