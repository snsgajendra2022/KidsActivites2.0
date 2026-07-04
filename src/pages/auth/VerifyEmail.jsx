import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';
import { verifyEmail } from '../../services/authService.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useTenant } from '../../context/TenantContext.jsx';
import AuthSplitLayout from '../../components/layout/AuthSplitLayout.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import PremiumCard from '../../components/ui/PremiumCard.jsx';

export default function VerifyEmail() {
  const { loginPath } = useTenantPath();
  const { tenantSlug } = useTenant();
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
    <AuthSplitLayout
      title="Verify email"
      subtitle={loading ? 'Please wait while we verify your email.' : error ? 'Verification could not be completed.' : 'Your email has been confirmed.'}
      workspaceSlug={tenantSlug}
      visualTitle="Email verification"
      visualSubtitle="Confirming your email helps us keep your school workspace secure."
      footerLink={{ to: loginPath, label: 'Go to login' }}
    >
      {loading && <LoadingState message="Verifying your email…" />}
      {!loading && error && (
        <PremiumCard className="text-center">
          <XCircle size={48} className="mx-auto mb-4 text-rose-500" />
          <p className="text-sm text-rose-600">{error}</p>
          <p className="mt-4 text-sm text-muted">
            <Link to={loginPath} className="font-semibold text-accent hover:underline">Return to login</Link>
          </p>
        </PremiumCard>
      )}
      {!loading && message && (
        <PremiumCard className="text-center">
          <CheckCircle size={48} className="mx-auto mb-4 text-[var(--sb-forest)]" />
          <p className="text-sm text-[var(--sb-forest)]">{message}</p>
          <p className="mt-4 text-sm text-muted">
            <Link to={loginPath} className="font-semibold text-accent hover:underline">Sign in to continue</Link>
          </p>
        </PremiumCard>
      )}
    </AuthSplitLayout>
  );
}
