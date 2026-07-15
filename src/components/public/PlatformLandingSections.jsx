import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import {
  BadgeCheck,
  Camera,
  FileEdit,
  FileSignature,
  FileText,
  GraduationCap,
  Headphones,
  Heart,
  MessageCircle,
  Palette,
  Phone,
  RefreshCw,
  School,
  SearchCheck,
  Send,
  Shield,
  Smartphone,
  Sparkles,
  Tv,
  User,
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
  { id: 'enrollment', label: 'Enrollment', icon: FileText, blurb: 'Admissions from draft to approval.' },
  { id: 'fees', label: 'Fees & ops', icon: Wallet, blurb: 'Payments, documents, and school operations.' },
  { id: 'media', label: 'Media & TV', icon: Tv, blurb: 'Photos, chat, and classroom TV playback.' },
  { id: 'mobile', label: 'Mobile app', icon: Smartphone, blurb: 'iOS and Android for parents, teachers, and admins.' },
];

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

const tileEase = [0.22, 1, 0.36, 1];

const ROLE_ICONS = [Shield, SearchCheck, Wallet, GraduationCap, Heart, Headphones];
const MOBILE_ICONS = [Heart, GraduationCap, Shield];
const HOW_ICONS = [School, Palette, FileText, BadgeCheck, Camera];

function SpotlightChip({
  item,
  index,
  active,
  onPick,
  Icon,
  iconSize = 16,
}) {
  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={active}
      className={`sb-enroll__chip sb-enroll__chip--card${active ? ' is-active' : ''}`}
      onClick={() => onPick(index)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
    >
      {Icon && (
        <span className="sb-enroll__chip-icon" aria-hidden>
          <Icon size={iconSize} strokeWidth={1.75} />
        </span>
      )}
      <span className="sb-enroll__chip-num">{item.step}</span>
      <span className="sb-enroll__chip-label">{item.title}</span>
      {item.description && (
        <span className="sb-enroll__chip-desc">{item.description}</span>
      )}
    </motion.button>
  );
}

function SpotlightPanel({ items, icons, onStepChange, stepPrefix = 'Step', ariaLabel, variant }) {
  const [active, setActive] = useState(0);
  const current = items[active] || items[0];
  const CurrentIcon = icons?.[active] || current?.icon;

  useEffect(() => {
    setActive(0);
    onStepChange?.(0);
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (index) => {
    setActive(index);
    onStepChange?.(index);
  };

  return (
    <div className={`sb-spotlight${variant ? ` sb-spotlight--${variant}` : ''}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current?.title}
          className="sb-enroll__spotlight"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.35, ease: tileEase }}
        >
          {CurrentIcon && (
            <motion.span
              className="sb-enroll__spotlight-icon"
              aria-hidden
              initial={{ scale: 0.8, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            >
              <CurrentIcon size={22} strokeWidth={1.75} />
            </motion.span>
          )}
          <div>
            <span className="sb-enroll__spotlight-step">{stepPrefix} {current?.step}</span>
            <h4>{current?.title}</h4>
            <p>{current?.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="sb-enroll__rail" role="tablist" aria-label={ariaLabel}>
        {items.map((item, index) => {
          const Icon = icons?.[index] || item.icon;
          return (
            <SpotlightChip
              key={`${item.title}-${index}`}
              item={item}
              index={index}
              active={active === index}
              onPick={pick}
              Icon={Icon}
            />
          );
        })}
      </div>
    </div>
  );
}

function GroupedSpotlightPanel({ groups, onStepChange, variant, stepPrefix = 'Capability' }) {
  const flatItems = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups],
  );
  const [active, setActive] = useState(0);
  const current = flatItems[active] || flatItems[0];
  const CurrentIcon = current?.icon;

  useEffect(() => {
    setActive(0);
    onStepChange?.(0);
  }, [groups]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (index) => {
    setActive(index);
    onStepChange?.(index);
  };

  let offset = 0;

  return (
    <div className={`sb-spotlight sb-spotlight--grouped${variant ? ` sb-spotlight--${variant}` : ''}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={current?.title}
          className="sb-enroll__spotlight"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.99 }}
          transition={{ duration: 0.35, ease: tileEase }}
        >
          {CurrentIcon && (
            <motion.span
              className="sb-enroll__spotlight-icon"
              aria-hidden
              initial={{ scale: 0.8, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 20 }}
            >
              <CurrentIcon size={22} strokeWidth={1.75} />
            </motion.span>
          )}
          <div>
            <span className="sb-enroll__spotlight-step">{stepPrefix} {current?.step}</span>
            <h4>{current?.title}</h4>
            <p>{current?.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {groups.map((group) => {
        const groupStart = offset;
        const section = (
          <section key={group.label} className="sb-spotlight__group">
            <p className="sb-spotlight__group-label">{group.label}</p>
            <div className="sb-enroll__rail" role="tablist" aria-label={group.label}>
              {group.items.map((item, localIndex) => {
                const index = groupStart + localIndex;
                const Icon = item.icon;
                return (
                  <SpotlightChip
                    key={`${group.label}-${item.title}`}
                    item={item}
                    index={index}
                    active={active === index}
                    onPick={pick}
                    Icon={Icon}
                  />
                );
              })}
            </div>
          </section>
        );
        offset += group.items.length;
        return section;
      })}
    </div>
  );
}

const ENROLL_VIEWS = [
  { id: 'form', label: 'Form', icon: FileText },
  { id: 'pipeline', label: 'Pipeline', icon: BadgeCheck },
  { id: 'workflow', label: 'Workflow', icon: RefreshCw },
];

const FORM_ICONS = [User, Heart, Users, Phone, FileSignature];
const PIPELINE_ICONS = [FileEdit, Send, SearchCheck, RefreshCw, Wallet, BadgeCheck];

function EnrollmentPanel({ formItems, pipelineItems, onViewChange, onStepChange }) {
  const [view, setView] = useState('form');
  const [active, setActive] = useState(0);

  const items = view === 'form' ? formItems : pipelineItems;
  const icons = view === 'form' ? FORM_ICONS : PIPELINE_ICONS;
  const current = items[active] || items[0];
  const CurrentIcon = icons[active] || FileText;

  const switchView = (id) => {
    setView(id);
    setActive(0);
    onViewChange?.(id);
    onStepChange?.(0);
  };

  const pick = (index) => {
    setActive(index);
    onStepChange?.(index);
  };

  return (
    <div className={`sb-enroll sb-enroll--${view}`}>
      <div className="sb-enroll__nav" role="tablist" aria-label="Enrollment views">
        {ENROLL_VIEWS.map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            type="button"
            role="tab"
            aria-selected={view === id}
            className={`sb-enroll__nav-btn${view === id ? ' is-active' : ''}`}
            onClick={() => switchView(id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="sb-enroll__nav-icon" aria-hidden>
              <Icon size={15} strokeWidth={1.75} />
            </span>
            {label}
          </motion.button>
        ))}
      </div>

      {view === 'workflow' ? (
        <div className="sb-enroll__workflow" aria-label="Enrollment workflow">
          <p className="sb-enroll__workflow-lead">
            Every application moves through validation, documents, and staff review — automatically tracked.
          </p>
          <ol className="sb-enroll__workflow-track">
            {ENROLLMENT_WORKFLOW.map((tag, index) => (
              <motion.li
                key={tag}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05, duration: 0.35, ease: tileEase }}
              >
                <motion.span
                  className="sb-enroll__workflow-step"
                  animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2.4, repeat: Infinity, delay: index * 0.35 }}
                >
                  {tag}
                </motion.span>
                {index < ENROLLMENT_WORKFLOW.length - 1 && (
                  <motion.span
                    className="sb-enroll__workflow-arrow"
                    aria-hidden
                    animate={{ opacity: [0.35, 1, 0.35], x: [0, 2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: index * 0.2 }}
                  >
                    →
                  </motion.span>
                )}
              </motion.li>
            ))}
          </ol>
        </div>
      ) : (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${view}-${active}`}
              className="sb-enroll__spotlight"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.99 }}
              transition={{ duration: 0.35, ease: tileEase }}
            >
              <motion.span
                className="sb-enroll__spotlight-icon"
                aria-hidden
                initial={{ scale: 0.8, rotate: -8 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 20 }}
              >
                <CurrentIcon size={22} strokeWidth={1.75} />
              </motion.span>
              <div>
                <span className="sb-enroll__spotlight-step">
                  {view === 'form' ? `Page ${current?.step}` : `Stage ${current?.step}`}
                </span>
                <h4>{current?.title}</h4>
                <p>{current?.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div
            className="sb-enroll__rail"
            role="tablist"
            aria-label={view === 'form' ? 'Form pages' : 'Admission pipeline'}
          >
            {items.map((item, index) => {
              const Icon = icons[index];
              return (
                <motion.button
                  key={`${view}-${item.title}`}
                  type="button"
                  role="tab"
                  aria-selected={active === index}
                  className={`sb-enroll__chip sb-enroll__chip--card${active === index ? ' is-active' : ''}`}
                  onClick={() => pick(index)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <span className="sb-enroll__chip-icon" aria-hidden>
                    <Icon size={16} strokeWidth={1.75} />
                  </span>
                  <span className="sb-enroll__chip-num">{item.step}</span>
                  <span className="sb-enroll__chip-label">{item.title}</span>
                  {item.description && (
                    <span className="sb-enroll__chip-desc">{item.description}</span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </>
      )}
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

function PanelBody({
  activeTab,
  data,
  iosUrl,
  androidUrl,
  onHowStepChange,
  onEnrollViewChange,
  onEnrollStepChange,
  onDetailStepChange,
}) {
  if (activeTab === 'how') {
    return (
      <SpotlightPanel
        items={data.how}
        icons={HOW_ICONS}
        onStepChange={onHowStepChange}
        stepPrefix="Step"
        ariaLabel="How it works steps"
        variant="how"
      />
    );
  }
  if (activeTab === 'features') {
    return (
      <SpotlightPanel
        items={data.features}
        onStepChange={onDetailStepChange}
        stepPrefix="Feature"
        ariaLabel="Platform features"
        variant="features"
      />
    );
  }
  if (activeTab === 'enrollment') {
    return (
      <EnrollmentPanel
        formItems={data.enrollmentForm}
        pipelineItems={data.enrollmentPipeline}
        onViewChange={onEnrollViewChange}
        onStepChange={onEnrollStepChange}
      />
    );
  }
  if (activeTab === 'fees') {
    return (
      <GroupedSpotlightPanel
        groups={data.feeGroups}
        onStepChange={onDetailStepChange}
        variant="fees"
        stepPrefix="Capability"
      />
    );
  }
  if (activeTab === 'roles') {
    return (
      <SpotlightPanel
        items={data.roles}
        icons={ROLE_ICONS}
        onStepChange={onDetailStepChange}
        stepPrefix="Role"
        ariaLabel="Platform roles"
        variant="roles"
      />
    );
  }
  if (activeTab === 'media') {
    return (
      <GroupedSpotlightPanel
        groups={data.mediaGroups}
        onStepChange={onDetailStepChange}
        variant="media"
        stepPrefix="Feature"
      />
    );
  }
  if (activeTab === 'mobile') {
    return (
      <>
        <SpotlightPanel
          items={data.mobile}
          icons={MOBILE_ICONS}
          onStepChange={onDetailStepChange}
          stepPrefix="App"
          ariaLabel="Mobile app roles"
          variant="mobile"
        />
        <div className="sb-plat-mobile-cta">
          <p>Download the Kids Activities app for parents, teachers, admins, and TV sign-in.</p>
          <div className="sb-app-store-buttons sb-app-store-buttons--after-journey">
            <AppStoreButton label="Download on the App Store" href={iosUrl} />
            <AppStoreButton label="Get it on Google Play" href={androidUrl} />
          </div>
        </div>
      </>
    );
  }

  return null;
}

export default function PlatformLandingSections() {
  const { platform } = usePortalConfig();
  const iosUrl = platform?.mobileApp?.iosUrl || platform?.mobileApp?.appStoreUrl;
  const androidUrl = platform?.mobileApp?.androidUrl || platform?.mobileApp?.playStoreUrl;
  const [activeTab, setActiveTab] = useState('features');
  const [howStep, setHowStep] = useState(0);
  const [enrollView, setEnrollView] = useState('form');
  const [enrollStep, setEnrollStep] = useState(0);
  const [detailStep, setDetailStep] = useState(0);

  const data = useMemo(() => ({
    how: toItems(HOW_IT_WORKS),
    features: toItems(PLATFORM_FEATURES),
    roles: toItems(PLATFORM_ROLES, 'title', 'items'),
    enrollmentForm: toItems(ENROLLMENT_PAGES, 'page', 'details'),
    enrollmentPipeline: toItems(ADMISSION_PIPELINE),
    feeGroups: [
      { label: 'Payments & documents', items: toItems(FEES_AND_DOCS) },
      { label: 'School operations', items: toItems(OPERATIONS) },
    ],
    mediaGroups: [
      { label: 'Communication & albums', items: toItems(COMMUNICATION_MEDIA) },
      { label: 'TV playback flow', items: toItems(TV_PLAYBACK_STEPS, 'label', 'description') },
    ],
    mobile: toItems(MOBILE_APP_ROLES, 'role', 'screens'),
  }), []);

  const activeMeta = OVERVIEW_TABS.find((tab) => tab.id === activeTab) || OVERVIEW_TABS[0];

  const showcaseStep = activeTab === 'how' ? howStep : detailStep;

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    setHowStep(0);
    setEnrollView('form');
    setEnrollStep(0);
    setDetailStep(0);
  };

  return (
    <section
      id="platform-overview"
      className="sb-editorial-section sb-editorial-section--lavender sb-platform-overview"
    >
      <div className="sb-container">
        <div className="sb-plat">
          <header className="sb-plat__header">
            <div className="sb-platform-shell__badge">
              <Sparkles size={14} aria-hidden />
              Full platform overview
            </div>
            <h2 className="sb-editorial-heading">Everything in One Platform</h2>
            <p className="sb-editorial-subheading mx-auto">{PLATFORM_PURPOSE}</p>
          </header>

          <LayoutGroup>
            <nav className="sb-plat__nav" role="tablist" aria-label="Platform overview">
              {OVERVIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const selected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={`sb-plat__nav-btn${selected ? ' is-active' : ''}`}
                    onClick={() => switchTab(tab.id)}
                  >
                    {selected && (
                      <motion.span
                        layoutId="plat-nav-pill"
                        className="sb-plat__nav-pill"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                    <Icon size={16} strokeWidth={1.75} aria-hidden />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="sb-plat__stage" role="tabpanel">
            <PlatformShowcaseVisual
              tabId={activeTab}
              activeStep={showcaseStep}
              enrollmentView={enrollView}
              enrollmentStep={enrollStep}
            />

            <AnimatePresence mode="wait">
              <motion.div
                key={`intro-${activeTab}`}
                className="sb-plat__intro"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.32, ease: tileEase }}
              >
                <h3>{activeMeta.label}</h3>
                <p>{activeMeta.blurb}</p>
              </motion.div>
            </AnimatePresence>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                className="sb-plat__body"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.38, ease: tileEase }}
              >
                <PanelBody
                  activeTab={activeTab}
                  data={data}
                  iosUrl={iosUrl}
                  androidUrl={androidUrl}
                  onHowStepChange={setHowStep}
                  onEnrollViewChange={setEnrollView}
                  onEnrollStepChange={setEnrollStep}
                  onDetailStepChange={setDetailStep}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
