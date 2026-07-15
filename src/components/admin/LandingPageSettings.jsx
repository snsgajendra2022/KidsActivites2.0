import { Plus, Trash2 } from 'lucide-react';
import Input from '../ui/Input.jsx';
import ToggleSwitch from '../ui/ToggleSwitch.jsx';
import { readFileAsDataUrl } from '../../services/portalConfigService.js';

const SECTION_OPTIONS = [
  { key: 'hero', label: 'Hero Banner', desc: 'Top image, headline, and enrollment buttons' },
  { key: 'campusBanner', label: 'Campus Image', desc: 'Wide campus photo section (static image only)' },
  { key: 'timeline', label: 'Features Timeline', desc: 'Scrollable feature highlights with images' },
  { key: 'map', label: 'Campus Map', desc: 'Location and address block' },
  { key: 'finalCta', label: 'Final Call-to-Action', desc: 'Bottom enrollment banner' },
  { key: 'footer', label: 'Footer', desc: 'Contact info and footer links' },
];

function ImageUploadField({ label, hint, value, onChange, previewVariant = 'default' }) {
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
  };

  const previewClass = previewVariant === 'wide'
    ? 'branding-upload-preview branding-upload-preview--wide'
    : 'branding-upload-preview';

  return (
    <div className="branding-upload-card">
      <div className="branding-upload-card__header">
        <div>
          <p className="branding-upload-card__title">{label}</p>
          {hint && <p className="branding-upload-card__hint">{hint}</p>}
        </div>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="branding-upload-card__remove">
            Remove
          </button>
        )}
      </div>
      <div className="branding-upload-card__body">
        <div className={previewClass}>
          {value ? (
            <img src={value} alt={label} className="branding-upload-preview__img" />
          ) : (
            <div className="branding-upload-preview__empty">
              <span>No image</span>
            </div>
          )}
        </div>
        <label className="branding-upload-card__action">
          <input type="file" accept="image/*" className="sr-only" onChange={handleFile} />
          Upload image
        </label>
      </div>
    </div>
  );
}

function SectionToggle({ sectionKey, label, desc, enabled, onChange }) {
  return (
    <div className="portal-settings__login-row">
      <div className="portal-settings__login-info">
        <div>
          <p className="portal-settings__login-title">{label}</p>
          <p className="portal-settings__login-desc">{desc}</p>
        </div>
      </div>
      <ToggleSwitch checked={enabled} onChange={onChange} label={`${label} visible`} />
    </div>
  );
}

export default function LandingPageSettings({
  landingPage,
  onChange,
  tenantSlug,
  activeSection = 'hero',
  onSectionChange,
}) {
  if (!landingPage) return null;

  const setSection = (key, enabled) => {
    onChange({
      ...landingPage,
      sections: { ...landingPage.sections, [key]: enabled },
    });
  };

  const setHero = (patch) => {
    onChange({ ...landingPage, hero: { ...landingPage.hero, ...patch } });
  };

  const setCampusBanner = (patch) => {
    onChange({ ...landingPage, campusBanner: { ...landingPage.campusBanner, ...patch } });
  };

  const setTimeline = (patch) => {
    onChange({ ...landingPage, timeline: { ...landingPage.timeline, ...patch } });
  };

  const setTimelineStep = (index, patch) => {
    const steps = [...(landingPage.timeline?.steps || [])];
    steps[index] = { ...steps[index], ...patch };
    setTimeline({ steps });
  };

  const addTimelineStep = () => {
    const steps = [...(landingPage.timeline?.steps || [])];
    steps.push({ title: 'New Feature', description: '', imageUrl: null });
    setTimeline({ steps });
  };

  const removeTimelineStep = (index) => {
    const steps = (landingPage.timeline?.steps || []).filter((_, i) => i !== index);
    setTimeline({ steps });
  };

  const setMap = (patch) => {
    onChange({ ...landingPage, map: { ...landingPage.map, ...patch } });
  };

  const setFinalCta = (patch) => {
    onChange({ ...landingPage, finalCta: { ...landingPage.finalCta, ...patch } });
  };

  return (
    <div className="grid gap-5">
      <p className="text-sm text-muted">
        Control which sections appear on your public homepage
        {tenantSlug ? <> at <strong>/{tenantSlug}/</strong></> : null}.
        Hero background uses the <strong>Landing Hero Image</strong> from Logo &amp; Images.
      </p>

      <div className="portal-settings__landing-subnav" role="tablist" aria-label="Landing page sections">
        {SECTION_OPTIONS.map(({ key, label }) => {
          const enabled = landingPage.sections?.[key] !== false;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeSection === key}
              className={`portal-settings__landing-subnav-btn${activeSection === key ? ' portal-settings__landing-subnav-btn--active' : ''}${!enabled ? ' portal-settings__landing-subnav-btn--off' : ''}`}
              onClick={() => onSectionChange?.(key)}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="portal-settings__login-list">
        {SECTION_OPTIONS.filter(({ key }) => key === activeSection).map(({ key, label, desc }) => (
          <SectionToggle
            key={key}
            sectionKey={key}
            label={label}
            desc={desc}
            enabled={landingPage.sections?.[key] !== false}
            onChange={(enabled) => setSection(key, enabled)}
          />
        ))}
      </div>

      {landingPage.sections?.[activeSection] === false && (
        <p className="portal-settings__field-note">
          This section is hidden on your homepage. Turn it on above to edit its content.
        </p>
      )}

      {activeSection === 'footer' && landingPage.sections?.footer !== false && (
        <p className="portal-settings__field-note">
          Footer content is managed under <strong>Footer</strong> in the main settings tabs.
        </p>
      )}

      {activeSection === 'hero' && landingPage.sections?.hero !== false && (
        <div className="portal-settings__panel portal-settings__panel--nested">
          <h3 className="portal-settings__section-title">Hero Banner</h3>
          <div className="grid gap-4">
            <Input label="Badge text" value={landingPage.hero?.badge || ''} onChange={(e) => setHero({ badge: e.target.value })} variant="enrollment" helper="Small label above the headline." />
            <Input label="Headline" value={landingPage.hero?.title || ''} onChange={(e) => setHero({ title: e.target.value })} variant="enrollment" helper="Leave blank to use school name." />
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand">Subtitle</span>
              <textarea
                className="portal-settings__textarea w-full"
                rows={3}
                value={landingPage.hero?.subtitle || ''}
                onChange={(e) => setHero({ subtitle: e.target.value })}
              />
            </label>
            <div className="portal-settings__login-list">
              <SectionToggle
                label="Primary button (Start Enrollment)"
                desc="Links to the enrollment form."
                enabled={landingPage.hero?.primaryCtaEnabled !== false}
                onChange={(enabled) => setHero({ primaryCtaEnabled: enabled })}
              />
              {landingPage.hero?.primaryCtaEnabled !== false && (
                <div className="portal-settings__login-row portal-settings__login-row--nested">
                  <Input
                    label="Primary button label"
                    value={landingPage.hero?.primaryCtaLabel || ''}
                    onChange={(e) => setHero({ primaryCtaLabel: e.target.value })}
                    variant="enrollment"
                  />
                </div>
              )}
              <SectionToggle
                label="Secondary button (Parent Login)"
                desc="Links to the parent login page."
                enabled={landingPage.hero?.secondaryCtaEnabled !== false}
                onChange={(enabled) => setHero({ secondaryCtaEnabled: enabled })}
              />
              {landingPage.hero?.secondaryCtaEnabled !== false && (
                <div className="portal-settings__login-row portal-settings__login-row--nested">
                  <Input
                    label="Secondary button label"
                    value={landingPage.hero?.secondaryCtaLabel || ''}
                    onChange={(e) => setHero({ secondaryCtaLabel: e.target.value })}
                    variant="enrollment"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'campusBanner' && landingPage.sections?.campusBanner !== false && (
        <div className="portal-settings__panel portal-settings__panel--nested">
          <h3 className="portal-settings__section-title">Campus Image</h3>
          <p className="portal-settings__field-note mb-4">Static photo only — no 360° viewer.</p>
          <div className="grid gap-4">
            <Input label="Title" value={landingPage.campusBanner?.title || ''} onChange={(e) => setCampusBanner({ title: e.target.value })} variant="enrollment" />
            <Input label="Subtitle" value={landingPage.campusBanner?.subtitle || ''} onChange={(e) => setCampusBanner({ subtitle: e.target.value })} variant="enrollment" />
            <ImageUploadField label="Campus image" hint="Wide photo for the campus section." value={landingPage.campusBanner?.imageUrl} previewVariant="wide" onChange={(url) => setCampusBanner({ imageUrl: url })} />
          </div>
        </div>
      )}

      {activeSection === 'timeline' && landingPage.sections?.timeline !== false && (
        <div className="portal-settings__panel portal-settings__panel--nested">
          <h3 className="portal-settings__section-title">Features Timeline</h3>
          <div className="grid gap-4 mb-4">
            <Input label="Section title" value={landingPage.timeline?.title || ''} onChange={(e) => setTimeline({ title: e.target.value })} variant="enrollment" />
            <Input label="Section subtitle" value={landingPage.timeline?.subtitle || ''} onChange={(e) => setTimeline({ subtitle: e.target.value })} variant="enrollment" />
          </div>
          {(landingPage.timeline?.steps || []).map((step, index) => (
            <div key={index} className="portal-settings__panel portal-settings__panel--nested mb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="portal-settings__login-title">Feature {index + 1}</p>
                {(landingPage.timeline?.steps || []).length > 1 && (
                  <button type="button" onClick={() => removeTimelineStep(index)} className="branding-upload-card__remove">
                    <Trash2 size={14} /> Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3">
                <Input label="Title" value={step.title || ''} onChange={(e) => setTimelineStep(index, { title: e.target.value })} variant="enrollment" />
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-brand">Description</span>
                  <textarea
                    className="portal-settings__textarea w-full"
                    rows={2}
                    value={step.description || ''}
                    onChange={(e) => setTimelineStep(index, { description: e.target.value })}
                  />
                </label>
                <ImageUploadField label="Image" value={step.imageUrl} previewVariant="wide" onChange={(url) => setTimelineStep(index, { imageUrl: url })} />
              </div>
            </div>
          ))}
          <button type="button" onClick={addTimelineStep} className="sb-button-secondary text-sm">
            <Plus size={16} /> Add feature
          </button>
        </div>
      )}

      {activeSection === 'map' && landingPage.sections?.map !== false && (
        <div className="portal-settings__panel portal-settings__panel--nested">
          <h3 className="portal-settings__section-title">Campus Map</h3>
          <div className="grid gap-4">
            <Input label="Title" value={landingPage.map?.title || ''} onChange={(e) => setMap({ title: e.target.value })} variant="enrollment" />
            <Input label="Subtitle" value={landingPage.map?.subtitle || ''} onChange={(e) => setMap({ subtitle: e.target.value })} variant="enrollment" />
            <div className="portal-settings__login-row">
              <div>
                <p className="portal-settings__login-title">Show school address</p>
                <p className="portal-settings__login-desc">Uses address from School Details.</p>
              </div>
              <ToggleSwitch checked={landingPage.map?.showAddress !== false} onChange={(v) => setMap({ showAddress: v })} label="Show address" />
            </div>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-brand">Google Maps embed</span>
              <p className="portal-settings__field-note mb-2">
                In Google Maps → Share → Embed a map → copy the iframe <strong>src</strong> URL, or paste the full iframe code.
                Leave blank to auto-generate a map from the school address.
              </p>
              <textarea
                className="portal-settings__textarea w-full font-mono text-xs"
                rows={4}
                value={landingPage.map?.embedUrl || ''}
                onChange={(e) => setMap({ embedUrl: e.target.value })}
                placeholder='https://www.google.com/maps/embed?pb=...'
              />
            </label>
          </div>
        </div>
      )}

      {activeSection === 'finalCta' && landingPage.sections?.finalCta !== false && (
        <div className="portal-settings__panel portal-settings__panel--nested">
          <h3 className="portal-settings__section-title">Final Call-to-Action</h3>
          <div className="grid gap-4">
            <Input label="Title" value={landingPage.finalCta?.title || ''} onChange={(e) => setFinalCta({ title: e.target.value })} variant="enrollment" helper="Leave blank to use school name." />
            <Input label="Subtitle" value={landingPage.finalCta?.subtitle || ''} onChange={(e) => setFinalCta({ subtitle: e.target.value })} variant="enrollment" helper="Leave blank to use school address." />
            <Input label="Button label" value={landingPage.finalCta?.ctaLabel || ''} onChange={(e) => setFinalCta({ ctaLabel: e.target.value })} variant="enrollment" />
            <ImageUploadField label="Background image" value={landingPage.finalCta?.imageUrl} previewVariant="wide" onChange={(url) => setFinalCta({ imageUrl: url })} />
          </div>
        </div>
      )}
    </div>
  );
}
