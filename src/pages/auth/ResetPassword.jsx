import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/authService.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setMessage(result?.message || 'Password updated. You can sign in now.');
    } catch (err) {
      setError(err?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>
        <h1>Invalid link</h1>
        <p>This reset link is missing or invalid.</p>
        <Link to="/forgot-password">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="auth-page" style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>
      <h1>Reset password</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <label htmlFor="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
        />
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
      <p><Link to="/login">Back to login</Link></p>
    </div>
  );
}
