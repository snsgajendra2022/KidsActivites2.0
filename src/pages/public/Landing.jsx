import { Link } from 'react-router-dom';
import { Shield, FileCheck, CreditCard, Users, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import PublicFooter from '../../components/layout/PublicFooter.jsx';
import PublicHero from '../../components/ui/PublicHero.jsx';
import ProcessJourney from '../../components/ui/ProcessJourney.jsx';
import PremiumCTA from '../../components/ui/PremiumCTA.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';

const DEFAULT_HERO_HEADLINE = ['Modern School Enrollment', 'Built for Premium Education'];
const DEFAULT_HERO_SUBTEXT =
  "Complete your child's admission online. Submit documents, pay fees, and stay connected — all in one trusted platform.";

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
    <PublicLayout hideFooter className="!sb-surface sb-page">
      <PublicHero
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
          label: <>Start Enrollment <ArrowRight size={18} className="inline ml-1" /></>,
          className: 'sb-button-gold sb-btn-pill btn-hover-lift inline-flex items-center gap-2',
        }}
        secondaryAction={{
          to: loginPath,
          label: 'Parent Login',
        }}
      />

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
        title={isPlatformHome ? portalName : school?.name}
        subtitle={isPlatformHome ? (platform?.tagline || 'Professional Grade Enrollment.') : school?.address}
        action={{
          to: enrollPath,
          label: <>Begin Enrollment Application <ArrowRight size={18} className="inline ml-1" /></>,
        }}
      />

      <section id="contact" className="border-t border-[var(--sb-border)] bg-white px-4 py-10 md:px-10">
        <div className="sb-container text-center text-sm text-muted">
          {isPlatformHome
            ? 'Contact your school directly for admissions assistance.'
            : `${school?.phone} · ${school?.email}`}
        </div>
      </section>

      <PublicFooter compact />
    </PublicLayout>
  );
}
