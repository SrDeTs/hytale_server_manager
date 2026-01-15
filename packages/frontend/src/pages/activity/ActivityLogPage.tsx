import { useState, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Badge,
} from '../../components/ui';
import { DataTable, type Column } from '../../components/ui/DataTable';
import {
  History,
  RefreshCw,
  User,
  Server,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search,
} from 'lucide-react';
import { useActivityLogs, type ActivityLogEntry, type ActivityLogFilters } from '../../hooks/api';
import { formatDistanceToNow } from 'date-fns';

/**
 * Human-readable action labels
 */
const ACTION_LABELS: Record<string, string> = {
  'auth:login': 'Logged in',
  'auth:logout': 'Logged out',
  'auth:password_change': 'Changed password',
  'auth:login_failed': 'Login failed',
  'server:create': 'Created server',
  'server:update': 'Updated server',
  'server:delete': 'Deleted server',
  'server:start': 'Started server',
  'server:stop': 'Stopped server',
  'server:restart': 'Restarted server',
  'server:kill': 'Force killed server',
  'server:command': 'Executed command',
  'backup:create': 'Created backup',
  'backup:restore': 'Restored backup',
  'backup:delete': 'Deleted backup',
  'player:kick': 'Kicked player',
  'player:ban': 'Banned player',
  'player:unban': 'Unbanned player',
  'mod:install': 'Installed mod',
  'mod:uninstall': 'Uninstalled mod',
  'mod:enable': 'Enabled mod',
  'mod:disable': 'Disabled mod',
  'world:activate': 'Activated world',
  'world:delete': 'Deleted world',
  'automation:create': 'Created automation rule',
  'automation:delete': 'Deleted automation rule',
  'automation:execute': 'Executed automation rule',
  'network:create': 'Created network',
  'network:delete': 'Deleted network',
  'settings:update': 'Updated settings',
  'user:create': 'Created user',
  'user:delete': 'Deleted user',
};

/**
 * Category colors for badges - mapped to available Badge variants
 */
const CATEGORY_COLORS: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'info'> = {
  auth: 'info',
  server: 'info',
  backup: 'success',
  player: 'warning',
  mod: 'info',
  world: 'info',
  automation: 'success',
  network: 'info',
  user: 'info',
  settings: 'default',
};

/**
 * Get human-readable action label
 */
function getActionLabel(action: string): string {
  return ACTION_LABELS[action] || action.replace(':', ' ').replace(/_/g, ' ');
}

/**
 * Get category icon
 */
function getCategoryIcon(category: string) {
  switch (category) {
    case 'auth':
      return <Shield size={14} />;
    case 'server':
      return <Server size={14} />;
    case 'user':
      return <User size={14} />;
    default:
      return <History size={14} />;
  }
}

export const ActivityLogPage = () => {
  const [filters, setFilters] = useState<ActivityLogFilters>({
    page: 1,
    limit: 20,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  const [searchValue, setSearchValue] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Build complete filters
  const queryFilters = useMemo(() => ({
    ...filters,
    search: searchValue || undefined,
    actionCategory: categoryFilter || undefined,
    status: (statusFilter as 'success' | 'failed') || undefined,
  }), [filters, searchValue, categoryFilter, statusFilter]);

  const { data, isLoading, refetch, isFetching } = useActivityLogs(queryFilters);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const columns: Column<ActivityLogEntry>[] = [
    {
      key: 'timestamp',
      label: 'Time',
      sortable: true,
      render: (entry) => (
        <span className="text-text-secondary text-sm">
          {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
        </span>
      ),
    },
    {
      key: 'username',
      label: 'User',
      sortable: true,
      render: (entry) => (
        <div className="flex items-center gap-2">
          <User size={14} className="text-text-muted" />
          <span className="font-medium">{entry.username}</span>
          <Badge variant="default" className="text-xs">
            {entry.userRole}
          </Badge>
        </div>
      ),
    },
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      render: (entry) => (
        <div className="flex items-center gap-2">
          <Badge variant={CATEGORY_COLORS[entry.actionCategory] || 'default'}>
            <span className="flex items-center gap-1">
              {getCategoryIcon(entry.actionCategory)}
              {entry.actionCategory}
            </span>
          </Badge>
          <span>{getActionLabel(entry.action)}</span>
        </div>
      ),
    },
    {
      key: 'resourceName',
      label: 'Resource',
      render: (entry) => (
        <span className="text-text-secondary">
          {entry.resourceName || entry.resourceId || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (entry) => (
        <div className="flex items-center gap-1">
          {entry.status === 'success' ? (
            <>
              <CheckCircle size={14} className="text-green-500" />
              <span className="text-green-600">Success</span>
            </>
          ) : (
            <>
              <XCircle size={14} className="text-red-500" />
              <span className="text-red-600">Failed</span>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'ipAddress',
      label: 'IP Address',
      render: (entry) => (
        <span className="text-text-muted text-sm font-mono">
          {entry.ipAddress || '-'}
        </span>
      ),
    },
  ];

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'auth', label: 'Authentication' },
    { value: 'server', label: 'Server' },
    { value: 'backup', label: 'Backup' },
    { value: 'player', label: 'Player' },
    { value: 'mod', label: 'Mod' },
    { value: 'world', label: 'World' },
    { value: 'automation', label: 'Automation' },
    { value: 'network', label: 'Network' },
    { value: 'user', label: 'User' },
    { value: 'settings', label: 'Settings' },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary flex items-center gap-2">
          <History className="text-primary" />
          Activity Log
        </h1>
        <p className="text-text-secondary mt-1">
          Track and audit all user actions across the system
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                {data?.pagination.total || 0} total entries
              </CardDescription>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isFetching}
              variant="secondary"
            >
              <RefreshCw className={isFetching ? 'animate-spin' : ''} size={16} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                />
                <input
                  type="text"
                  placeholder="Search by username or resource..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  className="pl-9 pr-4 py-2 border border-border rounded-lg bg-background text-text-primary w-64 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <Button type="submit" variant="secondary">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Filter size={16} className="text-text-muted" />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setFilters(prev => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setFilters(prev => ({ ...prev, page: 1 }));
                }}
                className="px-3 py-2 border border-border rounded-lg bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Data Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-text-secondary">Loading activity...</span>
            </div>
          ) : data?.data && data.data.length > 0 ? (
            <>
              <DataTable<ActivityLogEntry>
                data={data.data}
                columns={columns}
                keyExtractor={(item) => item.id}
              />

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.page - 1)}
                    disabled={data.pagination.page <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-text-secondary px-4">
                    Page {data.pagination.page} of {data.pagination.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handlePageChange(data.pagination.page + 1)}
                    disabled={data.pagination.page >= data.pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-text-muted mb-4" />
              <p className="text-text-secondary">No activity found</p>
              <p className="text-text-muted text-sm mt-1">
                Activity will appear here as actions are performed
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLogPage;
