import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, StatusIndicator } from '../../components/ui';
import { ArrowLeft, Play, Square, RotateCw, Settings, Users, Activity, Terminal, Database, Package, Trash2, ExternalLink, Plus, RefreshCw, Globe } from 'lucide-react';
import { useToast } from '../../stores/toastStore';
import api from '../../services/api';
import websocket from '../../services/websocket';
import { motion, AnimatePresence } from 'framer-motion';

interface Server {
  id: string;
  name: string;
  address: string;
  port: number;
  version: string;
  maxPlayers: number;
  gameMode: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping';
  adapterType: string;
  createdAt: string;
}

interface ServerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  diskUsage: number;
  tps: number;
  uptime: number;
  timestamp: string;
}

interface ServerStatus {
  serverId: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
  version: string;
  uptime: number;
}

interface InstalledMod {
  id: string;
  serverId: string;
  projectId: string;
  projectTitle: string;
  projectIconUrl?: string;
  versionId: string;
  versionName: string;
  classification: string;
  filePath: string;
  fileSize: number;
  enabled: boolean;
  installedAt: string;
}

export const ServerDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [server, setServer] = useState<Server | null>(null);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installedMods, setInstalledMods] = useState<InstalledMod[]>([]);
  const [modsLoading, setModsLoading] = useState(false);
  const [uninstallingMod, setUninstallingMod] = useState<string | null>(null);

  // Fetch server data on mount
  useEffect(() => {
    if (!id) return;
    fetchServer();
  }, [id]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!id || !server) return;

    const unsubscribe = websocket.subscribeToServer(id, {
      onStatus: (data) => {
        setStatus(data.status);
        setServer(prev => prev ? { ...prev, status: data.status.status } : null);
      },
      onMetrics: (data) => {
        setMetrics(data.metrics);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [id, server?.id]);

  const fetchServer = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);

      const [serverData, statusData, metricsData] = await Promise.all([
        api.getServer<Server>(id),
        api.getServerStatus(id),
        api.getServerMetrics(id),
      ]);

      setServer(serverData);
      setStatus({
        serverId: id,
        status: statusData.status,
        playerCount: statusData.playerCount,
        maxPlayers: statusData.maxPlayers,
        version: serverData.version,
        uptime: statusData.uptime,
      });
      setMetrics({
        cpuUsage: metricsData.cpuUsage,
        memoryUsage: metricsData.memoryUsage,
        memoryTotal: metricsData.memoryTotal,
        diskUsage: metricsData.diskUsage,
        tps: metricsData.tps,
        uptime: metricsData.uptime,
        timestamp: metricsData.timestamp?.toString() ?? new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Error fetching server:', err);
      setError(err.message || 'Failed to load server');
      toast.error('Failed to load server', err.message);
    } finally {
      setLoading(false);
    }

    // Also fetch installed mods
    fetchMods();
  };

  const fetchMods = async () => {
    if (!id) return;

    setModsLoading(true);
    try {
      const mods = await api.getServerMods<InstalledMod>(id);
      setInstalledMods(mods);
    } catch (err) {
      console.error('Error fetching mods:', err);
      // Don't show error toast for mods - just log it
    } finally {
      setModsLoading(false);
    }
  };

  const handleUninstallMod = async (modId: string, modName: string) => {
    if (!id) return;

    setUninstallingMod(modId);
    try {
      await api.uninstallMod(id, modId);
      setInstalledMods(prev => prev.filter(m => m.id !== modId));
      toast.success('Mod uninstalled', `${modName} has been removed`);
    } catch (err: any) {
      toast.error('Failed to uninstall mod', err.message);
    } finally {
      setUninstallingMod(null);
    }
  };

  const handleStart = async () => {
    if (!id) return;

    try {
      await api.startServer(id);
      toast.success('Server starting', `${server?.name} is starting up...`);
      setServer(prev => prev ? { ...prev, status: 'starting' } : null);
    } catch (err: any) {
      toast.error('Failed to start server', err.message);
    }
  };

  const handleStop = async () => {
    if (!id) return;

    try {
      await api.stopServer(id);
      toast.warning('Server stopping', `${server?.name} is shutting down...`);
      setServer(prev => prev ? { ...prev, status: 'stopping' } : null);
    } catch (err: any) {
      toast.error('Failed to stop server', err.message);
    }
  };

  const handleRestart = async () => {
    if (!id) return;

    try {
      await api.restartServer(id);
      toast.info('Server restarting', `${server?.name} is restarting...`);
    } catch (err: any) {
      toast.error('Failed to restart server', err.message);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">Loading...</h2>
        </div>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
            {error || 'Server Not Found'}
          </h2>
          <Link to="/servers" className="text-accent-primary hover:underline mt-4 inline-block">
            ← Back to Servers
          </Link>
        </div>
      </div>
    );
  }

  const currentPlayers = status?.playerCount || 0;
  const currentUptime = metrics?.uptime || 0;
  const currentTps = metrics?.tps || 0;
  const currentCpu = metrics?.cpuUsage || 0;
  const currentMemory = metrics?.memoryUsage || 0;
  const totalMemory = metrics?.memoryTotal || 8192;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to="/servers">
            <Button variant="ghost" icon={<ArrowLeft size={18} />}>
              <span className="hidden sm:inline">Back</span>
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary truncate">
              {server.name}
            </h1>
            <p className="text-sm sm:text-base text-text-light-muted dark:text-text-muted mt-1">
              {server.address}:{server.port}
            </p>
          </div>
          <div className="lg:hidden">
            <StatusIndicator status={server.status} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="hidden lg:block">
            <StatusIndicator status={server.status} showLabel />
          </div>
          {server.status === 'running' ? (
            <div className="flex gap-2">
              <Button variant="danger" icon={<Square size={18} />} className="flex-1 sm:flex-initial" onClick={handleStop}>
                Stop
              </Button>
              <Button variant="secondary" icon={<RotateCw size={18} />} className="flex-1 sm:flex-initial" onClick={handleRestart}>
                Restart
              </Button>
            </div>
          ) : server.status === 'stopped' ? (
            <Button variant="success" icon={<Play size={18} />} className="w-full sm:w-auto" onClick={handleStart}>
              Start
            </Button>
          ) : (
            <Button variant="ghost" className="w-full sm:w-auto" disabled>
              {server.status}...
            </Button>
          )}
          <Button variant="ghost" icon={<Globe size={18} />} className="w-full sm:w-auto" onClick={() => navigate(`/servers/${id}/worlds`)}>
            Worlds
          </Button>
          <Button variant="ghost" icon={<Settings size={18} />} className="w-full sm:w-auto" onClick={() => navigate(`/servers/${id}/settings`)}>
            Settings
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Players</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                {currentPlayers} / {server.maxPlayers}
              </p>
            </div>
            <Users size={32} className="text-accent-primary" />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">TPS</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                {server.status === 'running' ? currentTps.toFixed(1) : '-'}
              </p>
            </div>
            <Activity size={32} className={currentTps >= 19.5 ? 'text-success' : currentTps >= 18 ? 'text-warning' : 'text-danger'} />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Memory</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                {server.status === 'running' ? `${Math.round(currentMemory)} MB` : '-'}
              </p>
            </div>
            <Terminal size={32} className="text-accent-secondary" />
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardContent className="flex items-center justify-between">
            <div>
              <p className="text-text-light-muted dark:text-text-muted text-sm">Uptime</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                {server.status === 'running' ? formatUptime(currentUptime) : 'Offline'}
              </p>
            </div>
            <Database size={32} className="text-success" />
          </CardContent>
        </Card>
      </div>

      {/* Server Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Server Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-text-light-muted dark:text-text-muted">Version:</span>
              <Badge variant="info">{server.version}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-muted dark:text-text-muted">Game Mode:</span>
              <Badge variant="default">{server.gameMode}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-muted dark:text-text-muted">Adapter Type:</span>
              <Badge variant="default">
                {server.adapterType === 'java' ? 'Java JAR' : server.adapterType}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-light-muted dark:text-text-muted">Created:</span>
              <span className="text-text-light-primary dark:text-text-primary">
                {new Date(server.createdAt).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Resource Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-text-light-muted dark:text-text-muted text-sm">CPU Usage</span>
                <span className="text-text-light-primary dark:text-text-primary font-medium">
                  {server.status === 'running' ? `${currentCpu.toFixed(1)}%` : '-'}
                </span>
              </div>
              {server.status === 'running' && (
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      currentCpu > 70 ? 'bg-danger' : currentCpu > 50 ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${currentCpu}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-text-light-muted dark:text-text-muted text-sm">Memory Usage</span>
                <span className="text-text-light-primary dark:text-text-primary font-medium">
                  {server.status === 'running' ? `${Math.round(currentMemory)} / ${Math.round(totalMemory)} MB` : '-'}
                </span>
              </div>
              {server.status === 'running' && (
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-secondary"
                    style={{ width: `${(currentMemory / totalMemory) * 100}%` }}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-text-light-muted dark:text-text-muted text-sm">Player Slots</span>
                <span className="text-text-light-primary dark:text-text-primary font-medium">
                  {currentPlayers} / {server.maxPlayers}
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-primary"
                  style={{ width: `${(currentPlayers / server.maxPlayers) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Installed Mods Section */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package size={20} />
                Installed Mods
                {installedMods.length > 0 && (
                  <Badge variant="info" size="sm">{installedMods.length}</Badge>
                )}
              </CardTitle>
              <CardDescription>Mods and modpacks installed on this server</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw size={16} className={modsLoading ? 'animate-spin' : ''} />}
                onClick={fetchMods}
                disabled={modsLoading}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={16} />}
                onClick={() => navigate('/mods')}
              >
                Browse Mods
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {modsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-primary border-t-transparent" />
            </div>
          ) : installedMods.length === 0 ? (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-text-light-muted dark:text-text-muted mb-3 opacity-50" />
              <p className="text-text-light-muted dark:text-text-muted mb-4">No mods installed on this server</p>
              <Button
                variant="secondary"
                icon={<Plus size={16} />}
                onClick={() => navigate('/mods')}
              >
                Browse & Install Mods
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {installedMods.map((mod) => (
                  <motion.div
                    key={mod.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-accent-primary/50 transition-colors"
                  >
                    {/* Mod Icon */}
                    <img
                      src={mod.projectIconUrl || `https://via.placeholder.com/48/6366f1/ffffff?text=${mod.projectTitle[0]}`}
                      alt={mod.projectTitle}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />

                    {/* Mod Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-text-light-primary dark:text-text-primary truncate">
                          {mod.projectTitle}
                        </h4>
                        <Badge size="sm" variant={mod.classification === 'MODPACK' ? 'info' : 'default'}>
                          {mod.classification}
                        </Badge>
                        {!mod.enabled && (
                          <Badge size="sm" variant="warning">Disabled</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-text-light-muted dark:text-text-muted">
                        <span>v{mod.versionName}</span>
                        <span>•</span>
                        <span>{(mod.fileSize / 1024).toFixed(1)} KB</span>
                        <span>•</span>
                        <span>Installed {new Date(mod.installedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<ExternalLink size={14} />}
                        onClick={() => {
                          const slug = mod.projectTitle.toLowerCase().replace(/\s+/g, '-');
                          const classification = mod.classification.toLowerCase();
                          window.open(`https://modtale.net/${classification}/${slug}-${mod.projectId}`, '_blank');
                        }}
                        title="View on Modtale"
                      />
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={14} />}
                        onClick={() => handleUninstallMod(mod.id, mod.projectTitle)}
                        disabled={uninstallingMod === mod.id}
                        title="Uninstall mod"
                      >
                        {uninstallingMod === mod.id ? 'Removing...' : 'Remove'}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common server management tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Button variant="secondary" icon={<Terminal size={18} />} className="w-full" onClick={() => navigate('/console')}>
              Open Console
            </Button>
            <Button variant="secondary" icon={<Globe size={18} />} className="w-full" onClick={() => navigate(`/servers/${id}/worlds`)}>
              Manage Worlds
            </Button>
            <Button variant="secondary" icon={<Database size={18} />} className="w-full" onClick={() => navigate('/backups')}>
              Create Backup
            </Button>
            <Button variant="secondary" icon={<Package size={18} />} className="w-full" onClick={() => navigate('/mods')}>
              Browse Mods
            </Button>
            <Button variant="secondary" icon={<Users size={18} />} className="w-full" onClick={() => navigate('/players')}>
              View Players
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
