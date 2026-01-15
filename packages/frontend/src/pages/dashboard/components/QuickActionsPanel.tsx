import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../../../components/ui';
import { Play, Square, RotateCcw, HardDrive, RefreshCw } from 'lucide-react';
import { useToast } from '../../../stores/toastStore';
import api from '../../../services/api';

interface QuickActionsPanelProps {
  runningCount: number;
  stoppedCount: number;
  onRefresh: () => void;
}

export const QuickActionsPanel = ({ runningCount, stoppedCount, onRefresh }: QuickActionsPanelProps) => {
  const toast = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: 'start-all' | 'stop-all' | 'restart-all') => {
    try {
      setLoading(action);
      const response = await api.dashboardQuickAction(action);

      if (response.successCount > 0) {
        toast.success(
          `${action === 'start-all' ? 'Starting' : action === 'stop-all' ? 'Stopping' : 'Restarting'} ${response.successCount} server(s)`,
          response.failedCount > 0 ? `${response.failedCount} failed` : undefined
        );
      } else if (response.failedCount > 0) {
        toast.error('Action failed', `${response.failedCount} server(s) failed`);
      } else {
        toast.info('No servers affected', 'No servers matched the action criteria');
      }

      onRefresh();
    } catch (error: any) {
      toast.error('Action failed', error.message);
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full justify-start"
            icon={loading === 'start-all' ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            onClick={() => handleAction('start-all')}
            disabled={loading !== null || stoppedCount === 0}
          >
            Start All Servers
            {stoppedCount > 0 && (
              <span className="ml-auto text-text-light-muted dark:text-text-muted text-sm">
                ({stoppedCount} stopped)
              </span>
            )}
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            icon={loading === 'stop-all' ? <RefreshCw size={16} className="animate-spin" /> : <Square size={16} />}
            onClick={() => handleAction('stop-all')}
            disabled={loading !== null || runningCount === 0}
          >
            Stop All Servers
            {runningCount > 0 && (
              <span className="ml-auto text-text-light-muted dark:text-text-muted text-sm">
                ({runningCount} running)
              </span>
            )}
          </Button>

          <Button
            variant="secondary"
            className="w-full justify-start"
            icon={loading === 'restart-all' ? <RefreshCw size={16} className="animate-spin" /> : <RotateCcw size={16} />}
            onClick={() => handleAction('restart-all')}
            disabled={loading !== null || runningCount === 0}
          >
            Restart All Servers
          </Button>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
            <Button
              variant="ghost"
              className="w-full justify-start"
              icon={<HardDrive size={16} />}
              onClick={onRefresh}
              disabled={loading !== null}
            >
              Refresh Dashboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
