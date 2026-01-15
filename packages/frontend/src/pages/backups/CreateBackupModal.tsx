import { useState } from 'react';
import { Modal, ModalFooter, Button, Input } from '../../components/ui';
import { Database } from 'lucide-react';

interface Server {
  id: string;
  name: string;
  status: string;
}

interface CreateBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (serverId: string, description: string) => Promise<void>;
  servers: Server[];
}

export const CreateBackupModal = ({ isOpen, onClose, onSubmit, servers }: CreateBackupModalProps) => {
  const [serverId, setServerId] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!serverId) {
      setError('Please select a server');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onSubmit(serverId, description);
      handleClose();
    } catch (err: any) {
      console.error('Error creating backup:', err);
      setError(err.message || 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setServerId('');
    setDescription('');
    setError('');
    onClose();
  };

  const selectedServer = servers.find(s => s.id === serverId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Backup" size="md">
      <div className="space-y-4">
        {/* Server Selection */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Server *
          </label>
          <select
            value={serverId}
            onChange={(e) => setServerId(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-primary-bg-secondary border border-gray-300 dark:border-gray-700 rounded-lg text-text-light-primary dark:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="">Select a server...</option>
            {servers.map((server) => (
              <option key={server.id} value={server.id}>
                {server.name} ({server.status})
              </option>
            ))}
          </select>
          {error && !serverId && (
            <p className="text-danger text-sm mt-1">{error}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            Description (Optional)
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., Before major update, Manual backup..."
            className="w-full"
          />
          <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
            Add a note to help identify this backup later
          </p>
        </div>

        {/* Preview */}
        {selectedServer && (
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Database className="text-accent-primary flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-text-light-primary dark:text-text-primary">
                  Backup Preview
                </p>
                <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                  Server: {selectedServer.name}
                </p>
                {description && (
                  <p className="text-sm text-text-light-muted dark:text-text-muted mt-1">
                    Note: {description}
                  </p>
                )}
                <p className="text-xs text-text-light-muted dark:text-text-muted mt-2">
                  The backup will include all server files, worlds, and configurations.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* General Error */}
        {error && serverId && (
          <div className="bg-danger/10 border border-danger rounded-lg p-3">
            <p className="text-danger text-sm">{error}</p>
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={loading || !serverId}>
          {loading ? 'Creating...' : 'Create Backup'}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
