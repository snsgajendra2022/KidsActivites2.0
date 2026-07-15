import { useEffect } from 'react';
import { probeUploadBandwidth } from '../services/uploadBandwidthService.js';

/** Silently measure upload bandwidth — nothing shown in UI. */
export function useUploadBandwidth() {
  useEffect(() => {
    void probeUploadBandwidth();
  }, []);
}
