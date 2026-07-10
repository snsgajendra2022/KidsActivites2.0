import { ArrowRight, Sparkles } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import MapFeatureSection from '../../components/public/MapFeatureSection.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import StaticCampusBanner from '../../components/public/StaticCampusBanner.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';

import imgSecure from '../../assets/timeline_secure.jpg';
import imgDocs from '../../assets/timeline_docs.jpg';
import imgFees from '../../assets/timeline_fees.jpg';
import imgConnected from '../../assets/timeline_connected.jpg';

const DEFAULT_HERO_HEADLINE = ['Manage Kids Activities,', 'Admissions, and Parents', 'in One Platform'];
const DEFAULT_HERO_SUBTEXT =
  'Launch your activity workspace in minutes.\nManage enrollments, schedules, payments, documents, and parent communication from one trusted platform.';

const PLATFORM_TIMELINE_STEPS = [
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

function renderMultiline(text) {
  if (!text?.trim()) return null;
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  return lines.map((line, index) => (
    <span key={`${line}-${index}`}>
      {line}
      {index < lines.length - 1 && <br />}
    </span>
  ));
}

export default function Landing() {
  const { isPlatformHome } = useTenant();
  const { portalName, school, branding, platform, landingPage } = usePortalConfig();
  const { loginPath, tenantPath } = useTenantPath();
  const enrollPath = useSchoolEnrollPath();
  const enrollmentFormPath = tenantPath('/enrollment/kidzee-print-form');
  const heroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;

  if (isPlatformHome) {
    const heroLines = parseHeroHeadline(platform?.heroHeadline);
    const heroSubtext = platform?.heroSubtext?.trim() || DEFAULT_HERO_SUBTEXT;

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
          subtitle={renderMultiline(heroSubtext)}
          primaryAction={{
            to: enrollPath,
            label: <>Start Workspace Setup <ArrowRight size={18} /></>,
          }}
          secondaryAction={{
            to: '/workspace/new',
            label: 'Enrollment',
          }}
        />

        <EditorialTimeline
          title={`Why Programs Choose ${portalName}`}
          subtitle="A complete platform for enrollments, payments, documents, and parent communication."
          steps={PLATFORM_TIMELINE_STEPS}
        />

        <MapFeatureSection
          title="Schools Across the Region"
          subtitle="Kids Activities connects families with programs in their community."
        />

        <FinalImageCTA
          title={portalName}
          subtitle="Launch enrollments, payments, schedules, and parent communication in one secure platform."
          action={{
            to: enrollPath,
            label: <>Create Your Workspace <ArrowRight size={18} /></>,
          }}
        />

        <EditorialFooter compact />
      </PublicLayout>
    );
  }

  const sections = landingPage?.sections || {};
  const hero = landingPage?.hero || {};
  const campusBanner = landingPage?.campusBanner || {};
  const timeline = landingPage?.timeline || {};
  const map = landingPage?.map || {};
  const finalCta = landingPage?.finalCta || {};

  const heroTitle = hero.title?.trim() || school?.name || portalName;
  const heroSubtitle = hero.subtitle?.trim()
    || `Complete your child's admission to ${school?.name || 'our school'} online. Submit documents, pay fees, and stay connected.`;

  return (
    <PublicLayout hideFooter className="sb-editorial-page">
      {sections.hero !== false && (
        <CinematicHero
          imageUrl={heroImage}
          badge={hero.badge?.trim() ? (
            <>
              <Sparkles size={14} />
              {hero.badge}
            </>
          ) : null}
          title={heroTitle}
          subtitle={renderMultiline(heroSubtitle)}
          primaryAction={hero.primaryCtaEnabled !== false ? {
            to: enrollmentFormPath,
            label: <>{hero.primaryCtaLabel || 'Start Enrollment'} <ArrowRight size={18} /></>,
          } : null}
          secondaryAction={hero.secondaryCtaEnabled !== false ? {
            to: loginPath,
            label: hero.secondaryCtaLabel || 'Parent Login',
          } : null}
        />
      )}

      {sections.campusBanner !== false && campusBanner.imageUrl && (
        <StaticCampusBanner
          imageUrl={campusBanner.imageUrl}
          title={campusBanner.title}
          subtitle={campusBanner.subtitle}
        />
      )}

      {sections.timeline !== false && (
        <EditorialTimeline
          title={timeline.title || `Why Families Choose ${portalName}`}
          subtitle={timeline.subtitle}
          steps={timeline.steps || []}
        />
      )}

      {sections.map !== false && (
        <MapFeatureSection
          title={map.title || 'Visit Our Campus'}
          subtitle={map.subtitle || `Experience ${school?.name || 'our school'} in person or explore online.`}
          address={map.showAddress !== false ? school?.address : undefined}
          embedUrl={map.embedUrl}
          imageUrl={map.imageUrl || undefined}
        />
      )}

      {sections.finalCta !== false && (
        <FinalImageCTA
          title={finalCta.title?.trim() || school?.name || portalName}
          subtitle={finalCta.subtitle?.trim() || school?.address}
          imageUrl={finalCta.imageUrl || undefined}
          action={{
            to: enrollmentFormPath,
            label: <>{finalCta.ctaLabel || 'Start Enrollment'} <ArrowRight size={18} /></>,
          }}
        />
      )}

      {sections.footer !== false && <EditorialFooter compact />}
    </PublicLayout>
  );
}
