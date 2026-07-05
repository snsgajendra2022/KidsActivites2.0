import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Lock, ArrowLeft,
} from 'lucide-react';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getEmptyForm, saveDraft, submitApplication, getAdmissionsStatus } from '../../services/enrollmentService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { useUploadStore } from '../../store/uploadStore.js';
import {
  EnrollmentFormHeader,
  EnrollmentSectionHeader,
  EnrollmentNotesPanel,
  EnrollmentFormStepper,
} from '../../components/enrollment/EnrollmentFormLayout.jsx';
import {
  DynamicFormStepFields,
  DynamicDocumentStepFields,
  DynamicDeclarationStep,
  DynamicReviewStep,
} from '../../components/enrollment/DynamicEnrollmentFields.jsx';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';
import CinematicHero from '../../components/public/CinematicHero.jsx';
import JourneyNav from '../../components/public/JourneyNav.jsx';
import PremiumCard from '../../components/ui/PremiumCard.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { getEnrollmentSteps, validateDynamicStep } from '../../utils/enrollmentFormUtils.js';
import { DEFAULT_ENROLLMENT_FORM } from '../../data/defaultEnrollmentFormConfig.js';
import { DEFAULT_PORTAL_CONFIG } from '../../data/defaultPortalConfig.js';
import '../../styles/enrollment-form.css';
import { enrollmentThemeToCssVars } from '../../constants/enrollmentTheme.js';

const SCHOOL_NAME_FIELD_KEYS = new Set(['schoolName', 'applyingSchool', 'preferredSchool']);

const ENROLLMENT_JOURNEY = [
  { label: 'Start' },
  { label: 'Family' },
  { label: 'Child' },
  { label: 'Documents' },
  { label: 'Submit' },
];

function resolveJourneyIndex(stepConfig, stepNum) {
  if (!stepConfig || stepNum <= 1) return 0;
  const type = stepConfig.stepType;
  if (type === 'documents') return 3;
  if (type === 'declaration' || type === 'review') return 4;
  if (stepConfig.sectionKey === 'parent') return 1;
  return 2;
}

function applySchoolNameDefaults(emptyForm, formConfig, schoolName) {
  if (!schoolName?.trim()) return emptyForm;
  const next = { ...emptyForm };
  getEnrollmentSteps(formConfig).forEach((step) => {
    if (step.stepType !== 'form' || !step.sectionKey) return;
    const section = { ...(next[step.sectionKey] || {}) };
    let changed = false;
    (step.fields || []).forEach((field) => {
      if (SCHOOL_NAME_FIELD_KEYS.has(field.key) && !section[field.key]) {
        section[field.key] = schoolName;
        changed = true;
      }
    });
    if (changed) next[step.sectionKey] = section;
  });
  return next;
}

export default function Enrollment() {
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [admissions, setAdmissions] = useState({ admissionsOpen: true });
  const [draftSavedAt, setDraftSavedAt] = useState(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { portalName, school, branding, enrollmentTheme, enrollmentForm, loading: configLoading, activeSchoolId } = usePortalConfig();
  const heroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;
  const enrollCssVars = enrollmentThemeToCssVars(enrollmentTheme);
  const formConfig = enrollmentForm?.steps?.length ? enrollmentForm : DEFAULT_ENROLLMENT_FORM;
  const steps = useMemo(() => getEnrollmentSteps(formConfig), [formConfig]);
  const totalSteps = steps.length;
  const currentStep = steps[step - 1];
  const journeyIndex = resolveJourneyIndex(currentStep, step);
  const formInitialized = useRef(false);

  const [form, setForm] = useState(() => getEmptyForm(formConfig));

  useEffect(() => {
    if (!configLoading && formConfig?.steps?.length && !formInitialized.current) {
      const empty = applySchoolNameDefaults(getEmptyForm(formConfig), formConfig, school?.name);
      setForm(empty);
      formInitialized.current = true;
    }
  }, [configLoading, formConfig, school?.name]);

  useEffect(() => {
    getAdmissionsStatus()
      .then(setAdmissions)
      .catch(() => setAdmissions({ admissionsOpen: true }));
  }, []);

  const update = (section, field, value) => {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    setErrors((prev) => ({ ...prev, [`${section}.${field}`]: '', [`documents.${field}`]: '' }));
  };

  const updateDoc = (key, data) => {
    setForm((prev) => ({
      ...prev,
      documents: { ...prev.documents, [key]: data ? { ...data, status: 'uploaded' } : null },
    }));
    setErrors((prev) => ({ ...prev, [`documents.${key}`]: '' }));
  };

  const validateStep = () => {
    const { success, errors: stepErrors } = validateDynamicStep(step, form, formConfig);

    if (currentStep?.stepType === 'documents' && useUploadStore.getState().hasIncompleteUploads()) {
      toast('Some files are still uploading. Please wait before continuing.', 'warning');
      return false;
    }

    setErrors(stepErrors);
    if (!success) {
      toast('Please complete all required fields before continuing.', 'warning');
      return false;
    }
    return true;
  };

  const enrollmentMeta = {
    parentId: user?.role === 'parent' ? user.id : null,
    schoolId: activeSchoolId || user?.schoolId || null,
  };

  const ensureDraft = async () => {
    if (draftId) return draftId;
    const saved = await saveDraft(form, null, enrollmentMeta);
    setDraftId(saved.id);
    return saved.id;
  };

  useEffect(() => {
    if (currentStep?.stepType !== 'documents' || draftId || loading) return;
    ensureDraft().catch(() => {
      toast('Unable to prepare document upload. Please save draft and try again.', 'warning');
    });
  }, [currentStep?.stepType, draftId, loading]);

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const saved = await saveDraft(form, draftId, enrollmentMeta);
      setDraftId(saved.id);
      setDraftSavedAt(Date.now());
      toast('Application saved successfully.', 'success');
    } catch {
      toast('Unable to save draft. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const appId = draftId || await ensureDraft();
      const result = await submitApplication(
        form,
        appId,
        user?.role === 'parent' ? user.id : null,
        activeSchoolId || user?.schoolId || null,
      );
      setSubmitted(result);
      setShowSubmitModal(false);
      toast('Enrollment form submitted successfully.', 'success');
    } catch {
      toast('Please complete all required fields before submitting.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const next = async () => {
    if (!validateStep()) return;
    const nextStep = Math.min(step + 1, totalSteps);
    if (!draftId && nextStep > 1) {
      try {
        const saved = await saveDraft(form, draftId, enrollmentMeta);
        setDraftId(saved.id);
        setDraftSavedAt(Date.now());
      } catch {
        // Continue — submit will persist full form
      }
    }
    setStep(nextStep);
  };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const showNotesSidebar = Boolean(
    currentStep?.notes
    && ['form', 'documents', 'declaration'].includes(currentStep?.stepType),
  );

  if (!admissions.admissionsOpen) {
    return (
      <div className="enrollment-form-viewport enrollment-form-viewport--premium enrollment-form-viewport--editorial" style={enrollCssVars}>
        <NetworkBanner />
        <CinematicHero
          compact
          imageUrl={heroImage}
          badge="Admissions Closed"
          title="Enrollment Unavailable"
          subtitle={`${school?.name || portalName} is not accepting new applications at this time.`}
        />
        <div className="enrollment-form-shell">
          <PremiumCard className="enrollment-closed-card mx-auto max-w-lg text-center" goldAccent>
            <EmptyState
              icon={Lock}
              title="Admissions Currently Closed"
              description={(
                <>
                  This school is not accepting new enrollment applications right now.
                  {admissions.enrollmentDeadline ? ` The deadline was ${admissions.enrollmentDeadline}.` : ''}
                </>
              )}
              action={(
                <Link to="/" className="sb-button-primary sb-btn-pill mt-4 inline-flex">
                  Back to Home
                </Link>
              )}
            />
          </PremiumCard>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="enrollment-form-viewport enrollment-form-viewport--premium enrollment-form-viewport--editorial" style={enrollCssVars}>
        <NetworkBanner />
        <div className="enrollment-form-wrap flex items-center">
          <PremiumCard className="enrollment-success-card" elevated goldAccent>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--sb-forest)_12%,white)] text-2xl text-[var(--sb-forest)]">✓</div>
            <h1 className="mb-2 font-display text-2xl font-bold text-brand">Application Submitted</h1>
            <p className="mb-6 text-sm text-muted">
              Your enrollment application has been sent to the school admin for verification.
            </p>
            <div className="mb-6 rounded-lg border border-[var(--sb-border)] bg-[var(--sb-cream)] p-4 text-left text-sm">
              <div className="mb-2"><strong>Application Number:</strong> {submitted.applicationNo}</div>
              <div className="mb-2"><strong>Student:</strong> {submitted.student?.fullName}</div>
              <StatusBadge variant="success">{submitted.status}</StatusBadge>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="sb-button-secondary">Back to Home</Link>
              <Link to={user?.role === 'parent' ? '/parent/dashboard' : '/login'} className="sb-button-primary">
                {user?.role === 'parent' ? 'Go to Parent Dashboard' : 'Login to Track Status'}
              </Link>
            </div>
          </PremiumCard>
        </div>
      </div>
    );
  }

  const renderStepContent = () => {
    if (!currentStep) return null;

    switch (currentStep.stepType) {
      case 'form':
        return (
          <DynamicFormStepFields
            step={currentStep}
            form={form}
            errors={errors}
            update={update}
          />
        );
      case 'documents':
        return (
          <DynamicDocumentStepFields
            step={currentStep}
            form={form}
            errors={errors}
            updateDoc={updateDoc}
            applicationId={draftId}
            schoolId={enrollmentMeta.schoolId}
          />
        );
      case 'declaration':
        return (
          <DynamicDeclarationStep
            step={currentStep}
            form={form}
            errors={errors}
            update={update}
          />
        );
      case 'review':
        return <DynamicReviewStep form={form} config={formConfig} />;
      default:
        return null;
    }
  };

  return (
    <div className="enrollment-form-viewport enrollment-form-viewport--premium enrollment-form-viewport--editorial" style={enrollCssVars}>
      <NetworkBanner />

      <CinematicHero
        compact
        imageUrl={heroImage}
        badge={school?.academicYear ? `Admissions ${school.academicYear}` : 'Online Admissions'}
        title="Student Enrollment"
        subtitle={`Apply to ${school?.name || portalName}. Your progress is saved automatically as you complete each step.`}
      />

      <JourneyNav
        steps={ENROLLMENT_JOURNEY}
        activeIndex={journeyIndex}
        compact
      />

      <div className="enrollment-form-wrap">
        <div className="enrollment-page-container">
          <EnrollmentFormHeader portalName={portalName} school={school} />

          <main className="enrollment-form-main">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Link to="/" className="enrollment-back-link inline-flex items-center gap-1">
                <ArrowLeft size={14} />
                Back to Home
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                {(draftId || draftSavedAt) && (
                  <span className="enrollment-draft-badge" title="Your application draft is stored securely">
                    {loading ? 'Saving draft…' : 'Draft saved'}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={loading}
                  className="sb-button-secondary enrollment-save-draft-btn"
                >
                  Save Draft
                </button>
              </div>
            </div>

            <EnrollmentFormStepper currentStep={step} total={totalSteps} />
            <EnrollmentSectionHeader step={step} title={currentStep?.title || 'Enrollment'} />

            <div className={`enrollment-step-grid ${showNotesSidebar ? 'enrollment-step-grid--with-notes' : ''}`}>
              <PremiumCard className="enrollment-form-section-card" goldAccent>
                <div className="enrollment-form-fields">
                  {renderStepContent()}
                </div>
              </PremiumCard>

              {showNotesSidebar && (
                <EnrollmentNotesPanel>{currentStep.notes}</EnrollmentNotesPanel>
              )}
            </div>

            <div className="enrollment-form-actions">
              <div className="enrollment-form-actions__left">
                {step > 1 && (
                  <button type="button" onClick={back} className="sb-button-secondary">
                    Back
                  </button>
                )}
                <button type="button" onClick={handleSaveDraft} disabled={loading} className="sb-button-secondary">
                  Save Draft
                </button>
              </div>

              {step < totalSteps ? (
                <button type="button" onClick={next} className="sb-button-primary">
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (validateStep()) setShowSubmitModal(true); }}
                  className="sb-button-gold"
                >
                  Submit Application
                </button>
              )}
            </div>
          </main>
        </div>
      </div>

      <ConfirmModal
        open={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={handleSubmit}
        title="Submit Enrollment Application?"
        message="Please review all details carefully. Once submitted, the application will be sent to the school admin for verification."
        confirmText="Submit Application"
        loading={loading}
      />
    </div>
  );
}
