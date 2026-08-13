/**
 * Build printable Course Certificate HTML using Portal Settings template.
 */
import {
  applyCertificatePlaceholders,
  mergeCourseCertificateConfig,
} from '../data/defaultCourseCertificateConfig.js';
import { getCourseCertificateTemplate } from '../data/courseCertificateTemplates.js';
import { sanitizeBrandingValue } from './brandingUrlUtils.js';
import {
  displayCertificateFields,
  mergeCertificateRecords,
} from './courseCertificateFields.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatCertDate(value) {
  if (!value) {
    return new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  const raw = String(value).includes(' ') ? String(value).replace(' ', 'T') : String(value);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function initialsFrom(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'SC';
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

/** Embedded print CSS for certificate papers (mirrors course-certificates.css sheets). */
function certificateDocumentCss(template, accent) {
  const ink = template.ink;
  const paper = template.paper;
  return `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Great+Vibes&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,700;0,800;1,600&display=swap');

@page { size: A4 landscape; margin: 12mm; }

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: #1a1610;
  color: ${ink};
}
body {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  font-family: 'Cormorant Garamond', Georgia, serif;
}
.actions {
  position: fixed;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 20;
}
.actions button {
  border: 0;
  border-radius: 999px;
  padding: 10px 16px;
  font: 600 13px/1 Inter, system-ui, sans-serif;
  cursor: pointer;
}
.actions .print { background: #c9a227; color: #0f172a; }
.actions .close { background: #fff; color: #0f172a; }

.cert-sheet {
  --cert-accent: ${accent};
  --cert-ink: ${ink};
  --cert-paper: ${paper};
  --cert-title: 'Cinzel', 'Palatino Linotype', serif;
  --cert-body: 'Cormorant Garamond', Georgia, serif;
  --cert-script: 'Great Vibes', 'Palatino Linotype', cursive;
  position: relative;
  width: min(1040px, 96vw);
  aspect-ratio: 1.414 / 1;
  overflow: hidden;
  color: var(--cert-ink);
  background: var(--cert-paper);
  border-radius: 4px;
  box-shadow:
    0 1px 0 rgba(255,255,255,0.45) inset,
    0 28px 50px -24px rgba(0,0,0,0.55);
}
.cert-sheet__grain,
.cert-sheet__vignette,
.cert-sheet__ornament,
.cert-sheet__frame {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.cert-sheet__grain {
  opacity: 0.22;
  mix-blend-mode: multiply;
  background-image:
    repeating-linear-gradient(0deg, rgba(80,50,20,0.035) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(90deg, rgba(80,50,20,0.03) 0 1px, transparent 1px 4px);
}
.cert-sheet__vignette {
  background: radial-gradient(ellipse at center, transparent 42%, rgba(40,24,8,0.18) 100%);
}
.cert-sheet__frame {
  inset: 3.2%;
  border: 1.5px solid color-mix(in srgb, var(--cert-accent) 75%, transparent);
  box-shadow:
    inset 0 0 0 5px color-mix(in srgb, var(--cert-paper) 70%, #fff),
    inset 0 0 0 6.5px color-mix(in srgb, var(--cert-accent) 55%, transparent);
}
.cert-sheet__corner {
  position: absolute;
  width: 1.55rem;
  height: 1.55rem;
  z-index: 2;
  border-color: var(--cert-accent);
}
.cert-sheet__corner--tl { top: 4.4%; left: 4.4%; border-top: 2px solid; border-left: 2px solid; }
.cert-sheet__corner--tr { top: 4.4%; right: 4.4%; border-top: 2px solid; border-right: 2px solid; }
.cert-sheet__corner--bl { bottom: 4.4%; left: 4.4%; border-bottom: 2px solid; border-left: 2px solid; }
.cert-sheet__corner--br { bottom: 4.4%; right: 4.4%; border-bottom: 2px solid; border-right: 2px solid; }

.cert-sheet__content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 7.5% 9% 5.5%;
  text-align: center;
}
.cert-sheet__brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.22rem;
  width: 100%;
}
.cert-sheet__logo {
  width: 3.1rem;
  height: 3.1rem;
  object-fit: contain;
  border-radius: 0.2rem;
  background: rgba(255,255,255,0.45);
  padding: 0.12rem;
}
.cert-sheet__logo-fallback {
  width: 3.1rem;
  height: 3.1rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-family: var(--cert-title);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--cert-accent);
  border: 1.5px solid color-mix(in srgb, var(--cert-accent) 55%, transparent);
}
.cert-sheet__school {
  margin: 0.15rem 0 0;
  font-family: var(--cert-title);
  font-size: clamp(0.7rem, 1.5vw, 0.9rem);
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}
.cert-sheet__flourish {
  font-size: 0.9rem;
  letter-spacing: 0.35em;
  color: var(--cert-accent);
  opacity: 0.9;
}
.cert-sheet__title {
  margin: 0.45rem 0 0;
  font-family: var(--cert-title);
  font-size: clamp(1.35rem, 3.2vw, 2rem);
  font-weight: 700;
  line-height: 1.12;
  color: var(--cert-accent);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.cert-sheet__subtitle {
  margin: 0.45rem 0 0;
  font-family: var(--cert-body);
  font-size: clamp(0.9rem, 1.7vw, 1.1rem);
  font-style: italic;
  opacity: 0.88;
}
.cert-sheet__student {
  margin: 0.25rem 0 0;
  font-family: var(--cert-script);
  font-size: clamp(1.7rem, 3.8vw, 2.45rem);
  line-height: 1.2;
}
.cert-sheet__name-rule {
  width: min(62%, 18rem);
  height: 1px;
  margin: 0.2rem auto 0;
  background: linear-gradient(90deg, transparent, var(--cert-accent), transparent);
  opacity: 0.7;
}
.cert-sheet__body {
  margin: 0.45rem 0 0;
  max-width: 40rem;
  font-family: var(--cert-body);
  font-size: clamp(0.88rem, 1.55vw, 1.08rem);
  line-height: 1.5;
}
.cert-sheet__meta {
  margin: 0.4rem 0 0;
  font-family: var(--cert-body);
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  opacity: 0.72;
}
.cert-sheet__footer-block { width: 100%; display: grid; gap: 0.55rem; }
.cert-sheet__signs {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 0.5rem;
  align-items: end;
  width: 100%;
}
.cert-sheet__sign-line {
  height: 1px;
  background: color-mix(in srgb, var(--cert-ink) 38%, transparent);
  margin: 0 auto 0.3rem;
  width: 78%;
}
.cert-sheet__sign-name {
  margin: 0;
  font-family: var(--cert-script);
  font-size: clamp(1rem, 1.8vw, 1.25rem);
}
.cert-sheet__sign-title {
  margin: 0.05rem 0 0;
  font-family: var(--cert-title);
  font-size: 0.58rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.72;
}
.cert-sheet__seal {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid color-mix(in srgb, var(--cert-accent) 70%, #fff);
}
.cert-sheet__seal-fallback {
  width: 3.6rem;
  height: 3.6rem;
  border-radius: 999px;
  display: grid;
  place-items: center;
  border: 2px solid var(--cert-accent);
  box-shadow: inset 0 0 0 4px color-mix(in srgb, var(--cert-accent) 25%, transparent);
  font-family: var(--cert-title);
  font-size: 0.5rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--cert-accent);
}
.cert-sheet__footnote {
  margin: 0;
  font-family: var(--cert-body);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  opacity: 0.68;
}

.cert-paper--classic-gold {
  --cert-title: 'Cinzel', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(232,200,114,0.28), transparent 46%),
    linear-gradient(180deg, #fbf6e6 0%, #f3e6c4 48%, #ead7a4 100%);
}
.cert-paper--modern-minimal {
  --cert-title: 'Playfair Display', serif;
  --cert-body: 'Libre Baskerville', serif;
  background: linear-gradient(180deg, #ffffff 0%, #f7f5f0 100%);
}
.cert-paper--modern-minimal .cert-sheet__frame {
  border-width: 1px;
  box-shadow: inset 0 0 0 8px #fff, inset 0 0 0 9px #0f172a;
}
.cert-paper--royal-emerald {
  --cert-title: 'Cinzel', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 50% 30%, #1a5c45 0%, transparent 55%),
    linear-gradient(160deg, #0c3327 0%, #14543c 45%, #0a241c 100%);
}
.cert-paper--royal-emerald .cert-sheet__vignette {
  background: radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.45) 100%);
}
.cert-paper--midnight-navy {
  --cert-title: 'Cinzel', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 70% 10%, rgba(232,200,114,0.16), transparent 42%),
    linear-gradient(165deg, #071526 0%, #123050 52%, #0a1a30 100%);
}
.cert-paper--midnight-navy .cert-sheet__vignette {
  background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%);
}
.cert-paper--pastel-bloom {
  --cert-title: 'Playfair Display', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 12% 18%, rgba(244,180,196,0.45), transparent 42%),
    radial-gradient(ellipse at 88% 12%, rgba(216,180,230,0.4), transparent 40%),
    linear-gradient(180deg, #fff8f6 0%, #fde8ee 100%);
}
.cert-paper--academic-scholar {
  --cert-title: 'Cinzel', serif;
  --cert-body: 'Libre Baskerville', serif;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(180,130,60,0.18), transparent 45%),
    linear-gradient(180deg, #f8ecd0 0%, #ead3a0 55%, #d9b97a 100%);
}
.cert-paper--ocean-azure {
  --cert-title: 'Playfair Display', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 50% 100%, rgba(90,180,210,0.28), transparent 50%),
    linear-gradient(180deg, #f7fcfe 0%, #e4f3f8 48%, #cfe8f2 100%);
}
.cert-paper--sunset-coral {
  --cert-title: 'Playfair Display', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 80% 0%, rgba(255,170,90,0.35), transparent 42%),
    linear-gradient(165deg, #fff7ee 0%, #f8d7b4 55%, #f0b98a 100%);
}
.cert-paper--geometric-modern {
  --cert-title: 'Playfair Display', serif;
  --cert-body: 'Libre Baskerville', serif;
  background:
    linear-gradient(135deg, rgba(67,56,202,0.08) 0 18%, transparent 18% 82%, rgba(67,56,202,0.08) 82%),
    linear-gradient(180deg, #fbfaff 0%, #ece8ff 100%);
}
.cert-paper--forest-sage {
  --cert-title: 'Cinzel', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(ellipse at 20% 10%, rgba(150,180,110,0.28), transparent 40%),
    linear-gradient(180deg, #f6f8ef 0%, #e4ead4 100%);
}
.cert-paper--platinum-elite {
  --cert-title: 'Cinzel', serif;
  --cert-body: 'Libre Baskerville', serif;
  background: linear-gradient(135deg, #ffffff 0%, #e8eaee 38%, #f7f8fa 62%, #d9dde3 100%);
}
.cert-paper--celebration-festive {
  --cert-title: 'Playfair Display', serif;
  --cert-body: 'Cormorant Garamond', serif;
  background:
    radial-gradient(circle at 12% 18%, rgba(253,224,71,0.35) 0 8px, transparent 9px),
    radial-gradient(circle at 86% 22%, rgba(244,114,182,0.28) 0 7px, transparent 8px),
    linear-gradient(145deg, #fffaf2 0%, #fde7f3 48%, #ffe8c8 100%);
}

@media print {
  body { background: #fff; padding: 0; }
  .actions { display: none !important; }
  .cert-sheet {
    width: 100%;
    max-width: none;
    box-shadow: none;
    border-radius: 0;
  }
}
`;
}

/**
 * @param {object} options
 * @param {object} options.cert - LMS certificate record
 * @param {object} options.portalConfig - portal config (or partial)
 */
export function buildCourseCertificateHtml({ cert, portalConfig }) {
  const cfg = mergeCourseCertificateConfig(portalConfig?.courseCertificates);
  const template = getCourseCertificateTemplate(cfg.selectedTemplateId);
  const accent = cfg.accentOverride || template.accent;
  const schoolName =
    portalConfig?.school?.name ||
    portalConfig?.portalName ||
    'School';
  const portalName = portalConfig?.portalName || schoolName;
  const academicYear = portalConfig?.school?.academicYear || '';
  const logoUrl = sanitizeBrandingValue(
    portalConfig?.branding?.logoUrl || portalConfig?.branding?.logoIconUrl,
  );
  const sealUrl = sanitizeBrandingValue(cfg.sealUrl);

  const fields = displayCertificateFields(cert);
  const studentName = fields.studentName;
  const courseName = fields.courseName;
  const issuedAt = formatCertDate(fields.issuedAt || cert?.issuedAt || cert?.completedAt || cert?.createdAt);
  const certNumber = fields.certificateNumber;

  const vars = {
    studentName,
    courseName,
    courseTitle: courseName,
    learnerName: studentName,
    date: issuedAt,
    schoolName,
    portalName,
    academicYear,
  };

  const title = applyCertificatePlaceholders(cfg.title, vars);
  const subtitle = applyCertificatePlaceholders(cfg.subtitle, vars);
  const body = applyCertificatePlaceholders(cfg.bodyText, vars);
  const footer = applyCertificatePlaceholders(cfg.footerNote, vars);

  const logoHtml =
    cfg.showLogo !== false
      ? logoUrl
        ? `<img class="cert-sheet__logo" src="${escapeHtml(logoUrl)}" alt="" />`
        : `<div class="cert-sheet__logo-fallback">${escapeHtml(initialsFrom(schoolName))}</div>`
      : '';

  const sealHtml =
    cfg.showSeal !== false
      ? sealUrl
        ? `<img class="cert-sheet__seal" src="${escapeHtml(sealUrl)}" alt="School seal" />`
        : `<div class="cert-sheet__seal-fallback">Seal</div>`
      : `<div style="width:3.6rem"></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — ${escapeHtml(studentName)}</title>
  <style>${certificateDocumentCss(template, accent)}</style>
</head>
<body>
  <div class="actions">
    <button class="print" type="button" onclick="window.print()">Print / Save PDF</button>
    <button class="close" type="button" onclick="window.close()">Close</button>
  </div>
  <article class="cert-sheet cert-paper--${escapeHtml(template.id)}">
    <div class="cert-sheet__grain"></div>
    <div class="cert-sheet__ornament"></div>
    <div class="cert-sheet__vignette"></div>
    <div class="cert-sheet__frame"></div>
    <span class="cert-sheet__corner cert-sheet__corner--tl"></span>
    <span class="cert-sheet__corner cert-sheet__corner--tr"></span>
    <span class="cert-sheet__corner cert-sheet__corner--bl"></span>
    <span class="cert-sheet__corner cert-sheet__corner--br"></span>
    <div class="cert-sheet__content">
      <div class="cert-sheet__brand">
        ${logoHtml}
        <p class="cert-sheet__school">${escapeHtml(schoolName)}</p>
        <div class="cert-sheet__flourish">✦ · ✦</div>
        <h1 class="cert-sheet__title">${escapeHtml(title)}</h1>
        <p class="cert-sheet__subtitle">${escapeHtml(subtitle)}</p>
        <p class="cert-sheet__student">${escapeHtml(studentName)}</p>
        <div class="cert-sheet__name-rule"></div>
        <p class="cert-sheet__body">${escapeHtml(body)}</p>
        <p class="cert-sheet__meta">Awarded on ${escapeHtml(issuedAt)}${certNumber ? ` · ${escapeHtml(certNumber)}` : ''}</p>
      </div>
      <div class="cert-sheet__footer-block">
        <div class="cert-sheet__signs">
          <div>
            <div class="cert-sheet__sign-line"></div>
            <p class="cert-sheet__sign-name">${escapeHtml(cfg.signatoryName || 'Principal')}</p>
            <p class="cert-sheet__sign-title">${escapeHtml(cfg.signatoryTitle || 'Head of Institution')}</p>
          </div>
          <div>${sealHtml}</div>
          <div>
            <div class="cert-sheet__sign-line"></div>
            <p class="cert-sheet__sign-name">${escapeHtml(cfg.coSignatoryName || 'Course Director')}</p>
            <p class="cert-sheet__sign-title">${escapeHtml(cfg.coSignatoryTitle || 'Academic Lead')}</p>
          </div>
        </div>
        <p class="cert-sheet__footnote">${escapeHtml(footer)}</p>
      </div>
    </div>
  </article>
</body>
</html>`;
}

export function openCourseCertificateWindow(html, onBlocked) {
  const win = window.open('', '_blank');
  if (!win) {
    onBlocked?.();
    return null;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  return win;
}

/**
 * Open a certificate using API record + portal template.
 * Falls back to GET /lms/certificates/{id}/html when portal templates are disabled.
 *
 * @param {object} options
 * @param {object} [options.cert] - known certificate payload
 * @param {string} [options.certificateId]
 * @param {object} options.portalConfig
 * @param {(msg: string) => void} [options.onError]
 * @param {() => void} [options.onBlocked]
 */
export async function openLmsCertificatePreview({
  cert,
  certificateId,
  portalConfig,
  onError,
  onBlocked,
  fetchCertificate,
  fetchCertificateHtml,
}) {
  const cfg = mergeCourseCertificateConfig(portalConfig?.courseCertificates);
  let record = cert ? mergeCertificateRecords(cert) : null;
  const id = certificateId || record?.id || record?.certificateId;

  if (fetchCertificate && id) {
    try {
      const fresh = await fetchCertificate(id);
      if (fresh) record = mergeCertificateRecords(record, fresh);
    } catch {
      // keep local record
    }
  }

  if (!record && !id) {
    onError?.('Certificate unavailable.');
    return null;
  }

  if (cfg.enabled !== false) {
    try {
      const html = buildCourseCertificateHtml({
        cert: record || { id },
        portalConfig: {
          ...portalConfig,
          courseCertificates: cfg,
        },
      });
      return openCourseCertificateWindow(html, onBlocked);
    } catch (err) {
      // fall through to API HTML
      if (!fetchCertificateHtml || !id) {
        onError?.(err?.message || 'Unable to open certificate.');
        return null;
      }
    }
  }

  if (!fetchCertificateHtml || !id) {
    onError?.('Certificate unavailable.');
    return null;
  }

  try {
    const data = await fetchCertificateHtml(id);
    const html = data?.renderedHtml || data?.html || '<p>Certificate unavailable.</p>';
    return openCourseCertificateWindow(html, onBlocked);
  } catch (err) {
    onError?.(err?.message || 'Unable to open certificate.');
    return null;
  }
}
