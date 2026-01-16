import { useState, useEffect } from 'react';
import { Modal, ModalFooter, Button, Input, Badge } from '../../components/ui';
import { Clock, GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';

interface ScheduledTask {
  id: string;
  serverId: string;
  name: string;
  type: 'backup' | 'restart' | 'start' | 'stop' | 'command';
  cronExpression: string;
  enabled: boolean;
  server: {
    id: string;
    name: string;
  };
}

interface TaskGroupMember {
  id: string;
  groupId: string;
  taskId: string;
  sortOrder: number;
  task: ScheduledTask;
}

interface TaskGroup {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  cronExpression: string;
  failureMode: 'stop' | 'continue';
  delayBetweenTasks: number;
  lastRun: Date | null;
  lastStatus: 'success' | 'failed' | 'partial' | null;
  taskMemberships: TaskGroupMember[];
}

interface TaskGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    description?: string;
    cronExpression: string;
    failureMode: 'stop' | 'continue';
    delayBetweenTasks: number;
    enabled?: boolean;
    taskIds?: string[];
  }) => Promise<void>;
  onUpdate?: (groupId: string, data: {
    name: string;
    description?: string;
    cronExpression: string;
    failureMode: 'stop' | 'continue';
    delayBetweenTasks: number;
  }) => Promise<void>;
  availableTasks: ScheduledTask[];
  editGroup?: TaskGroup | null;
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

export const TaskGroupModal = ({
  isOpen,
  onClose,
  onSubmit,
  onUpdate,
  availableTasks,
  editGroup,
}: TaskGroupModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cronPreset, setCronPreset] = useState('0 0 * * *');
  const [customCron, setCustomCron] = useState('');
  const [failureMode, setFailureMode] = useState<'stop' | 'continue'>('stop');
  const [delayBetweenTasks, setDelayBetweenTasks] = useState(0);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = !!editGroup;

  // Populate form when editing
  useEffect(() => {
    if (editGroup) {
      setName(editGroup.name);
      setDescription(editGroup.description || '');
      setFailureMode(editGroup.failureMode);
      setDelayBetweenTasks(editGroup.delayBetweenTasks);

      // Set selected tasks in order
      const orderedTaskIds = editGroup.taskMemberships
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(m => m.taskId);
      setSelectedTaskIds(orderedTaskIds);

      // Check if cron matches a preset
      const preset = CRON_PRESETS.find(p => p.value === editGroup.cronExpression);
      if (preset && preset.value !== 'custom') {
        setCronPreset(editGroup.cronExpression);
        setCustomCron('');
      } else {
        setCronPreset('custom');
        setCustomCron(editGroup.cronExpression);
      }
    }
  }, [editGroup]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter a group name');
      return;
    }

    const cronExpression = cronPreset === 'custom' ? customCron : cronPreset;

    if (!cronExpression || !isValidCron(cronExpression)) {
      setError('Please enter a valid cron expression');
      return;
    }

    if (selectedTaskIds.length === 0) {
      setError('Please select at least one task');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isEditMode && editGroup && onUpdate) {
        await onUpdate(editGroup.id, {
          name,
          description: description || undefined,
          cronExpression,
          failureMode,
          delayBetweenTasks,
        });
      } else {
        await onSubmit({
          name,
          description: description || undefined,
          cronExpression,
          failureMode,
          delayBetweenTasks,
          enabled: true,
          taskIds: selectedTaskIds,
        });
      }

      handleClose();
    } catch (err: any) {
      console.error(isEditMode ? 'Error updating task group:' : 'Error creating task group:', err);
      setError(err.message || (isEditMode ? 'Failed to update task group' : 'Failed to create task group'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setCronPreset('0 0 * * *');
    setCustomCron('');
    setFailureMode('stop');
    setDelayBetweenTasks(0);
    setSelectedTaskIds([]);
    setError('');
    onClose();
  };

  const isValidCron = (cron: string): boolean => {
    const parts = cron.trim().split(/\s+/);
    return parts.length === 5;
  };

  const toggleTaskSelection = (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  const moveTaskUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...selectedTaskIds];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setSelectedTaskIds(newOrder);
  };

  const moveTaskDown = (index: number) => {
    if (index === selectedTaskIds.length - 1) return;
    const newOrder = [...selectedTaskIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    setSelectedTaskIds(newOrder);
  };

  const removeTask = (taskId: string) => {
    setSelectedTaskIds(selectedTaskIds.filter(id => id !== taskId));
  };

  const selectedTasks = selectedTaskIds
    .map(id => availableTasks.find(t => t.id === id))
    .filter((t): t is ScheduledTask => t !== undefined);

  const unselectedTasks = availableTasks.filter(t => !selectedTaskIds.includes(t.id));

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditMode ? "Edit Task Group" : "Create Task Group"}
      size="lg"
    >
      <div className="space-y-4">
        {/* Group Name */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Group Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Daily Server Maintenance"
            className="w-full"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Description (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Backup, restart, and notify"
            className="w-full"
          />
        </div>

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

        {/* Failure Mode */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            On Task Failure
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="failureMode"
                value="stop"
                checked={failureMode === 'stop'}
                onChange={() => setFailureMode('stop')}
                className="accent-accent-primary"
              />
              <span className="text-sm text-text-light-primary dark:text-text-primary">
                Stop remaining tasks
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="failureMode"
                value="continue"
                checked={failureMode === 'continue'}
                onChange={() => setFailureMode('continue')}
                className="accent-accent-primary"
              />
              <span className="text-sm text-text-light-primary dark:text-text-primary">
                Continue with remaining tasks
              </span>
            </label>
          </div>
        </div>

        {/* Delay Between Tasks */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Delay Between Tasks (seconds)
          </label>
          <Input
            type="number"
            min={0}
            value={delayBetweenTasks}
            onChange={(e) => setDelayBetweenTasks(parseInt(e.target.value) || 0)}
            className="w-full"
          />
          <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
            Wait time between each task execution. Set to 0 for no delay.
          </p>
        </div>

        {/* Task Selection */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Tasks * {selectedTaskIds.length > 0 && `(${selectedTaskIds.length} selected)`}
          </label>

          {/* Selected Tasks (ordered) */}
          {selectedTasks.length > 0 && (
            <div className="mb-3 border border-accent-primary/50 rounded-lg p-2 bg-accent-primary/5">
              <p className="text-xs font-medium text-accent-primary mb-2">Execution Order (drag to reorder)</p>
              <div className="space-y-1">
                {selectedTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 bg-white dark:bg-primary-bg-secondary rounded px-2 py-1.5"
                  >
                    <GripVertical size={14} className="text-text-light-muted dark:text-text-muted cursor-grab" />
                    <span className="text-xs font-mono text-accent-primary">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-light-primary dark:text-text-primary truncate block">
                        {task.name}
                      </span>
                      <span className="text-xs text-text-light-muted dark:text-text-muted">
                        {task.server.name} - {task.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveTaskUp(index)}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveTaskDown(index)}
                        disabled={index === selectedTasks.length - 1}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded disabled:opacity-30"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        onClick={() => removeTask(task.id)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-danger"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Tasks */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
            {unselectedTasks.length === 0 && selectedTasks.length === 0 ? (
              <div className="p-4 text-center text-text-light-muted dark:text-text-muted text-sm">
                No tasks available. Create some scheduled tasks first.
              </div>
            ) : unselectedTasks.length === 0 ? (
              <div className="p-4 text-center text-text-light-muted dark:text-text-muted text-sm">
                All tasks selected
              </div>
            ) : (
              unselectedTasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => toggleTaskSelection(task.id)}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => {}}
                    className="accent-accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-light-primary dark:text-text-primary truncate">
                        {task.name}
                      </span>
                      <Badge variant="default" size="sm">{task.type}</Badge>
                      {!task.enabled && <Badge variant="warning" size="sm">Disabled</Badge>}
                    </div>
                    <span className="text-xs text-text-light-muted dark:text-text-muted">
                      {task.server.name}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Preview */}
        {name && selectedTasks.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="text-accent-primary flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-primary">
                  Group Preview
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Name: {name}
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Schedule: {cronPreset === 'custom' ? customCron : CRON_PRESETS.find(p => p.value === cronPreset)?.label}
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Tasks: {selectedTasks.length} task(s) will run in sequence
                  {delayBetweenTasks > 0 && ` with ${delayBetweenTasks}s delay between each`}
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  On failure: {failureMode === 'stop' ? 'Stop remaining tasks' : 'Continue with remaining'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
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
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={loading}
          disabled={loading || !name || selectedTaskIds.length === 0}
        >
          {loading ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Group')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
