import { useNetworkStore } from '../../store/networkStore.js';
import { WifiOff, AlertTriangle } from 'lucide-react';

export default function NetworkBanner() {
  const { isOnline, slowConnection } = useNetworkStore();

  if (isOnline && !slowConnection) return null;

  const offline = !isOnline;

  return (
    <div
      className={`flex shrink-0 items-center justify-center gap-2 border-b px-4 py-2.5 text-sm font-semibold ${
        offline
          ? 'border-rose-100 bg-rose-50 text-rose-600'
          : 'border-amber-100 bg-amber-50 text-amber-700'
      }`}
    >
      {offline ? (
        <>
          <WifiOff size={16} />
          You are offline. Upload will resume when the connection is restored.
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
