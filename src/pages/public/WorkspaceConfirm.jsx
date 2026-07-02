import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check, ExternalLink, Loader2 } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import { confirmWorkspace } from '../../services/workspaceService.js';
import { ApiError } from '../../services/api/client.js';

export default function WorkspaceConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    if (!token) {
      setState({ loading: false, error: 'Missing confirmation token.', data: null });
      return;
    }

    let cancelled = false;
    confirmWorkspace(token)
      .then((data) => {
        if (!cancelled) setState({ loading: false, error: null, data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof ApiError ? err.message : 'Confirmation failed',
            data: null,
          });
        }
      });

    return () => { cancelled = true; };
  }, [token]);

  const { loading, error, data } = state;

  return (
    <PublicLayout className="!sb-surface">
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        {loading && (
          <>
            <Loader2 size={40} className="mb-4 animate-spin text-brand" />
            <h1 className="font-display text-2xl font-bold text-brand">Provisioning your workspace…</h1>
            <p className="mt-2 text-sm text-muted">This may take a minute.</p>
          </>
        )}

        {!loading && error && (
          <>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle size={32} />
            </div>
            <h1 className="font-display mb-3 text-2xl font-bold text-brand">Confirmation failed</h1>
            <p className="mb-8 text-muted">{error}</p>
            <Link to="/workspace/new" className="premium-btn premium-btn-primary">
              Request a new workspace
            </Link>
          </>
        )}

        {!loading && data && (
          <>
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={32} />
            </div>
            <h1 className="font-display mb-3 text-3xl font-bold text-brand">Workspace ready!</h1>
            <p className="mb-2 text-muted">
              <strong>{data.workspaceName}</strong> is now active.
            </p>
            <p className="mb-6 text-sm text-muted">
              Sign in with <strong>{data.adminEmail}</strong>. Your temporary password was sent by email.
            </p>

            {data.temporaryPassword && (
              <div className="mb-6 w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm">
                <p className="font-medium text-amber-900">Temporary password (also emailed):</p>
                <code className="mt-1 block font-mono text-amber-800">{data.temporaryPassword}</code>
              </div>
            )}

            <a href={data.loginUrl} className="premium-btn premium-btn-primary mb-4 inline-flex items-center gap-2">
              Go to workspace login <ExternalLink size={16} />
            </a>
            <p className="text-xs text-muted">
              URL: <code>{data.loginUrl}</code>
            </p>
          </>
        )}
      </div>
    </PublicLayout>
  );
}
