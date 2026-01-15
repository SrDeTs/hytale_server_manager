import { create } from 'zustand';

export type InstallationStatus = 'pending' | 'downloading' | 'installing' | 'completed' | 'failed';

export interface InstallationQueueItem {
  id: string;
  serverId: string;
  serverName: string;
  projectId: string;
  projectTitle: string;
  projectIconUrl?: string;
  versionId: string;
  versionName: string;
  classification: string;
  status: InstallationStatus;
  progress: number; // 0-100
  error?: string;
  addedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

interface InstallationQueueStore {
  queue: InstallationQueueItem[];

  // Add item to queue (returns the item ID)
  addToQueue: (item: Omit<InstallationQueueItem, 'id' | 'status' | 'progress' | 'addedAt'>) => string;

  // Update item status
  updateStatus: (id: string, status: InstallationStatus, error?: string) => void;

  // Update progress
  updateProgress: (id: string, progress: number) => void;

  // Remove item from queue
  removeFromQueue: (id: string) => void;

  // Clear completed items
  clearCompleted: () => void;

  // Clear all items
  clearAll: () => void;

  // Get items by server
  getByServer: (serverId: string) => InstallationQueueItem[];

  // Get items by status
  getByStatus: (status: InstallationStatus) => InstallationQueueItem[];
}

export const useInstallationQueueStore = create<InstallationQueueStore>((set, get) => ({
  queue: [],

  addToQueue: (item) => {
    const id = `install-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem: InstallationQueueItem = {
      ...item,
      id,
      status: 'pending',
      progress: 0,
      addedAt: new Date(),
    };

    set((state) => ({
      queue: [...state.queue, newItem],
    }));

    return id;
  },

  updateStatus: (id, status, error) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id
          ? {
              ...item,
              status,
              error,
              startedAt: status === 'downloading' && !item.startedAt ? new Date() : item.startedAt,
              completedAt: status === 'completed' || status === 'failed' ? new Date() : item.completedAt,
            }
          : item
      ),
    }));
  },

  updateProgress: (id, progress) => {
    set((state) => ({
      queue: state.queue.map((item) =>
        item.id === id ? { ...item, progress } : item
      ),
    }));
  },

  removeFromQueue: (id) => {
    set((state) => ({
      queue: state.queue.filter((item) => item.id !== id),
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      queue: state.queue.filter(
        (item) => item.status !== 'completed' && item.status !== 'failed'
      ),
    }));
  },

  clearAll: () => {
    set({ queue: [] });
  },

  getByServer: (serverId) => {
    return get().queue.filter((item) => item.serverId === serverId);
  },

  getByStatus: (status) => {
    return get().queue.filter((item) => item.status === status);
  },
}));
