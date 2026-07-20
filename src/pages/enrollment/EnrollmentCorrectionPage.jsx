import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle, FileUp, FormInput } from 'lucide-react';
import KidzeePrintableForm from './KidzeePrintableForm.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import {
  getCorrectionApplication,
  saveCorrectionDraft,
  submitCorrectionApplication,
} from '../../services/enrollmentService.js';
import {
  KIDZEE_BRANDING,
  getEmptyKidzeeFormData,
  mapApplicationToKidzeeForm,
} from './kidzeePrintFields.js';
import NetworkBanner from '../../components/layout/NetworkBanner.jsx';
import SmartFileUpload from '../../components/upload/SmartFileUpload.jsx';
import Button from '../../components/ui/Button.jsx';
import { ApiError } from '../../services/api/client.js';
import {
  getEnrollmentDocumentFields,
  getCorrectionRequestedDocuments,
  getCorrectionRequestNote,
  mergeFormPhotosIntoDocuments,
} from '../../utils/enrollmentDocumentFields.js';
import '../../styles/enrollment-correction.css';

function CorrectionRequestBanner({ note, documentLabels }) {
  if (!note && (!documentLabels || documentLabels.length === 0)) return null;
  return (
    <section className="no-print enrollment-correction-banner">
      <h2 className="enrollment-correction-banner__title">
        Correction requested by school
      </h2>
      {note && (
        <p className="enrollment-correction-banner__note">{note}</p>
      )}
      {documentLabels?.length > 0 && (
        <>
          <p className="enrollment-correction-banner__list-label">
            Documents to upload / update
          </p>
          <ul className="enrollment-correction-banner__list">
            {documentLabels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function CorrectionDocumentsPanel({
  fields,
  documents,
  applicationId,
  onDocumentChange,
}) {
  if (!fields.length) return null;

  return (
    <section className="no-print enrollment-correction-docs">
      <h2 className="enrollment-correction-docs__title">Upload / update documents</h2>
      <p className="enrollment-correction-docs__lead">
        Your previously uploaded file appears below when available. Replace any rejected or missing
        document, then resubmit.
      </p>

      {fields.map((field) => {
        const doc = documents?.[field.key] || null;
        const isRejected = doc?.status === 'rejected';
        const hasFile = Boolean(
          doc?.fileKey || doc?.previewUrl || doc?.dataUrl || doc?.downloadUrl || doc?.name,
        );
        return (
          <div
            key={field.key}
            id={`doc-reject-${field.key}`}
            className={`enrollment-correction-doc${isRejected ? ' is-rejected' : ''}${!hasFile ? ' is-missing' : ''}`}
            style={{
              padding: '0.85rem',
              borderRadius: 10,
              border: isRejected ? '1px solid #fca5a5' : '1px solid #e2e8f0',
              background: isRejected ? '#fef2f2' : '#fff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <strong>
                {field.label}
                <span style={{ color: '#b91c1c' }}> *</span>
              </strong>
              {isRejected && (
                <span style={{ color: '#b91c1c', fontSize: '0.8rem', fontWeight: 600 }}>Needs re-upload</span>
              )}
              {!hasFile && (
                <span style={{ color: '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>Missing</span>
              )}
              {hasFile && !isRejected && (
                <span style={{ color: '#15803d', fontSize: '0.8rem', fontWeight: 600 }}>On file</span>
              )}
            </div>
            <SmartFileUpload
              fieldKey={field.key}
              label=""
              category={field.fileCategory || (field.key.toLowerCase().includes('photo') ? 'photo' : 'document')}
              maxSizeMB={field.maxSizeMB}
              required
              value={doc}
              applicationId={applicationId}
              rejectionReason={isRejected
                ? (doc.rejectReason || 'This document was rejected. Please re-upload.')
                : null}
              onChange={(data) => onDocumentChange(
                field.key,
                data ? { ...data, status: 'uploaded', rejectReason: undefined } : null,
              )}
            />
          </div>
        );
      })}
    </section>
  );
}

function StepTabs({ step, onChange }) {
  const tabs = [
    { id: 'documents', label: '1. Documents', icon: FileUp },
    { id: 'form', label: '2. Enrollment form', icon: FormInput },
  ];
  return (
    <div className="no-print enrollment-correction-steps" role="tablist" aria-label="Correction steps">
      {tabs.map((tab) => {
        const active = step === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`enrollment-correction-step${active ? ' is-active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <Icon size={16} aria-hidden />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function EnrollmentCorrectionPage() {
  const { token } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { branding: portalBranding, enrollmentForm } = usePortalConfig();

  const step = searchParams.get('step') === 'form' ? 'form' : 'documents';
  const setStep = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'form') params.set('step', 'form');
    else params.delete('step');
    setSearchParams(params, { replace: true });
  };

  const branding = useMemo(() => ({
    ...KIDZEE_BRANDING,
    logoUrl: portalBranding?.logoUrl || KIDZEE_BRANDING.logoUrl,
  }), [portalBranding?.logoUrl]);

  const allDocumentFields = useMemo(
    () => getEnrollmentDocumentFields(enrollmentForm),
    [enrollmentForm],
  );

  const emptyForm = useMemo(() => getEmptyKidzeeFormData(branding), [branding]);
  const [loadState, setLoadState] = useState({
    loading: true,
    initialData: null,
    applicationId: null,
    applicationStatus: null,
    documents: {},
    formData: {},
    correctionNote: '',
    requestedDocumentKeys: [],
    loadError: null,
    submitted: false,
    submitting: false,
  });

  const uploadFields = useMemo(() => {
    const keys = loadState.requestedDocumentKeys;
    const byKey = new Map(allDocumentFields.map((f) => [f.key, f]));
    const resolve = (keyList) => keyList.map((key) => byKey.get(key) || {
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim(),
      required: true,
      fileCategory: key.toLowerCase().includes('photo') ? 'photo' : 'document',
    });

    if (keys.length) return resolve(keys);
    // Older correction links without correctionRequest: only required portal docs
    const required = allDocumentFields.filter((f) => f.required);
    return required.length ? required : allDocumentFields;
  }, [allDocumentFields, loadState.requestedDocumentKeys]);

  const documentLabels = uploadFields.map((f) => f.label);

  useEffect(() => {
    if (!token) {
      setLoadState({
        loading: false,
        initialData: null,
        applicationId: null,
        applicationStatus: null,
        documents: {},
        formData: {},
        correctionNote: '',
        requestedDocumentKeys: [],
        loadError: 'No correction link was provided.',
        submitted: false,
        submitting: false,
      });
      return undefined;
    }

    let cancelled = false;
    (async () => {
      try {
        const app = await getCorrectionApplication(token);
        if (cancelled) return;
        if (!app) {
          setLoadState({
            loading: false,
            initialData: null,
            applicationId: null,
            applicationStatus: null,
            documents: {},
            formData: {},
            correctionNote: '',
            requestedDocumentKeys: [],
            loadError: 'Application not found for this correction link.',
            submitted: false,
            submitting: false,
          });
          return;
        }
        const formData = app.formData || app.printableEnrollment || {};
        setLoadState({
          loading: false,
          initialData: mapApplicationToKidzeeForm(app, branding),
          applicationId: app.id,
          applicationStatus: app.status,
          documents: mergeFormPhotosIntoDocuments(app.documents || {}, formData),
          formData,
          correctionNote: getCorrectionRequestNote(app),
          requestedDocumentKeys: getCorrectionRequestedDocuments(app),
          loadError: null,
          submitted: false,
          submitting: false,
        });
      } catch (err) {
        if (cancelled) return;
        let message = 'This correction link is invalid or has expired.';
        if (err instanceof ApiError) {
          if (err.code === 'TOKEN_EXPIRED') {
            message = 'This correction link has expired. Please contact the school admissions office for a new link.';
          } else if (err.code === 'INVALID_TOKEN') {
            message = 'This correction link is invalid or has already been used.';
          }
        }
        setLoadState({
          loading: false,
          initialData: null,
          applicationId: null,
          applicationStatus: null,
          documents: {},
          formData: {},
          correctionNote: '',
          requestedDocumentKeys: [],
          loadError: message,
          submitted: false,
          submitting: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [token, branding]);

  /** Persistable docs only — form-photo previews are display-only (live in formData.photos). */
  const documentsForSave = (docs) => {
    const out = {};
    Object.entries(docs || {}).forEach(([key, doc]) => {
      if (!doc || doc.source === 'formPhoto') return;
      out[key] = doc;
    });
    return out;
  };

  const handleDocumentChange = async (fieldKey, data) => {
    const nextDocuments = { ...loadState.documents };
    if (data) {
      nextDocuments[fieldKey] = data;
    } else {
      delete nextDocuments[fieldKey];
    }
    setLoadState((prev) => ({ ...prev, documents: nextDocuments }));
    try {
      await saveCorrectionDraft(token, { documents: documentsForSave(nextDocuments) });
    } catch {
      // non-blocking
    }
  };

  const handleSubmitted = () => {
    setLoadState((prev) => ({ ...prev, submitted: true, submitting: false }));
  };

  const handleResubmitFromDocuments = async () => {
    setLoadState((prev) => ({ ...prev, submitting: true }));
    try {
      await submitCorrectionApplication(token, {
        documents: documentsForSave(loadState.documents),
        formData: loadState.formData,
        printableEnrollment: loadState.formData,
      });
      handleSubmitted();
    } catch (err) {
      setLoadState((prev) => ({ ...prev, submitting: false }));
      const message = err instanceof ApiError
        ? (err.message || 'Could not resubmit. Please try again.')
        : 'Could not resubmit. Please try again.';
      window.alert(message);
    }
  };

  if (loadState.loading) {
    return (
      <div className="kidzee-print-page">
        <NetworkBanner />
        <p className="no-print enrollment-correction-status">
          Loading your document correction page…
        </p>
      </div>
    );
  }

  if (loadState.loadError) {
    return (
      <div className="kidzee-print-page">
        <NetworkBanner />
        <div className="no-print enrollment-correction-status">
          <h2 style={{ marginBottom: '0.75rem', color: '#b45309' }}>Correction Link Unavailable</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>{loadState.loadError}</p>
        </div>
      </div>
    );
  }

  if (loadState.submitted) {
    return (
      <div className="kidzee-print-page">
        <NetworkBanner />
        <div className="no-print enrollment-correction-status">
          <CheckCircle size={48} style={{ color: '#16a34a', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '0.75rem' }}>Application Resubmitted</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6 }}>
            Thank you. Your corrected enrollment application has been resubmitted and is now under review.
            You may close this page.
          </p>
        </div>
      </div>
    );
  }

  const formStep = step === 'form';

  return (
    <div className={`kidzee-print-page${formStep ? ' kidzee-print-page--correction-form' : ''}`}>
      <NetworkBanner />
      <div className="no-print enrollment-correction-chrome">
        <h1 className="enrollment-correction-chrome__title">
          Document correction
        </h1>
        {!formStep && (
          <p className="enrollment-correction-chrome__lead">
            Step 1 is for uploading documents. Step 2 is the enrollment form if you also need to edit details.
          </p>
        )}
      </div>

      <StepTabs step={step} onChange={setStep} />
      {/* Docs-step banner only — form step uses KidzeePrintableForm's compact print banner */}
      {!formStep && (
        <CorrectionRequestBanner note={loadState.correctionNote} documentLabels={documentLabels} />
      )}

      {step === 'documents' ? (
        <>
          <CorrectionDocumentsPanel
            fields={uploadFields}
            documents={loadState.documents}
            applicationId={loadState.applicationId}
            onDocumentChange={handleDocumentChange}
          />
          <div className="no-print enrollment-correction-actions">
            <Button variant="secondary" onClick={() => setStep('form')}>
              Continue to enrollment form
            </Button>
            <Button
              variant="primary"
              loading={loadState.submitting}
              onClick={handleResubmitFromDocuments}
            >
              Resubmit application
            </Button>
          </div>
        </>
      ) : (
        <KidzeePrintableForm
          key={loadState.applicationId || token}
          initialData={loadState.initialData || emptyForm}
          readOnly={false}
          isAdmin={false}
          branding={branding}
          applicationId={loadState.applicationId}
          onSubmitted={handleSubmitted}
          correctionToken={token}
          applicationStatus={loadState.applicationStatus}
          correctionNote={loadState.correctionNote}
          requestedDocuments={loadState.requestedDocumentKeys}
          documentFieldLabels={Object.fromEntries(uploadFields.map((f) => [f.key, f.label]))}
          backLabel="Back to Documents"
          onBackClick={() => setStep('documents')}
          onSaveDraft={async (payload) => saveCorrectionDraft(token, {
            ...payload,
            documents: documentsForSave(loadState.documents),
          })}
          onSubmitApplication={async (payload) => submitCorrectionApplication(token, {
            ...payload,
            documents: documentsForSave(loadState.documents),
          })}
        />
      )}
    </div>
  );
}
