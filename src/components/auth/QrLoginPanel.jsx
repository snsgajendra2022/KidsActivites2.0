import { useCallback, useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone } from 'lucide-react';
import { initQrLogin, pollQrLoginStatus } from '../../services/qrLoginService.js';

const POLL_MS = 2000;

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function QrLoginPanel({ onApproved, onError }) {
  const [session, setSession] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const pollRef = useRef(null);
  const countdownRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startSession = useCallback(async () => {
    clearTimers();
    setStatus('loading');
    setMessage('');
    try {
      const data = await initQrLogin();
      setSession(data);
      setSecondsLeft(Number(data.expiresIn ?? 300));
      setStatus(data.status === 'REJECTED' ? 'rejected' : 'pending');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Could not start QR login.');
      onError?.(err.message);
    }
  }, [clearTimers, onError]);

  useEffect(() => {
    void startSession();
    return clearTimers;
  }, [startSession, clearTimers]);

  useEffect(() => {
    if (!session?.sessionId || status !== 'pending') return undefined;

    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    pollRef.current = setInterval(async () => {
      try {
        const data = await pollQrLoginStatus(session.sessionId);
        if (data.status === 'APPROVED' && data.accessToken) {
          clearTimers();
          setStatus('approved');
          onApproved?.(data);
          return;
        }
        if (data.status === 'REJECTED') {
          clearTimers();
          setStatus('rejected');
          setMessage('Sign-in was rejected on your mobile device.');
          return;
        }
        if (typeof data.expiresIn === 'number') {
          setSecondsLeft(data.expiresIn);
        }
      } catch (err) {
        clearTimers();
        setStatus('error');
        setMessage(err.message || 'QR login failed.');
        onError?.(err.message);
      }
    }, POLL_MS);

    return clearTimers;
  }, [session, status, onApproved, onError, clearTimers]);

  useEffect(() => {
    if (secondsLeft === 0 && status === 'pending') {
      clearTimers();
      setStatus('expired');
      setMessage('QR code expired. Refreshing…');
      void startSession();
    }
  }, [secondsLeft, status, clearTimers, startSession]);

  if (status === 'loading' || !session?.qrPayload) {
    return (
      <div className="login-qr-panel">
        <p className="login-muted-text text-sm">Preparing QR code…</p>
      </div>
    );
  }

  return (
    <div className="login-qr-panel flex flex-col items-center gap-4">
      <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
        <QRCodeSVG value={session.qrPayload} size={220} level="M" includeMargin />
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-brand">
        <Smartphone size={16} />
        Scan with Kids Activities mobile app
      </div>
      <p className="login-muted-text max-w-sm text-center text-sm">
        For web sign-in only. On the TV app, use the QR shown on the television and scan it from
        the Kids Activities mobile app while signed in.
      </p>
      <p className="text-xs font-semibold text-muted">
        Expires in {formatCountdown(secondsLeft)}
      </p>
      {message ? (
        <div className="sb-alert sb-alert--warning w-full text-sm" role="status">
          {message}
        </div>
      ) : null}
      {status === 'error' || status === 'rejected' ? (
        <button type="button" className="sb-button-secondary" onClick={() => void startSession()}>
          Refresh QR code
        </button>
      ) : null}
    </div>
  );
}
