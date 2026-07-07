import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Image, KeyRound, Layout, Menu, Palette, Save, Upload, Mail, Smartphone, Shield, FileText, Globe, QrCode } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import PortalLogo from '../../components/brand/PortalLogo.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { readFileAsDataUrl } from '../../services/portalConfigService.js';
import { getAllMenuItemsGrouped, buildRoleMenuEntries, resolveMenuOrderForRole } from '../../utils/navUtils.js';
import { MenuItemRow, AddMenuButton } from '../../components/admin/PortalMenuEditor.jsx';
import '../../styles/portal-menu-editor.css';
import { applyPortalTheme, THEME_PRESETS } from '../../utils/themeUtils.js';
import { DEFAULT_ENROLLMENT_THEME } from '../../constants/enrollmentTheme.js';
import { ROLE_LABELS } from '../../constants/roles.js';
import EnrollmentFormBuilder from './EnrollmentFormBuilder.jsx';
import { cloneEnrollmentFormConfig, DEFAULT_ENROLLMENT_FORM } from '../../data/defaultEnrollmentFormConfig.js';
import { FOOTER_LINKS } from '../../components/layout/PublicFooter.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';

const TABS = [
  { id: 'identity', label: 'Portal Identity', icon: Layout },
  { id: 'enrollment-form', label: 'Enrollment Form', icon: FileText },
  { id: 'login', label: 'Login Access', icon: KeyRound },
  { id: 'theme', label: 'Theme Colors', icon: Palette },
  { id: 'school', label: 'School Details', icon: Menu },
  { id: 'images', label: 'Logo & Images', icon: Image },
  { id: 'menus', label: 'Side Menu', icon: Menu },
];

function ImageUploadField({ label, hint, value, onChange }) {
  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
  };

  return (
    <div className="rounded-xl border border-black/5 bg-[#f8f9ff] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">{label}</p>
          {hint && <p className="mt-1 text-xs text-[#45474c]">{hint}</p>}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs font-medium text-rose-600 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/5 bg-white">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <Upload size={20} className="text-[#6b7a8c]" />
          )}
        </div>
        <label className="premium-btn premium-btn-secondary premium-btn-sm inline-flex cursor-pointer">
          <Upload size={14} />
          Upload Image
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}

function EnrollmentSchoolDetailsSection({ school, onSchoolChange, hint }) {
  const patch = (field, value) => onSchoolChange({ ...school, [field]: value });

  return (
    <div className="sb-card grid max-w-3xl gap-4 p-6">
      <h3 className="font-display text-base font-bold text-brand">Enrollment School Details</h3>
      {hint && <p className="text-sm text-muted">{hint}</p>}
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
  const { toast } = useToast();
  const [editTarget, setEditTarget] = useState('school');
  const [tab, setTab] = useState('identity');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);
  const [platformForm, setPlatformForm] = useState(null);

  const activeSchoolMeta = schools.find((s) => s.id === activeSchoolId);

  useEffect(() => {
    if (platform) {
      setPlatformForm({
<<<<<<< HEAD
        platformName: platform.platformName || 'Kids Activities',
=======
        platformName: platform.platformName || 'KidsActivites',
>>>>>>> 0e6e0343f6eae898026f88eb7524d1d7016e697b
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
      });
    }
  }, [config, activeSchoolId]);

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
<<<<<<< HEAD
        platformName: platformForm.platformName.trim() || 'Kids Activities',
=======
        platformName: platformForm.platformName.trim() || 'KidsActivites',
>>>>>>> 0e6e0343f6eae898026f88eb7524d1d7016e697b
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
        menuCustomization,
        customMenuItems: (form.customMenuItems || []).filter((i) => i.label?.trim() && i.to?.trim()),
        menuOrder: form.menuOrder || {},
        menuVisibility: form.menuVisibility || {},
      });
      toast('Portal settings saved. Changes are live across the app.', 'success');
    } catch {
      toast('Failed to save portal settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const menuGroups = getAllMenuItemsGrouped();

  const patchMenuCustomization = (menuId, patch) => {
    setForm((f) => {
      const current = { ...(f.menuCustomization[menuId] || {}), ...patch };
      Object.keys(current).forEach((key) => {
        if (current[key] === undefined || current[key] === '') delete current[key];
      });
      const menuCustomization = { ...f.menuCustomization };
      if (Object.keys(current).length === 0) delete menuCustomization[menuId];
      else menuCustomization[menuId] = current;
      return { ...f, menuCustomization };
    });
  };

  const setMenuVisible = (role, menuId, visible) => {
    setForm((f) => ({
      ...f,
      menuVisibility: {
        ...f.menuVisibility,
        [role]: { ...f.menuVisibility[role], [menuId]: visible },
      },
    }));
  };

  const addCustomMenuItem = (role) => {
    const item = {
      id: `custom_${Date.now()}`,
      label: 'New Menu Item',
      icon: 'Link',
      to: '/support',
      roles: [role],
    };
    setForm((f) => {
      const customMenuItems = [...(f.customMenuItems || []), item];
      const currentOrder = resolveMenuOrderForRole(role, f.menuOrder, customMenuItems);
      return {
        ...f,
        customMenuItems,
        menuVisibility: {
          ...f.menuVisibility,
          [role]: { ...(f.menuVisibility[role] || {}), [item.id]: true },
        },
        menuOrder: {
          ...f.menuOrder,
          [role]: [...currentOrder, item.id],
        },
      };
    });
  };

  const updateCustomMenuItem = (id, patch) => {
    setForm((f) => ({
      ...f,
      customMenuItems: f.customMenuItems.map((item) => (
        item.id === id ? { ...item, ...patch } : item
      )),
    }));
  };

  const removeCustomMenuItem = (id) => {
    setForm((f) => {
      const customMenuItems = f.customMenuItems.filter((item) => item.id !== id);
      const menuOrder = { ...f.menuOrder };
      Object.keys(menuOrder).forEach((role) => {
        menuOrder[role] = (menuOrder[role] || []).filter((menuId) => menuId !== id);
      });
      return { ...f, customMenuItems, menuOrder };
    });
  };

  const moveMenuItem = (role, menuId, direction) => {
    setForm((f) => {
      const order = resolveMenuOrderForRole(role, f.menuOrder, f.customMenuItems);
      const index = order.indexOf(menuId);
      if (index < 0) return f;
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= order.length) return f;
      const nextOrder = [...order];
      [nextOrder[index], nextOrder[swapIndex]] = [nextOrder[swapIndex], nextOrder[index]];
      return {
        ...f,
        menuOrder: { ...f.menuOrder, [role]: nextOrder },
      };
    });
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Portal Branding & Configuration"
          subtitle={
            editTarget === 'platform' && isPlatformAdmin
              ? 'Manage the main homepage (/) and enrollment form (/enrollment).'
              : 'Manage portal name, school branding, images, and side menu visibility for all roles.'
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
          <div className="mb-6 inline-flex rounded-full border border-black/5 bg-white p-1">
            <button
              type="button"
              onClick={() => setEditTarget('platform')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                editTarget === 'platform' ? 'sb-tab-active' : 'text-muted hover:text-brand'
              }`}
            >
              <Globe size={16} />
              Main Portal (/)
            </button>
            <button
              type="button"
              onClick={() => setEditTarget('school')}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                editTarget === 'school' ? 'sb-tab-active' : 'text-muted hover:text-brand'
              }`}
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
          <div className="sb-card max-w-2xl p-6 text-sm text-muted">
            Select a school from <strong>Admin → Schools</strong>, then return here to edit that school&apos;s portal branding.
          </div>
        )}

        {editTarget === 'school' && form && (
          <>
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                tab === id
                  ? 'sb-tab-active'
                  : 'border border-black/5 bg-white text-muted hover:bg-[#f8f9ff]'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>

        {tab === 'identity' && (
          <div className="sb-card grid max-w-3xl gap-4 p-6">
            <div className="mb-2 flex items-center gap-3">
              <PortalLogo size="lg" />
              <div>
                <p className="text-sm font-semibold text-brand">Live preview</p>
                <p className="text-xs text-[#45474c]">Sidebar & header branding</p>
              </div>
            </div>
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
            <Input
              label="Footer Text"
              value={form.footerText}
              onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))}
              variant="enrollment"
            />
          </div>
        )}

        {tab === 'enrollment-form' && form?.enrollmentForm && (
          <div className="space-y-6">
            <EnrollmentSchoolDetailsSection
              school={form.school}
              onSchoolChange={(school) => setForm((f) => ({ ...f, school }))}
              hint={
                activeSchoolMeta?.slug ? (
                  <>
                    Shown on this school&apos;s enrollment form at{' '}
                    <strong>/{activeSchoolMeta.slug}/enroll</strong>.
                  </>
                ) : (
                  <>Shown on the school enrollment form.</>
                )
              }
            />
            <EnrollmentFormBuilder
              value={form.enrollmentForm}
              onChange={(enrollmentForm) => setForm((f) => ({ ...f, enrollmentForm }))}
            />
          </div>
        )}

        {tab === 'login' && (
          <div className="sb-card max-w-3xl p-6">
            <p className="mb-5 text-sm text-muted">
              Control which sign-in options parents and staff see on the login page. At least one method must stay enabled.
            </p>

            <div className="divide-y divide-black/5 rounded-xl border border-black/5">
              <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafbfe]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-accent">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand">Email Login</p>
                    <p className="text-xs text-muted">School-registered email + password</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.loginMethods.emailLogin !== false}
                  onClick={() => setLoginMethod('emailLogin', form.loginMethods.emailLogin === false)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.loginMethods.emailLogin !== false ? 'sb-toggle-on' : 'bg-[#c5c6cd]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.loginMethods.emailLogin !== false ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-[#fafbfe]">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-accent">
                    <QrCode size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand">QR Login</p>
<<<<<<< HEAD
                    <p className="text-xs text-muted">Sign in on web by scanning with the Kids Activities mobile app</p>
=======
                    <p className="text-xs text-muted">Sign in on web by scanning with the KidsActivites mobile app</p>
>>>>>>> 0e6e0343f6eae898026f88eb7524d1d7016e697b
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.loginMethods.qrLogin !== false}
                  onClick={() => setLoginMethod('qrLogin', form.loginMethods.qrLogin === false)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    form.loginMethods.qrLogin !== false ? 'sb-toggle-on' : 'bg-[#c5c6cd]'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      form.loginMethods.qrLogin !== false ? 'left-[22px]' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="px-5 py-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-accent">
                    <Shield size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-brand">OTP Login</p>
                    <p className="text-xs text-muted">Single OTP sign-in — users choose mobile or email on the login page</p>
                  </div>
                </div>

                <div className="ml-2 space-y-3 border-l-2 border-black/5 pl-5">
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
                  ].map(({ key, icon: Icon, title, desc }) => {
                    const enabled = form.loginMethods[key] !== false;
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between gap-4 rounded-xl border border-black/5 bg-[#fafbfe] px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-accent">
                            <Icon size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-brand">{title}</p>
                            <p className="text-xs text-muted">{desc}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={enabled}
                          onClick={() => setLoginMethod(key, !enabled)}
                          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                            enabled ? 'sb-toggle-on' : 'bg-[#c5c6cd]'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                              enabled ? 'left-[22px]' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs text-muted">
              OTP login appears as one option on the login page. Enable mobile, email, or both channels inside OTP login.
            </p>

            <div className="mt-8 border-t border-black/5 pt-6">
              <p className="mb-2 text-sm font-semibold text-brand">Login Header Scroll Text</p>
              <p className="mb-3 text-xs text-muted">
                One announcement per line. They scroll right to left in a single line on the login header.
              </p>
              <textarea
                className="w-full rounded-xl border border-black/10 bg-[#fafbfe] px-4 py-3 text-sm text-brand outline-none focus:border-[var(--sb-secondary)] focus:ring-2 focus:ring-[var(--sb-secondary)]/15"
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

        {tab === 'theme' && (
          <div className="space-y-6 max-w-3xl">
            <div className="sb-card p-6">
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
                <p className="mt-1 text-xs text-on-primary-subtle">{form.footerText}</p>
                <div className="mt-3 flex flex-wrap gap-4">
                  {FOOTER_LINKS.map(({ label, to }) => (
                    <Link key={to} to={to} className="public-footer-link">{label}</Link>
                  ))}
                </div>
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

            <div className="sb-card p-6">
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
          <div className="space-y-4">
            <EnrollmentSchoolDetailsSection
              school={form.school}
              onSchoolChange={(school) => setForm((f) => ({ ...f, school }))}
              hint={
                activeSchoolMeta?.slug ? (
                  <>
                    Used on the public landing page and enrollment header for{' '}
                    <strong>/{activeSchoolMeta.slug}</strong>.
                  </>
                ) : (
                  <>School contact details shown on the public school portal.</>
                )
              }
            />
          </div>
        )}

        {tab === 'images' && (
          <div className="grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
            <ImageUploadField
              label="Sidebar / Header Logo"
              hint="Square image recommended. Used in sidebar and public header."
              value={form.branding.logoIconUrl || form.branding.logoUrl}
              onChange={(url) => setForm((f) => ({
                ...f,
                branding: { ...f.branding, logoIconUrl: url, logoUrl: url },
              }))}
            />
            <ImageUploadField
              label="Favicon"
              hint="Browser tab icon (.png or .svg)."
              value={form.branding.faviconUrl}
              onChange={(url) => setForm((f) => ({
                ...f,
                branding: { ...f.branding, faviconUrl: url },
              }))}
            />
            <ImageUploadField
              label="Landing Hero Image"
              hint="Full-width background on home page."
              value={form.branding.heroImageUrl}
              onChange={(url) => setForm((f) => ({
                ...f,
                branding: { ...f.branding, heroImageUrl: url },
              }))}
            />
            <ImageUploadField
              label="Login Page Hero"
              hint="Background image on login page."
              value={form.branding.loginHeroUrl}
              onChange={(url) => setForm((f) => ({
                ...f,
                branding: { ...f.branding, loginHeroUrl: url },
              }))}
            />
          </div>
        )}

        {tab === 'menus' && (
          <div className="space-y-4">
            <p className="portal-menu-hint">
              Customize sidebar labels, icons, order, and visibility per role. Use the arrows to move items up or down.
              Add new menu links for internal routes. Click <strong>Save Changes</strong> to apply.
            </p>
            {Object.entries(menuGroups).map(([role]) => {
              const entries = buildRoleMenuEntries(role, form.customMenuItems || [], form.menuOrder || {});
              return (
                <div key={role} className="sb-card overflow-hidden">
                  <div className="border-b border-black/5 bg-[#f8f9ff] px-5 py-3">
                    <h3 className="font-display text-sm font-bold text-brand">
                      {ROLE_LABELS[role] || role}
                    </h3>
                  </div>
                  <div className="portal-menu-col-headers">
                    <span>Order</span>
                    <span>Icon</span>
                    <span>Label &amp; Path</span>
                    <span>Visible</span>
                  </div>
                  <div>
                    {entries.map((entry, index) => {
                      const { item, kind } = entry;
                      const visible = form.menuVisibility?.[role]?.[item.id] !== false;
                      const canMoveUp = index > 0;
                      const canMoveDown = index < entries.length - 1;

                      if (kind === 'builtin') {
                        const custom = form.menuCustomization[item.id] || {};
                        const label = custom.label ?? item.label;
                        const icon = custom.icon ?? item.iconName ?? 'Circle';
                        return (
                          <MenuItemRow
                            key={`${role}-${item.id}`}
                            item={item}
                            label={label}
                            icon={icon}
                            path={item.to}
                            visible={visible}
                            builtin
                            canMoveUp={canMoveUp}
                            canMoveDown={canMoveDown}
                            onMoveUp={() => moveMenuItem(role, item.id, 'up')}
                            onMoveDown={() => moveMenuItem(role, item.id, 'down')}
                            onLabelChange={(value) => patchMenuCustomization(item.id, {
                              label: value === item.label ? undefined : value,
                            })}
                            onIconChange={(value) => patchMenuCustomization(item.id, { icon: value })}
                            onVisibleChange={(v) => setMenuVisible(role, item.id, v)}
                          />
                        );
                      }

                      return (
                        <MenuItemRow
                          key={`${role}-custom-${item.id}`}
                          item={item}
                          label={item.label}
                          icon={item.icon || 'Link'}
                          path={item.to}
                          visible={visible}
                          builtin={false}
                          canMoveUp={canMoveUp}
                          canMoveDown={canMoveDown}
                          onMoveUp={() => moveMenuItem(role, item.id, 'up')}
                          onMoveDown={() => moveMenuItem(role, item.id, 'down')}
                          onLabelChange={(value) => updateCustomMenuItem(item.id, { label: value })}
                          onIconChange={(value) => updateCustomMenuItem(item.id, { icon: value })}
                          onPathChange={(value) => updateCustomMenuItem(item.id, { to: value })}
                          onVisibleChange={(v) => setMenuVisible(role, item.id, v)}
                          onRemove={() => removeCustomMenuItem(item.id)}
                        />
                      );
                    })}
                  </div>
                  <AddMenuButton onClick={() => addCustomMenuItem(role)} />
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </PageTransition>
    </AppLayout>
  );
}
