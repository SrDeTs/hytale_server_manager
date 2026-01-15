import { create } from 'zustand';
import { api } from '../services/api';

export interface Alert {
  id: string;
  serverId: string;
  serverName?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

interface AlertsState {
  alerts: Alert[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  // Actions
  fetchAlerts: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAlertAsRead: (serverId: string, alertId: string) => Promise<void>;
  clearError: () => void;
}

// Cache duration: 30 seconds
const CACHE_DURATION = 30 * 1000;

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  lastFetched: null,

  fetchAlerts: async () => {
    const now = Date.now();
    const lastFetched = get().lastFetched;

    // Skip if recently fetched (within cache duration)
    if (lastFetched && now - lastFetched < CACHE_DURATION && get().alerts.length > 0) {
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const alerts = await api.getAlerts<Alert>(undefined, {
        limit: 50,
        unresolvedOnly: false,
      });
      set({
        alerts,
        unreadCount: alerts.filter((a) => !a.isRead).length,
        isLoading: false,
        lastFetched: now,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch alerts',
        isLoading: false,
      });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { count } = await api.getUnreadCount();
      set({ unreadCount: count });
    } catch (error: any) {
      // Silently fail for unread count - not critical
      console.error('Failed to fetch unread count:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.markAllAlertsAsReadGlobal();
      set((state) => ({
        alerts: state.alerts.map((a) => ({ ...a, isRead: true })),
        unreadCount: 0,
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark alerts as read' });
      throw error;
    }
  },

  markAlertAsRead: async (serverId: string, alertId: string) => {
    try {
      await api.markAlertAsRead(serverId, alertId);
      set((state) => ({
        alerts: state.alerts.map((a) =>
          a.id === alertId ? { ...a, isRead: true } : a
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error: any) {
      set({ error: error.message || 'Failed to mark alert as read' });
      throw error;
    }
  },

  clearError: () => set({ error: null }),
}));
