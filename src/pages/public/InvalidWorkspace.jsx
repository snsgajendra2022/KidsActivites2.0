import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import Button from '../../components/ui/Button.jsx';
import { resolveTenantSlug } from '../../services/api/config.js';

export default function InvalidWorkspace() {
  const slug = resolveTenantSlug();

  return (
    <PublicLayout className="!sb-surface">
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <AlertCircle size={32} />
        </div>
        <h1 className="font-display mb-3 text-3xl font-bold text-brand">Workspace not found</h1>
        <p className="mb-2 text-muted">
          {slug
            ? <>The workspace <strong>{slug}</strong> does not exist or is not active.</>
            : 'This workspace does not exist or is not active.'}
        </p>
        <p className="mb-8 text-sm text-muted">
          Check the URL or register a new school workspace.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/register-school">
            <Button variant="primary">Register a school</Button>
          </Link>
          <Link to="/">
            <Button variant="secondary">Go to homepage</Button>
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
