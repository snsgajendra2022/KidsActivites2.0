import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/authService.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const result = await forgotPassword(email);
      setMessage(result?.message || 'If an account exists, a reset link has been sent.');
    } catch (err) {
      setError(err?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page" style={{ maxWidth: 420, margin: '4rem auto', padding: '1rem' }}>
      <h1>Forgot password</h1>
      <p>Enter your email and we will send a reset link.</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
      <p><Link to="/login">Back to login</Link></p>
    </div>
  );
}
