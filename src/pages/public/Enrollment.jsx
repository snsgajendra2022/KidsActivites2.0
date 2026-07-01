import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { getEmptyForm, saveDraft, submitApplication } from '../../services/enrollmentService.js';
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
import { ConfirmModal } from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { getEnrollmentSteps, validateDynamicStep } from '../../utils/enrollmentFormUtils.js';
import { DEFAULT_ENROLLMENT_FORM } from '../../data/defaultEnrollmentFormConfig.js';
import '../../styles/enrollment-form.css';
import { enrollmentThemeToCssVars } from '../../constants/enrollmentTheme.js';

export default function Enrollment() {
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const { toast } = useToast();
  const { portalName, school, enrollmentTheme, enrollmentForm, loading: configLoading } = usePortalConfig();
  const enrollCssVars = enrollmentThemeToCssVars(enrollmentTheme);
  const formConfig = enrollmentForm?.steps?.length ? enrollmentForm : DEFAULT_ENROLLMENT_FORM;
  const steps = useMemo(() => getEnrollmentSteps(formConfig), [formConfig]);
  const totalSteps = steps.length;
  const currentStep = steps[step - 1];
  const formInitialized = useRef(false);

  const [form, setForm] = useState(() => getEmptyForm(formConfig));

  useEffect(() => {
    if (!configLoading && formConfig?.steps?.length && !formInitialized.current) {
      setForm(getEmptyForm(formConfig));
      formInitialized.current = true;
    }
  }, [configLoading, formConfig]);

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

  const handleSaveDraft = async () => {
    setLoading(true);
    try {
      const saved = await saveDraft(form, draftId);
      setDraftId(saved.id);
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
      const result = await submitApplication(form, draftId);
      setSubmitted(result);
      setShowSubmitModal(false);
      toast('Enrollment form submitted successfully.', 'success');
    } catch {
      toast('Please complete all required fields before submitting.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const next = () => { if (validateStep()) setStep((s) => Math.min(s + 1, totalSteps)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));

  const showNotesSidebar = Boolean(
    currentStep?.notes
    && ['form', 'documents', 'declaration'].includes(currentStep?.stepType),
  );

  if (submitted) {
    return (
      <div className="enrollment-form-viewport" style={enrollCssVars}>
        <NetworkBanner />
        <div className="enrollment-form-wrap flex items-center">
          <div className="enrollment-success-card">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">✓</div>
            <h1 className="mb-2 text-2xl font-black uppercase text-[#1B2E4B]">Application Submitted</h1>
            <p className="mb-6 text-sm text-gray-600">
              Your enrollment application has been sent to the school admin for verification.
            </p>
            <div className="mb-6 border border-gray-200 bg-gray-50 p-4 text-left text-sm">
              <div className="mb-2"><strong>Application Number:</strong> {submitted.applicationNo}</div>
              <div className="mb-2"><strong>Student:</strong> {submitted.student?.fullName}</div>
              <StatusBadge variant="success">{submitted.status}</StatusBadge>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/" className="enrollment-btn enrollment-btn--outline">Back to Home</Link>
              <Link to="/login" className="enrollment-btn enrollment-btn--primary">Login to Track Status</Link>
            </div>
          </div>
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
    <div className="enrollment-form-viewport" style={enrollCssVars}>
      <NetworkBanner />

      <div className="enrollment-form-wrap">
        <div className="enrollment-page-container">
          <EnrollmentFormHeader portalName={portalName} school={school} />

          <main className="enrollment-form-main">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Link to="/" className="text-[11px] font-bold uppercase tracking-wider text-gray-500 hover:text-[#1B2E4B]">
                ← Back to Home
              </Link>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={loading}
                className="enrollment-btn enrollment-btn--outline !py-2 !px-4 !text-[10px]"
              >
                Save Draft
              </button>
            </div>

            <EnrollmentFormStepper currentStep={step} total={totalSteps} />
            <EnrollmentSectionHeader step={step} title={currentStep?.title || 'Enrollment'} />

            <div className={`enrollment-step-grid ${showNotesSidebar ? 'enrollment-step-grid--with-notes' : ''}`}>
              <div className="enrollment-form-fields">
                {renderStepContent()}
              </div>

              {showNotesSidebar && (
                <EnrollmentNotesPanel>{currentStep.notes}</EnrollmentNotesPanel>
              )}
            </div>

            <div className="enrollment-form-actions">
              <div className="enrollment-form-actions__left">
                {step > 1 && (
                  <button type="button" onClick={back} className="enrollment-btn enrollment-btn--outline">
                    Back
                  </button>
                )}
                <button type="button" onClick={handleSaveDraft} disabled={loading} className="enrollment-btn enrollment-btn--outline">
                  Save Draft
                </button>
              </div>

              {step < totalSteps ? (
                <button type="button" onClick={next} className="enrollment-btn enrollment-btn--primary">
                  Continue →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { if (validateStep()) setShowSubmitModal(true); }}
                  className="enrollment-btn enrollment-btn--accent"
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
