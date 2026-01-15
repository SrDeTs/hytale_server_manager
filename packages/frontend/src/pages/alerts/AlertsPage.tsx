import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, DataTable, type Column } from '../../components/ui';
import { Bell, AlertCircle, AlertTriangle, Info, Check, CheckCheck, RefreshCw, Trash2 } from 'lucide-react';
import { useToast } from '../../stores/toastStore';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  serverId: string;
  serverName?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

interface Server {
  id: string;
  name: string;
  status: string;
}

export const AlertsPage = () => {
  const toast = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'unresolved'>('all');

  const handleSelectionChange = useCallback((items: Alert[]) => {
    setSelectedAlerts(items);
  }, []);

  const keyExtractor = useCallback((alert: Alert) => alert.id, []);

  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    critical: 0,
    warning: 0,
    info: 0,
  });

  useEffect(() => {
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer === 'all' && servers.length === 0) {
      return;
    }
    fetchAlerts();
  }, [selectedServer, servers.length, filter]);

  const fetchServers = async () => {
    try {
      const data = await api.getServers();
      setServers(data.map((s: any) => ({ id: s.id, name: s.name, status: s.status })));
    } catch (error) {
      console.error('Error fetching servers:', error);
      toast.error('Failed to load servers', 'Please try again later');
    }
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);

      let allAlerts: Alert[] = [];

      if (selectedServer === 'all') {
        // Fetch alerts using the global endpoint
        allAlerts = await api.getAlerts<Alert>(undefined, {
          unreadOnly: filter === 'unread',
          unresolvedOnly: filter === 'unresolved',
          limit: 200,
        });
      } else {
        // Fetch alerts for selected server
        allAlerts = await api.getAlerts<Alert>(selectedServer, {
          unreadOnly: filter === 'unread',
          unresolvedOnly: filter === 'unresolved',
          limit: 200,
        });
      }

      // Enrich alerts with server names
      const enrichedAlerts = allAlerts.map(alert => ({
        ...alert,
        serverName: servers.find(s => s.id === alert.serverId)?.name || 'Unknown Server',
      }));

      setAlerts(enrichedAlerts);

      // Calculate stats
      const unread = enrichedAlerts.filter(a => !a.isRead).length;
      const critical = enrichedAlerts.filter(a => a.severity === 'critical').length;
      const warning = enrichedAlerts.filter(a => a.severity === 'warning').length;
      const info = enrichedAlerts.filter(a => a.severity === 'info').length;

      setStats({
        total: enrichedAlerts.length,
        unread,
        critical,
        warning,
        info,
      });
    } catch (error: any) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load alerts', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (alert: Alert) => {
    try {
      await api.markAlertAsRead(alert.serverId, alert.id);
      toast.success('Alert marked as read');
      await fetchAlerts();
    } catch (error: any) {
      toast.error('Failed to mark as read', error.message);
    }
  };

  const handleResolve = async (alert: Alert) => {
    try {
      await api.resolveAlert(alert.serverId, alert.id);
      toast.success('Alert resolved');
      await fetchAlerts();
    } catch (error: any) {
      toast.error('Failed to resolve alert', error.message);
    }
  };

  const handleDelete = async (alert: Alert) => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    try {
      await api.deleteAlert(alert.serverId, alert.id);
      toast.success('Alert deleted');
      await fetchAlerts();
    } catch (error: any) {
      toast.error('Failed to delete alert', error.message);
    }
  };

  const handleBulkMarkRead = async () => {
    if (selectedAlerts.length === 0) return;

    try {
      for (const alert of selectedAlerts.filter(a => !a.isRead)) {
        await api.markAlertAsRead(alert.serverId, alert.id);
      }
      toast.success(`Marked ${selectedAlerts.length} alert(s) as read`);
      await fetchAlerts();
      setSelectedAlerts([]);
    } catch (error: any) {
      toast.error('Failed to mark alerts as read', error.message);
    }
  };

  const handleBulkResolve = async () => {
    if (selectedAlerts.length === 0) return;

    try {
      for (const alert of selectedAlerts.filter(a => !a.isResolved)) {
        await api.resolveAlert(alert.serverId, alert.id);
      }
      toast.success(`Resolved ${selectedAlerts.length} alert(s)`);
      await fetchAlerts();
      setSelectedAlerts([]);
    } catch (error: any) {
      toast.error('Failed to resolve alerts', error.message);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="text-red-500" size={18} />;
      case 'warning':
        return <AlertTriangle className="text-yellow-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const columns: Column<Alert>[] = [
    {
      key: 'severity',
      label: 'Severity',
      render: (alert) => (
        <div className="flex items-center gap-2">
          {getSeverityIcon(alert.severity)}
          <Badge
            variant={
              alert.severity === 'critical'
                ? 'danger'
                : alert.severity === 'warning'
                ? 'warning'
                : 'info'
            }
            size="sm"
          >
            {alert.severity}
          </Badge>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Alert',
      render: (alert) => (
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${!alert.isRead ? 'text-text-light-primary dark:text-text-primary' : 'text-text-light-muted dark:text-text-muted'}`}>
              {alert.title}
            </span>
            {!alert.isRead && (
              <Badge variant="default" size="sm">New</Badge>
            )}
            {alert.isResolved && (
              <Badge variant="success" size="sm">Resolved</Badge>
            )}
          </div>
          <p className="text-sm text-text-light-muted dark:text-text-muted mt-1 line-clamp-2">
            {alert.message}
          </p>
        </div>
      ),
    },
    {
      key: 'serverName',
      label: 'Server',
      render: (alert) => (
        <span className="text-sm text-text-light-primary dark:text-text-primary">
          {alert.serverName}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (alert) => (
        <Badge variant="default" size="sm">
          {alert.type.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      label: 'Time',
      render: (alert) => (
        <div>
          <p className="text-sm">{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}</p>
          <p className="text-xs text-text-light-muted dark:text-text-muted">
            {new Date(alert.createdAt).toLocaleString()}
          </p>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (alert) => (
        <div className="flex gap-1">
          {!alert.isRead && (
            <Button
              variant="ghost"
              size="sm"
              icon={<Check size={14} />}
              onClick={() => handleMarkRead(alert)}
              title="Mark as read"
            />
          )}
          {!alert.isResolved && (
            <Button
              variant="ghost"
              size="sm"
              icon={<CheckCheck size={14} />}
              onClick={() => handleResolve(alert)}
              title="Resolve"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={() => handleDelete(alert)}
            title="Delete"
          />
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
            Alerts & Notifications
          </h1>
          <p className="text-text-light-muted dark:text-text-muted mt-1">
            Monitor server alerts and system notifications
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />}
          onClick={fetchAlerts}
          disabled={loading}
        >
          Refresh
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card variant="glass">
          <CardContent>
            <div className="text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Total</p>
              <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                {stats.total}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Unread</p>
              <p className="text-2xl font-heading font-bold text-accent-primary">
                {stats.unread}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Critical</p>
              <p className="text-2xl font-heading font-bold text-red-500">
                {stats.critical}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Warning</p>
              <p className="text-2xl font-heading font-bold text-yellow-500">
                {stats.warning}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="text-center">
              <p className="text-text-light-muted dark:text-text-muted text-sm">Info</p>
              <p className="text-2xl font-heading font-bold text-blue-500">
                {stats.info}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['all', 'unread', 'unresolved'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'primary' : 'secondary'}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {/* Alerts List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>
            {selectedServer === 'all'
              ? 'All Alerts'
              : `${servers.find((s) => s.id === selectedServer)?.name} Alerts`}
            {loading && ' (Loading...)'}
          </CardTitle>
          <CardDescription>
            System alerts with filtering, search and pagination
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 && !loading ? (
            <div className="text-center py-12 text-text-light-muted dark:text-text-muted">
              <Bell size={48} className="mx-auto mb-4 opacity-50" />
              <p>No alerts to display</p>
              <p className="text-sm mt-2">All systems are running smoothly</p>
            </div>
          ) : (
            <DataTable
              data={alerts}
              columns={columns}
              keyExtractor={keyExtractor}
              itemsPerPage={10}
              searchable
              exportable
              selectable
              onSelectionChange={handleSelectionChange}
              bulkActions={
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Check size={14} />}
                    onClick={handleBulkMarkRead}
                    disabled={selectedAlerts.filter(a => !a.isRead).length === 0}
                  >
                    Mark Read
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<CheckCheck size={14} />}
                    onClick={handleBulkResolve}
                    disabled={selectedAlerts.filter(a => !a.isResolved).length === 0}
                  >
                    Resolve
                  </Button>
                </div>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertsPage;
