import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CreditCard,
  FileCheck,
  GraduationCap,
  LogIn,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import PublicFooter from '../../components/layout/PublicFooter.jsx';
import PublicHero from '../../components/ui/PublicHero.jsx';
import ProcessJourney from '../../components/ui/ProcessJourney.jsx';
import PremiumCTA from '../../components/ui/PremiumCTA.jsx';
import PremiumCard from '../../components/ui/PremiumCard.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';

const DEFAULT_HERO_HEADLINE = ['Modern School Operations', 'Built for Growing Institutions'];
const DEFAULT_HERO_SUBTEXT =
  'Launch your school workspace in minutes. Manage enrollment, fees, and parent communication on one trusted platform.';

function parseHeroHeadline(headline) {
  if (!headline?.trim()) return DEFAULT_HERO_HEADLINE;
  const lines = headline.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : DEFAULT_HERO_HEADLINE;
}

export default function AccessLanding() {
  const { portalName, branding, platform } = usePortalConfig();
  const navigate = useNavigate();
  const [workspaceSlug, setWorkspaceSlug] = useState('');

  const heroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;
  const heroLines = parseHeroHeadline(platform?.heroHeadline);
  const heroSubtext = platform?.heroSubtext?.trim() || DEFAULT_HERO_SUBTEXT;

  function handleSignIn(e) {
    e.preventDefault();
    const slug = workspaceSlug.trim().toLowerCase();
    if (!slug) return;
    navigate(`/${slug}/login`);
  }

  return (
    <PublicLayout hideFooter className="!sb-surface sb-page">
      <PublicHero
        imageUrl={heroImage}
        badge={(
          <>
            <Sparkles size={14} />
            {platform?.tagline || 'Multi-school platform'}
          </>
        )}
        title={heroLines.map((line, index) => (
          <span key={line}>
            {line}
            {index < heroLines.length - 1 && <br />}
          </span>
        ))}
        subtitle={heroSubtext}
        primaryAction={{
          to: '/workspace/new',
          label: <>Create Workspace <ArrowRight size={18} className="inline ml-1" /></>,
          className: 'sb-button-gold sb-btn-pill btn-hover-lift inline-flex items-center gap-2',
        }}
      />

      <section className="sb-section sb-section--cream border-b border-[var(--sb-border)]">
        <div className="sb-container grid gap-8 lg:grid-cols-2">
          <PremiumCard goldAccent>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-accent">
              <Building2 size={22} />
            </div>
            <h2 className="font-display mb-2 text-2xl font-bold text-brand">New to SchoolBridge?</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              Request a dedicated workspace for your school. We&apos;ll send a confirmation email and provision your
              tenant after you verify.
            </p>
            <Link to="/workspace/new" className="sb-button-primary inline-flex items-center gap-2">
              Start workspace setup <ArrowRight size={16} />
            </Link>
          </PremiumCard>

          <PremiumCard goldAccent>
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-accent">
              <LogIn size={22} />
            </div>
            <h2 className="font-display mb-2 text-2xl font-bold text-brand">Sign in to your workspace</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted">
              Enter your school workspace slug to open your portal login.
            </p>
            <form onSubmit={handleSignIn} className="flex flex-col gap-3 sm:flex-row">
              <FormInput
                name="workspaceSlug"
                placeholder="your-school"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                helper="e.g. green-valley → /green-valley/login"
                className="flex-1"
              />
              <Button type="submit" variant="primary" size="lg" className="shrink-0 sm:self-end">
                Continue
              </Button>
            </form>
          </PremiumCard>
        </div>
      </section>

      <ProcessJourney
        title={`Why Schools Choose ${portalName}`}
        subtitle="A complete platform for admissions, fees, and parent communication."
        steps={[
          { icon: Shield, title: 'Secure & Trusted', desc: 'Role-based access, encrypted data, and audit-ready workflows.' },
          { icon: FileCheck, title: 'Easy Documentation', desc: 'Upload documents online with real-time status tracking.' },
          { icon: CreditCard, title: 'Transparent Fees', desc: 'Clear fee breakdown with digital receipt generation.' },
          { icon: Users, title: 'Stay Connected', desc: 'Chat with teachers and receive classroom photos after admission.' },
        ]}
      />

      <PremiumCTA
        icon={GraduationCap}
        title={portalName}
        subtitle={platform?.tagline || 'Professional grade enrollment and school operations.'}
        action={{
          to: '/workspace/new',
          label: <>Create your workspace <ArrowRight size={18} className="inline ml-1" /></>,
        }}
      />

      <PublicFooter compact />
    </PublicLayout>
  );
}
