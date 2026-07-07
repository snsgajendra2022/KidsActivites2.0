import { ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import JourneyNav from '../../components/public/JourneyNav.jsx';
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import MapFeatureSection from '../../components/public/MapFeatureSection.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import Banner360 from '../../components/public/Banner360.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';

import imgSecure from '../../assets/timeline_secure.jpg';
import imgDocs from '../../assets/timeline_docs.jpg';
import imgFees from '../../assets/timeline_fees.jpg';
import imgConnected from '../../assets/timeline_connected.jpg';
import imgPanorama from '../../assets/panorama_360.png';

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
    ? heroSubtext.split('\n').map((line, index, arr) => (
        <span key={line}>
          {line}
          {index < arr.length - 1 && <br />}
        </span>
      ))
    : `Complete your child's admission to ${school?.name || 'our school'} online. Submit documents, pay fees, and stay connected.`;

  return (
    <PublicLayout hideFooter className="sb-editorial-page">
      <CinematicHero
        imageUrl={heroImage}
        badge={(
          <>
            <Sparkles size={14} />
            {isPlatformHome
              ? (platform?.tagline || 'KIDS ACTIVITY ENROLLMENT PLATFORM')
              : `Admissions Open — Playgroup to 8th Class`}
          </>
        )}
        title={heroTitle}
        subtitle={heroSubtitle}
        primaryAction={{
          to: enrollPath,
          label: <>{isPlatformHome ? 'Start Workspace Setup' : 'Start Enrollment'} <ArrowRight size={18} /></>,
        }}
        secondaryAction={{
          to: loginPath,
          label: 'Parent Login',
        }}
      />



      <Banner360 
        imageUrl={imgPanorama}
        title="Experience Our Campus"
        subtitle="Explore our world-class facilities in 360°"
      />

      <EditorialTimeline
        title={`Why Programs Choose ${portalName}`}
        subtitle="A complete platform for enrollments, payments, documents, and parent communication."
        steps={TIMELINE_STEPS}
      />

      <MapFeatureSection
        title={isPlatformHome ? 'Schools Across the Region' : 'Visit Our Campus'}
        subtitle={isPlatformHome
<<<<<<< HEAD
          ? 'Kids Activities connects families with programs in their community.'
=======
          ? 'Kids Activities connects families with schools in their community.'
>>>>>>> 184e342ca3086b09ecfa96a1a12c60b50aaaa6ee
          : `Experience ${school?.name || 'our school'} in person or explore online.`}
        address={isPlatformHome ? undefined : school?.address}
      />

      <FinalImageCTA
        title={isPlatformHome ? portalName : school?.name}
        subtitle={isPlatformHome
          ? 'Launch enrollments, payments, schedules, and parent communication in one secure platform.'
          : school?.address}
        action={{
          to: enrollPath,
          label: <>{isPlatformHome ? 'Create Your Workspace' : 'Start Enrollment'} <ArrowRight size={18} /></>,
        }}
      />

      <EditorialFooter compact />
    </PublicLayout>
  );
}
