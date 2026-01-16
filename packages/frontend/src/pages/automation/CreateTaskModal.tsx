import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input } from '../../components/ui';
import { Clock } from 'lucide-react';

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
}

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serverId: string, data: any) => Promise<void>;
  onUpdate?: (taskId: string, data: any) => Promise<void>;
  servers: Server[];
  editTask?: ScheduledTask | null;
}

const CRON_PRESETS = [
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Every 30 minutes', value: '*/30 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at noon', value: '0 12 * * *' },
  { label: 'Weekly on Sunday', value: '0 0 * * 0' },
  { label: 'Weekly on Monday', value: '0 0 * * 1' },
  { label: 'Custom', value: 'custom' },
];

export const CreateTaskModal = ({ isOpen, onClose, onSubmit, onUpdate, servers, editTask }: CreateTaskModalProps) => {
  const [serverId, setServerId] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'backup' | 'restart' | 'start' | 'stop' | 'command'>('backup');
  const [cronPreset, setCronPreset] = useState('0 0 * * *');
  const [customCron, setCustomCron] = useState('');
  const [command, setCommand] = useState('');
  const [description, setDescription] = useState('');
  const [backupLimit, setBackupLimit] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!editTask;

  // Populate form when editing
  useEffect(() => {
    if (editTask) {
      setServerId(editTask.serverId);
      setName(editTask.name);
      setType(editTask.type);
      setBackupLimit(editTask.backupLimit);

      // Parse taskData
      if (editTask.taskData) {
        try {
          const data = JSON.parse(editTask.taskData);
          if (data.command) setCommand(data.command);
          if (data.description) setDescription(data.description);
        } catch {
          // Ignore parse errors
        }
      }

      // Check if cron matches a preset
      const preset = CRON_PRESETS.find(p => p.value === editTask.cronExpression);
      if (preset && preset.value !== 'custom') {
        setCronPreset(editTask.cronExpression);
        setCustomCron('');
      } else {
        setCronPreset('custom');
        setCustomCron(editTask.cronExpression);
      }
    }
  }, [editTask]);

  const handleSubmit = async () => {
    if (!serverId) {
      setError('Please select a server');
      return;
    }

    if (!name.trim()) {
      setError('Please enter a task name');
      return;
    }

    const cronExpression = cronPreset === 'custom' ? customCron : cronPreset;

    if (!cronExpression || !isValidCron(cronExpression)) {
      setError('Please enter a valid cron expression');
      return;
    }

    if (type === 'command' && !command.trim()) {
      setError('Please enter a command');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const taskData: any = {};

      if (type === 'command') {
        taskData.command = command;
      }

      if (type === 'backup' && description) {
        taskData.description = description;
      }

      if (isEditMode && editTask && onUpdate) {
        await onUpdate(editTask.id, {
          name,
          cronExpression,
          taskData,
          backupLimit: type === 'backup' ? backupLimit : undefined,
        });
      } else {
        await onSubmit(serverId, {
          name,
          type,
          cronExpression,
          taskData,
          enabled: true,
          backupLimit: type === 'backup' ? backupLimit : undefined,
        });
      }

      handleClose();
    } catch (err: any) {
      console.error(isEditMode ? 'Error updating task:' : 'Error creating task:', err);
      setError(err.message || (isEditMode ? 'Failed to update task' : 'Failed to create task'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setServerId('');
    setName('');
    setType('backup');
    setCronPreset('0 0 * * *');
    setCustomCron('');
    setCommand('');
    setDescription('');
    setBackupLimit(10);
    setError('');
    onClose();
  };

  const isValidCron = (cron: string): boolean => {
    // Basic validation - should have 5 parts
    const parts = cron.trim().split(/\s+/);
    return parts.length === 5;
  };

  const selectedServer = servers.find(s => s.id === serverId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditMode ? "Edit Scheduled Task" : "Create Scheduled Task"} size="lg">
      <div className="space-y-4">
        {/* Server Selection */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Server *
          </label>
          <select
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            disabled={isEditMode}
            className={`w-full px-3 py-2 bg-white dark:bg-primary-bg-secondary border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">Select a server...</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.status})
              </option>
            ))}
          </select>
          {isEditMode && (
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              Server cannot be changed when editing a task
            </p>
          )}
        </div>

        {/* Task Name */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Task Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Daily Backup, Restart Server..."
            className="w-full"
          />
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Task Type *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            disabled={isEditMode}
            className={`w-full px-3 py-2 bg-white dark:bg-primary-bg-secondary border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary ${isEditMode ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="backup">Create Backup</option>
            <option value="restart">Restart Server</option>
            <option value="start">Start Server</option>
            <option value="stop">Stop Server</option>
            <option value="command">Execute Command</option>
          </select>
          {isEditMode && (
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              Task type cannot be changed when editing a task
            </p>
          )}
        </div>

        {/* Command Input (only for command type) */}
        {type === 'command' && (
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              Command *
            </label>
            <Input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="/say Server restart in 5 minutes"
              className="w-full font-mono"
            />
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              Enter the command to execute on the server console
            </p>
          </div>
        )}

        {/* Description (for backup type) */}
        {type === 'backup' && (
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              Backup Description (Optional)
            </label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Daily automated backup"
              className="w-full"
            />
          </div>
        )}

        {/* Backup Limit (for backup type) */}
        {type === 'backup' && (
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              Backup Limit
            </label>
            <Input
              type="number"
              min={0}
              value={backupLimit}
              onChange={(e) => setBackupLimit(parseInt(e.target.value) || 0)}
              className="w-full"
            />
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              Maximum number of backups to keep from this task. Oldest backups will be deleted when limit is exceeded.
              Set to 0 for unlimited backups.
            </p>
          </div>
        )}

        {/* Schedule Preset */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Schedule *
          </label>
          <select
            value={cronPreset}
            onChange={(e) => setCronPreset(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-primary-bg-secondary border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            {CRON_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Cron Expression */}
        {cronPreset === 'custom' && (
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              Custom Cron Expression *
            </label>
            <Input
              value={customCron}
              onChange={(e) => setCustomCron(e.target.value)}
              placeholder="* * * * *"
              className="w-full font-mono"
            />
            <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
              Format: minute hour day month weekday (e.g., "0 2 * * *" = 2 AM daily)
            </p>
          </div>
        )}

        {/* Preview */}
        {selectedServer && name && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="text-accent-primary flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-primary">
                  Task Preview
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Server: {selectedServer.name}
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Name: {name}
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Type: {type}
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Schedule: {cronPreset === 'custom' ? customCron : CRON_PRESETS.find(p => p.value === cronPreset)?.label}
                </p>
                {type === 'command' && command && (
                  <p className="text-sm text-text-light-muted dark:text-text-muted mt-1 font-mono">
                    Command: {command}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* General Error */}
        {error && (
          <div className="bg-danger/10 border border-danger rounded-lg p-3">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={loading || !serverId || !name}>
          {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Task')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
