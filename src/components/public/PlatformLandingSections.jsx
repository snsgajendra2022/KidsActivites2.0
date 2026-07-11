import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BadgeCheck,
  FileText,
  GraduationCap,
  MessageCircle,
  Palette,
  School,
  Smartphone,
  Sparkles,
  Tv,
  Users,
  Wallet,
} from 'lucide-react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import PlatformShowcaseVisual from './PlatformShowcaseVisual.jsx';
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
  { id: 'features', label: 'Features', icon: Sparkles, blurb: 'Core tools schools use every day.' },
  { id: 'how', label: 'How it works', icon: GraduationCap, blurb: 'From workspace setup to parent connection.' },
  { id: 'roles', label: 'Roles', icon: Users, blurb: 'Secure portals for every team member.' },
  { id: 'enrollment', label: 'Enrollment', icon: FileText, blurb: 'Kidzee admissions from draft to approval.' },
  { id: 'fees', label: 'Fees & ops', icon: Wallet, blurb: 'Payments, documents, and school operations.' },
  { id: 'media', label: 'Media & TV', icon: Tv, blurb: 'Photos, chat, and classroom TV playback.' },
  { id: 'mobile', label: 'Mobile app', icon: Smartphone, blurb: 'iOS and Android for parents, teachers, and admins.' },
];

const HOW_ICONS = [School, Palette, Users, BadgeCheck, MessageCircle];

const panelMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
};

const cardMotion = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

function padStep(index) {
  return String(index + 1).padStart(2, '0');
}

function toItems(items, titleKey = 'title', descKey = 'description') {
  return items.map((item, index) => ({
    step: item.step || padStep(index),
    icon: item.icon,
    title: item[titleKey] || item.title || item.role || item.page || item.label,
    description: item[descKey] || item.description || item.items || item.details || item.screens,
  }));
}

function DetailCard({ icon: Icon, step, title, description, index, active, onSelect }) {
  const interactive = typeof onSelect === 'function';

  return (
    <motion.li
      {...cardMotion}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className={`sb-showcase-card${active ? ' sb-showcase-card--active' : ''}${interactive ? ' sb-showcase-card--interactive' : ''}`}
    >
      {interactive ? (
        <button type="button" className="sb-showcase-card__hit" onClick={() => onSelect(index)}>
          <span className="sb-showcase-card__step">{step}</span>
          <span className="sb-showcase-card__icon" aria-hidden>
            {Icon ? <Icon size={18} strokeWidth={1.75} /> : null}
          </span>
          <span className="sb-showcase-card__copy">
            <strong>{title}</strong>
            {description && <span>{description}</span>}
          </span>
        </button>
      ) : (
        <div className="sb-showcase-card__body">
          <span className="sb-showcase-card__step">{step}</span>
          <span className="sb-showcase-card__icon" aria-hidden>
            {Icon ? <Icon size={18} strokeWidth={1.75} /> : null}
          </span>
          <div className="sb-showcase-card__copy">
            <strong>{title}</strong>
            {description && <p>{description}</p>}
          </div>
        </div>
      )}
    </motion.li>
  );
}

function HowItWorksPanel({ items, onStepChange }) {
  const [active, setActive] = useState(0);
  const activeItem = items[active] || items[0];

  const selectStep = (index) => {
    setActive(index);
    onStepChange?.(index);
  };

  return (
    <div className="sb-showcase-how">
      <motion.div className="sb-showcase-how__spotlight" key={activeItem?.title} {...panelMotion}>
        <span className="sb-showcase-how__spotlight-step">{activeItem?.step}</span>
        <h4>{activeItem?.title}</h4>
        <p>{activeItem?.description}</p>
      </motion.div>
      <ol className="sb-showcase-grid sb-showcase-grid--how" aria-label="How it works steps">
        {items.map((item, index) => (
          <DetailCard
            key={item.title}
            icon={HOW_ICONS[index]}
            step={item.step}
            title={item.title}
            description={item.description}
            index={index}
            active={active === index}
            onSelect={selectStep}
          />
        ))}
      </ol>
    </div>
  );
}

function FeaturePanel() {
  return (
    <ol className="sb-showcase-grid sb-showcase-grid--features" aria-label="Platform features">
      {PLATFORM_FEATURES.map((item, index) => (
        <DetailCard
          key={item.title}
          icon={item.icon}
          step={padStep(index)}
          title={item.title}
          description={item.description}
          index={index}
        />
      ))}
    </ol>
  );
}

function GenericPanel({ items }) {
  return (
    <ol className="sb-showcase-grid" aria-label="Platform details">
      {items.map((item, index) => (
        <DetailCard
          key={`${item.title}-${index}`}
          icon={item.icon}
          step={item.step}
          title={item.title}
          description={item.description}
          index={index}
        />
      ))}
    </ol>
  );
}

function EnrollmentPanel({ formItems, pipelineItems }) {
  return (
    <div className="sb-showcase-stack">
      <div>
        <h4 className="sb-showcase-stack__title">Kidzee form pages</h4>
        <GenericPanel items={formItems} />
      </div>
      <div>
        <h4 className="sb-showcase-stack__title">Admission pipeline</h4>
        <GenericPanel items={pipelineItems} />
      </div>
      <div className="sb-showcase-workflow" aria-label="Enrollment workflow">
        <p className="sb-showcase-workflow__label">Workflow</p>
        <ol className="sb-showcase-workflow__track">
          {ENROLLMENT_WORKFLOW.map((tag, index) => (
            <li key={tag}>
              <span>{tag}</span>
              {index < ENROLLMENT_WORKFLOW.length - 1 && <ArrowRight size={14} aria-hidden />}
            </li>
          ))}
        </ol>
      </div>
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

function TabPanel({ activeTab, data, iosUrl, androidUrl, onHowStepChange }) {
  if (activeTab === 'how') return <HowItWorksPanel items={data.how} onStepChange={onHowStepChange} />;
  if (activeTab === 'features') return <FeaturePanel />;
  if (activeTab === 'enrollment') {
    return <EnrollmentPanel formItems={data.enrollmentForm} pipelineItems={data.enrollmentPipeline} />;
  }

  return (
    <>
      <GenericPanel items={data[activeTab] || []} />
      {activeTab === 'mobile' && (
        <div className="sb-showcase-mobile-cta">
          <p>Download the Kids Activities app for parents, teachers, admins, and TV sign-in.</p>
          <div className="sb-app-store-buttons sb-app-store-buttons--after-journey">
            <AppStoreButton label="Download on the App Store" href={iosUrl} />
            <AppStoreButton label="Get it on Google Play" href={androidUrl} />
          </div>
        </div>
      )}
    </>
  );
}

export default function PlatformLandingSections() {
  const { platform } = usePortalConfig();
  const iosUrl = platform?.mobileApp?.iosUrl || platform?.mobileApp?.appStoreUrl;
  const androidUrl = platform?.mobileApp?.androidUrl || platform?.mobileApp?.playStoreUrl;
  const [activeTab, setActiveTab] = useState('features');
  const [activeHowStep, setActiveHowStep] = useState(0);

  const data = useMemo(() => ({
    how: HOW_IT_WORKS,
    roles: toItems(PLATFORM_ROLES, 'title', 'items'),
    enrollmentForm: toItems(ENROLLMENT_PAGES, 'page', 'details'),
    enrollmentPipeline: toItems(ADMISSION_PIPELINE),
    fees: toItems([...FEES_AND_DOCS, ...OPERATIONS]),
    media: [
      ...toItems(COMMUNICATION_MEDIA),
      ...toItems(TV_PLAYBACK_STEPS, 'label', 'description'),
    ],
    mobile: toItems(MOBILE_APP_ROLES, 'role', 'screens'),
  }), []);

  const activeMeta = OVERVIEW_TABS.find((tab) => tab.id === activeTab) || OVERVIEW_TABS[0];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setActiveHowStep(0);
  };

  return (
    <section
      id="platform-overview"
      className="sb-editorial-section sb-editorial-section--lavender sb-platform-overview"
    >
      <div className="sb-container">
        <div className="sb-platform-showcase">
          <header className="sb-platform-showcase__header">
            <div className="sb-platform-shell__badge">
              <Sparkles size={14} aria-hidden />
              Full platform overview
            </div>
            <h2 className="sb-editorial-heading">Everything in One Platform</h2>
            <p className="sb-editorial-subheading mx-auto">{PLATFORM_PURPOSE}</p>
          </header>

          <div className="sb-platform-showcase__layout">
            <nav className="sb-platform-showcase__nav" role="tablist" aria-label="Platform overview">
              {OVERVIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`sb-platform-showcase__nav-btn${selected ? ' is-active' : ''}`}
                    onClick={() => handleTabChange(tab.id)}
                  >
                    <Icon size={16} strokeWidth={1.75} aria-hidden />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="sb-platform-showcase__stage" role="tabpanel">
              <div className="sb-platform-showcase__stage-head">
                <div>
                  <h3>{activeMeta.label}</h3>
                  <p>{activeMeta.blurb}</p>
                </div>
                <PlatformShowcaseVisual
                  tabId={activeTab}
                  activeStep={activeTab === 'how' ? activeHowStep : 0}
                />
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  className="sb-platform-showcase__content"
                  {...panelMotion}
                >
                  <TabPanel
                    activeTab={activeTab}
                    data={data}
                    iosUrl={iosUrl}
                    androidUrl={androidUrl}
                    onHowStepChange={setActiveHowStep}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
