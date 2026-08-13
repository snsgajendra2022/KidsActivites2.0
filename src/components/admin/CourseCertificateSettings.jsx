import { useMemo, useState } from 'react';
import { Award, Eye, Sparkles } from 'lucide-react';
import Input from '../ui/Input.jsx';
import ToggleSwitch from '../ui/ToggleSwitch.jsx';
import { sanitizeBrandingValue } from '../../utils/brandingUrlUtils.js';
import { readFileAsDataUrl } from '../../services/portalConfigService.js';
import {
  CERTIFICATE_PLACEHOLDERS,
  applyCertificatePlaceholders,
  mergeCourseCertificateConfig,
} from '../../data/defaultCourseCertificateConfig.js';
import {
  COURSE_CERTIFICATE_TEMPLATES,
  getCourseCertificateTemplate,
} from '../../data/courseCertificateTemplates.js';
import '../../styles/course-certificates.css';

const SAMPLE = {
  studentName: 'Aarav Sharma',
  courseName: 'Creative Coding Foundations',
  date: new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }),
};

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

function CertificatePreview({
  config,
  template,
  schoolName,
  portalName,
  academicYear,
  logoUrl,
}) {
  const accent = config.accentOverride || template.accent;
  const vars = {
    studentName: SAMPLE.studentName,
    courseName: SAMPLE.courseName,
    date: SAMPLE.date,
    schoolName: schoolName || 'Your School',
    portalName: portalName || schoolName || 'Kids Activities',
    academicYear: academicYear || '2026–2027',
  };

  const title = applyCertificatePlaceholders(config.title, vars);
  const subtitle = applyCertificatePlaceholders(config.subtitle, vars);
  const body = applyCertificatePlaceholders(config.bodyText, vars);
  const footer = applyCertificatePlaceholders(config.footerNote, vars);
  const sealUrl = sanitizeBrandingValue(config.sealUrl);
  const logo = sanitizeBrandingValue(logoUrl);

  return (
    <div
      className={`cert-sheet cert-paper--${template.id}`}
      style={{
        '--cert-accent': accent,
        '--cert-ink': template.ink,
        '--cert-paper': template.paper,
        color: template.ink,
      }}
    >
      <div className="cert-sheet__grain" aria-hidden />
      <div className="cert-sheet__ornament" aria-hidden />
      <div className="cert-sheet__vignette" aria-hidden />
      <div className="cert-sheet__frame" aria-hidden />
      <span className="cert-sheet__corner cert-sheet__corner--tl" aria-hidden />
      <span className="cert-sheet__corner cert-sheet__corner--tr" aria-hidden />
      <span className="cert-sheet__corner cert-sheet__corner--bl" aria-hidden />
      <span className="cert-sheet__corner cert-sheet__corner--br" aria-hidden />

      <div className="cert-sheet__content">
        <div className="cert-sheet__brand">
          {config.showLogo ? (
            logo ? (
              <img src={logo} alt="" className="cert-sheet__logo" />
            ) : (
              <div className="cert-sheet__logo-fallback">{initialsFrom(schoolName || portalName)}</div>
            )
          ) : null}
          <p className="cert-sheet__school">{schoolName || portalName || 'School Name'}</p>
          <div className="cert-sheet__flourish" aria-hidden>✦ · ✦</div>
          <h3 className="cert-sheet__title">{title || 'Certificate of Completion'}</h3>
          <p className="cert-sheet__subtitle">{subtitle}</p>
          <p className="cert-sheet__student">{SAMPLE.studentName}</p>
          <div className="cert-sheet__name-rule" aria-hidden />
          <p className="cert-sheet__body">{body}</p>
          <p className="cert-sheet__date">Awarded on {SAMPLE.date}</p>
        </div>

        <div className="cert-sheet__footer-block">
          <div className="cert-sheet__signs">
            <div className="cert-sheet__sign">
              <div className="cert-sheet__sign-line" />
              <p className="cert-sheet__sign-name">{config.signatoryName || 'Principal'}</p>
              <p className="cert-sheet__sign-title">{config.signatoryTitle || 'Head of Institution'}</p>
            </div>

            <div>
              {config.showSeal ? (
                sealUrl ? (
                  <img src={sealUrl} alt="School seal" className="cert-sheet__seal" />
                ) : (
                  <div className="cert-sheet__seal-fallback">Seal</div>
                )
              ) : (
                <div style={{ width: '3.35rem' }} />
              )}
            </div>

            <div className="cert-sheet__sign">
              <div className="cert-sheet__sign-line" />
              <p className="cert-sheet__sign-name">{config.coSignatoryName || 'Course Director'}</p>
              <p className="cert-sheet__sign-title">{config.coSignatoryTitle || 'Academic Lead'}</p>
            </div>
          </div>
          <p className="cert-sheet__footnote">{footer}</p>
        </div>
      </div>
    </div>
  );
}

export default function CourseCertificateSettings({
  value,
  onChange,
  schoolName,
  portalName,
  academicYear,
  logoUrl,
}) {
  const config = useMemo(() => mergeCourseCertificateConfig(value), [value]);
  const template = getCourseCertificateTemplate(config.selectedTemplateId);
  const [bodyFocus, setBodyFocus] = useState(false);

  const patch = (partial) => onChange({ ...config, ...partial });

  const insertPlaceholder = (token) => {
    const current = config.bodyText || '';
    const next = current.includes(token) ? current : `${current}${current.endsWith(' ') || !current ? '' : ' '}${token}`;
    patch({ bodyText: next });
  };

  const onSealFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    patch({ sealUrl: dataUrl, showSeal: true });
    e.target.value = '';
  };

  return (
    <div className="cert-settings">
      <div className="cert-settings__toolbar">
        <div>
          <p className="cert-settings__hint">
            Choose a printed-paper theme. Each template has its own background texture, frame, and fonts.
            Logo comes from <strong>Logo &amp; Images</strong>. Placeholders like <code>{'{{studentName}}'}</code> fill when a certificate is issued.
          </p>
        </div>
        <div className="cert-toggle-row" style={{ minWidth: '14rem' }}>
          <div>
            <p className="cert-toggle-row__label">Enable templates</p>
            <p className="cert-toggle-row__hint">Use for LMS course certificates</p>
          </div>
          <ToggleSwitch
            checked={config.enabled !== false}
            onChange={(enabled) => patch({ enabled })}
            label="Enable course certificates"
          />
        </div>
      </div>

      <div className="cert-settings__grid">
        <div className="cert-settings__panel">
          <h3 className="cert-settings__panel-title">
            <Sparkles size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            Certificate templates
          </h3>
          <p className="cert-settings__panel-desc">
            12 printed-paper designs — ivory gold, navy vellum, parchment, linen, and more.
          </p>

          <div className="cert-template-grid">
            {COURSE_CERTIFICATE_TEMPLATES.map((tpl) => {
              const active = tpl.id === template.id;
              return (
                <button
                  key={tpl.id}
                  type="button"
                  className={`cert-template-card${active ? ' cert-template-card--active' : ''}`}
                  onClick={() => patch({ selectedTemplateId: tpl.id, accentOverride: null })}
                >
                  <div className="cert-template-card__swatch">
                    <CertificatePreview
                      config={{ ...config, accentOverride: null, showLogo: false, showSeal: false }}
                      template={tpl}
                      schoolName={schoolName}
                      portalName={portalName}
                      academicYear={academicYear}
                      logoUrl={null}
                    />
                  </div>
                  <div className="cert-template-card__meta">
                    <p className="cert-template-card__name">{tpl.name}</p>
                    <p className="cert-template-card__tag">{tpl.tagline}</p>
                    <span className="cert-template-card__family">{tpl.family}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="cert-fields" style={{ marginTop: '1.15rem' }}>
            <h3 className="cert-settings__panel-title">Editable certificate text</h3>
            <p className="cert-settings__panel-desc">
              All lines below appear on the certificate. School name and logo update from portal branding.
            </p>

            <Input
              label="Certificate title"
              value={config.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Certificate of Completion"
              variant="enrollment"
            />
            <Input
              label="Subtitle line"
              value={config.subtitle}
              onChange={(e) => patch({ subtitle: e.target.value })}
              placeholder="This is to certify that"
              variant="enrollment"
            />

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Body text
              </label>
              <textarea
                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm text-secondary outline-none focus:border-[var(--sb-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--sb-primary)_25%,transparent)]"
                rows={4}
                value={config.bodyText}
                onChange={(e) => patch({ bodyText: e.target.value })}
                onFocus={() => setBodyFocus(true)}
                onBlur={() => setBodyFocus(false)}
                placeholder="{{studentName}} has successfully completed {{courseName}}…"
              />
              <div className="cert-placeholder-chips">
                {CERTIFICATE_PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className="cert-placeholder-chip"
                    title={`Insert ${p.label}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => insertPlaceholder(p.key)}
                  >
                    {p.key}
                  </button>
                ))}
              </div>
              {bodyFocus ? (
                <p className="mt-1 text-xs text-secondary/70">Click a chip to insert a dynamic field.</p>
              ) : null}
            </div>

            <div className="cert-fields__row cert-fields__row--2">
              <Input
                label="Signatory name"
                value={config.signatoryName}
                onChange={(e) => patch({ signatoryName: e.target.value })}
                variant="enrollment"
              />
              <Input
                label="Signatory title"
                value={config.signatoryTitle}
                onChange={(e) => patch({ signatoryTitle: e.target.value })}
                variant="enrollment"
              />
            </div>

            <div className="cert-fields__row cert-fields__row--2">
              <Input
                label="Co-signatory name"
                value={config.coSignatoryName}
                onChange={(e) => patch({ coSignatoryName: e.target.value })}
                variant="enrollment"
              />
              <Input
                label="Co-signatory title"
                value={config.coSignatoryTitle}
                onChange={(e) => patch({ coSignatoryTitle: e.target.value })}
                variant="enrollment"
              />
            </div>

            <Input
              label="Footer note"
              value={config.footerNote}
              onChange={(e) => patch({ footerNote: e.target.value })}
              helper="Supports {{schoolName}} and {{academicYear}}"
              variant="enrollment"
            />

            <div className="cert-fields__row cert-fields__row--2">
              <div className="cert-toggle-row">
                <div>
                  <p className="cert-toggle-row__label">Show school logo</p>
                  <p className="cert-toggle-row__hint">From Logo &amp; Images</p>
                </div>
                <ToggleSwitch
                  checked={config.showLogo !== false}
                  onChange={(showLogo) => patch({ showLogo })}
                  label="Show logo"
                />
              </div>
              <div className="cert-toggle-row">
                <div>
                  <p className="cert-toggle-row__label">Show school seal</p>
                  <p className="cert-toggle-row__hint">Upload a circular seal</p>
                </div>
                <ToggleSwitch
                  checked={config.showSeal !== false}
                  onChange={(showSeal) => patch({ showSeal })}
                  label="Show seal"
                />
              </div>
            </div>

            <div className="branding-upload-card">
              <div className="branding-upload-card__header">
                <div>
                  <p className="branding-upload-card__title">School seal / stamp</p>
                  <p className="branding-upload-card__hint">
                    Optional circular seal for the certificate center. PNG with transparent background works best.
                  </p>
                </div>
                {config.sealUrl ? (
                  <button
                    type="button"
                    className="branding-upload-card__remove"
                    onClick={() => patch({ sealUrl: null })}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="branding-upload-card__body">
                <div className="branding-upload-preview branding-upload-preview--icon">
                  {sanitizeBrandingValue(config.sealUrl) ? (
                    <img
                      src={sanitizeBrandingValue(config.sealUrl)}
                      alt="Seal"
                      className="branding-upload-preview__img"
                    />
                  ) : (
                    <div className="branding-upload-preview__empty">
                      <Award size={22} />
                      <span>No seal</span>
                    </div>
                  )}
                </div>
                <label className="branding-upload-card__btn">
                  <input type="file" accept="image/*" hidden onChange={onSealFile} />
                  Upload seal
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-secondary mb-1.5">
                Accent color override (optional)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={config.accentOverride || template.accent}
                  onChange={(e) => patch({ accentOverride: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-black/10 bg-white p-1"
                />
                <button
                  type="button"
                  className="text-sm font-semibold text-secondary/80 hover:text-secondary"
                  onClick={() => patch({ accentOverride: null })}
                >
                  Reset to theme default
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="cert-settings__panel cert-preview-wrap">
          <h3 className="cert-settings__panel-title">
            <Eye size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
            Live preview · {template.name}
          </h3>
          <p className="cert-settings__panel-desc">
            Preview uses sample learner <strong>{SAMPLE.studentName}</strong> and course{' '}
            <strong>{SAMPLE.courseName}</strong>. School branding is live from your settings.
          </p>
          <div className="cert-preview-stage">
            <p className="cert-preview-stage__label">Printed certificate preview</p>
            <CertificatePreview
              config={config}
              template={template}
              schoolName={schoolName}
              portalName={portalName}
              academicYear={academicYear}
              logoUrl={logoUrl}
            />
          </div>
          <div className="cert-preview-actions">
            <span className="text-xs text-secondary/70">
              School: <strong>{schoolName || '—'}</strong>
              {' · '}
              Template: <strong>{template.name}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
