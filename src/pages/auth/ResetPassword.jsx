import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/authService.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useTenant } from '../../context/TenantContext.jsx';
import AuthSplitLayout from '../../components/layout/AuthSplitLayout.jsx';
import FormPanel from '../../components/ui/FormPanel.jsx';
import PremiumCard from '../../components/ui/PremiumCard.jsx';
import Button from '../../components/ui/Button.jsx';

export default function ResetPassword() {
  const { loginPath, tenantPath } = useTenantPath();
  const { tenantSlug } = useTenant();
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
      <AuthSplitLayout
        title="Invalid link"
        subtitle="This reset link is missing or has expired."
        workspaceSlug={tenantSlug}
        footerLink={{ to: tenantPath('/forgot-password'), label: 'Request a new link' }}
      >
        <PremiumCard className="text-center">
          <p className="text-sm text-muted">
            <Link to={tenantPath('/forgot-password')} className="font-semibold text-accent hover:underline">
              Request a new reset link
            </Link>
          </p>
        </PremiumCard>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout
      title="Reset password"
      subtitle="Choose a new password for your account."
      workspaceSlug={tenantSlug}
      visualTitle="Set a new password"
      visualSubtitle="Use at least 8 characters. Avoid reusing passwords from other services."
      footerLink={{ to: loginPath, label: 'Back to login' }}
    >
      <FormPanel>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-field">
            <label className="form-label" htmlFor="password">New password</label>
            <input
              id="password"
              className="sb-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="confirm">Confirm password</label>
            <input
              id="confirm"
              className="sb-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="sb-alert sb-alert--error" role="alert">{error}</div>
          )}
          {message && (
            <div className="sb-alert sb-alert--success" role="status">{message}</div>
          )}
          <Button type="submit" variant="primary" size="lg" loading={loading} disabled={loading} className="sb-button-primary w-full">
            Update password
          </Button>
        </form>
      </FormPanel>
    </AuthSplitLayout>
  );
}
