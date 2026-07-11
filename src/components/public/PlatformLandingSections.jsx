import { Smartphone } from 'lucide-react';
import JourneyNav from './JourneyNav.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import {
  COMMUNICATION_MEDIA,
  ENROLLMENT_PAGES,
  ENROLLMENT_WORKFLOW,
  MOBILE_APP_ROLES,
  PLATFORM_FEATURES,
  PLATFORM_PURPOSE,
  PLATFORM_ROLES,
  TV_PLAYBACK_DETAILS,
  TV_PLAYBACK_STEPS,
} from '../../data/platformLandingData.js';

function SectionHeader({ title, subtitle }) {
  return (
    <div className="sb-editorial-section__header">
      <h2 className="sb-editorial-heading">{title}</h2>
      {subtitle && <p className="sb-editorial-subheading mx-auto">{subtitle}</p>}
    </div>
  );
}

function AppStoreButton({ label, href }) {
  if (href?.trim()) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="sb-purple-cta"
      >
        {label}
      </a>
    );
  }

  return (
    <span className="sb-purple-cta sb-purple-cta--disabled" aria-disabled="true">
      {label} — Coming Soon
    </span>
  );
}

export default function PlatformLandingSections() {
  const { platform } = usePortalConfig();
  const iosUrl = platform?.mobileApp?.iosUrl || platform?.mobileApp?.appStoreUrl;
  const androidUrl = platform?.mobileApp?.androidUrl || platform?.mobileApp?.playStoreUrl;

  return (
    <>
      <section className="sb-editorial-section sb-editorial-section--lavender">
        <div className="sb-container">
          <SectionHeader
            title="One Platform for Every School Workspace"
            subtitle="Each school or activity program runs on its own branded portal with shared platform capabilities."
          />
          <p className="sb-platform-intro">{PLATFORM_PURPOSE}</p>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--cream">
        <div className="sb-container">
          <SectionHeader
            title="Main Platform Features"
            subtitle="Everything schools need to run admissions, operations, and parent engagement online."
          />
          <ul className="sb-platform-features-grid">
            {PLATFORM_FEATURES.map(({ icon: Icon, title }) => (
              <li key={title} className="sb-platform-feature-item">
                <div className="sb-access-card__icon">
                  <Icon size={20} aria-hidden />
                </div>
                <h3>{title}</h3>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--lavender">
        <div className="sb-container">
          <SectionHeader
            title="Built for Every Role"
            subtitle="Secure, role-based portals for admins, teachers, parents, and school staff."
          />
          <div className="sb-platform-role-grid">
            {PLATFORM_ROLES.map(({ title, items }) => (
              <article key={title} className="sb-access-card sb-platform-role-card">
                <h3>{title}</h3>
                <p>{items}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--cream">
        <div className="sb-container">
          <SectionHeader
            title="5-Page Kidzee Enrollment Form"
            subtitle="A complete digital admission workflow with draft save, validation, and admin review."
          />
          <div className="sb-platform-enroll-grid">
            {ENROLLMENT_PAGES.map(({ page, details }) => (
              <article key={page} className="sb-access-card sb-platform-enroll-card">
                <h3>{page}</h3>
                <p>{details}</p>
              </article>
            ))}
          </div>
          <ul className="sb-platform-tag-list" aria-label="Enrollment workflow features">
            {ENROLLMENT_WORKFLOW.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--lavender">
        <div className="sb-container">
          <SectionHeader
            title="Communication & Media"
            subtitle="Keep families connected with chat, notifications, photos, and class albums."
          />
          <div className="sb-platform-media-grid">
            {COMMUNICATION_MEDIA.map(({ title, description }) => (
              <article key={title} className="sb-access-card sb-platform-media-card">
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--cream">
        <div className="sb-container">
          <SectionHeader
            title="QR & TV Playback"
            subtitle="Display class albums on lobby TVs with secure QR sign-in from the mobile app."
          />
          <JourneyNav steps={TV_PLAYBACK_STEPS} activeIndex={0} className="sb-platform-tv-journey" />
          <p className="sb-platform-tv-flow">
            Flow: TV shows QR → Teacher/Admin scans from mobile app → Select album → TV starts playback.
          </p>
          <ul className="sb-platform-tag-list" aria-label="TV playback capabilities">
            {TV_PLAYBACK_DETAILS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="sb-editorial-section sb-editorial-section--lavender">
        <div className="sb-container">
          <SectionHeader
            title="Kids Activities Mobile App"
            subtitle="Parents, teachers, admins, and TV flows — all supported on iOS and Android."
          />
          <div className="sb-platform-mobile-intro">
            <div className="sb-access-card__icon">
              <Smartphone size={22} aria-hidden />
            </div>
            <p>
              The Kids Activities mobile app supports parents, teachers, admins, and TV playback workflows
              from one secure school workspace.
            </p>
          </div>
          <div className="sb-platform-role-grid">
            {MOBILE_APP_ROLES.map(({ role, screens }) => (
              <article key={role} className="sb-access-card sb-platform-role-card">
                <h3>{role}</h3>
                <p>{screens}</p>
              </article>
            ))}
          </div>
          <div className="sb-app-store-buttons">
            <AppStoreButton label="Download on the App Store" href={iosUrl} />
            <AppStoreButton label="Get it on Google Play" href={androidUrl} />
          </div>
        </div>
      </section>
    </>
  );
}
