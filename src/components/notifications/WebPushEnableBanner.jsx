import { useCallback, useEffect, useState } from 'react';
import { BellOff, BellRing, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  enableWebPushFromUserGesture,
  getWebPushStatus,
} from '../../services/webPushService.js';

/**
 * Shows why browser push is off and an Enable button (user gesture required).
 * Each browser profile registers its own FCM device (Chrome ≠ Safari).
 */
export default function WebPushEnableBanner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState({
    ok: false,
    reason: 'default',
    message: 'Checking notification support…',
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getWebPushStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void refresh();
    const onVis = () => { void refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  if (status.reason === 'granted') {
    return (
      <div className="webpush-banner webpush-banner--ok" role="status">
        <BellRing size={18} aria-hidden />
        <p>{status.message}</p>
      </div>
    );
  }

  const canClickEnable = status.reason === 'default';
  const Icon = status.reason === 'insecure' || status.reason === 'missing_config'
    ? ShieldAlert
    : BellOff;

  const onEnable = async () => {
    setBusy(true);
    try {
      const result = await enableWebPushFromUserGesture(user);
      await refresh();
      if (result.ok) {
        toast(result.message, 'success');
      } else {
        toast(result.message, 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`webpush-banner webpush-banner--${status.reason}`} role="status">
      <Icon size={18} aria-hidden />
      <div className="webpush-banner__body">
        <strong>Browser notifications{status.browser ? ` · ${status.browser}` : ''}</strong>
        <p>{status.message}</p>
      </div>
      {canClickEnable && (
        <button
          type="button"
          className="webpush-banner__btn"
          onClick={() => { void onEnable(); }}
          disabled={busy || !user?.id}
        >
          {busy ? 'Enabling…' : 'Allow notifications'}
        </button>
      )}
    </div>
  );
}
