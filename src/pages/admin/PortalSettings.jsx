import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, KeyRound, Layout, Menu, Save, Upload, Mail, Smartphone, Shield, Globe, QrCode, Home, PanelBottom } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import ToggleSwitch from '../../components/ui/ToggleSwitch.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { readFileAsDataUrl } from '../../services/portalConfigService.js';
import { sanitizeBrandingValue } from '../../utils/brandingUrlUtils.js';
import '../../styles/portal-branding.css';
import { applyPortalTheme, THEME_PRESETS } from '../../utils/themeUtils.js';
import { DEFAULT_ENROLLMENT_THEME } from '../../constants/enrollmentTheme.js';
import EnrollmentFormBuilder from './EnrollmentFormBuilder.jsx';
import { cloneEnrollmentFormConfig, DEFAULT_ENROLLMENT_FORM } from '../../data/defaultEnrollmentFormConfig.js';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import { mergeLandingPage } from '../../data/defaultLandingPage.js';
import FooterSettings from '../../components/admin/FooterSettings.jsx';
import { mergeFooterConfig } from '../../data/defaultFooterConfig.js';
import LandingBuilder from '../../landing-builder/admin/LandingBuilder.jsx';

const TABS = [
  { id: 'identity', label: 'Portal Identity', icon: Layout, desc: 'Name & tagline' },
  { id: 'login', label: 'Login Access', icon: KeyRound, desc: 'Sign-in methods' },
  { id: 'email', label: 'Email Settings', icon: Mail, desc: 'School SMTP mail' },
  // Theme Colors — hidden for now; re-enable when tenant theme customization is ready.
  // { id: 'theme', label: 'Theme Colors', icon: Palette, desc: 'Brand & accent colors' },
  { id: 'school', label: 'School Details', icon: Menu, desc: 'Contact information' },
  { id: 'footer', label: 'Footer', icon: PanelBottom, desc: 'Contact, socials & links' },
  { id: 'images', label: 'Logo & Images', icon: Image, desc: 'Logos & hero images' },
  { id: 'landing', label: 'Landing Page', icon: Home, desc: 'Homepage sections & content' },
];

const TAB_META = Object.fromEntries(TABS.map((t) => [t.id, t]));

function SettingsSectionHead({ title, description, className = '' }) {
  return (
    <div className={`portal-settings__section-head ${className}`.trim()}>
      <h2 className="portal-settings__section-title">{title}</h2>
      {description && <p className="portal-settings__section-desc">{description}</p>}
    </div>
  );
}

function LoginOptionRow({ icon: Icon, title, desc, checked, onChange, nested = false }) {
  return (
    <div className={`portal-settings__login-row${nested ? ' portal-settings__login-row--nested' : ''}`}>
      <div className="portal-settings__login-info">
        <div className={`portal-settings__login-icon${nested ? ' portal-settings__login-icon--sm' : ''}`}>
          <Icon size={nested ? 16 : 18} />
        </div>
        <div>
          <p className="portal-settings__login-title">{title}</p>
          {desc && <p className="portal-settings__login-desc">{desc}</p>}
        </div>
      </div>
      <ToggleSwitch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

function ImageUploadField({ label, hint, value, onChange, previewVariant = 'default' }) {
  const [previewBroken, setPreviewBroken] = useState(false);
  const displayUrl = sanitizeBrandingValue(value);

  useEffect(() => {
    setPreviewBroken(false);
  }, [displayUrl]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    setPreviewBroken(false);
    onChange(dataUrl);
  };

  const previewClass = previewVariant === 'icon'
    ? 'branding-upload-preview branding-upload-preview--icon'
    : previewVariant === 'wide'
      ? 'branding-upload-preview branding-upload-preview--wide'
      : 'branding-upload-preview';

  return (
    <div className="branding-upload-card">
      <div className="branding-upload-card__header">
        <div>
          <p className="branding-upload-card__title">{label}</p>
          {hint && <p className="branding-upload-card__hint">{hint}</p>}
        </div>
        {displayUrl && (
          <button
            type="button"
            onClick={() => {
              setPreviewBroken(false);
              onChange(null);
            }}
            className="branding-upload-card__remove"
          >
            Remove
          </button>
        )}
      </div>
      <div className="branding-upload-card__body">
        <div className={previewClass}>
          {displayUrl && !previewBroken ? (
            <img
              src={displayUrl}
              alt={label}
              className="branding-upload-preview__img"
              onError={() => setPreviewBroken(true)}
            />
          ) : (
            <div className="branding-upload-preview__empty">
              <Upload size={22} />
              <span>{previewBroken ? 'Image failed to load — upload again' : 'No image'}</span>
            </div>
          )}
        </div>
        <label className="premium-btn premium-btn-secondary premium-btn-sm branding-upload-card__btn">
          <Upload size={14} />
          {displayUrl ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}

function getPortalShortLabel(name) {
  const trimmed = (name || 'KA').trim();
  if (!trimmed) return 'KA';
  if (trimmed.length <= 4) return trimmed.toUpperCase();
  return trimmed.split(/\s+/).map((word) => word[0]).join('').slice(0, 3).toUpperCase();
}

function BrandingSidebarPreview({ portalName, schoolName, iconUrl, logoUrl }) {
  const expandedLogo = sanitizeBrandingValue(logoUrl) || sanitizeBrandingValue(iconUrl);

  return (
    <div className="branding-sidebar-preview">
      <p className="branding-sidebar-preview__title">Sidebar preview</p>
      <div className="branding-sidebar-preview__grid">
        <div className="branding-sidebar-preview__panel branding-sidebar-preview__panel--collapsed">
          <p className="branding-sidebar-preview__label">Collapsed</p>
          <div className="branding-sidebar-preview__rail">
            {iconUrl ? (
              <span className="portal-logo-sidebar-mark branding-sidebar-preview__initials">
                <img src={iconUrl} alt="" className="portal-logo-compact-img" />
              </span>
            ) : (
              <span className="sidebar-brand-initials-btn branding-sidebar-preview__initials">
                <span className="sidebar-brand-initials-btn__label">
                  {getPortalShortLabel(portalName)}
                </span>
              </span>
            )}
          </div>
        </div>
        <div className="branding-sidebar-preview__panel">
          <p className="branding-sidebar-preview__label">Expanded</p>
          <div className="branding-sidebar-preview__expanded">
            <span className="portal-logo-sidebar-wrap branding-sidebar-preview__wrap">
              {expandedLogo ? (
                <img src={expandedLogo} alt="" className="portal-logo-sidebar-img" />
              ) : (
                <span className="portal-logo-name--compact">{(portalName || 'KA').slice(0, 2).toUpperCase()}</span>
              )}
            </span>
            <div className="branding-sidebar-preview__text">
              <p className="branding-sidebar-preview__name">{portalName || 'Portal Name'}</p>
              <p className="branding-sidebar-preview__school">{schoolName || 'School name'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnrollmentSchoolDetailsSection({ school, onSchoolChange, hint }) {
  const patch = (field, value) => onSchoolChange({ ...school, [field]: value });

  return (
    <div className="grid gap-4">
      {hint && <p className="portal-settings__section-desc">{hint}</p>}
      <Input
        label="School Name"
        value={school?.name || ''}
        onChange={(e) => patch('name', e.target.value)}
        variant="enrollment"
      />
      <Input
        label="Academic Year"
        value={school?.academicYear || ''}
        onChange={(e) => patch('academicYear', e.target.value)}
        variant="enrollment"
      />
      <Input
        label="Address"
        value={school?.address || ''}
        onChange={(e) => patch('address', e.target.value)}
        variant="enrollment"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Phone"
          value={school?.phone || ''}
          onChange={(e) => patch('phone', e.target.value)}
          variant="enrollment"
        />
        <Input
          label="Email"
          type="email"
          value={school?.email || ''}
          onChange={(e) => patch('email', e.target.value)}
          variant="enrollment"
        />
      </div>
    </div>
  );
}

export default function PortalSettings() {
  const {
    config,
    updateConfig,
    updatePlatformConfig,
    activeSchoolId,
    isPlatformAdmin,
    platform,
    schools,
  } = usePortalConfig();
  const { tenantSlug } = useTenant();
  const { toast } = useToast();
  const [editTarget, setEditTarget] = useState('school');
  const [tab, setTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [platformForm, setPlatformForm] = useState(null);

  const activeSchoolMeta = schools.find((s) => s.id === activeSchoolId)
    || (tenantSlug && form?.school
      ? { id: activeSchoolId, name: form.school.name, slug: tenantSlug }
      : null);

  useEffect(() => {
    if (platform) {
      setPlatformForm({
        platformName: platform.platformName || 'Kids Activities',
        tagline: platform.tagline || '',
        footerText: platform.footerText || DEFAULT_PORTAL_CONFIG.footerText,
        heroHeadline: platform.heroHeadline || '',
        heroSubtext: platform.heroSubtext || '',
        school: { ...(platform.school || DEFAULT_PORTAL_CONFIG.school) },
        enrollmentForm: cloneEnrollmentFormConfig(
          platform.enrollmentForm?.steps?.length ? platform.enrollmentForm : DEFAULT_ENROLLMENT_FORM,
        ),
        branding: {
          ...DEFAULT_PORTAL_CONFIG.branding,
          ...(platform.branding || {}),
        },
      });
    }
  }, [platform]);

  useEffect(() => {
    if (config) {
      setForm({
        portalName: config.portalName,
        tagline: config.tagline,
        footerText: config.footerText,
        school: { ...config.school },
        branding: { ...config.branding },
        theme: { ...config.theme },
        enrollmentTheme: { ...config.enrollmentTheme },
        loginMethods: { ...config.loginMethods },
        loginScrollLines: [...(config.loginScrollLines || [])],
        enrollmentForm: cloneEnrollmentFormConfig(config.enrollmentForm),
        menuVisibility: JSON.parse(JSON.stringify(config.menuVisibility || {})),
        menuCustomization: { ...(config.menuCustomization || {}) },
        customMenuItems: [...(config.customMenuItems || [])],
        menuOrder: JSON.parse(JSON.stringify(config.menuOrder || {})),
        emailSettings: {
          ...DEFAULT_PORTAL_CONFIG.emailSettings,
          ...(config.emailSettings || {}),
          password: '',
        },
        landingPage: mergeLandingPage(
          config.landingPage,
          config.portalName,
          config.school?.name,
        ),
        footer: mergeFooterConfig(
          config.footer,
          config.school?.name,
          config.footerText,
        ),
      });
    }
  }, [config, activeSchoolId]);

  useEffect(() => {
    const main = document.querySelector('.portal-shell main');
    main?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [tab]);

  useEffect(() => {
    if (tab === 'theme' && form?.theme) {
      applyPortalTheme(form.theme, form.enrollmentTheme);
    } else if (config?.theme) {
      applyPortalTheme(config.theme, config.enrollmentTheme);
    }
  }, [tab, form?.theme, form?.enrollmentTheme, config?.theme, config?.enrollmentTheme]);

  const setBrandColor = (color) => {
    setForm((f) => ({
      ...f,
      theme: { ...f.theme, brandColor: color },
      enrollmentTheme: {
        ...f.enrollmentTheme,
        brandNavy: color,
      },
    }));
  };

  const setAccentColor = (color) => {
    setForm((f) => ({
      ...f,
      theme: { ...f.theme, accentColor: color },
      enrollmentTheme: {
        ...f.enrollmentTheme,
        brandRed: color,
      },
    }));
  };

  const applyPreset = (preset) => {
    setForm((f) => ({
      ...f,
      theme: { brandColor: preset.brandColor, accentColor: preset.accentColor },
      enrollmentTheme: {
        ...f.enrollmentTheme,
        brandNavy: preset.brandColor,
        brandRed: preset.accentColor,
      },
    }));
  };

  const setEnrollmentColor = (key, value) => {
    setForm((f) => ({
      ...f,
      enrollmentTheme: { ...f.enrollmentTheme, [key]: value },
    }));
  };

  if (editTarget === 'platform' && isPlatformAdmin) {
    if (!platformForm) {
      return (
        <AppLayout>
          <div className="p-8 text-sm text-[#45474c]">Loading main portal settings…</div>
        </AppLayout>
      );
    }
  } else if (!form) {
    return (
      <AppLayout>
        <div className="p-8 text-sm text-[#45474c]">Loading portal settings…</div>
      </AppLayout>
    );
  }

  const setLoginMethod = (key, enabled) => {
    setForm((f) => {
      const next = { ...f.loginMethods, [key]: enabled };
      const count = (next.emailLogin ? 1 : 0) + (next.mobileOtp ? 1 : 0) + (next.emailOtp ? 1 : 0) + (next.qrLogin ? 1 : 0);
      if (count === 0) {
        toast('At least one login method must remain enabled.', 'warning');
        return f;
      }
      return { ...f, loginMethods: next };
    });
  };

  const handleSavePlatform = async () => {
    if (!platformForm) return;
    setSaving(true);
    try {
      await updatePlatformConfig({
        platformName: platformForm.platformName.trim() || 'Kids Activities',
        tagline: platformForm.tagline.trim(),
        footerText: platformForm.footerText.trim(),
        heroHeadline: platformForm.heroHeadline.trim(),
        heroSubtext: platformForm.heroSubtext.trim(),
        school: platformForm.school,
        enrollmentForm: platformForm.enrollmentForm,
        branding: platformForm.branding,
      });
      toast('Main portal settings saved. Updates appear on / and /enrollment.', 'success');
    } catch {
      toast('Failed to save main portal settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!form.loginMethods?.emailLogin && !form.loginMethods?.mobileOtp && !form.loginMethods?.emailOtp && !form.loginMethods?.qrLogin) {
      toast('Enable at least one login method.', 'error');
      return;
    }
    setSaving(true);
    try {
      const menuCustomization = Object.fromEntries(
        Object.entries(form.menuCustomization || {}).filter(([, v]) => v?.label || v?.icon),
      );
      await updateConfig({
        ...form,
        footerText: form.footer?.copyright?.trim() || form.footerText,
        menuCustomization,
        customMenuItems: (form.customMenuItems || []).filter((i) => i.label?.trim() && i.to?.trim()),
        menuOrder: form.menuOrder || {},
        menuVisibility: form.menuVisibility || {},
      });
      toast('Portal settings saved. Logo and branding updates are live.', 'success');
    } catch {
      toast('Failed to save portal settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="portal-settings">
        <PageHeader
          title="Portal Branding & Configuration"
          subtitle={
            editTarget === 'platform' && isPlatformAdmin
              ? 'Manage the main homepage (/) and enrollment form (/enrollment).'
              : 'Customize your school portal — branding, login, email, and theme.'
          }
          actions={(
            <button
              type="button"
              onClick={editTarget === 'platform' && isPlatformAdmin ? handleSavePlatform : handleSave}
              disabled={saving || (editTarget === 'school' && !form)}
              className="premium-btn premium-btn-primary premium-btn-sm"
            >
              <Save size={16} />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          )}
        />

        {isPlatformAdmin && (
          <div className="portal-settings__target">
            <button
              type="button"
              onClick={() => setEditTarget('platform')}
              className={`portal-settings__target-btn${editTarget === 'platform' ? ' portal-settings__target-btn--active' : ''}`}
            >
              <Globe size={16} />
              Main Portal (/)
            </button>
            <button
              type="button"
              onClick={() => setEditTarget('school')}
              className={`portal-settings__target-btn${editTarget === 'school' ? ' portal-settings__target-btn--active' : ''}`}
            >
              <Layout size={16} />
              School Portal
              {activeSchoolMeta ? ` — ${activeSchoolMeta.name}` : ''}
            </button>
          </div>
        )}

        {editTarget === 'platform' && isPlatformAdmin && platformForm && (
          <div className="grid gap-4">
            <div className="sb-card grid max-w-3xl gap-4 p-6">
              <Input
                label="Platform Name"
                value={platformForm.platformName}
                onChange={(e) => setPlatformForm((f) => ({ ...f, platformName: e.target.value }))}
                variant="enrollment"
                helper="Shown in header and footer on the main homepage (/)."
              />
              <Input
                label="Platform Tagline"
                value={platformForm.tagline}
                onChange={(e) => setPlatformForm((f) => ({ ...f, tagline: e.target.value }))}
                variant="enrollment"
                helper="Badge text on hero — e.g. Multi-school enrollment platform."
              />
              <Input
                label="Footer Text"
                value={platformForm.footerText}
                onChange={(e) => setPlatformForm((f) => ({ ...f, footerText: e.target.value }))}
                variant="enrollment"
              />
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand">Hero Headline</label>
                <textarea
                  className="w-full rounded-xl border border-black/10 bg-[#fafbfe] px-4 py-3 text-sm text-brand outline-none focus:border-[var(--sb-secondary)] focus:ring-2 focus:ring-[var(--sb-secondary)]/15"
                  rows={3}
                  value={platformForm.heroHeadline}
                  onChange={(e) => setPlatformForm((f) => ({ ...f, heroHeadline: e.target.value }))}
                  placeholder={'Modern School Enrollment\nBuilt for Premium Education'}
                />
                <p className="mt-1 text-xs text-muted">One line per row. Shown on the main homepage hero.</p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-brand">Hero Description</label>
                <textarea
                  className="w-full rounded-xl border border-black/10 bg-[#fafbfe] px-4 py-3 text-sm text-brand outline-none focus:border-[var(--sb-secondary)] focus:ring-2 focus:ring-[var(--sb-secondary)]/15"
                  rows={4}
                  value={platformForm.heroSubtext}
                  onChange={(e) => setPlatformForm((f) => ({ ...f, heroSubtext: e.target.value }))}
                />
              </div>
            </div>
            <div className="max-w-3xl">
              <ImageUploadField
                label="Landing Hero Image"
                hint="Full-width background on the main homepage (/)."
                value={platformForm.branding.heroImageUrl}
                onChange={(url) => setPlatformForm((f) => ({
                  ...f,
                  branding: { ...f.branding, heroImageUrl: url },
                }))}
              />
            </div>

            <EnrollmentSchoolDetailsSection
              school={platformForm.school}
              onSchoolChange={(school) => setPlatformForm((f) => ({ ...f, school }))}
              hint={<>Shown on the main portal enrollment form at <strong>/enrollment</strong>.</>}
            />

            {platformForm.enrollmentForm && (
              <EnrollmentFormBuilder
                value={platformForm.enrollmentForm}
                onChange={(enrollmentForm) => setPlatformForm((f) => ({ ...f, enrollmentForm }))}
              />
            )}

            <p className="max-w-3xl text-xs text-muted">
              School-specific branding is edited under <strong>School Portal</strong>. Select a school from Admin → Schools first.
            </p>
          </div>
        )}

        {editTarget === 'school' && !form && isPlatformAdmin && (
          <div className="portal-settings__empty">
            Select a school from <strong>Admin → Schools</strong>, then return here to edit that school&apos;s portal branding.
          </div>
        )}

        {editTarget === 'school' && form && (
          <>
            {activeSchoolMeta && (
              <div className="portal-settings__banner">
                <div>
                  <p className="portal-settings__banner-title">{activeSchoolMeta.name}</p>
                  <p className="portal-settings__banner-meta">
                    Editing portal branding for this school. Changes apply to login, sidebar, and public pages.
                  </p>
                </div>
                {activeSchoolMeta.slug && (
                  <span className="portal-settings__banner-url">/{activeSchoolMeta.slug}</span>
                )}
              </div>
            )}

            <div className="portal-settings__layout">
              <nav className="portal-settings__nav" aria-label="Portal settings sections">
                {TABS.map(({ id, label, icon: Icon, desc }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`portal-settings__nav-btn${tab === id ? ' portal-settings__nav-btn--active' : ''}`}
                  >
                    <span className="portal-settings__nav-icon">
                      <Icon size={16} />
                    </span>
                    <span className="portal-settings__nav-text">
                      <span className="portal-settings__nav-label">{label}</span>
                      <span className="portal-settings__nav-desc">{desc}</span>
                    </span>
                  </button>
                ))}
              </nav>

              <div className="portal-settings__content">
                <div className="portal-settings__panel portal-settings__panel--tab">
                  <SettingsSectionHead
                    className="portal-settings__section-head--mobile"
                    title={TAB_META[tab]?.label}
                    description={TAB_META[tab]?.desc}
                  />

        {tab === 'identity' && (
          <div className="grid gap-5">
            <BrandingSidebarPreview
              portalName={form.portalName}
              schoolName={form.school?.name}
              iconUrl={form.branding.logoIconUrl}
              logoUrl={form.branding.logoUrl}
            />
            <div className="grid gap-4">
              <Input
                label="Portal Name"
                value={form.portalName}
                onChange={(e) => setForm((f) => ({ ...f, portalName: e.target.value }))}
                variant="enrollment"
                helper="Shown in header, sidebar, login, and browser title."
              />
              <Input
                label="Portal Tagline"
                value={form.tagline}
                onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
                variant="enrollment"
              />
            </div>
          </div>
        )}

        {tab === 'login' && (
          <div>
            <div className="portal-settings__login-list">
              <LoginOptionRow
                icon={Mail}
                title="Email Login"
                desc="School-registered email + password"
                checked={form.loginMethods.emailLogin !== false}
                onChange={(enabled) => setLoginMethod('emailLogin', enabled)}
              />
              <LoginOptionRow
                icon={QrCode}
                title="QR Login"
                desc="Sign in on web by scanning with the Kids Activities mobile app"
                checked={form.loginMethods.qrLogin !== false}
                onChange={(enabled) => setLoginMethod('qrLogin', enabled)}
              />
              <div className="portal-settings__login-row portal-settings__otp-group">
                <div className="portal-settings__login-info">
                  <div className="portal-settings__login-icon">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="portal-settings__login-title">OTP Login</p>
                    <p className="portal-settings__login-desc">
                      Single OTP sign-in — users choose mobile or email on the login page
                    </p>
                  </div>
                </div>
              </div>
              <div className="portal-settings__otp-nested">
                {[
                  {
                    key: 'mobileOtp',
                    icon: Smartphone,
                    title: 'Mobile OTP',
                    desc: 'Allow OTP via registered mobile number',
                  },
                  {
                    key: 'emailOtp',
                    icon: Mail,
                    title: 'Email OTP',
                    desc: 'Allow OTP via registered email address',
                  },
                ].map(({ key, icon, title, desc }) => (
                  <LoginOptionRow
                    key={key}
                    icon={icon}
                    title={title}
                    desc={desc}
                    nested
                    checked={form.loginMethods[key] !== false}
                    onChange={(next) => setLoginMethod(key, next)}
                  />
                ))}
              </div>
            </div>

            <p className="portal-settings__field-note">
              OTP login appears as one option on the login page. Enable mobile, email, or both channels inside OTP login.
            </p>

            <hr className="portal-settings__divider" />

            <div>
              <p className="portal-settings__login-title">Login Header Scroll Text</p>
              <p className="portal-settings__login-desc mb-3">
                One announcement per line. They scroll right to left in a single line on the login header.
              </p>
              <textarea
                className="portal-settings__textarea"
                rows={5}
                value={(form.loginScrollLines || []).join('\n')}
                onChange={(e) => {
                  const lines = e.target.value
                    .split('\n')
                    .map((line) => line.trim())
                    .filter(Boolean);
                  setForm((f) => ({ ...f, loginScrollLines: lines }));
                }}
                placeholder={'Admissions open for 2026–2027\nFee deadline: 31 July 2026'}
              />
            </div>
          </div>
        )}

        {tab === 'email' && (
          <div className="grid gap-4">
            <div className="portal-settings__login-row">
              <div>
                <p className="portal-settings__login-title">Use school email for outgoing mail</p>
                <p className="portal-settings__login-desc">
                  Requires valid SMTP credentials (e.g. Gmail app password, school mail server)
                </p>
              </div>
              <ToggleSwitch
                checked={form.emailSettings?.useSchoolSmtp === true}
                onChange={(enabled) => setForm((f) => ({
                  ...f,
                  emailSettings: { ...f.emailSettings, useSchoolSmtp: enabled },
                }))}
                label="Use school email for outgoing mail"
              />
            </div>

            <div className="portal-settings__grid-2">
              <Input
                label="SMTP Host"
                value={form.emailSettings?.smtpHost || ''}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  emailSettings: { ...f.emailSettings, smtpHost: e.target.value },
                }))}
                variant="enrollment"
                placeholder="smtp.gmail.com"
              />
              <Input
                label="SMTP Port"
                type="number"
                value={form.emailSettings?.smtpPort ?? 587}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  emailSettings: { ...f.emailSettings, smtpPort: Number(e.target.value) || 587 },
                }))}
                variant="enrollment"
              />
            </div>

            <Input
              label="SMTP Username / Email"
              type="email"
              value={form.emailSettings?.username || ''}
              onChange={(e) => setForm((f) => ({
                ...f,
                emailSettings: { ...f.emailSettings, username: e.target.value },
              }))}
              variant="enrollment"
              helper="Usually the full email address used to authenticate with your mail server."
            />

            <Input
              label="SMTP Password"
              type="password"
              value={form.emailSettings?.password || ''}
              onChange={(e) => setForm((f) => ({
                ...f,
                emailSettings: { ...f.emailSettings, password: e.target.value },
              }))}
              variant="enrollment"
              placeholder={form.emailSettings?.passwordConfigured ? 'Leave blank to keep current password' : 'Enter SMTP password or app password'}
            />

            <div className="portal-settings__grid-2">
              <Input
                label="From Email"
                type="email"
                value={form.emailSettings?.fromEmail || ''}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  emailSettings: { ...f.emailSettings, fromEmail: e.target.value },
                }))}
                variant="enrollment"
                helper="Defaults to SMTP username if empty."
              />
              <Input
                label="From Name"
                value={form.emailSettings?.fromName || ''}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  emailSettings: { ...f.emailSettings, fromName: e.target.value },
                }))}
                variant="enrollment"
                helper={`Defaults to ${form.school?.name || 'school name'} if empty.`}
              />
            </div>

            <p className="portal-settings__field-note">
              Parent notification emails mention your school name only. Login links are included only when the parent already has a portal account; correction requests use a secure no-login link.
            </p>
          </div>
        )}

        {tab === 'theme' && (
          <div className="space-y-5">
            <div className="rounded-xl border border-black/5 bg-[#fafbfe] p-5">
              <p className="mb-5 text-sm text-muted">
                Brand and accent colors apply across login, dashboard, footer, links, notifications, and enrollment headers.
              </p>

              <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand">Brand Color</label>
                  <p className="mb-2 text-xs text-muted">Footer, sidebar, primary buttons, headers</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.theme.brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-black/10"
                    />
                    <input
                      type="text"
                      value={form.theme.brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="input-premium h-11 flex-1 rounded-lg border border-[#c5c6cd] px-3 text-sm uppercase"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold text-brand">Accent Color</label>
                  <p className="mb-2 text-xs text-muted">Links, badges, toggles, notification alerts</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.theme.accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-11 w-14 cursor-pointer rounded-lg border border-black/10"
                    />
                    <input
                      type="text"
                      value={form.theme.accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="input-premium h-11 flex-1 rounded-lg border border-[#c5c6cd] px-3 text-sm uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-black/5 p-4" style={{ background: form.theme.brandColor }}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-on-primary-muted">Footer preview</p>
                <p className="text-sm font-semibold text-on-primary">{form.portalName}</p>
                <p className="mt-1 text-xs text-on-primary-subtle">{form.footer?.copyright || form.footerText}</p>
              </div>

              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted">Color Presets</p>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="inline-flex items-center gap-2 rounded-full border border-black/5 px-3 py-1.5 text-xs font-semibold text-muted hover:bg-brand-muted"
                  >
                    <span className="flex h-4 overflow-hidden rounded-full border border-black/10">
                      <span className="h-4 w-4" style={{ background: preset.brandColor }} />
                      <span className="h-4 w-4" style={{ background: preset.accentColor }} />
                    </span>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-black/5 bg-[#fafbfe] p-5">
              <p className="mb-1 text-sm font-semibold text-brand">Enrollment Form Colors</p>
              <p className="mb-5 text-sm text-muted">
                Navy &amp; red sync with app brand color. Adjust form background and borders below.
              </p>

              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { key: 'brandGrayLight', label: 'Gray Light', hint: 'Borders, dividers, progress track' },
                  { key: 'formBg', label: 'Form Background', hint: 'Input fields & notes panel' },
                ].map(({ key, label, hint }) => (
                  <div key={key}>
                    <label className="mb-1.5 block text-xs font-semibold text-brand">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={form.enrollmentTheme[key]}
                        onChange={(e) => setEnrollmentColor(key, e.target.value)}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-black/10"
                      />
                      <input
                        type="text"
                        value={form.enrollmentTheme[key]}
                        onChange={(e) => setEnrollmentColor(key, e.target.value)}
                        className="input-premium h-10 flex-1 rounded-lg border border-[#c5c6cd] px-2 text-xs uppercase"
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-[#6b7a8c]">{hint}</p>
                  </div>
                ))}
              </div>

              <div
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: form.enrollmentTheme.brandGrayLight }}
              >
                <div
                  className="flex items-center px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
                  style={{
                    background: `linear-gradient(to right, ${form.theme.brandColor} 0%, ${form.theme.brandColor} 44px, ${form.theme.brandColor} 44px)`,
                  }}
                >
                  <span className="mr-3 w-6 text-center">A</span>
                  Enrollment Preview
                </div>
                <div className="flex flex-wrap items-center gap-3 p-4" style={{ background: '#fff' }}>
                  <span
                    className="rounded px-3 py-1.5 text-xs font-semibold text-white"
                    style={{ background: form.theme.brandColor }}
                  >
                    Continue
                  </span>
                  <input
                    readOnly
                    className="rounded border px-2 py-1.5 text-xs"
                    style={{
                      background: form.enrollmentTheme.formBg,
                      borderColor: form.enrollmentTheme.brandGrayLight,
                      color: form.theme.brandColor,
                    }}
                    value="Sample input"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, enrollmentTheme: { ...DEFAULT_ENROLLMENT_THEME } }))}
                className="mt-4 text-xs font-semibold text-accent hover:underline"
              >
                Reset enrollment colors to default
              </button>
            </div>
          </div>
        )}

        {tab === 'school' && (
          <EnrollmentSchoolDetailsSection
            school={form.school}
            onSchoolChange={(school) => setForm((f) => ({ ...f, school }))}
            hint={
              activeSchoolMeta?.slug || tenantSlug ? (
                <>
                  Used on the public landing page, login page, and enrollment header for{' '}
                  <strong>/{activeSchoolMeta?.slug || tenantSlug}</strong>.
                  Footer contact fields can also be edited under <strong>Footer</strong>.
                </>
              ) : (
                <>School contact details shown on the public school portal and login page.</>
              )
            }
          />
        )}

        {tab === 'footer' && (
          <FooterSettings
            footer={form.footer}
            school={form.school}
            onFooterChange={(footer) => setForm((f) => ({ ...f, footer }))}
            onSchoolChange={(school) => setForm((f) => ({ ...f, school }))}
          />
        )}

        {tab === 'images' && (
          <div className="grid gap-5">
            <BrandingSidebarPreview
              portalName={form.portalName}
              schoolName={form.school?.name}
              iconUrl={form.branding.logoIconUrl}
              logoUrl={form.branding.logoUrl}
            />
            <div className="portal-settings__images-grid">
              <ImageUploadField
                label="Sidebar Icon"
                hint="Square mark for the collapsed sidebar rail. PNG or SVG, 128×128 px recommended."
                value={form.branding.logoIconUrl}
                previewVariant="icon"
                onChange={(url) => setForm((f) => ({
                  ...f,
                  branding: { ...f.branding, logoIconUrl: url },
                }))}
              />
              <ImageUploadField
                label="Header Logo"
                hint="Wider logo for expanded sidebar and public header."
                value={form.branding.logoUrl}
                previewVariant="wide"
                onChange={(url) => setForm((f) => ({
                  ...f,
                  branding: { ...f.branding, logoUrl: url },
                }))}
              />
              <ImageUploadField
                label="Favicon"
                hint="Browser tab icon (.png or .svg)."
                value={form.branding.faviconUrl}
                previewVariant="icon"
                onChange={(url) => setForm((f) => ({
                  ...f,
                  branding: { ...f.branding, faviconUrl: url },
                }))}
              />
              <ImageUploadField
                label="Landing Hero Image"
                hint="Full-width background on home page."
                value={form.branding.heroImageUrl}
                previewVariant="wide"
                onChange={(url) => setForm((f) => ({
                  ...f,
                  branding: { ...f.branding, heroImageUrl: url },
                }))}
              />
              <ImageUploadField
                label="Login Page Hero"
                hint="Background image on login page."
                value={form.branding.loginHeroUrl}
                previewVariant="wide"
                onChange={(url) => setForm((f) => ({
                  ...f,
                  branding: { ...f.branding, loginHeroUrl: url },
                }))}
              />
            </div>
          </div>
        )}

        {tab === 'landing' && (
          <LandingBuilder
            schoolId={activeSchoolId}
            schoolName={form.school?.name}
            portalName={form.portalName}
            tenantSlug={activeSchoolMeta?.slug || tenantSlug}
          />
        )}

                </div>
              </div>
            </div>
          </>
        )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}
