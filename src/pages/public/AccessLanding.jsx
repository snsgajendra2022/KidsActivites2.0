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
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import PlatformLandingSections from '../../components/public/PlatformLandingSections.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';

import imgSecure from '../../assets/timeline_secure.jpg';
import imgDocs from '../../assets/timeline_docs.jpg';
import imgFees from '../../assets/timeline_fees.jpg';
import imgConnected from '../../assets/timeline_connected.jpg';

const DEFAULT_HERO_HEADLINE = ['Manage Kids Activities,', 'Admissions, and Parents', 'in One Platform'];
const DEFAULT_HERO_SUBTEXT =
  'Launch your activity workspace in minutes.\nManage enrollments, schedules, payments, documents, and parent communication from one trusted platform.';

const TIMELINE_STEPS = [
  {
    title: 'Secure & Trusted',
    description: 'Role-based access, protected data, and audit-ready workflows for every program.',
    imageUrl: imgSecure,
  },
  {
    title: 'Easy Documentation',
    description: 'Collect forms, documents, and approvals online with real-time status tracking.',
    imageUrl: imgDocs,
  },
  {
    title: 'Transparent Payments',
    description: 'Clear payment breakdowns, online fee tracking, and digital receipt generation.',
    imageUrl: imgFees,
  },
  {
    title: 'Stay Connected',
    description: 'Share updates, messages, photos, and activity progress with parents.',
    imageUrl: imgConnected,
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
            {platform?.tagline || 'KIDS ACTIVITY ENROLLMENT PLATFORM'}
          </>
        )}
        title={heroLines.map((line, index) => (
          <span key={line}>
            {line}
            {index < heroLines.length - 1 && <br />}
          </span>
        ))}
        subtitle={heroSubtext.split('\n').map((line, index, arr) => (
          <span key={line}>
            {line}
            {index < arr.length - 1 && <br />}
          </span>
        ))}
        primaryAction={{
          to: '/workspace/new',
          label: <>Create Your Workspace <ArrowRight size={18} /></>,
        }}
        secondaryAction={{
          onClick: () => {
            document.getElementById('platform-overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
          label: 'See All Features',
        }}
      />

      <section className="sb-editorial-section sb-editorial-section--cream sb-access-section">
        <div className="sb-container sb-access-cards">
          <div className="sb-access-card">
            <div className="sb-access-card__icon">
              <Building2 size={22} />
            </div>
            <h2>New to Kids Activities?</h2>
            <p>
              Request a dedicated workspace for your activity program. We'll send a confirmation email and set up your portal after verification.
            </p>
            <Link to="/workspace/new" className="sb-purple-cta">
              Start Workspace Setup <ArrowRight size={16} />
            </Link>
          </div>

          <div className="sb-access-card">
            <div className="sb-access-card__icon">
              <LogIn size={22} />
            </div>
            <h2>Sign in to your workspace</h2>
            <p>Enter your workspace slug to open your portal login.</p>
            <form onSubmit={handleSignIn} className="flex flex-col gap-3 sm:flex-row">
              <FormInput
                name="workspaceSlug"
                placeholder="your-program"
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                helper="e.g. little-stars → /little-stars/login"
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
        title={`Why Programs Choose ${portalName}`}
        subtitle="A complete platform for enrollments, payments, documents, and parent communication."
        steps={TIMELINE_STEPS}
      />

      <PlatformLandingSections />

      <FinalImageCTA
        title={portalName}
        subtitle="Launch enrollments, payments, schedules, and parent communication in one secure platform."
        action={{
          to: '/workspace/new',
          label: <>Create Your Workspace <ArrowRight size={18} /></>,
        }}
      />

      <EditorialFooter compact />
    </PublicLayout>
  );
}
