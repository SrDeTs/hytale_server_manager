import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, DataTable, type Column } from '../../components/ui';
import { Database, RotateCcw, Plus, Calendar, Trash2, AlertCircle, X } from 'lucide-react';
import { useToast } from '../../stores/toastStore';
import api from '../../services/api';
import { CreateBackupModal } from './CreateBackupModal';

interface Backup {
  id: string;
  serverId: string;
  name: string;
  description: string | null;
  filePath: string;
  fileSize: number;
  status: string;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  totalFiles: number | null;
  backedUpFiles: number | null;
  skippedFiles: string | null; // JSON array of skipped file paths with reasons
  server: {
    id: string;
    name: string;
  };
}

interface Server {
  id: string;
  name: string;
  status: string;
}

export const BackupsPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBackups, setSelectedBackups] = useState<Backup[]>([]);
  const [deletingMultiple, setDeletingMultiple] = useState(false);
  const [viewingSkippedFiles, setViewingSkippedFiles] = useState<Backup | null>(null);

  // Memoize callbacks to prevent infinite loops in DataTable
  const handleSelectionChange = useCallback((items: Backup[]) => {
    setSelectedBackups(items);
  }, []);

  const keyExtractor = useCallback((backup: Backup) => backup.id, []);

  const [stats, setStats] = useState({
    totalBackups: 0,
    totalSize: 0,
    completedBackups: 0,
    failedBackups: 0,
  });

  useEffect(() => {
    fetchServers();
  }, []);

  // Fetch backups when selectedServer changes OR when servers are loaded
  useEffect(() => {
    // Only fetch if we have servers loaded (needed for 'all' option)
    if (selectedServer === 'all' && servers.length === 0) {
      return; // Wait for servers to load
    }
    fetchBackups();
  }, [selectedServer, servers.length]);

  const fetchServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data.map((s: any) => ({ id: s.id, name: s.name, status: s.status })));
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast.error('Failed to load servers', 'Please try again later');
    }
  };

  const fetchBackups = async () => {
    try {
      setLoading(true);

      if (selectedServer === 'all') {
        // Fetch backups for all servers
        const allBackups: Backup[] = [];
        for (const server of servers) {
          const serverBackups = await api.getServerBackups<Backup>(server.id);
          allBackups.push(...serverBackups);
        }
        setBackups(allBackups);

        // Calculate total stats
        const totalSize = allBackups.reduce((sum, b) => sum + b.fileSize, 0);
        const completed = allBackups.filter(b => b.status === 'completed').length;
        const failed = allBackups.filter(b => b.status === 'failed').length;

        setStats({
          totalBackups: allBackups.length,
          totalSize,
          completedBackups: completed,
          failedBackups: failed,
        });
      } else {
        // Fetch backups for selected server
        const [serverBackups, serverStats] = await Promise.all([
          api.getServerBackups<Backup>(selectedServer),
          api.getBackupStats<typeof stats>(selectedServer),
        ]);

        setBackups(serverBackups);
        setStats(serverStats);
      }
    } catch (error: any) {
      console.error('Error fetching backups:', error);
      toast.error('Failed to load backups', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async (serverId: string, description: string) => {
    try {
      const backup = await api.createBackup<Backup>(serverId, description);
      toast.success('Backup started', `${backup.server.name} backup is being created in the background`);
      await fetchBackups();
    } catch (error: any) {
      toast.error('Failed to create backup', error.message);
      throw error;
    }
  };

  const handleRestore = async (backup: Backup) => {
    if (!confirm(`Are you sure you want to restore ${backup.server.name} from this backup? This will replace all current server files.`)) {
      return;
    }

    try {
      await api.restoreBackup(backup.id);
      toast.success('Backup restored', `${backup.server.name} has been restored from backup`);
      await fetchBackups();
    } catch (error: any) {
      toast.error('Failed to restore backup', error.message);
    }
  };

  const handleDelete = async (backup: Backup) => {
    if (!confirm(`Are you sure you want to delete this backup? This action cannot be undone.`)) {
      return;
    }

    try {
      await api.deleteBackup(backup.id);
      toast.success('Backup deleted', 'Backup has been removed');
      await fetchBackups();
    } catch (error: any) {
      toast.error('Failed to delete backup', error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBackups.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedBackups.length} backup(s)? This action cannot be undone.`)) {
      return;
    }

    setDeletingMultiple(true);
    try {
      const backupIds = selectedBackups.map(b => b.id);
      const result = await api.deleteBackups(backupIds);

      if (result.deleted > 0) {
        toast.success(
          `Deleted ${result.deleted} backup(s)`,
          result.failed > 0 ? `${result.failed} backup(s) failed to delete` : undefined
        );
      }

      if (result.failed > 0) {
        toast.warning('Some backups failed to delete', result.errors?.join(', ') || 'Unknown error');
      }

      await fetchBackups();
      setSelectedBackups([]);
    } catch (error: any) {
      toast.error('Failed to delete backups', error.message);
    } finally {
      setDeletingMultiple(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const columns: Column<Backup>[] = [
    {
      key: 'serverName',
      label: 'Server',
      render: (backup) => (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/servers/${backup.server.id}`);
            }}
            className="font-medium text-accent-primary hover:text-accent-primary/80 hover:underline transition-colors text-left"
          >
            {backup.server.name}
          </button>
          {backup.description && <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">{backup.description}</p>}
        </div>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (backup) => (
        <span className="text-sm font-mono text-text-light-primary dark:text-text-primary">{backup.name}</span>
      ),
    },
    {
      key: 'fileSize',
      label: 'Size',
      render: (backup) => <span>{formatBytes(backup.fileSize)}</span>,
    },
    {
      key: 'files',
      label: 'Files',
      render: (backup) => {
        if (backup.totalFiles === null) {
          return <span className="text-text-light-muted dark:text-text-muted">-</span>;
        }
        const skippedCount = backup.skippedFiles ? JSON.parse(backup.skippedFiles).length : 0;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">
              {backup.backedUpFiles}/{backup.totalFiles}
            </span>
            {skippedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="!p-1"
                icon={<AlertCircle size={14} className="text-warning" />}
                onClick={() => setViewingSkippedFiles(backup)}
                title={`${skippedCount} files skipped`}
              />
            )}
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (backup) => (
        <div>
          <p>{new Date(backup.createdAt).toLocaleDateString()}</p>
          <p className="text-xs text-text-light-muted dark:text-text-muted">
            {new Date(backup.createdAt).toLocaleTimeString()}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (backup) => (
        <Badge
          variant={
            backup.status === 'completed'
              ? 'success'
              : backup.status === 'creating'
              ? 'info'
              : backup.status === 'failed'
              ? 'danger'
              : 'warning'
          }
          size="sm"
        >
          {backup.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (backup) => (
        <div className="flex gap-2">
          {backup.status === 'completed' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={14} />}
                onClick={() => handleRestore(backup)}
              >
                Restore
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(backup)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">
            Backups
          </h1>
          <p className="text-text-light-muted dark:text-text-muted mt-1">Manage server backups and schedules</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
          Create Backup
        </Button>
      </div>

      {/* Server Selector */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-text-light-muted dark:text-text-muted">Server:</span>
        <button
          onClick={() => setSelectedServer('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedServer === 'all'
              ? 'bg-accent-primary text-black'
              : 'bg-white dark:bg-primary-bg-secondary text-text-light-muted dark:text-text-muted hover:text-text-light-primary dark:hover:text-text-primary'
          }`}
        >
          All Servers
        </button>
        {servers.map((server) => (
          <button
            key={server.id}
            onClick={() => setSelectedServer(server.id)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedServer === server.id
                ? 'bg-accent-primary text-black'
                : 'bg-white dark:bg-primary-bg-secondary text-text-light-muted dark:text-text-muted hover:text-text-light-primary dark:hover:text-text-primary'
            }`}
          >
            {server.name}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Total Backups</p>
                <p className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary mt-1">
                  {stats.totalBackups}
                </p>
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
                  {stats.completedBackups} completed, {stats.failedBackups} failed
                </p>
              </div>
              <Database size={32} className="text-accent-primary" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Storage Used</p>
                <p className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary mt-1">
                  {formatBytes(stats.totalSize)}
                </p>
              </div>
              <Database size={32} className="text-success" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Avg Backup Size</p>
                <p className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary mt-1">
                  {stats.totalBackups > 0 ? formatBytes(stats.totalSize / stats.totalBackups) : '0 Bytes'}
                </p>
              </div>
              <Calendar size={32} className="text-accent-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>
            {selectedServer === 'all' ? 'All Backups' : `${servers.find(s => s.id === selectedServer)?.name} Backups`}
            {loading && ' (Loading...)'}
          </CardTitle>
          <CardDescription>All server backups with advanced filtering and sorting</CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 && !loading ? (
            <div className="text-center py-12 text-text-light-muted dark:text-text-muted">
              <Database size={48} className="mx-auto mb-4 opacity-50" />
              <p>No backups found</p>
              <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>
                Create Your First Backup
              </Button>
            </div>
          ) : (
            <DataTable
              data={backups}
              columns={columns}
              keyExtractor={keyExtractor}
              itemsPerPage={10}
              searchable
              exportable
              selectable
              onSelectionChange={handleSelectionChange}
              bulkActions={
                <Button
                  variant="danger"
                  size="sm"
                  icon={<Trash2 size={14} />}
                  onClick={handleBulkDelete}
                  loading={deletingMultiple}
                  disabled={deletingMultiple}
                >
                  Delete Selected
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <CreateBackupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateBackup}
        servers={servers}
      />

      {/* Skipped Files Modal */}
      {viewingSkippedFiles && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-primary-bg-secondary rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-heading font-bold text-text-light-primary dark:text-text-primary">
                  Skipped Files
                </h2>
                <p className="text-sm text-text-light-muted dark:text-text-muted">
                  {viewingSkippedFiles.name}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<X size={18} />}
                onClick={() => setViewingSkippedFiles(null)}
              />
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {(() => {
                const skippedFiles: string[] = viewingSkippedFiles.skippedFiles
                  ? JSON.parse(viewingSkippedFiles.skippedFiles)
                  : [];

                if (skippedFiles.length === 0) {
                  return (
                    <p className="text-text-light-muted dark:text-text-muted text-center py-8">
                      No files were skipped during this backup.
                    </p>
                  );
                }

                // Group by reason
                const byPattern = skippedFiles.filter(f => f.includes('(excluded by pattern)'));
                const byLocked = skippedFiles.filter(f => f.includes('(locked') || f.includes('(inaccessible)'));
                const other = skippedFiles.filter(f => !f.includes('(excluded by pattern)') && !f.includes('(locked') && !f.includes('(inaccessible)'));

                return (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-text-light-muted dark:text-text-muted">
                      <AlertCircle size={16} className="text-warning" />
                      <span>{skippedFiles.length} file(s) were skipped during backup</span>
                    </div>

                    {byPattern.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-primary mb-2">
                          Excluded by Pattern ({byPattern.length})
                        </h3>
                        <div className="bg-gray-100 dark:bg-primary-bg rounded-lg p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1">
                            {byPattern.map((file, i) => (
                              <li key={i} className="text-xs font-mono text-text-light-muted dark:text-text-muted">
                                {file.replace(' (excluded by pattern)', '')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {byLocked.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-primary mb-2">
                          Locked/Inaccessible ({byLocked.length})
                        </h3>
                        <div className="bg-gray-100 dark:bg-primary-bg rounded-lg p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1">
                            {byLocked.map((file, i) => (
                              <li key={i} className="text-xs font-mono text-text-light-muted dark:text-text-muted">
                                {file.replace(' (locked/inaccessible)', '')}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {other.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-text-light-primary dark:text-text-primary mb-2">
                          Other ({other.length})
                        </h3>
                        <div className="bg-gray-100 dark:bg-primary-bg rounded-lg p-3 max-h-40 overflow-y-auto">
                          <ul className="space-y-1">
                            {other.map((file, i) => (
                              <li key={i} className="text-xs font-mono text-text-light-muted dark:text-text-muted">
                                {file}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setViewingSkippedFiles(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
