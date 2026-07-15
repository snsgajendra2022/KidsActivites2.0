import { create } from 'zustand';

export const useNetworkStore = create((set, get) => ({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  wasOffline: false,
  slowConnection: false,
  serverReconnecting: false,

  setOnline: () => {
    const { wasOffline } = get();
    set({ isOnline: true, wasOffline: wasOffline });
  },

  setOffline: () => set({ isOnline: false, wasOffline: true }),

  setSlowConnection: (slow) => set({ slowConnection: slow }),

  setServerReconnecting: (serverReconnecting) => set({ serverReconnecting }),

  clearWasOffline: () => set({ wasOffline: false }),
}));
