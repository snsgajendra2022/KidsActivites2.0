import { Plus, Trash2 } from 'lucide-react';
import Input from '../ui/Input.jsx';
import { SOCIAL_LINK_KEYS } from '../../data/defaultFooterConfig.js';

function QuickLinkRow({ link, index, onChange, onRemove }) {
  return (
    <div className="portal-settings__panel portal-settings__panel--nested mb-3">
      <div className="flex items-center justify-between mb-3">
        <p className="portal-settings__login-title">Link {index + 1}</p>
        <button type="button" onClick={onRemove} className="branding-upload-card__remove">
          <Trash2 size={14} /> Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Label"
          value={link.label || ''}
          onChange={(e) => onChange({ ...link, label: e.target.value })}
          variant="enrollment"
          placeholder="Admissions"
        />
        <Input
          label="URL"
          value={link.url || ''}
          onChange={(e) => onChange({ ...link, url: e.target.value })}
          variant="enrollment"
          placeholder="/enrollment or https://..."
        />
      </div>
    </div>
  );
}

export default function FooterSettings({ footer, school, onFooterChange, onSchoolChange }) {
  const patchFooter = (patch) => onFooterChange({ ...footer, ...patch });
  const patchSocial = (key, value) => patchFooter({
    socialLinks: { ...footer.socialLinks, [key]: value },
  });
  const patchSchool = (field, value) => onSchoolChange({ ...school, [field]: value });

  const quickLinks = footer?.quickLinks || [];

  const setQuickLink = (index, next) => {
    const links = [...quickLinks];
    links[index] = next;
    patchFooter({ quickLinks: links });
  };

  const addQuickLink = () => {
    patchFooter({ quickLinks: [...quickLinks, { label: '', url: '' }] });
  };

  const removeQuickLink = (index) => {
    patchFooter({ quickLinks: quickLinks.filter((_, i) => i !== index) });
  };

  return (
    <div className="grid gap-5">
      <p className="portal-settings__section-desc">
        Footer content is shown on your public landing page, login page, and other school-facing pages.
        Only your school&apos;s contact details and social links appear here — no platform-wide support info.
      </p>

      <div className="portal-settings__panel portal-settings__panel--nested">
        <h3 className="portal-settings__section-title">Footer Description</h3>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand">About text</span>
          <textarea
            className="portal-settings__textarea w-full"
            rows={3}
            value={footer?.description || ''}
            onChange={(e) => patchFooter({ description: e.target.value })}
            placeholder="A brief description of your school shown in the footer."
          />
        </label>
      </div>

      <div className="portal-settings__panel portal-settings__panel--nested">
        <h3 className="portal-settings__section-title">School Contact</h3>
        <p className="portal-settings__field-note mb-4">
          Shown in the footer contact section on public pages.
        </p>
        <div className="grid gap-4">
          <Input
            label="Address"
            value={school?.address || ''}
            onChange={(e) => patchSchool('address', e.target.value)}
            variant="enrollment"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Phone"
              value={school?.phone || ''}
              onChange={(e) => patchSchool('phone', e.target.value)}
              variant="enrollment"
            />
            <Input
              label="Email"
              type="email"
              value={school?.email || ''}
              onChange={(e) => patchSchool('email', e.target.value)}
              variant="enrollment"
            />
          </div>
        </div>
      </div>

      <div className="portal-settings__panel portal-settings__panel--nested">
        <h3 className="portal-settings__section-title">Social Links</h3>
        <p className="portal-settings__field-note mb-4">
          Icons appear in the footer only when a URL is provided.
        </p>
        <div className="grid gap-4">
          {SOCIAL_LINK_KEYS.map(({ key, label, placeholder }) => (
            <Input
              key={key}
              label={label}
              value={footer?.socialLinks?.[key] || ''}
              onChange={(e) => patchSocial(key, e.target.value)}
              variant="enrollment"
              placeholder={placeholder}
            />
          ))}
        </div>
      </div>

      <div className="portal-settings__panel portal-settings__panel--nested">
        <h3 className="portal-settings__section-title">Copyright</h3>
        <Input
          label="Copyright text"
          value={footer?.copyright || ''}
          onChange={(e) => patchFooter({ copyright: e.target.value })}
          variant="enrollment"
          helper={`Leave blank to use: © ${new Date().getFullYear()} ${school?.name || 'School Name'}. All rights reserved.`}
        />
      </div>

      <div className="portal-settings__panel portal-settings__panel--nested">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="portal-settings__section-title">Quick Links</h3>
            <p className="portal-settings__field-note">Optional links shown in the footer (e.g. Admissions, About).</p>
          </div>
          <button type="button" onClick={addQuickLink} className="sb-button-secondary text-sm">
            <Plus size={16} /> Add link
          </button>
        </div>
        {quickLinks.length === 0 ? (
          <p className="portal-settings__field-note">No quick links added yet.</p>
        ) : (
          quickLinks.map((link, index) => (
            <QuickLinkRow
              key={index}
              link={link}
              index={index}
              onChange={(next) => setQuickLink(index, next)}
              onRemove={() => removeQuickLink(index)}
            />
          ))
        )}
      </div>
    </div>
  );
}
