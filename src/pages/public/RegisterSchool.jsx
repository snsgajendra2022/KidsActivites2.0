import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  checkPublicWorkspaceSlug,
  registerSchool,
  slugifyName,
} from '../../services/workspaceService.js';
import { ApiError } from '../../services/api/client.js';

const SCHOOL_TYPES = [
  { value: 'School', label: 'School' },
  { value: 'Daycare', label: 'Daycare' },
  { value: 'Preschool', label: 'Preschool' },
];

export default function RegisterSchool() {
  const toast = useToast();
  const [form, setForm] = useState({
    schoolName: '',
    workspaceSlug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    password: '',
    confirmPassword: '',
    address: '',
    schoolType: 'School',
    termsAccepted: false,
  });
  const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, reason: '', suggestions: [] });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'schoolName' && !slugTouched) {
        next.workspaceSlug = slugifyName(value);
      }
      return next;
    });
  };

  const runSlugCheck = useCallback(async (slug) => {
    const normalized = slugifyName(slug);
    if (!normalized || normalized.length < 3) {
      setSlugStatus({ checking: false, available: null, reason: '', suggestions: [] });
      return;
    }
    setSlugStatus((s) => ({ ...s, checking: true }));
    try {
      const result = await checkPublicWorkspaceSlug(normalized);
      setSlugStatus({
        checking: false,
        available: result.available,
        reason: result.reason || '',
        suggestions: result.suggestions || [],
      });
    } catch {
      setSlugStatus({ checking: false, available: null, reason: '', suggestions: [] });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSlugCheck(form.workspaceSlug), 400);
    return () => clearTimeout(timer);
  }, [form.workspaceSlug, runSlugCheck]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (!form.termsAccepted) {
      toast.error('Please accept the terms of service');
      return;
    }
    setSubmitting(true);
    try {
      const result = await registerSchool({
        schoolName: form.schoolName.trim(),
        workspaceSlug: form.workspaceSlug.trim(),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim(),
        ownerPhone: form.ownerPhone.trim(),
        password: form.password,
        address: form.address.trim(),
        schoolType: form.schoolType,
        termsAccepted: true,
      });
      toast.success(result.message || 'Workspace created successfully');
      window.location.href = result.workspaceUrl;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  const slugHelper = slugStatus.checking
    ? 'Checking availability…'
    : slugStatus.available === true
      ? 'Slug is available'
      : slugStatus.available === false
        ? slugStatus.reason || 'Slug is not available'
        : 'Lowercase letters, numbers, and hyphens only';

  return (
    <PublicLayout className="!sb-surface">
      <div className="mx-auto max-w-xl px-4 py-12 md:py-16">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-brand">
          <ArrowLeft size={16} /> Back
        </Link>

        <h1 className="font-display mb-2 text-3xl font-bold text-brand">Register your school</h1>
        <p className="mb-8 text-muted">
          Create your SchoolBridge workspace with a unique subdomain. You&apos;ll be redirected to sign in when ready.
        </p>

        <form onSubmit={handleSubmit} className="sb-card space-y-5 p-6 md:p-8">
          <FormInput
            label="School name"
            name="schoolName"
            required
            value={form.schoolName}
            onChange={(e) => updateField('schoolName', e.target.value)}
            placeholder="Green Valley International School"
          />

          <div>
            <FormInput
              label="Workspace slug"
              name="workspaceSlug"
              required
              value={form.workspaceSlug}
              onChange={(e) => {
                setSlugTouched(true);
                updateField('workspaceSlug', e.target.value);
              }}
              placeholder="green-valley"
              helper={slugHelper}
              error={slugStatus.available === false ? slugStatus.reason : undefined}
            />
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              {slugStatus.checking && <Loader2 size={12} className="animate-spin" />}
              {slugStatus.available === true && !slugStatus.checking && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Check size={12} /> Available
                </span>
              )}
              {slugStatus.available === false && !slugStatus.checking && (
                <span className="flex items-center gap-1 text-rose-600">
                  <X size={12} /> Unavailable
                </span>
              )}
            </div>
            {slugStatus.suggestions?.length > 0 && (
              <div className="mt-2 text-xs text-muted">
                Try:{' '}
                {slugStatus.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="mr-2 text-brand underline"
                    onClick={() => {
                      setSlugTouched(true);
                      updateField('workspaceSlug', s);
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Select
            label="School type"
            value={form.schoolType}
            onChange={(e) => updateField('schoolType', e.target.value)}
            options={SCHOOL_TYPES}
          />

          <FormInput
            label="Address"
            name="address"
            value={form.address}
            onChange={(e) => updateField('address', e.target.value)}
            placeholder="123 Main St, City"
          />

          <FormInput
            label="Owner name"
            name="ownerName"
            required
            value={form.ownerName}
            onChange={(e) => updateField('ownerName', e.target.value)}
            placeholder="Jane Smith"
          />

          <FormInput
            label="Owner email"
            name="ownerEmail"
            type="email"
            required
            value={form.ownerEmail}
            onChange={(e) => updateField('ownerEmail', e.target.value)}
            placeholder="admin@school.edu"
          />

          <FormInput
            label="Phone"
            name="ownerPhone"
            type="tel"
            value={form.ownerPhone}
            onChange={(e) => updateField('ownerPhone', e.target.value)}
            placeholder="+91 98765 43210"
          />

          <FormInput
            label="Password"
            name="password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => updateField('password', e.target.value)}
            helper="At least 8 characters"
          />

          <FormInput
            label="Confirm password"
            name="confirmPassword"
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => updateField('confirmPassword', e.target.value)}
          />

          <label className="flex items-start gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.termsAccepted}
              onChange={(e) => updateField('termsAccepted', e.target.checked)}
            />
            <span>
              I agree to the{' '}
              <Link to="/terms-of-use" className="text-brand underline" target="_blank">
                terms of service
              </Link>
            </span>
          </label>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting || slugStatus.available === false || slugStatus.checking}
            className="w-full"
          >
            Create workspace
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
