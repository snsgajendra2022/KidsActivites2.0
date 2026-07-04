import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import PremiumCard from '../../components/ui/PremiumCard.jsx';
import { resolveTenantSlug } from '../../services/api/config.js';

export default function InvalidWorkspace() {
  const slug = resolveTenantSlug();

  return (
    <PublicLayout className="!sb-surface sb-page">
      <section className="sb-section">
        <div className="sb-container mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center text-center">
          <PremiumCard className="w-full" goldAccent>
            <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sb-gold)_15%,white)] text-[var(--sb-gold)]">
              <AlertCircle size={32} />
            </div>
            <p className="sb-eyebrow">Workspace Error</p>
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
              <Link to="/register-school" className="sb-button-primary sb-btn-pill">
                Register a school
              </Link>
              <Link to="/" className="sb-button-secondary sb-btn-pill">
                Go to homepage
              </Link>
            </div>
          </PremiumCard>
        </div>
      </section>
    </PublicLayout>
  );
}
