import imgSecure from '../assets/timeline_secure.jpg';
import imgDocs from '../assets/timeline_docs.jpg';
import imgFees from '../assets/timeline_fees.jpg';
import imgConnected from '../assets/timeline_connected.jpg';

export const DEFAULT_LANDING_TIMELINE_STEPS = [
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

export function buildDefaultLandingPage(portalName = 'Kids Activities', schoolName = 'our school') {
  return {
    sections: {
      hero: true,
      campusBanner: false,
      timeline: true,
      map: true,
      finalCta: true,
      footer: true,
    },
    hero: {
      badge: 'Admissions Open',
      title: '',
      subtitle: `Complete your child's admission to ${schoolName} online. Submit documents, pay fees, and stay connected.`,
      primaryCtaEnabled: true,
      primaryCtaLabel: 'Start Enrollment',
      secondaryCtaEnabled: true,
      secondaryCtaLabel: 'Parent Login',
    },
    campusBanner: {
      title: 'Experience Our Campus',
      subtitle: 'Explore our facilities',
      imageUrl: null,
    },
    timeline: {
      title: `Why Families Choose ${portalName}`,
      subtitle: 'A complete platform for enrollments, payments, documents, and parent communication.',
      steps: DEFAULT_LANDING_TIMELINE_STEPS.map((step) => ({ ...step })),
    },
    map: {
      title: 'Visit Our Campus',
      subtitle: `Experience ${schoolName} in person or explore online.`,
      embedUrl: '',
      imageUrl: null,
      showAddress: true,
    },
    finalCta: {
      title: '',
      subtitle: '',
      imageUrl: null,
      ctaLabel: 'Start Enrollment',
    },
  };
}

export function mergeLandingPage(stored, portalName, schoolName) {
  const defaults = buildDefaultLandingPage(portalName, schoolName);
  if (!stored) return defaults;

  const storedSteps = stored.timeline?.steps;
  const steps = storedSteps?.length
    ? storedSteps.map((step, index) => ({
      ...defaults.timeline.steps[index],
      ...step,
    }))
    : defaults.timeline.steps;

  return {
    ...defaults,
    ...stored,
    sections: { ...defaults.sections, ...(stored.sections || {}) },
    hero: { ...defaults.hero, ...(stored.hero || {}) },
    campusBanner: { ...defaults.campusBanner, ...(stored.campusBanner || {}) },
    timeline: { ...defaults.timeline, ...(stored.timeline || {}), steps },
    map: { ...defaults.map, ...(stored.map || {}) },
    finalCta: { ...defaults.finalCta, ...(stored.finalCta || {}) },
  };
}
