import { useCallback, useEffect, useRef, useState } from 'react';
import { BellOff, BellRing, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  enableWebPushFromUserGesture,
  getWebPushStatus,
  syncWebPushToken,
} from '../../services/webPushService.js';

/**
 * Shows why browser push is off and an Enable / Retry button (user gesture for first Allow).
 * Each browser profile registers its own FCM device (Chrome ≠ Safari).
 *
 * Mounted in AppLayout so users see this after login, not only on the Notifications page.
 */
export default function WebPushEnableBanner({ compact = false }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState({
    ok: false,
    reason: 'default',
    message: 'Checking notification support…',
  });
  const [busy, setBusy] = useState(false);
  const autoRetryDone = useRef(false);

  const refresh = useCallback(async () => {
    const next = await getWebPushStatus();
    setStatus(next);
    return next;
  }, []);

  useEffect(() => {
    void refresh();
    const onVis = () => { void refresh(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refresh]);

  // Permission already granted but no local FCM token → retry quietly (no gesture needed).
  useEffect(() => {
    if (!user?.id || status.reason !== 'needs_register' || autoRetryDone.current) return;
    autoRetryDone.current = true;
    let cancelled = false;
    (async () => {
      setBusy(true);
      try {
        await syncWebPushToken(user);
        if (!cancelled) await refresh();
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, status.reason, refresh]);

  if (status.reason === 'granted') {
    if (compact) return null;
    return (
      <div className="webpush-banner webpush-banner--ok" role="status">
        <BellRing size={18} aria-hidden />
        <p>{status.message}</p>
      </div>
    );
  }

  const canClickEnable = status.reason === 'default' || status.reason === 'needs_register';
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

  const buttonLabel = status.reason === 'needs_register'
    ? (busy ? 'Registering…' : 'Retry registration')
    : (busy ? 'Enabling…' : 'Allow notifications');

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
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
