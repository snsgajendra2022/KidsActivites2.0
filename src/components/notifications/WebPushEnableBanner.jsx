import { useCallback, useEffect, useRef, useState } from 'react';
import { BellOff, BellRing, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  enableWebPushFromUserGesture,
  getWebPushStatus,
  syncWebPushToken,
} from '../../services/webPushService.js';

const GESTURE_PROMPTED_KEY = 'sb_web_push_gesture_prompted';

/**
 * Shows why browser push is off and an Enable / Retry button (user gesture for first Allow).
 * Each browser profile registers its own FCM device (Chrome ≠ Safari).
 *
 * Mounted in AppLayout so users see this after login, not only on the Notifications page.
 *
 * Also: once per tab session, the first click/keypress after login can open the browser
 * Allow dialog when permission is still `default` (still a real user gesture — browsers
 * forbid silent prompts on login alone).
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
  const autoRetryGen = useRef(0);
  const busyRef = useRef(false);
  const statusReasonRef = useRef(status.reason);

  const refresh = useCallback(async () => {
    const next = await getWebPushStatus();
    setStatus(next);
    statusReasonRef.current = next.reason;
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
    if (!user?.id || status.reason !== 'needs_register') return;
    const gen = ++autoRetryGen.current;
    let cancelled = false;
    (async () => {
      setBusy(true);
      busyRef.current = true;
      try {
        await syncWebPushToken(user);
        if (!cancelled && gen === autoRetryGen.current) await refresh();
      } finally {
        if (!cancelled && gen === autoRetryGen.current) {
          setBusy(false);
          busyRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, status.reason, refresh]);

  // First pointer/key after login → request permission while still in a user gesture.
  // Skipped if we already prompted this tab session, or permission is not `default`.
  useEffect(() => {
    if (!user?.id) return undefined;
    try {
      if (sessionStorage.getItem(GESTURE_PROMPTED_KEY) === '1') return undefined;
    } catch {
      // ignore
    }

    const onGesture = (event) => {
      if (busyRef.current) return;
      if (statusReasonRef.current !== 'default') return;
      // Banner button has its own handler — avoid double requestPermission.
      const target = event.target;
      if (target instanceof Element && target.closest('.webpush-banner__btn')) return;

      try {
        sessionStorage.setItem(GESTURE_PROMPTED_KEY, '1');
      } catch {
        // ignore
      }
      document.removeEventListener('pointerdown', onGesture, true);
      document.removeEventListener('keydown', onGesture, true);

      busyRef.current = true;
      setBusy(true);
      void (async () => {
        try {
          const result = await enableWebPushFromUserGesture(user);
          await refresh();
          if (result.ok) {
            toast(result.message, 'success');
          } else if (result.reason === 'denied') {
            toast(result.message, 'error');
          }
          // Dismiss / default: leave banner visible; no error toast spam.
        } finally {
          busyRef.current = false;
          setBusy(false);
        }
      })();
    };

    document.addEventListener('pointerdown', onGesture, true);
    document.addEventListener('keydown', onGesture, true);
    return () => {
      document.removeEventListener('pointerdown', onGesture, true);
      document.removeEventListener('keydown', onGesture, true);
    };
  }, [user, refresh, toast]);

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
    busyRef.current = true;
    try {
      try {
        sessionStorage.setItem(GESTURE_PROMPTED_KEY, '1');
      } catch {
        // ignore
      }
      const result = await enableWebPushFromUserGesture(user);
      await refresh();
      if (result.ok) {
        toast(result.message, 'success');
      } else {
        toast(result.message, 'error');
      }
    } finally {
      setBusy(false);
      busyRef.current = false;
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
        <p>
          {status.reason === 'default'
            ? 'Click Allow notifications (or anywhere once) so this browser can receive alerts. Browsers block silent enable on login.'
            : status.message}
        </p>
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
