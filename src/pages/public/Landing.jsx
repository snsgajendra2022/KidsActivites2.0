import { ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import JourneyNav from '../../components/public/JourneyNav.jsx';
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import MapFeatureSection from '../../components/public/MapFeatureSection.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';

const DEFAULT_HERO_HEADLINE = ['Modern School Enrollment', 'Built for Premium Education'];
const DEFAULT_HERO_SUBTEXT =
  "Complete your child's admission online. Submit documents, pay fees, and stay connected — all in one trusted platform.";

const LANDING_JOURNEY = [
  { label: 'Discover' },
  { label: 'Apply' },
  { label: 'Documents' },
  { label: 'Connect' },
];

const TIMELINE_STEPS = [
  {
    title: 'Secure & Trusted',
    description: 'Role-based access, encrypted data, and audit-ready workflows designed for schools you can trust.',
    showPlay: true,
  },
  {
    title: 'Easy Documentation',
    description: 'Upload documents online with real-time status tracking — no more lost paperwork or repeated visits.',
    showPlay: true,
  },
  {
    title: 'Transparent Fees',
    description: 'Clear fee breakdown with digital receipt generation so families always know where they stand.',
    showPlay: false,
  },
  {
    title: 'Stay Connected',
    description: 'Chat with teachers and receive classroom photos after admission — your school community, online.',
    showPlay: true,
  },
];

function parseHeroHeadline(headline) {
  if (!headline?.trim()) return DEFAULT_HERO_HEADLINE;
  const lines = headline.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.length ? lines : DEFAULT_HERO_HEADLINE;
}

export default function Landing() {
  const { isPlatformHome } = useTenant();
  const { portalName, school, branding, platform } = usePortalConfig();
  const { loginPath } = useTenantPath();
  const enrollPath = useSchoolEnrollPath();
  const heroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;
  const heroLines = parseHeroHeadline(platform?.heroHeadline);
  const heroSubtext = platform?.heroSubtext?.trim() || DEFAULT_HERO_SUBTEXT;

  const heroTitle = isPlatformHome ? (
    <>
      {heroLines.map((line, index) => (
        <span key={line}>
          {line}
          {index < heroLines.length - 1 && <br />}
        </span>
      ))}
    </>
  ) : (
    school?.name || portalName
  );

  const heroSubtitle = isPlatformHome
    ? heroSubtext
    : `Complete your child's admission to ${school?.name || 'our school'} online. Submit documents, pay fees, and stay connected.`;

  return (
    <PublicLayout hideFooter className="sb-editorial-page">
      <CinematicHero
        imageUrl={heroImage}
        badge={(
          <>
            <Sparkles size={14} />
            {isPlatformHome
              ? (platform?.tagline || 'Multi-school enrollment platform')
              : `Admissions Open — ${school?.academicYear}`}
          </>
        )}
        title={heroTitle}
        subtitle={heroSubtitle}
        primaryAction={{
          to: enrollPath,
          label: <>Start Enrollment <ArrowRight size={18} /></>,
        }}
        secondaryAction={{
          to: loginPath,
          label: 'Parent Login',
        }}
      />

      <JourneyNav steps={LANDING_JOURNEY} activeIndex={0} />

      <EditorialTimeline
        title={`Why Schools Choose ${portalName}`}
        subtitle="A complete platform for admissions, fees, and parent communication."
        steps={TIMELINE_STEPS}
      />

      <MapFeatureSection
        title={isPlatformHome ? 'Schools Across the Region' : 'Visit Our Campus'}
        subtitle={isPlatformHome
          ? 'SchoolBridge connects families with schools in their community.'
          : `Experience ${school?.name || 'our school'} in person or explore online.`}
        address={isPlatformHome ? undefined : school?.address}
      />

      <FinalImageCTA
        title={isPlatformHome ? portalName : school?.name}
        subtitle={isPlatformHome
          ? (platform?.tagline || 'Professional Grade Enrollment.')
          : school?.address}
        action={{
          to: enrollPath,
          label: <>Begin Enrollment Application <ArrowRight size={18} /></>,
        }}
      />

      <EditorialFooter compact />
    </PublicLayout>
  );
}
