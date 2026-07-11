import { useNetworkStore } from '../../store/networkStore.js';
import { WifiOff, AlertTriangle, RefreshCw } from 'lucide-react';

export default function NetworkBanner() {
  const { isOnline, slowConnection, serverReconnecting } = useNetworkStore();

  if (isOnline && !slowConnection && !serverReconnecting) return null;

  const offline = !isOnline;

  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-2 border-b px-4 py-2.5 text-sm font-semibold ${
        offline
          ? 'border-rose-100 bg-rose-50 text-rose-600'
          : serverReconnecting
            ? 'border-sky-100 bg-sky-50 text-sky-700'
            : 'border-amber-100 bg-amber-50 text-amber-700'
      }`}
    >
      {offline ? (
        <>
          <WifiOff size={16} />
          You are offline. Upload will resume when the connection is restored.
        </>
      ) : serverReconnecting ? (
        <>
          <RefreshCw size={16} className="animate-spin" />
          Reconnecting to server… Your session is preserved.
        </>
      ) : (
        <>
          <AlertTriangle size={16} />
          Slow network detected. Some actions may take longer.
        </>
      )}
    </div>
  );
}
