import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import PortalPublicLayout from '../../components/layout/PortalPublicLayout.jsx';
import FormInput from '../../components/ui/FormInput.jsx';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  checkWorkspaceSlug,
  createWorkspaceRequest,
  slugifyName,
} from '../../services/workspaceService.js';
import { ApiError } from '../../services/api/client.js';
import {
  validateWorkspaceField,
  validateWorkspaceForm,
  WORKSPACE_FIELD_LABELS,
} from '../../schemas/workspaceSchema.js';

const INITIAL_FORM = {
  workspaceName: '',
  slug: '',
  adminName: '',
  adminEmail: '',
};

const ALL_FIELDS = Object.keys(INITIAL_FORM);

function emptyTouched() {
  return Object.fromEntries(ALL_FIELDS.map((key) => [key, false]));
}

export default function WorkspaceNew() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [touched, setTouched] = useState(emptyTouched);
  const [slugStatus, setSlugStatus] = useState({ checking: false, available: null, reason: '' });
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setFieldError = (field, message) => {
    setFieldErrors((prev) => {
      if (!message) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return { ...prev, [field]: message };
    });
  };

  const validateAndSetField = (field, value) => {
    const message = validateWorkspaceField(field, value);
    setFieldError(field, message);
    return !message;
  };

  const updateField = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'workspaceName' && !slugTouched) {
        next.slug = slugifyName(value);
      }
      return next;
    });

    if (touched[field]) {
      validateAndSetField(field, value);
    }

    if (field === 'workspaceName' && !slugTouched && touched.slug) {
      const slugValue = slugifyName(value);
      validateAndSetField('slug', slugValue);
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateAndSetField(field, form[field]);
  };

  const runSlugCheck = useCallback(async (slug) => {
    const normalized = slugifyName(slug);
    const slugValidationError = validateWorkspaceField('slug', normalized);
    if (slugValidationError) {
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

  const slugAvailabilityError = touched.slug
    && !fieldErrors.slug
    && slugStatus.available === false
    ? (slugStatus.reason || `${WORKSPACE_FIELD_LABELS.slug} is not available.`)
    : '';

  const slugFieldError = fieldErrors.slug || slugAvailabilityError;

  const slugHelper = fieldErrors.slug
    ? undefined
    : slugStatus.checking
      ? 'Checking availability…'
      : slugStatus.available === true
        ? 'Slug is available'
        : slugStatus.available === false
          ? slugStatus.reason || 'Slug is not available'
          : 'Lowercase letters, numbers, and hyphens only';

  async function handleSubmit(e) {
    e.preventDefault();

    const validation = validateWorkspaceForm(form);
    setTouched(Object.fromEntries(ALL_FIELDS.map((key) => [key, true])));
    setFieldErrors(validation.errors);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || 'Please fix the highlighted fields.');
      return;
    }

    if (slugStatus.checking) {
      toast.error(`Please wait while we check ${WORKSPACE_FIELD_LABELS.slug.toLowerCase()} availability.`);
      return;
    }

    if (slugStatus.available !== true) {
      const message = slugAvailabilityError
        || `${WORKSPACE_FIELD_LABELS.slug} must be available before you can continue.`;
      setFieldError('slug', message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      await createWorkspaceRequest(validation.data);
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to submit workspace request');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <PortalPublicLayout>
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
          <div className="portal-public-success-icon mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <Check size={32} />
          </div>
          <h1 className="portal-public-title font-display mb-3 text-3xl font-bold">Check your email</h1>
          <p className="mb-2 text-muted">
            We sent a confirmation link to <strong>{form.adminEmail}</strong>.
          </p>
          <p className="mb-8 text-sm text-muted">
            Click the link to provision your workspace <strong>{form.slug}</strong>. The link expires in 48 hours.
          </p>
          <Link to="/" className="portal-public-btn portal-public-btn--secondary inline-flex items-center gap-2">
            <ArrowLeft size={16} /> Back to home
          </Link>
        </div>
      </PortalPublicLayout>
    );
  }

  return (
    <PortalPublicLayout maxWidth="max-w-xl">
      <div className="mx-auto max-w-xl px-4 py-12 md:py-16">
        <Link to="/" className="portal-public-back mb-8 inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft size={16} /> Back
        </Link>

        <h1 className="portal-public-title font-display mb-2 text-3xl font-bold">Create your workspace</h1>
        <p className="mb-8 text-muted">
          Set up a dedicated Kids Activities environment for your school. We&apos;ll email you a confirmation link before
          provisioning.
        </p>

        <form onSubmit={handleSubmit} noValidate className="portal-public-card sb-card space-y-5 p-6 md:p-8">
          <FormInput
            label={WORKSPACE_FIELD_LABELS.workspaceName}
            name="workspaceName"
            required
            value={form.workspaceName}
            onChange={(e) => updateField('workspaceName', e.target.value)}
            onBlur={() => handleBlur('workspaceName')}
            error={touched.workspaceName ? fieldErrors.workspaceName : undefined}
            placeholder="Green Valley International School"
          />

          <div>
            <FormInput
              label={WORKSPACE_FIELD_LABELS.slug}
              name="slug"
              required
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                updateField('slug', slugifyName(e.target.value));
              }}
              onBlur={() => handleBlur('slug')}
              placeholder="green-valley"
              helper={slugHelper}
              error={touched.slug ? slugFieldError : undefined}
            />
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              {slugStatus.checking && <Loader2 size={12} className="animate-spin" />}
              {slugStatus.available === true && !slugStatus.checking && !slugFieldError && (
                <span className="flex items-center gap-1 text-emerald-600">
                  <Check size={12} /> Available
                </span>
              )}
              {slugStatus.available === false && !slugStatus.checking && !fieldErrors.slug && (
                <span className="flex items-center gap-1 text-rose-600">
                  <X size={12} /> Unavailable
                </span>
              )}
            </div>
          </div>

          <FormInput
            label={WORKSPACE_FIELD_LABELS.adminName}
            name="adminName"
            required
            value={form.adminName}
            onChange={(e) => updateField('adminName', e.target.value)}
            onBlur={() => handleBlur('adminName')}
            error={touched.adminName ? fieldErrors.adminName : undefined}
            placeholder="Jane Smith"
          />

          <FormInput
            label={WORKSPACE_FIELD_LABELS.adminEmail}
            name="adminEmail"
            type="email"
            required
            value={form.adminEmail}
            onChange={(e) => updateField('adminEmail', e.target.value)}
            onBlur={() => handleBlur('adminEmail')}
            error={touched.adminEmail ? fieldErrors.adminEmail : undefined}
            placeholder="admin@school.edu"
            helper={touched.adminEmail && fieldErrors.adminEmail ? undefined : "We'll send the confirmation link to this address"}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={submitting}
            disabled={submitting || slugStatus.checking}
            className="w-full"
          >
            Request workspace
          </Button>
        </form>
      </div>
    </PortalPublicLayout>
  );
}
