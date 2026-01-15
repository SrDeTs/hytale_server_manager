import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { setModtaleApiKey } from '../services/modtaleApi';

interface ModtaleStore {
  apiKey: string;
  setApiKey: (key: string) => Promise<void>;
  clearApiKey: () => void;
}

export const useModtaleStore = create<ModtaleStore>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: async (key: string) => {
        await setModtaleApiKey(key);
        set({ apiKey: key });
      },
      clearApiKey: () => {
        setModtaleApiKey('');
        set({ apiKey: '' });
      },
    }),
    {
      name: 'hytale-panel-modtale',
      onRehydrateStorage: () => (state) => {
        // Initialize API key on backend on app load
        if (state?.apiKey) {
          setModtaleApiKey(state.apiKey);
        }
      },
    }
  )
);
