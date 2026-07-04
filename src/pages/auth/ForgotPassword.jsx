import { useState } from 'react';
import { forgotPassword } from '../../services/authService.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useTenant } from '../../context/TenantContext.jsx';
import AuthSplitLayout from '../../components/layout/AuthSplitLayout.jsx';
import FormPanel from '../../components/ui/FormPanel.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ForgotPassword() {
  const { loginPath } = useTenantPath();
  const { tenantSlug } = useTenant();
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
    <AuthSplitLayout
      title="Forgot password"
      subtitle="We'll send a secure reset link to your email."
      workspaceSlug={tenantSlug}
      visualTitle="Account recovery"
      visualSubtitle="We'll send a secure link to reset your password. Links expire after a short period for your security."
      footerLink={{ to: loginPath, label: 'Back to login' }}
    >
      <FormPanel>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="sb-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@school.edu.in"
            />
          </div>
          {error && (
            <div className="sb-alert sb-alert--error" role="alert">{error}</div>
          )}
          {message && (
            <div className="sb-alert sb-alert--success" role="status">{message}</div>
          )}
          <Button type="submit" variant="primary" size="lg" loading={loading} disabled={loading} className="sb-button-primary w-full">
            Send reset link
          </Button>
        </form>
      </FormPanel>
    </AuthSplitLayout>
  );
}
