import { useCallback } from 'react';
import { toast } from 'sonner';

const TYPE_MAP = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
  loading: 'loading',
  network: 'warning',
  permission: 'error',
};

/**
 * Backward-compatible toast hook wrapping Sonner.
 * @returns {{ toast: (message: string, type?: string) => void }}
 */
export function useToast() {
  const showToast = useCallback((message, type = 'success') => {
    const sonnerType = TYPE_MAP[type] || 'success';
    if (sonnerType === 'loading') {
      toast.loading(message);
    } else {
      toast[sonnerType](message);
    }
  }, []);

  return { toast: showToast };
}

export { toast };
