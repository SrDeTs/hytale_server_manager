import { create } from 'zustand';
import { api } from '../services/api';

// Script info for update instructions
interface ScriptInfo {
  filename: string;
  instructions: string[];
}

interface UpdateScripts {
  windows: ScriptInfo;
  linux: ScriptInfo;
}

export interface UpdateInfo {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion?: string;
  releaseUrl?: string;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl?: string;
  scripts: UpdateScripts;
  message?: string;
  checkedAt?: string;
}

interface UpdateState {
  updateInfo: UpdateInfo | null;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
  dismissed: boolean;

  // Actions
  checkForUpdates: (force?: boolean) => Promise<void>;
  dismissUpdate: () => void;
  resetDismiss: () => void;
  clearError: () => void;
}

// Cache duration: 1 hour
const CACHE_DURATION = 60 * 60 * 1000;
const DISMISS_KEY = 'hsm-update-dismissed-version';

export const useUpdateStore = create<UpdateState>((set, get) => ({
  updateInfo: null,
  isLoading: false,
  error: null,
  lastChecked: null,
  dismissed: false,

  checkForUpdates: async (force = false) => {
    const { lastChecked, isLoading } = get();
    const now = new Date();

    // Skip if recently checked (unless forced)
    if (!force && lastChecked && now.getTime() - lastChecked.getTime() < CACHE_DURATION) {
      return;
    }

    if (isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const info = await api.get<UpdateInfo>('/system/updates/check');

      // Check if user has dismissed this version
      const dismissedVersion = localStorage.getItem(DISMISS_KEY);
      const dismissed = dismissedVersion === info.latestVersion;

      set({
        updateInfo: info,
        isLoading: false,
        lastChecked: now,
        dismissed,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to check for updates',
        isLoading: false,
      });
    }
  },

  dismissUpdate: () => {
    const { updateInfo } = get();
    if (updateInfo?.latestVersion) {
      localStorage.setItem(DISMISS_KEY, updateInfo.latestVersion);
    }
    set({ dismissed: true });
  },

  resetDismiss: () => {
    localStorage.removeItem(DISMISS_KEY);
    set({ dismissed: false });
  },

  clearError: () => set({ error: null }),
}));
