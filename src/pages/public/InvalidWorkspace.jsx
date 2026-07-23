import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import PremiumCard from '../../components/ui/PremiumCard.jsx';
import { resolveTenantSlug } from '../../services/api/config.js';
import footerLogo from '../../assets/kids_activities_logo_white.png';

/**
 * Platform footer for invalid / inactive workspaces.
 * Logo asset has a baked-in black background — footer bg matches so it looks seamless.
 */
function WorkspaceErrorFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="workspace-error-footer" aria-label="Site footer">
      <div className="workspace-error-footer__inner">
        <div className="workspace-error-footer__top">
          <Link to="/" className="workspace-error-footer__brand" aria-label="Kids Activities home">
            <img
              src={footerLogo}
              alt="Kids Activities"
              className="workspace-error-footer__logo"
              width={220}
              height={56}
              decoding="async"
            />
          </Link>

          <nav className="workspace-error-footer__nav" aria-label="Footer">
            <Link to="/">Homepage</Link>
            <Link to="/register-school">Register a school</Link>
            <Link to="/support">Support</Link>
            <Link to="/privacy-policy">Privacy</Link>
          </nav>
        </div>

        <div className="workspace-error-footer__bottom">
          <p>© {year} Kids Activities. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

export default function InvalidWorkspace() {
  const slug = resolveTenantSlug();

  return (
    <PublicLayout hideFooter className="!sb-surface sb-page">
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
      <WorkspaceErrorFooter />
    </PublicLayout>
  );
}
