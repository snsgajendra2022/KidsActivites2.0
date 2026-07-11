import { useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import {
  ADMISSION_PIPELINE,
  COMMUNICATION_MEDIA,
  ENROLLMENT_PAGES,
  ENROLLMENT_WORKFLOW,
  FEES_AND_DOCS,
  HOW_IT_WORKS,
  MOBILE_APP_ROLES,
  OPERATIONS,
  PLATFORM_FEATURES,
  PLATFORM_PURPOSE,
  PLATFORM_ROLES,
  TV_PLAYBACK_STEPS,
} from '../../data/platformLandingData.js';

const OVERVIEW_TABS = [
  { id: 'features', label: 'Features', blurb: 'Core tools schools use every day.' },
  { id: 'how', label: 'How it works', blurb: 'From workspace setup to parent connection.' },
  { id: 'roles', label: 'Roles', blurb: 'Secure portals for every team member.' },
  { id: 'enrollment', label: 'Enrollment', blurb: 'Kidzee admissions from draft to approval.' },
  { id: 'fees', label: 'Fees & ops', blurb: 'Payments, documents, and school operations.' },
  { id: 'media', label: 'Media & TV', blurb: 'Photos, chat, and classroom TV playback.' },
  { id: 'mobile', label: 'Mobile app', blurb: 'iOS and Android for parents, teachers, and admins.' },
];

function padStep(index) {
  return String(index + 1).padStart(2, '0');
}

function StepCard({ step, title, description }) {
  return (
    <li className="sb-platform-step-card">
      <span className="sb-platform-step-card__num">{step}</span>
      <h4 className="sb-platform-step-card__title">{title}</h4>
      {description && <p className="sb-platform-step-card__desc">{description}</p>}
    </li>
  );
}

function StepGrid({ items = [], className = '' }) {
  const count = Math.min(items.length, 12);
  return (
    <ol className={`sb-platform-step-grid sb-platform-step-grid--count-${count} ${className}`.trim()}>
      {items.map((item, index) => (
        <StepCard
          key={`${item.title}-${index}`}
          step={item.step || padStep(index)}
          title={item.title}
          description={item.description}
        />
      ))}
    </ol>
  );
}

function StepGroup({ label, items }) {
  if (!items.length) return null;
  return (
    <div className="sb-platform-step-group">
      {label && <h4 className="sb-platform-step-group__label">{label}</h4>}
      <StepGrid items={items} />
    </div>
  );
}

function WorkflowTrack({ tags = [] }) {
  if (!tags.length) return null;
  return (
    <div className="sb-platform-workflow" aria-label="Enrollment workflow">
      <p className="sb-platform-workflow__label">Workflow</p>
      <ol className="sb-platform-workflow__track">
        {tags.map((tag, index) => (
          <li key={tag} className="sb-platform-workflow__item">
            <span>{tag}</span>
            {index < tags.length - 1 && (
              <ArrowRight size={14} className="sb-platform-workflow__arrow" aria-hidden />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function AppStoreButton({ label, href }) {
  if (href?.trim()) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="sb-purple-cta">
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

function toJourneyItems(items, titleKey = 'title', descKey = 'description') {
  return items.map((item, index) => ({
    step: item.step || padStep(index),
    title: item[titleKey] || item.title || item.role || item.page || item.label,
    description: item[descKey] || item.description || item.items || item.details || item.screens,
  }));
}

export default function PlatformLandingSections() {
  const { platform } = usePortalConfig();
  const iosUrl = platform?.mobileApp?.iosUrl || platform?.mobileApp?.appStoreUrl;
  const androidUrl = platform?.mobileApp?.androidUrl || platform?.mobileApp?.playStoreUrl;
  const [activeTab, setActiveTab] = useState('features');

  const journeyByTab = useMemo(() => ({
    features: toJourneyItems(PLATFORM_FEATURES),
    how: toJourneyItems(HOW_IT_WORKS),
    roles: toJourneyItems(PLATFORM_ROLES, 'title', 'items'),
    enrollmentForm: toJourneyItems(ENROLLMENT_PAGES, 'page', 'details'),
    enrollmentPipeline: toJourneyItems(ADMISSION_PIPELINE),
    fees: toJourneyItems([...FEES_AND_DOCS, ...OPERATIONS]),
    media: [
      ...toJourneyItems(COMMUNICATION_MEDIA),
      ...toJourneyItems(TV_PLAYBACK_STEPS, 'label', 'description'),
    ],
    mobile: toJourneyItems(MOBILE_APP_ROLES, 'role', 'screens'),
  }), []);

  const activeMeta = OVERVIEW_TABS.find((tab) => tab.id === activeTab) || OVERVIEW_TABS[0];

  return (
    <section
      id="platform-overview"
      className="sb-editorial-section sb-editorial-section--lavender sb-platform-overview"
    >
      <div className="sb-container">
        <div className="sb-platform-shell">
          <div className="sb-platform-shell__intro">
            <div className="sb-platform-shell__badge">
              <Sparkles size={14} aria-hidden />
              Full platform overview
            </div>
            <h2 className="sb-editorial-heading">Everything in One Platform</h2>
            <p className="sb-editorial-subheading mx-auto">{PLATFORM_PURPOSE}</p>
          </div>

          <div className="sb-platform-tabs" role="tablist" aria-label="Platform overview">
            {OVERVIEW_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`sb-platform-tab${activeTab === tab.id ? ' sb-platform-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="sb-platform-tab-panel" role="tabpanel">
            <div className="sb-platform-tab-panel__head">
              <h3>{activeMeta.label}</h3>
              <p>{activeMeta.blurb}</p>
            </div>

            <div className="sb-platform-tab-panel__body">
              {activeTab === 'enrollment' ? (
                <>
                  <StepGroup label="Kidzee form pages" items={journeyByTab.enrollmentForm} />
                  <StepGroup label="Admission pipeline" items={journeyByTab.enrollmentPipeline} />
                  <WorkflowTrack tags={ENROLLMENT_WORKFLOW} />
                </>
              ) : (
                <StepGrid items={journeyByTab[activeTab] || []} />
              )}

              {activeTab === 'mobile' && (
                <div className="sb-platform-mobile-cta">
                  <p>Download the Kids Activities app for parents, teachers, admins, and TV sign-in.</p>
                  <div className="sb-app-store-buttons sb-app-store-buttons--after-journey">
                    <AppStoreButton label="Download on the App Store" href={iosUrl} />
                    <AppStoreButton label="Get it on Google Play" href={androidUrl} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
