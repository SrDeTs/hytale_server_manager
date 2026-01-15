import { useState } from 'react';
import { Modal, ModalFooter, Button, Input } from '../../components/ui';
import { File, Folder } from 'lucide-react';
import { api } from '../../services/api';

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  serverId: string;
  currentPath: string;
  type: 'file' | 'directory';
}

export const CreateItemModal = ({ isOpen, onClose, onCreated, serverId, currentPath, type }: CreateItemModalProps) => {
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // Validate name (no path separators)
    if (name.includes('/') || name.includes('\\')) {
      setError('Name cannot contain path separators (/ or \\)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const fullPath = currentPath ? `${currentPath}/${name}` : name;

      if (type === 'file') {
        await api.createFile(serverId, fullPath, content);
      } else {
        await api.createDirectory(serverId, fullPath);
      }

      onCreated();
      handleClose();
    } catch (err: any) {
      console.error(`Error creating ${type}:`, err);
      setError(err.message || `Failed to create ${type}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setContent('');
    setError('');
    onClose();
  };

  const getPlaceholder = () => {
    if (type === 'file') {
      return 'e.g., config.yml, server.properties';
    }
    return 'e.g., configs, mods';
  };

  const getTitle = () => {
    return type === 'file' ? 'Create New File' : 'Create New Folder';
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={getTitle()} size="md">
      <div className="space-y-4">
        {/* Type Indicator */}
        <div className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-900 rounded-lg">
          {type === 'file' ? (
            <File size={24} className="text-blue-500" />
          ) : (
            <Folder size={24} className="text-accent-primary" />
          )}
          <div>
            <p className="text-sm font-medium text-text-light-primary dark:text-text-primary">
              Creating {type === 'file' ? 'a new file' : 'a new folder'}
            </p>
            <p className="text-xs text-text-light-muted dark:text-text-muted">
              Location: /{currentPath || 'root'}
            </p>
          </div>
        </div>

        {/* Name Input */}
        <div>
          <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
            {type === 'file' ? 'File Name' : 'Folder Name'} *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={getPlaceholder()}
            className="w-full"
            autoFocus
          />
          <p className="text-xs text-text-light-muted dark:text-text-muted mt-1">
            Do not include path separators (/ or \)
          </p>
        </div>

        {/* Content Input (for files only) */}
        {type === 'file' && (
          <div>
            <label className="block text-sm font-medium text-text-light-primary dark:text-text-primary mb-2">
              Initial Content (Optional)
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-32 bg-white dark:bg-primary-bg-secondary text-text-light-primary dark:text-text-primary font-mono text-sm p-3 rounded-lg border border-gray-300 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-accent-primary resize-none"
              placeholder="Leave empty to create an empty file..."
              spellCheck={false}
            />
          </div>
        )}

        {/* Preview */}
        {name && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-xs text-text-light-muted dark:text-text-muted mb-1">Full path:</p>
            <p className="text-sm font-mono text-text-light-primary dark:text-text-primary">
              /{currentPath ? `${currentPath}/` : ''}{name}
            </p>
          </div>
        )}

        {/* Error Message */}
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
          onClick={handleCreate}
          loading={loading}
          disabled={loading || !name.trim()}
        >
          {loading ? `Creating...` : `Create ${type === 'file' ? 'File' : 'Folder'}`}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
