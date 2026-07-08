import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
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
import { ApiError } from '../../services/api/client.js';

export default function EnrollmentCorrectionPage() {
  const { token } = useParams();
  const { branding: portalBranding } = usePortalConfig();

  const branding = useMemo(() => ({
    ...KIDZEE_BRANDING,
    logoUrl: portalBranding?.logoUrl || KIDZEE_BRANDING.logoUrl,
  }), [portalBranding?.logoUrl]);

  const emptyForm = useMemo(() => getEmptyKidzeeFormData(branding), [branding]);
  const [loadState, setLoadState] = useState({
    loading: true,
    initialData: null,
    applicationId: null,
    loadError: null,
    submitted: false,
  });

  useEffect(() => {
    if (!token) {
      setLoadState({
        loading: false,
        initialData: null,
        applicationId: null,
        loadError: 'No correction link was provided.',
        submitted: false,
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
            loadError: 'Application not found for this correction link.',
            submitted: false,
          });
          return;
        }
        setLoadState({
          loading: false,
          initialData: mapApplicationToKidzeeForm(app, branding),
          applicationId: app.id,
          loadError: null,
          submitted: false,
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
          loadError: message,
          submitted: false,
        });
      }
    })();

    return () => { cancelled = true; };
  }, [token, branding]);

  const handleSubmitted = () => {
    setLoadState((prev) => ({ ...prev, submitted: true }));
  };

  if (loadState.loading) {
    return (
      <div className="kidzee-print-page">
        <NetworkBanner />
        <p className="no-print" style={{ padding: '2rem', textAlign: 'center' }}>
          Loading your enrollment form…
        </p>
      </div>
    );
  }

  if (loadState.loadError) {
    return (
      <div className="kidzee-print-page">
        <NetworkBanner />
        <div className="no-print" style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
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
        <div className="no-print" style={{ padding: '3rem 1.5rem', textAlign: 'center', maxWidth: 480, margin: '0 auto' }}>
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

  return (
    <div className="kidzee-print-page">
      <NetworkBanner />
      <div className="no-print" style={{ padding: '1rem 1rem 0', textAlign: 'center' }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
          Please review the requested corrections, update your form, and resubmit.
        </p>
      </div>
      <KidzeePrintableForm
        key={loadState.applicationId || token}
        initialData={loadState.initialData || emptyForm}
        readOnly={false}
        isAdmin={false}
        branding={branding}
        applicationId={loadState.applicationId}
        onSubmitted={handleSubmitted}
        correctionToken={token}
        onSaveDraft={async (payload) => saveCorrectionDraft(token, payload)}
        onSubmitApplication={async (payload) => submitCorrectionApplication(token, payload)}
      />
    </div>
  );
}
