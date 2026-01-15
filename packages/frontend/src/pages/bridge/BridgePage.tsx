import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Wifi, WifiOff, Settings, Activity } from 'lucide-react';
import { mockBridgeStatus, mockServerEvents } from '../../data/mockData';

export const BridgePage = () => {
  const bridge = mockBridgeStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-text-light-primary dark:text-text-primary">Hytale Bridge</h1>
        <p className="text-text-light-muted dark:text-text-muted mt-1">In-game integration and real-time monitoring</p>
      </div>

      {/* Connection Status */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
          <CardDescription>Bridge plugin connectivity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-lg flex items-center justify-center ${
                bridge.connected ? 'bg-success/20' : 'bg-danger/20'
              }`}>
                {bridge.connected ? (
                  <Wifi size={32} className="text-success" />
                ) : (
                  <WifiOff size={32} className="text-danger" />
                )}
              </div>
              <div>
                <p className="text-2xl font-heading font-bold text-text-light-primary dark:text-text-primary">
                  {bridge.connected ? 'Connected' : 'Disconnected'}
                </p>
                <p className="text-text-light-muted dark:text-text-muted">Plugin v{bridge.pluginVersion}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-text-light-muted dark:text-text-muted">Latency</p>
              <p className="text-2xl font-heading font-bold text-accent-primary">{bridge.latency}ms</p>
              <p className="text-xs text-text-light-muted dark:text-text-muted">
                Last heartbeat: {new Date(bridge.lastHeartbeat).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Available Features</CardTitle>
          <CardDescription>Bridge functionality and capabilities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bridge.features.map((feature) => (
              <div
                key={feature.id}
                className="p-4 rounded-lg border border-gray-300 dark:border-gray-800 hover:border-gray-300 dark:border-gray-700 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-heading font-semibold text-text-light-primary dark:text-text-primary">{feature.name}</h4>
                    <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">{feature.description}</p>
                  </div>
                  <Badge variant={feature.enabled ? 'success' : 'default'} size="sm">
                    {feature.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                {feature.configurable && (
                  <Button variant="ghost" size="sm" icon={<Settings size={14} />} className="mt-2">
                    Configure
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Real-time Events */}
      <Card variant="glass">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Real-time Events</CardTitle>
              <CardDescription>Live server events and activities</CardDescription>
            </div>
            <Activity size={20} className="text-accent-primary animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockServerEvents.map((event) => (
              <div
                key={event.id}
                className="p-3 rounded-lg bg-white dark:bg-primary-bg border border-gray-300 dark:border-gray-800/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        event.type === 'player_join' ? 'success' :
                        event.type === 'player_leave' ? 'warning' :
                        event.type === 'alert' ? 'danger' : 'info'
                      }
                      size="sm"
                    >
                      {event.type.replace('_', ' ')}
                    </Badge>
                    <div>
                      <p className="text-sm text-text-light-primary dark:text-text-primary">
                        {event.type === 'player_join' && `${event.data.username} joined the server`}
                        {event.type === 'player_leave' && `${event.data.username} left the server`}
                        {event.type === 'chat' && `${event.data.username}: ${event.data.message}`}
                        {event.type === 'achievement' && `${event.data.username} earned ${event.data.achievement}`}
                        {event.type === 'alert' && event.data.message}
                      </p>
                      {event.data.server && (
                        <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">{event.data.server}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-text-light-muted dark:text-text-muted">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
