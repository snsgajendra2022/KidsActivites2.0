import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../../services/authService.js';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError('Verification link is invalid');
      setLoading(false);
      return;
    }
    verifyEmail(token)
      .then((result) => setMessage(result?.message || 'Email verified successfully'))
      .catch((err) => setError(err?.message || 'Verification failed'))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem', textAlign: 'center' }}>
      <h1>Verify email</h1>
      {loading && <p>Verifying…</p>}
      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}
      <p><Link to="/login">Go to login</Link></p>
    </div>
  );
}
