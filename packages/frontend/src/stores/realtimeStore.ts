import { create } from 'zustand';
import type { RealtimeMetrics } from '../types/advanced';
import { generateRealtimeMetrics } from '../data/mockAdvanced';

interface RealtimeStore {
  metrics: Record<string, RealtimeMetrics>;
  isLiveMode: boolean;
  updateInterval: number | null;
  toggleLiveMode: () => void;
  updateMetrics: (serverId: string) => void;
  startLiveUpdates: () => void;
  stopLiveUpdates: () => void;
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  metrics: {},
  isLiveMode: false,
  updateInterval: null,

  toggleLiveMode: () => {
    const { isLiveMode, startLiveUpdates, stopLiveUpdates } = get();
    if (isLiveMode) {
      stopLiveUpdates();
    } else {
      startLiveUpdates();
    }
    set({ isLiveMode: !isLiveMode });
  },

  updateMetrics: (serverId: string) => {
    const newMetrics = generateRealtimeMetrics(serverId);
    set((state) => ({
      metrics: {
        ...state.metrics,
        [serverId]: newMetrics,
      },
    }));
  },

  startLiveUpdates: () => {
    const interval = setInterval(() => {
      // Update metrics for active servers
      const { updateMetrics } = get();
      ['srv-001', 'srv-002', 'srv-004'].forEach((serverId) => {
        updateMetrics(serverId);
      });
    }, 5000); // Update every 5 seconds

    set({ updateInterval: interval });
  },

  stopLiveUpdates: () => {
    const { updateInterval } = get();
    if (updateInterval) {
      clearInterval(updateInterval);
      set({ updateInterval: null });
    }
  },
}));
