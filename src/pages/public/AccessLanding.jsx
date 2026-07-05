import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  LogIn,
  Sparkles,
} from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import JourneyNav from '../../components/public/JourneyNav.jsx';
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';

const DEFAULT_HERO_HEADLINE = ['Modern School Operations', 'Built for Growing Institutions'];
const DEFAULT_HERO_SUBTEXT =
  'Launch your school workspace in minutes. Manage enrollment, fees, and parent communication on one trusted platform.';

const ACCESS_JOURNEY = [
  { label: 'Discover' },
  { label: 'Create' },
  { label: 'Configure' },
  { label: 'Launch' },
];

const TIMELINE_STEPS = [
  {
    title: 'Secure & Trusted',
    description: 'Role-based access, encrypted data, and audit-ready workflows.',
    showPlay: true,
  },
  {
    title: 'Easy Documentation',
    description: 'Upload documents online with real-time status tracking.',
    showPlay: false,
  },
  {
    title: 'Transparent Fees',
    description: 'Clear fee breakdown with digital receipt generation.',
    showPlay: false,
  },
  {
    title: 'Stay Connected',
    description: 'Chat with teachers and receive classroom photos after admission.',
    showPlay: true,
  },
];

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
    <PublicLayout hideFooter className="sb-editorial-page">
      <CinematicHero
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
          label: <>Create Workspace <ArrowRight size={18} /></>,
        }}
      />

      <JourneyNav steps={ACCESS_JOURNEY} activeIndex={0} />

      <section className="sb-editorial-section sb-editorial-section--lavender">
        <div className="sb-container sb-access-cards">
          <div className="sb-access-card">
            <div className="sb-access-card__icon">
              <Building2 size={22} />
            </div>
            <h2>New to SchoolBridge?</h2>
            <p>
              Request a dedicated workspace for your school. We&apos;ll send a confirmation email and provision your
              tenant after you verify.
            </p>
            <Link to="/workspace/new" className="sb-purple-cta">
              Start workspace setup <ArrowRight size={16} />
            </Link>
          </div>

          <div className="sb-access-card">
            <div className="sb-access-card__icon">
              <LogIn size={22} />
            </div>
            <h2>Sign in to your workspace</h2>
            <p>Enter your school workspace slug to open your portal login.</p>
            <form onSubmit={handleSignIn} className="flex flex-col gap-3 sm:flex-row">
              <FormInput
                name="workspaceSlug"
                placeholder="your-school"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                helper="e.g. green-valley → /green-valley/login"
                className="flex-1"
              />
              <Button type="submit" variant="primary" size="lg" className="sb-purple-cta shrink-0 sm:self-end !border-0">
                Continue
              </Button>
            </form>
          </div>
        </div>
      </section>

      <EditorialTimeline
        title={`Why Schools Choose ${portalName}`}
        subtitle="A complete platform for admissions, fees, and parent communication."
        steps={TIMELINE_STEPS}
      />

      <FinalImageCTA
        title={portalName}
        subtitle={platform?.tagline || 'Professional grade enrollment and school operations.'}
        action={{
          to: '/workspace/new',
          label: <>Create your workspace <ArrowRight size={18} /></>,
        }}
      />

      <EditorialFooter compact />
    </PublicLayout>
  );
}
