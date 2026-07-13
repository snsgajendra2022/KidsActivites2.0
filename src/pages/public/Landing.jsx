import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import EditorialTimeline from '../../components/public/EditorialTimeline.jsx';
import MapFeatureSection from '../../components/public/MapFeatureSection.jsx';
import FinalImageCTA from '../../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../../components/public/EditorialFooter.jsx';
import StaticCampusBanner from '../../components/public/StaticCampusBanner.jsx';
import LandingPageRenderer from '../../landing-builder/LandingPageRenderer.jsx';
import { readPreviewDraftFromKeys } from '../../landing-builder/blockUtils.js';
import { landingPageAction } from '../../services/landingPageApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getAccessToken } from '../../services/api/tokenStorage.js';
import '../../styles/landing-builder.css';

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
  const { user, bootstrapping } = useAuth();
  const { portalName, school, branding, platform, landingPage, landingPagePublished, activeSchoolId } = usePortalConfig();
  const { loginPath, tenantPath, tenantSlug } = useTenantPath();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === '1';
  const enrollPath = useSchoolEnrollPath();
  const enrollmentFormPath = tenantPath('/enrollment/kidzee-print-form');
  const heroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;

  const previewKeys = useMemo(
    () => [activeSchoolId, school?.id, tenantSlug, user?.schoolId].filter(Boolean),
    [activeSchoolId, school?.id, tenantSlug, user?.schoolId],
  );

  const [previewDraft, setPreviewDraft] = useState(null);
  const [previewSource, setPreviewSource] = useState(null); // 'stash' | 'api' | 'published'
  const [previewLoading, setPreviewLoading] = useState(isPreview);

  useEffect(() => {
    if (!isPreview || isPlatformHome) {
      setPreviewDraft(null);
      setPreviewSource(null);
      setPreviewLoading(false);
      return undefined;
    }

    // Wait for auth bootstrap so we can load the admin draft with the access token.
    if (bootstrapping) {
      setPreviewLoading(true);
      return undefined;
    }

    let cancelled = false;
    setPreviewLoading(true);

    const finish = (draft, source) => {
      if (cancelled) return;
      setPreviewDraft(draft);
      setPreviewSource(source);
      setPreviewLoading(false);
    };

    const stashed = readPreviewDraftFromKeys(previewKeys);
    if (stashed) {
      finish(stashed, 'stash');
      return undefined;
    }

    const token = getAccessToken();
    if (!token) {
      finish(null, landingPagePublished?.blocks?.length ? 'published' : null);
      return undefined;
    }

    const schoolId = activeSchoolId || school?.id || user?.schoolId || undefined;
    landingPageAction('getEditor', {}, { schoolId })
      .then((data) => {
        if (data?.draft?.version === 2 && data.draft?.blocks?.length) {
          finish(data.draft, 'api');
          return;
        }
        finish(null, landingPagePublished?.blocks?.length ? 'published' : null);
      })
      .catch(() => {
        finish(null, landingPagePublished?.blocks?.length ? 'published' : null);
      });

    return () => { cancelled = true; };
  }, [
    isPreview,
    isPlatformHome,
    bootstrapping,
    previewKeys,
    activeSchoolId,
    school?.id,
    user?.schoolId,
    landingPagePublished,
  ]);


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

  if (isPreview && previewLoading) {
    return (
      <PublicLayout hideFooter className="sb-editorial-page">
        <div className="landing-builder__loading">Loading landing page preview…</div>
      </PublicLayout>
    );
  }

  const v2Page = isPreview
    ? (previewDraft || landingPagePublished)
    : landingPagePublished;
  const showingPreviewDraft = isPreview && Boolean(previewDraft);
  const showingPublishedFallback = isPreview && !previewDraft && Boolean(landingPagePublished?.blocks?.length);

  if (v2Page?.version === 2 && v2Page?.blocks?.length) {
    return (
      <PublicLayout hideFooter className="sb-editorial-page">
        {isPreview && (
          <div className="landing-builder__preview-banner" role="status">
            <span>
              {showingPreviewDraft
                ? (previewSource === 'api'
                  ? 'Preview mode — showing your latest saved draft (not published yet).'
                  : 'Preview mode — this draft is not visible to the public until you publish.')
                : showingPublishedFallback
                  ? 'Preview mode — could not load draft, showing the published page. Click Preview again from Portal Settings while signed in.'
                  : 'Preview mode'}
            </span>
            {tenantSlug && (
              <a
                className="landing-builder__preview-back"
                href={`/${tenantSlug}/admin/portal-settings`}
              >
                Back to editor
              </a>
            )}
          </div>
        )}
        <LandingPageRenderer
          page={v2Page}
          branding={branding}
          school={school}
          portalName={portalName}
          tenantPath={tenantPath}
        />
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
