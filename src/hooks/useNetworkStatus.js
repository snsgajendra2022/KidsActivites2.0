import { useEffect } from 'react';
import { useNetworkStore } from '../store/networkStore.js';
import { useUploadStore } from '../store/uploadStore.js';
import { toast } from 'sonner';

export function useNetworkStatus() {
  const { isOnline, wasOffline, slowConnection, setOnline, setOffline, setSlowConnection, clearWasOffline } = useNetworkStore();

  useEffect(() => {
    const handleOnline = () => {
      setOnline();
      if (useNetworkStore.getState().wasOffline) {
        toast.success('Connection restored. Resuming pending uploads.');
        useUploadStore.getState().resumeAll();
        clearWasOffline();
      }
    };

    const handleOffline = () => {
      setOffline();
      useUploadStore.getState().pauseAll();
      toast.warning('You are offline. Upload will resume when the connection is restored.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Slow connection detection via Network Information API (optional)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const checkSlow = () => {
      if (conn) {
        const slow = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.saveData;
        setSlowConnection(slow);
        if (slow && isOnline) {
          toast.info('Slow network detected. Upload may take longer.');
        }
      }
    };
    conn?.addEventListener('change', checkSlow);
    checkSlow();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      conn?.removeEventListener('change', checkSlow);
    };
  }, [setOnline, setOffline, setSlowConnection, clearWasOffline, isOnline]);

  return { isOnline, wasOffline, slowConnection };
}
