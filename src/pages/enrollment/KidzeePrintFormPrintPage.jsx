import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import KidzeePrintableForm from './KidzeePrintableForm.jsx';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { getPrintApplication } from '../../services/enrollmentService.js';
import {
  KIDZEE_BRANDING,
  getEmptyKidzeeFormData,
  mapApplicationToKidzeeForm,
} from './kidzeePrintFields.js';
import {
  getEnrollmentDocumentFields,
  getCorrectionRequestedDocuments,
  getCorrectionRequestNote,
} from '../../utils/enrollmentDocumentFields.js';

/**
 * Read-only Kidzee form view for headless PDF capture (Playwright).
 * Loaded via short-lived print token — no nav, toolbar, or auth required.
 */
export default function KidzeePrintFormPrintPage() {
  const { branding: portalBranding, enrollmentForm } = usePortalConfig();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const branding = useMemo(() => ({
    ...KIDZEE_BRANDING,
    logoUrl: portalBranding?.logoUrl || KIDZEE_BRANDING.logoUrl,
  }), [portalBranding?.logoUrl]);

  const documentFieldLabels = useMemo(() => {
    const map = {};
    getEnrollmentDocumentFields(enrollmentForm).forEach((f) => { map[f.key] = f.label; });
    return map;
  }, [enrollmentForm]);

  const emptyForm = useMemo(() => getEmptyKidzeeFormData(branding), [branding]);
  const [loadState, setLoadState] = useState(() => ({
    loading: Boolean(token),
    initialData: null,
    applicationId: null,
    loadError: token ? null : 'No print token was provided.',
    applicationStatus: null,
    correctionNote: '',
    requestedDocuments: [],
  }));

  useEffect(() => {
    if (!token) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const app = await getPrintApplication(token);
        if (cancelled) return;
        if (!app) {
          setLoadState({
            loading: false,
            initialData: null,
            applicationId: null,
            loadError: 'Application not found or print link expired.',
            applicationStatus: null,
            correctionNote: '',
            requestedDocuments: [],
          });
          return;
        }
        setLoadState({
          loading: false,
          initialData: mapApplicationToKidzeeForm(app, branding),
          applicationId: app.id,
          loadError: null,
          applicationStatus: app.status,
          correctionNote: getCorrectionRequestNote(app),
          requestedDocuments: getCorrectionRequestedDocuments(app),
        });
      } catch {
        if (!cancelled) {
          setLoadState({
            loading: false,
            initialData: null,
            applicationId: null,
            loadError: 'Could not load this form. The print link may have expired.',
            applicationStatus: null,
            correctionNote: '',
            requestedDocuments: [],
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token, branding]);

  useEffect(() => {
    if (loadState.loading || loadState.loadError || !loadState.initialData) {
      document.body.removeAttribute('data-pdf-ready');
      return undefined;
    }

    let cancelled = false;
    const TOTAL_PRINT_PAGES = 5;

    const markReady = () => {
      if (cancelled) return;
      const pages = document.querySelectorAll('.kidzee-print-pages .print-page');
      if (pages.length < TOTAL_PRINT_PAGES) return;
      document.body.setAttribute('data-pdf-ready', 'true');
    };

    // Force every page to paint (content-visibility:auto skips off-screen pages).
    const forcePaintAllPages = () => {
      document.querySelectorAll('.kidzee-print-pages .print-page').forEach((page) => {
        page.scrollIntoView({ block: 'start' });
      });
      window.scrollTo(0, 0);
    };

    forcePaintAllPages();
    requestAnimationFrame(() => {
      forcePaintAllPages();
      requestAnimationFrame(markReady);
    });
    const fallback = setTimeout(() => {
      forcePaintAllPages();
      markReady();
    }, 5000);

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      document.body.removeAttribute('data-pdf-ready');
    };
  }, [loadState.loading, loadState.loadError, loadState.initialData, loadState.applicationId]);

  if (loadState.loading || (!loadState.initialData && !loadState.loadError)) {
    return (
      <div className="kidzee-print-page">
        <p style={{ padding: '2rem', textAlign: 'center' }}>Preparing form for PDF…</p>
      </div>
    );
  }

  if (loadState.loadError || !loadState.initialData) {
    return (
      <div className="kidzee-print-page">
        <p style={{ padding: '2rem', textAlign: 'center', color: '#b45309' }}>
          {loadState.loadError || 'Unable to render form.'}
        </p>
      </div>
    );
  }

  return (
    <div className="kidzee-print-page kidzee-print-page--pdf">
      <KidzeePrintableForm
        key={loadState.applicationId || 'print'}
        initialData={loadState.initialData}
        readOnly
        branding={branding}
        applicationId={loadState.applicationId}
        printOnly
        applicationStatus={loadState.applicationStatus}
        correctionNote={loadState.correctionNote}
        requestedDocuments={loadState.requestedDocuments}
        documentFieldLabels={documentFieldLabels}
      />
    </div>
  );
}
