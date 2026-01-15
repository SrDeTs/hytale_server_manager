import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, DataTable, type Column } from '../../components/ui';
import { Plus, Play, Pause, Trash2, Clock, Command, Database, RotateCw, PlayCircle } from 'lucide-react';
import { useToast } from '../../stores/toastStore';
import { api } from '../../services/api';
import { CreateTaskModal } from './CreateTaskModal';

interface Server {
  id: string;
  name: string;
  status: string;
}

interface ScheduledTask {
  id: string;
  serverId: string;
  name: string;
  type: 'backup' | 'restart' | 'start' | 'stop' | 'command';
  cronExpression: string;
  taskData: string | null;
  enabled: boolean;
  backupLimit: number;
  lastRun: Date | null;
  lastStatus: 'success' | 'failed' | null;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  server: {
    id: string;
    name: string;
  };
}

export const AutomationPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('all');
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<ScheduledTask[]>([]);
  const [deletingMultiple, setDeletingMultiple] = useState(false);

  // Memoize callbacks to prevent infinite loops in DataTable
  const handleSelectionChange = useCallback((items: ScheduledTask[]) => {
    setSelectedTasks(items);
  }, []);

  const keyExtractor = useCallback((task: ScheduledTask) => task.id, []);

  // Fetch servers on mount
  useEffect(() => {
    fetchServers();
  }, []);

  // Fetch tasks when selectedServer changes OR when servers are loaded
  useEffect(() => {
    if (selectedServer === 'all' && servers.length === 0) {
      return; // Wait for servers to load
    }
    fetchTasks();
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

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let data: ScheduledTask[];
      if (selectedServer === 'all') {
        // Fetch tasks for all servers
        const allTasks: ScheduledTask[] = [];
        for (const server of servers) {
          const serverTasks = await api.getServerTasks<ScheduledTask>(server.id);
          allTasks.push(...serverTasks);
        }
        data = allTasks;
      } else {
        data = await api.getServerTasks<ScheduledTask>(selectedServer);
      }
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks', 'Please try again later');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTask = async (taskId: string, currentEnabled: boolean) => {
    try {
      await api.toggleTask(taskId, !currentEnabled);
      toast.success(currentEnabled ? 'Task disabled' : 'Task enabled');
      await fetchTasks();
    } catch (error: any) {
      console.error('Error toggling task:', error);
      toast.error('Failed to toggle task', error.message);
    }
  };

  const handleRunNow = async (taskId: string) => {
    try {
      await api.runTaskNow(taskId);
      toast.success('Task executed', 'Task has been run manually');
      await fetchTasks();
    } catch (error: any) {
      console.error('Error running task:', error);
      toast.error('Failed to run task', error.message);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await api.deleteTask(taskId);
      toast.success('Task deleted', 'Task has been removed');
      await fetchTasks();
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task', error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} task(s)? This action cannot be undone.`)) {
      return;
    }

    setDeletingMultiple(true);
    let deleted = 0;
    let failed = 0;

    for (const task of selectedTasks) {
      try {
        await api.deleteTask(task.id);
        deleted++;
      } catch (error) {
        failed++;
      }
    }

    if (deleted > 0) {
      toast.success(`Deleted ${deleted} task(s)`, failed > 0 ? `${failed} task(s) failed to delete` : undefined);
    }
    if (failed > 0 && deleted === 0) {
      toast.error('Failed to delete tasks');
    }

    await fetchTasks();
    setSelectedTasks([]);
    setDeletingMultiple(false);
  };

  const handleCreateTask = async (serverId: string, data: any) => {
    await api.createTask(serverId, data);
    toast.success('Task created', 'Scheduled task has been created');
    await fetchTasks();
    setShowCreateModal(false);
  };

  const formatCron = (cron: string): string => {
    if (cron === '0 * * * *') return 'Every hour';
    if (cron === '0 0 * * *') return 'Daily at midnight';
    if (cron === '0 0 * * 0') return 'Weekly on Sunday';
    if (cron === '*/5 * * * *') return 'Every 5 minutes';
    if (cron === '*/15 * * * *') return 'Every 15 minutes';
    if (cron === '*/30 * * * *') return 'Every 30 minutes';
    if (cron === '0 */6 * * *') return 'Every 6 hours';
    if (cron === '0 12 * * *') return 'Daily at noon';
    if (cron === '0 0 * * 1') return 'Weekly on Monday';
    return cron;
  };

  const columns: Column<ScheduledTask>[] = [
    {
      key: 'name',
      label: 'Task',
      render: (task) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${task.enabled ? 'bg-success/20' : 'bg-gray-200 dark:bg-gray-800'}`}>
            {task.type === 'command' && <Command size={16} />}
            {task.type === 'restart' && <RotateCw size={16} />}
            {task.type === 'backup' && <Database size={16} />}
            {task.type === 'start' && <Play size={16} />}
            {task.type === 'stop' && <Pause size={16} />}
          </div>
          <div>
            <p className="font-medium text-text-light-primary dark:text-text-primary">{task.name}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/servers/${task.server.id}`);
              }}
              className="text-xs text-accent-primary hover:text-accent-primary/80 hover:underline transition-colors text-left"
            >
              {task.server.name}
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (task) => (
        <Badge variant="default" size="sm">{task.type}</Badge>
      ),
    },
    {
      key: 'cronExpression',
      label: 'Schedule',
      render: (task) => (
        <Badge variant="info" size="sm">{formatCron(task.cronExpression)}</Badge>
      ),
    },
    {
      key: 'enabled',
      label: 'Status',
      render: (task) => (
        <Badge variant={task.enabled ? 'success' : 'default'} size="sm">
          {task.enabled ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'lastRun',
      label: 'Last Run',
      render: (task) => (
        <div>
          <p className="text-sm">{task.lastRun ? new Date(task.lastRun).toLocaleDateString() : 'Never'}</p>
          {task.lastRun && (
            <p className="text-xs text-text-light-muted dark:text-text-muted">
              {new Date(task.lastRun).toLocaleTimeString()}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'lastStatus',
      label: 'Result',
      render: (task) => {
        if (!task.lastRun) {
          return <Badge variant="default" size="sm">Never run</Badge>;
        }
        if (task.lastStatus === 'success') {
          return <Badge variant="success" size="sm">Success</Badge>;
        }
        if (task.lastStatus === 'failed') {
          return <Badge variant="danger" size="sm">Failed</Badge>;
        }
        return <Badge variant="default" size="sm">Unknown</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (task) => (
        <div className="flex gap-1">
          <Button
            variant={task.enabled ? 'ghost' : 'success'}
            size="sm"
            icon={task.enabled ? <Pause size={14} /> : <Play size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTask(task.id, task.enabled);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<PlayCircle size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              handleRunNow(task.id);
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTask(task.id);
            }}
          />
        </div>
      ),
    },
  ];

  const activeTasks = tasks.filter(t => t.enabled).length;
  const successfulTasks = tasks.filter(t => t.lastStatus === 'success').length;
  const failedTasks = tasks.filter(t => t.lastStatus === 'failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">Task Automation</h1>
          <p className="text-text-light-muted dark:text-text-muted mt-1">Schedule and automate server tasks</p>
        </div>
        <Button variant="primary" icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
          Create Task
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Total Tasks</p>
                <p className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary mt-1">{tasks.length}</p>
              </div>
              <Clock size={32} className="text-accent-primary" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Active</p>
                <p className="text-3xl font-heading font-bold text-success mt-1">{activeTasks}</p>
              </div>
              <Play size={32} className="text-success" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Successful</p>
                <p className="text-3xl font-heading font-bold text-success mt-1">{successfulTasks}</p>
              </div>
              <PlayCircle size={32} className="text-success" />
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light-muted dark:text-text-muted text-sm">Failed</p>
                <p className="text-3xl font-heading font-bold text-danger mt-1">{failedTasks}</p>
              </div>
              <Pause size={32} className="text-danger" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tasks List */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>
            {selectedServer === 'all' ? 'All Tasks' : `${servers.find(s => s.id === selectedServer)?.name} Tasks`}
            {loading && ' (Loading...)'}
          </CardTitle>
          <CardDescription>Automated tasks and recurring jobs with advanced filtering</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 && !loading ? (
            <div className="text-center py-12 text-text-light-muted dark:text-text-muted">
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No scheduled tasks found</p>
              <Button variant="primary" className="mt-4" icon={<Plus size={16} />} onClick={() => setShowCreateModal(true)}>
                Create Your First Task
              </Button>
            </div>
          ) : (
            <DataTable
              data={tasks}
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

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTask}
        servers={servers}
      />
    </div>
  );
};
