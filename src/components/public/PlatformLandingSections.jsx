import { useMemo, useState } from 'react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import {
  ADMISSION_PIPELINE,
  FEES_AND_DOCS,
  HOW_IT_WORKS,
  MOBILE_APP_ROLES,
  OPERATIONS,
  PLATFORM_FEATURES,
  PLATFORM_ROLES,
} from '../../data/platformLandingData.js';

const OVERVIEW_TABS = [
  { id: 'features', label: 'Features' },
  { id: 'how', label: 'How it works' },
  { id: 'roles', label: 'Roles' },
  { id: 'enrollment', label: 'Enrollment' },
  { id: 'fees', label: 'Fees & ops' },
  { id: 'media', label: 'Media & TV' },
  { id: 'mobile', label: 'Mobile app' },
];

function padStep(index) {
  return String(index + 1).padStart(2, '0');
}

function JourneyStrip({ items = [] }) {
  return (
    <ol className={`sb-platform-journey sb-platform-journey--count-${Math.min(items.length, 8)}`}>
      {items.map((title, index) => (
        <li key={`${title}-${index}`} className="sb-platform-journey__item">
          <div className="sb-platform-journey__rail">
            <span className="sb-platform-journey__dot">{padStep(index)}</span>
            {index < items.length - 1 && <span className="sb-platform-journey__line" aria-hidden />}
          </div>
          <h3>{title}</h3>
        </li>
      ))}
    </ol>
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

export default function PlatformLandingSections() {
  const { platform } = usePortalConfig();
  const iosUrl = platform?.mobileApp?.iosUrl || platform?.mobileApp?.appStoreUrl;
  const androidUrl = platform?.mobileApp?.androidUrl || platform?.mobileApp?.playStoreUrl;
  const [activeTab, setActiveTab] = useState('features');

  const journeyByTab = useMemo(() => ({
    features: PLATFORM_FEATURES.map((item) => item.title),
    how: HOW_IT_WORKS.map((item) => item.title),
    roles: PLATFORM_ROLES.map((item) => item.title),
    enrollment: ADMISSION_PIPELINE.map((item) => item.title),
    fees: [...FEES_AND_DOCS, ...OPERATIONS].map((item) => item.title),
    media: [
      'Chat',
      'Notifications',
      'Photos & albums',
      'TV shows QR',
      'Scan from app',
      'TV playback',
    ],
    mobile: MOBILE_APP_ROLES.map((item) => item.role),
  }), []);

  return (
    <section
      id="platform-overview"
      className="sb-editorial-section sb-editorial-section--lavender sb-platform-overview"
    >
      <div className="sb-container">
        <div className="sb-platform-shell">
          <div className="sb-platform-shell__intro">
            <h2 className="sb-editorial-heading">Everything in One Platform</h2>
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
            <JourneyStrip items={journeyByTab[activeTab] || []} />

            {activeTab === 'mobile' && (
              <div className="sb-app-store-buttons sb-app-store-buttons--after-journey">
                <AppStoreButton label="Download on the App Store" href={iosUrl} />
                <AppStoreButton label="Get it on Google Play" href={androidUrl} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
