/** Default editable copy + branding for Course Certificates (portal settings). */

export const CERTIFICATE_PLACEHOLDERS = [
  { key: '{{studentName}}', label: 'Student name' },
  { key: '{{courseName}}', label: 'Course name' },
  { key: '{{date}}', label: 'Completion date' },
  { key: '{{schoolName}}', label: 'School name' },
  { key: '{{portalName}}', label: 'Portal name' },
  { key: '{{academicYear}}', label: 'Academic year' },
];

export const DEFAULT_COURSE_CERTIFICATE = {
  enabled: true,
  selectedTemplateId: 'classic-gold',
  title: 'Certificate of Completion',
  subtitle: 'This is to certify that',
  bodyText:
    '{{studentName}} has successfully completed the course {{courseName}} with distinction and dedication.',
  signatoryName: 'Principal',
  signatoryTitle: 'Head of Institution',
  coSignatoryName: 'Course Director',
  coSignatoryTitle: 'Academic Lead',
  footerNote: 'Issued by {{schoolName}} · {{academicYear}}',
  showLogo: true,
  showSeal: true,
  showQrHint: false,
  sealUrl: null,
  accentOverride: null,
};

export function mergeCourseCertificateConfig(raw) {
  const base = { ...DEFAULT_COURSE_CERTIFICATE };
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    sealUrl: raw.sealUrl ?? base.sealUrl,
    accentOverride: raw.accentOverride ?? base.accentOverride,
  };
}

export function applyCertificatePlaceholders(text, vars = {}) {
  let out = String(text || '');
  Object.entries(vars).forEach(([key, value]) => {
    const token = key.startsWith('{{') ? key : `{{${key}}}`;
    out = out.split(token).join(value == null ? '' : String(value));
  });
  return out;
}
