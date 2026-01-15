import type { ServerStatus } from '../../types';

interface StatusIndicatorProps {
  status: ServerStatus | 'online' | 'offline';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusIndicator = ({ status, showLabel = false, size = 'md' }: StatusIndicatorProps) => {
  const statusConfig = {
    running: {
      className: 'status-running',
      label: 'Running',
    },
    online: {
      className: 'status-running',
      label: 'Online',
    },
    stopped: {
      className: 'status-stopped',
      label: 'Stopped',
    },
    offline: {
      className: 'status-stopped',
      label: 'Offline',
    },
    starting: {
      className: 'status-warning',
      label: 'Starting',
    },
    stopping: {
      className: 'status-warning',
      label: 'Stopping',
    },
    crashed: {
      className: 'status-error',
      label: 'Crashed',
    },
    orphaned: {
      className: 'status-warning',
      label: 'Reconnecting',
    },
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className={`status-indicator ${config.className} ${sizes[size]}`} />
      {showLabel && <span className="text-sm text-text-muted">{config.label}</span>}
    </div>
  );
};
