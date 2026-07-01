import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { useNetworkStatus } from '../hooks/useNetworkStatus.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (!navigator.onLine) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: (failureCount) => navigator.onLine && failureCount < 1,
    },
  },
});

function NetworkWatcher({ children }) {
  useNetworkStatus();
  return children;
}

export default function AppProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <NetworkWatcher>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            duration: 4000,
            className: 'sonner-toast',
          }}
          mobileOffset={{ top: 16 }}
          expand={false}
        />
      </NetworkWatcher>
    </QueryClientProvider>
  );
}

export { queryClient };
