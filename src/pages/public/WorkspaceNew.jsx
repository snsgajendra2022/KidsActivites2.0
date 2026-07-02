import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import PublicLayout from '../../components/layout/PublicLayout.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  checkWorkspaceSlug,
  createWorkspaceRequest,
  slugifyName,
} from '../../services/workspaceService.js';
import { ApiError } from '../../services/api/client.js';

export default function WorkspaceNew() {
  const toast = useToast();
  const [form, setForm] = useState({
    workspaceName: '',
    slug: '',
    adminName: '',
    adminEmail: '',
  });
  const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, reason: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'workspaceName' && !slugTouched) {
        next.slug = slugifyName(value);
      }
      return next;
    });
  };

  const runSlugCheck = useCallback(async (slug) => {
    const normalized = slugifyName(slug);
    if (!normalized || normalized.length < 3) {
      setSlugStatus({ checking: false, available: null, reason: '' });
      return;
    }
    setSlugStatus((s) => ({ ...s, checking: true }));
    try {
      const result = await checkWorkspaceSlug(normalized);
      setSlugStatus({
        checking: false,
        available: result.available,
        reason: result.reason || '',
      });
    } catch {
      setSlugStatus({ checking: false, available: null, reason: '' });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSlugCheck(form.slug), 400);
    return () => clearTimeout(timer);
  }, [form.slug, runSlugCheck]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createWorkspaceRequest({
        workspaceName: form.workspaceName.trim(),
        slug: form.slug.trim(),
        adminName: form.adminName.trim(),
        adminEmail: form.adminEmail.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit workspace request');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <PublicLayout className="!sb-surface">
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check size={32} />
          </div>
          <h1 className="font-display mb-3 text-3xl font-bold text-brand">Check your email</h1>
          <p className="mb-2 text-muted">
            We sent a confirmation link to <strong>{form.adminEmail}</strong>.
          </p>
          <p className="mb-8 text-sm text-muted">
            Click the link to provision your workspace <strong>{form.slug}</strong>. The link expires in 48 hours.
          </p>
          <Link to="/" className="premium-btn premium-btn-secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>
      </PublicLayout>
    );
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

        <h1 className="font-display mb-2 text-3xl font-bold text-brand">Create your workspace</h1>
        <p className="mb-8 text-muted">
          Set up a dedicated SchoolBridge environment for your school. We&apos;ll email you a confirmation link before
          provisioning.
        </p>

        <form onSubmit={handleSubmit} className="sb-card space-y-5 p-6 md:p-8">
          <FormInput
            label="Workspace name"
            name="workspaceName"
            required
            value={form.workspaceName}
            onChange={(e) => updateField('workspaceName', e.target.value)}
            placeholder="Green Valley International School"
          />

          <div>
            <FormInput
              label="Workspace slug"
              name="slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                updateField('slug', e.target.value);
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
          </div>

          <FormInput
            label="Admin name"
            name="adminName"
            required
            value={form.adminName}
            onChange={(e) => updateField('adminName', e.target.value)}
            placeholder="Jane Smith"
          />

          <FormInput
            label="Admin email"
            name="adminEmail"
            type="email"
            required
            value={form.adminEmail}
            onChange={(e) => updateField('adminEmail', e.target.value)}
            placeholder="admin@school.edu"
            helper="We'll send the confirmation link to this address"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting || slugStatus.available === false || slugStatus.checking}
            className="w-full"
          >
            Request workspace
          </Button>
        </form>
      </div>
    </PublicLayout>
  );
}
