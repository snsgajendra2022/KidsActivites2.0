import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, FileCheck, CreditCard, Users, ArrowRight, Sparkles, GraduationCap } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import PublicFooter from '../../components/layout/PublicFooter.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { useSchoolEnrollPath } from '../../hooks/useSchoolBasePath.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };

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

  return (
    <PublicLayout hideFooter className="!sb-surface">
      <section className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden md:min-h-[calc(100vh-4.5rem)]">
        <div className="absolute inset-0 z-0">
          {heroImage && <img alt="" className="h-full w-full object-cover" src={heroImage} />}
          <div className="hero-gradient absolute inset-0" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-4 py-16 md:px-10 md:py-20">
          <motion.div {...fadeUp} transition={{ duration: 0.5 }} className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
              <Sparkles size={14} />
              {isPlatformHome
                ? (platform?.tagline || 'Multi-school enrollment platform')
                : `Admissions Open — ${school?.academicYear}`}
            </div>
            <h1 className="font-display mb-5 text-4xl font-extrabold leading-tight tracking-[-0.04em] text-white md:text-5xl">
              {isPlatformHome ? (
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
              )}
            </h1>
            <p className="mb-8 max-w-xl text-lg leading-relaxed text-white/80">
              {isPlatformHome ? heroSubtext : (
                <>
                  Complete your child&apos;s admission to {school?.name || 'our school'} online. Submit documents, pay fees, and stay connected.
                </>
              )}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to={enrollPath}
                className="sb-link-btn sb-link-btn--light btn-hover-lift sb-btn-pill inline-flex items-center gap-2 bg-white text-sm font-semibold shadow-sm"
              >
                Start Enrollment <ArrowRight size={18} />
              </Link>
              <Link
                to={loginPath}
                className="sb-link-btn sb-link-btn--dark btn-hover-lift sb-btn-pill inline-flex items-center gap-2 border border-white/20 bg-brand text-sm font-semibold shadow-sm transition-premium hover:opacity-90"
              >
                Parent Login
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="programs" className="px-4 py-16 md:px-10 md:py-20">
        <div className="mx-auto max-w-screen-2xl">
          <motion.div {...fadeUp} className="mb-12 text-center">
            <h2 className="font-display mb-3 text-3xl font-extrabold tracking-tight text-brand">
              Why Schools Choose {portalName}
            </h2>
            <p className="text-muted">
              A complete platform for admissions, fees, and parent communication.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: 'Secure & Trusted', desc: 'Role-based access, encrypted data, and audit-ready workflows.' },
              { icon: FileCheck, title: 'Easy Documentation', desc: 'Upload documents online with real-time status tracking.' },
              { icon: CreditCard, title: 'Transparent Fees', desc: 'Clear fee breakdown with digital receipt generation.' },
              { icon: Users, title: 'Stay Connected', desc: 'Chat with teachers and receive classroom photos after admission.' },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                className="sb-card p-6 transition-premium hover:-translate-y-0.5 hover:shadow-lg"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-accent">
                  <Icon size={22} />
                </div>
                <h3 className="mb-2 text-base font-bold text-brand">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="bg-brand px-4 py-16 text-center text-on-primary md:px-10 md:py-20">
        <div className="mx-auto max-w-screen-2xl">
          <GraduationCap size={40} className="mx-auto mb-4 opacity-80" />
          <h2 className="font-display mb-3 text-3xl font-extrabold">
            {isPlatformHome ? portalName : school?.name}
          </h2>
          <p className="mb-8 text-on-primary-muted">
            {isPlatformHome ? (platform?.tagline || 'Professional Grade Enrollment.') : school?.address}
          </p>
          <Link
            to={enrollPath}
            className="sb-link-btn sb-link-btn--light btn-hover-lift sb-btn-pill inline-flex items-center gap-2 bg-white text-sm font-semibold shadow-md"
          >
            Begin Enrollment Application <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <section id="contact" className="border-t border-black/5 bg-white px-4 py-10 md:px-10">
        <div className="mx-auto max-w-screen-2xl text-center text-sm text-muted">
          {isPlatformHome
            ? 'Contact your school directly for admissions assistance.'
            : `${school?.phone} · ${school?.email}`}
        </div>
      </section>

      <PublicFooter compact />
    </PublicLayout>
  );
}
