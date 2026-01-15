import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input } from '../../components/ui';
import { ArrowLeft, Save, RotateCw, HardDrive, FolderOpen, Server, Plus, X, FileX } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../stores/toastStore';

type SettingsTab = 'general' | 'storage' | 'network' | 'advanced';

interface ServerData {
  id: string;
  name: string;
  address: string;
  port: number;
  version: string;
  maxPlayers: number;
  gameMode: string;
  status: string;
  serverPath: string;
  backupPath: string | null;
  backupType: string;
  backupExclusions: string | null;
  jvmArgs: string | null;
  adapterConfig: string | null;
  adapterType: string;
}

interface GeneralSettings {
  name: string;
  maxPlayers: number;
  gameMode: string;
}

interface NetworkSettings {
  address: string;
  port: number;
}

interface StorageSettings {
  serverPath: string;
  backupType: 'local' | 'ftp';
  backupPath: string;
  backupExclusions: string[];
}

interface AdvancedSettings {
  jvmArgs: string;
  jarFile: string;
  assetsPath: string;
  javaPath: string;
}

interface FtpStatus {
  enabled: boolean;
  connected: boolean;
  message: string;
}

export const ServerSettingsPage = () => {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server data from API
  const [server, setServer] = useState<ServerData | null>(null);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    name: '',
    maxPlayers: 20,
    gameMode: 'exploration',
  });

  // Network settings state
  const [networkSettings, setNetworkSettings] = useState<NetworkSettings>({
    address: '0.0.0.0',
    port: 5520,
  });

  // Storage settings state
  const [storageSettings, setStorageSettings] = useState<StorageSettings>({
    serverPath: '',
    backupType: 'local',
    backupPath: '',
    backupExclusions: [],
  });
  const [newExclusion, setNewExclusion] = useState('');
  const [ftpStatus, setFtpStatus] = useState<FtpStatus | null>(null);
  const [storageSaving, setStorageSaving] = useState(false);

  // Advanced settings state
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    jvmArgs: '-Xms1G -Xmx2G',
    jarFile: 'Server/HytaleServer.jar',
    assetsPath: '../Assets.zip',
    javaPath: 'java',
  });

  // Load server data
  useEffect(() => {
    if (!id) return;
    loadServer();
    loadFtpStatus();
  }, [id]);

  const loadServer = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const serverData = await api.getServer<ServerData>(id);
      setServer(serverData);

      // Populate general settings
      setGeneralSettings({
        name: serverData.name || '',
        maxPlayers: serverData.maxPlayers || 20,
        gameMode: serverData.gameMode || 'exploration',
      });

      // Populate network settings
      setNetworkSettings({
        address: serverData.address || '0.0.0.0',
        port: serverData.port || 5520,
      });

      // Parse backup exclusions from JSON
      let exclusions: string[] = [];
      if (serverData.backupExclusions) {
        try {
          exclusions = JSON.parse(serverData.backupExclusions);
        } catch (e) {
          console.error('Failed to parse backup exclusions:', e);
        }
      }

      // Populate storage settings
      setStorageSettings({
        serverPath: serverData.serverPath || '',
        backupType: (serverData.backupType as 'local' | 'ftp') || 'local',
        backupPath: serverData.backupPath || '',
        backupExclusions: exclusions,
      });

      // Parse adapter config
      let adapterConfig: { jarFile?: string; assetsPath?: string; javaPath?: string } = {};
      if (serverData.adapterConfig) {
        try {
          adapterConfig = JSON.parse(serverData.adapterConfig);
        } catch (e) {
          console.error('Failed to parse adapter config:', e);
        }
      }

      // Populate advanced settings
      setAdvancedSettings({
        jvmArgs: serverData.jvmArgs || '-Xms1G -Xmx2G',
        jarFile: adapterConfig.jarFile || 'Server/HytaleServer.jar',
        assetsPath: adapterConfig.assetsPath || '../Assets.zip',
        javaPath: adapterConfig.javaPath || 'java',
      });
    } catch (err: any) {
      console.error('Failed to load server:', err);
      setError(err.message || 'Failed to load server');
    } finally {
      setLoading(false);
    }
  };

  const loadFtpStatus = async () => {
    try {
      const status = await api.get<FtpStatus>('/settings/ftp/status');
      setFtpStatus(status);
    } catch (err) {
      console.error('Failed to load FTP status:', err);
    }
  };

  const handleStorageSave = async () => {
    if (!id) return;
    setStorageSaving(true);
    try {
      await api.updateServer(id, {
        serverPath: storageSettings.serverPath || undefined,
        backupPath: storageSettings.backupPath || null,
        backupType: storageSettings.backupType,
        backupExclusions: storageSettings.backupExclusions.length > 0 ? storageSettings.backupExclusions : null,
      });
      toast.success('Storage settings saved', 'Server storage configuration updated successfully');
      setHasChanges(false);
    } catch (err: any) {
      toast.error('Failed to save storage settings', err.message);
    } finally {
      setStorageSaving(false);
    }
  };

  const handleAddExclusion = () => {
    const trimmed = newExclusion.trim();
    if (!trimmed) return;
    if (storageSettings.backupExclusions.includes(trimmed)) {
      toast.error('Duplicate pattern', 'This exclusion pattern already exists');
      return;
    }
    setStorageSettings(prev => ({
      ...prev,
      backupExclusions: [...prev.backupExclusions, trimmed],
    }));
    setNewExclusion('');
    setHasChanges(true);
  };

  const handleRemoveExclusion = (pattern: string) => {
    setStorageSettings(prev => ({
      ...prev,
      backupExclusions: prev.backupExclusions.filter(p => p !== pattern),
    }));
    setHasChanges(true);
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

  const tabs: { id: SettingsTab; label: string; description: string }[] = [
    { id: 'general', label: 'General', description: 'Basic server settings' },
    { id: 'storage', label: 'Storage', description: 'Server directories and backup location' },
    { id: 'network', label: 'Network', description: 'Network and connection settings' },
    { id: 'advanced', label: 'Advanced', description: 'JVM and advanced configuration' },
  ];

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      let updateData: Record<string, unknown> = {};

      if (activeTab === 'general') {
        updateData = {
          name: generalSettings.name,
          maxPlayers: generalSettings.maxPlayers,
          gameMode: generalSettings.gameMode,
        };
      } else if (activeTab === 'network') {
        updateData = {
          address: networkSettings.address,
          port: networkSettings.port,
        };
      } else if (activeTab === 'storage') {
        // Storage has its own save handler
        await handleStorageSave();
        return;
      } else if (activeTab === 'advanced') {
        updateData = {
          jvmArgs: advancedSettings.jvmArgs,
          adapterConfig: {
            jarFile: advancedSettings.jarFile,
            assetsPath: advancedSettings.assetsPath,
            javaPath: advancedSettings.javaPath,
          },
        };
      }

      await api.updateServer(id, updateData);

      // Update the server state with new values
      if (server) {
        setServer({ ...server, ...updateData } as ServerData);
      }

      toast.success('Settings saved', 'Server configuration updated successfully');
      setHasChanges(false);
    } catch (err: any) {
      toast.error('Failed to save settings', err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!server) return;

    // Reset to the original server values
    setGeneralSettings({
      name: server.name || '',
      maxPlayers: server.maxPlayers || 20,
      gameMode: server.gameMode || 'exploration',
    });

    setNetworkSettings({
      address: server.address || '0.0.0.0',
      port: server.port || 5520,
    });

    // Parse backup exclusions from JSON
    let exclusions: string[] = [];
    if (server.backupExclusions) {
      try {
        exclusions = JSON.parse(server.backupExclusions);
      } catch (e) {
        console.error('Failed to parse backup exclusions:', e);
      }
    }

    setStorageSettings({
      serverPath: server.serverPath || '',
      backupType: (server.backupType as 'local' | 'ftp') || 'local',
      backupPath: server.backupPath || '',
      backupExclusions: exclusions,
    });

    // Parse adapter config for reset
    let adapterConfig: { jarFile?: string; assetsPath?: string; javaPath?: string } = {};
    if (server.adapterConfig) {
      try {
        adapterConfig = JSON.parse(server.adapterConfig);
      } catch (e) {
        console.error('Failed to parse adapter config:', e);
      }
    }

    setAdvancedSettings({
      jvmArgs: server.jvmArgs || '-Xms1G -Xmx2G',
      jarFile: adapterConfig.jarFile || 'Server/HytaleServer.jar',
      assetsPath: adapterConfig.assetsPath || '../Assets.zip',
      javaPath: adapterConfig.javaPath || 'java',
    });

    setHasChanges(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link to={`/servers/${id}`}>
            <Button variant="ghost" icon={<ArrowLeft size={18} />}>
              <span className="hidden sm:inline">Back to Server</span>
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">Server Settings</h1>
            <p className="text-sm sm:text-base text-text-light-muted dark:text-text-muted mt-1 truncate">{server.name}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          {hasChanges && (
            <Button variant="ghost" icon={<RotateCw size={18} />} onClick={handleReset} disabled={saving} className="w-full sm:w-auto">
              Reset
            </Button>
          )}
          <Button variant="primary" icon={<Save size={18} />} onClick={handleSave} disabled={saving || !hasChanges} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 sm:py-2 rounded-lg whitespace-nowrap transition-colors text-sm sm:text-base ${
              activeTab === tab.id
                ? 'bg-accent-primary text-white'
                : 'bg-white dark:bg-gray-100 dark:bg-primary-bg-secondary text-text-light-muted dark:text-text-muted hover:bg-gray-200 dark:bg-gray-800 hover:text-text-light-primary dark:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure basic server information and behavior</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Server Name</label>
                <Input
                  value={generalSettings.name}
                  onChange={(e) => {
                    setGeneralSettings(prev => ({ ...prev, name: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="My Hytale Server"
                />
              </div>

              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Max Players</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={generalSettings.maxPlayers}
                  onChange={(e) => {
                    setGeneralSettings(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) || 20 }));
                    setHasChanges(true);
                  }}
                />
              </div>

              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Game Mode</label>
                <select
                  value={generalSettings.gameMode}
                  onChange={(e) => {
                    setGeneralSettings(prev => ({ ...prev, gameMode: e.target.value }));
                    setHasChanges(true);
                  }}
                  className="w-full bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-text-light-primary dark:text-text-primary focus:outline-none focus:border-accent-primary"
                >
                  <option value="exploration">Exploration</option>
                  <option value="creative">Creative</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Settings */}
      {activeTab === 'storage' && (
        <Card variant="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive size={20} />
                  Storage Settings
                </CardTitle>
                <CardDescription>Configure server directories and backup storage location</CardDescription>
              </div>
              {ftpStatus && storageSettings.backupType === 'ftp' && (
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  ftpStatus.connected
                    ? 'bg-green-500/10 text-green-500'
                    : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    ftpStatus.connected ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  {ftpStatus.connected ? 'FTP Connected' : 'FTP Disconnected'}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Server Directory */}
                <div>
                  <label className="block text-sm font-medium text-text-light-muted dark:text-text-muted mb-2">
                    <FolderOpen size={16} className="inline mr-2" />
                    Server Directory
                  </label>
                  <Input
                    value={storageSettings.serverPath}
                    onChange={(e) => {
                      setStorageSettings(prev => ({ ...prev, serverPath: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder="/path/to/server"
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    The directory where server files are stored
                  </p>
                </div>

                {/* Backup Storage Type */}
                <div>
                  <label className="block text-sm font-medium text-text-light-muted dark:text-text-muted mb-2">
                    <Server size={16} className="inline mr-2" />
                    Backup Storage Type
                  </label>
                  <select
                    value={storageSettings.backupType}
                    onChange={(e) => {
                      setStorageSettings(prev => ({
                        ...prev,
                        backupType: e.target.value as 'local' | 'ftp',
                        backupPath: '', // Reset path when changing type
                      }));
                      setHasChanges(true);
                    }}
                    className="w-full bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-text-light-primary dark:text-text-primary focus:outline-none focus:border-accent-primary"
                  >
                    <option value="local">Local Directory</option>
                    <option value="ftp" disabled={!ftpStatus?.enabled}>
                      FTP Server {!ftpStatus?.enabled && '(Not Configured)'}
                    </option>
                  </select>
                </div>

                {/* Backup Path */}
                <div>
                  <label className="block text-sm font-medium text-text-light-muted dark:text-text-muted mb-2">
                    {storageSettings.backupType === 'ftp' ? 'FTP Remote Path' : 'Local Backup Directory'}
                  </label>
                  <Input
                    value={storageSettings.backupPath}
                    onChange={(e) => {
                      setStorageSettings(prev => ({ ...prev, backupPath: e.target.value }));
                      setHasChanges(true);
                    }}
                    placeholder={
                      storageSettings.backupType === 'ftp'
                        ? '/backups/my-server/'
                        : '/path/to/backups'
                    }
                  />
                  <p className="text-xs text-text-secondary mt-1">
                    {storageSettings.backupType === 'ftp'
                      ? 'Path on the FTP server where backups will be stored. Leave empty to use default.'
                      : 'Local directory for storing backups. Leave empty to use default location.'}
                  </p>
                </div>

                {/* Backup Exclusions */}
                <div>
                  <label className="block text-sm font-medium text-text-light-muted dark:text-text-muted mb-2">
                    <FileX size={16} className="inline mr-2" />
                    Backup Exclusions
                  </label>
                  <p className="text-xs text-text-secondary mb-3">
                    Files and folders matching these patterns will be excluded from backups. Examples:
                    <code className="bg-gray-200 dark:bg-gray-800 px-1 mx-1 rounded">*.log</code> (all .log files),
                    <code className="bg-gray-200 dark:bg-gray-800 px-1 mx-1 rounded">logs/*</code> (logs folder contents),
                    <code className="bg-gray-200 dark:bg-gray-800 px-1 mx-1 rounded">*.log.gz</code> (compressed logs)
                  </p>

                  {/* Add new exclusion */}
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={newExclusion}
                      onChange={(e) => setNewExclusion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddExclusion();
                        }
                      }}
                      placeholder="e.g., *.log, logs/*, crash-reports/**"
                      className="flex-1"
                    />
                    <Button
                      variant="secondary"
                      icon={<Plus size={16} />}
                      onClick={handleAddExclusion}
                      disabled={!newExclusion.trim()}
                    >
                      Add
                    </Button>
                  </div>

                  {/* Exclusion list */}
                  {storageSettings.backupExclusions.length > 0 ? (
                    <div className="space-y-2">
                      {storageSettings.backupExclusions.map((pattern) => (
                        <div
                          key={pattern}
                          className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2"
                        >
                          <code className="text-sm text-text-light-primary dark:text-text-primary font-mono">
                            {pattern}
                          </code>
                          <button
                            onClick={() => handleRemoveExclusion(pattern)}
                            className="text-gray-500 hover:text-danger transition-colors p-1"
                            title="Remove exclusion"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-text-light-muted dark:text-text-muted text-sm border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                      No exclusions configured. All files will be included in backups.
                    </div>
                  )}
                </div>

                {/* FTP Warning */}
                {storageSettings.backupType === 'ftp' && (
                  <div className="bg-blue-500/10 text-blue-400 p-3 rounded text-sm">
                    <strong>Note:</strong> When using FTP storage, backups will be uploaded to the FTP server
                    and deleted from local storage after successful upload. Make sure your FTP server has
                    sufficient storage space.
                  </div>
                )}

                {/* Save Button */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="primary"
                    icon={<Save size={18} />}
                    onClick={handleStorageSave}
                    disabled={storageSaving}
                  >
                    {storageSaving ? 'Saving...' : 'Save Storage Settings'}
                  </Button>
                </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Settings */}
      {activeTab === 'network' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Network Settings</CardTitle>
            <CardDescription>Configure network address and port settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Server IP / Address</label>
                <Input
                  value={networkSettings.address}
                  onChange={(e) => {
                    setNetworkSettings(prev => ({ ...prev, address: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="0.0.0.0"
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  The IP address the server will bind to. Use 0.0.0.0 to listen on all interfaces.
                </p>
              </div>

              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Server Port</label>
                <Input
                  type="number"
                  min={1}
                  max={65535}
                  value={networkSettings.port}
                  onChange={(e) => {
                    setNetworkSettings(prev => ({ ...prev, port: parseInt(e.target.value) || 5520 }));
                    setHasChanges(true);
                  }}
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  The port the server will listen on (default: 5520).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advanced Settings */}
      {activeTab === 'advanced' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Advanced Settings</CardTitle>
            <CardDescription>Java configuration and JVM arguments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Java Executable Path */}
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Java Executable Path</label>
                <Input
                  value={advancedSettings.javaPath}
                  onChange={(e) => {
                    setAdvancedSettings(prev => ({ ...prev, javaPath: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="java"
                  className="font-mono"
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  Path to the Java executable. Use "java" to use system Java, or specify a full path (e.g., /usr/lib/jvm/java-17/bin/java).
                </p>
              </div>

              {/* JAR File Name */}
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">JAR File Path</label>
                <Input
                  value={advancedSettings.jarFile}
                  onChange={(e) => {
                    setAdvancedSettings(prev => ({ ...prev, jarFile: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="Server/HytaleServer.jar"
                  className="font-mono"
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  Path to the server JAR file relative to the server directory.
                </p>
              </div>

              {/* Assets Path */}
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">Assets Path</label>
                <Input
                  value={advancedSettings.assetsPath}
                  onChange={(e) => {
                    setAdvancedSettings(prev => ({ ...prev, assetsPath: e.target.value }));
                    setHasChanges(true);
                  }}
                  placeholder="../Assets.zip"
                  className="font-mono"
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  Path to the Assets.zip file relative to the JAR file location. Used with --assets argument.
                </p>
              </div>

              {/* JVM Arguments */}
              <div>
                <label className="block text-sm text-text-light-muted dark:text-text-muted mb-2">JVM Arguments</label>
                <textarea
                  value={advancedSettings.jvmArgs}
                  onChange={(e) => {
                    setAdvancedSettings(prev => ({ ...prev, jvmArgs: e.target.value }));
                    setHasChanges(true);
                  }}
                  className="w-full bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-text-light-primary dark:text-text-primary focus:outline-none focus:border-accent-primary font-mono text-sm"
                  rows={4}
                  placeholder="-Xms1G -Xmx2G"
                />
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  JVM arguments passed to the Java process. Common options: -Xms (min memory), -Xmx (max memory).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
