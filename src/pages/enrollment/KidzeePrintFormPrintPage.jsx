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

/**
 * Read-only Kidzee form view for headless PDF capture (Playwright).
 * Loaded via short-lived print token — no nav, toolbar, or auth required.
 */
export default function KidzeePrintFormPrintPage() {
  const { branding: portalBranding } = usePortalConfig();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const branding = useMemo(() => ({
    ...KIDZEE_BRANDING,
    logoUrl: portalBranding?.logoUrl || KIDZEE_BRANDING.logoUrl,
  }), [portalBranding?.logoUrl]);

  const emptyForm = useMemo(() => getEmptyKidzeeFormData(branding), [branding]);
  const [loadState, setLoadState] = useState(() => ({
    loading: Boolean(token),
    initialData: null,
    applicationId: null,
    loadError: token ? null : 'No print token was provided.',
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
          });
          return;
        }
        setLoadState({
          loading: false,
          initialData: mapApplicationToKidzeeForm(app, branding),
          applicationId: app.id,
          loadError: null,
        });
      } catch {
        if (!cancelled) {
          setLoadState({
            loading: false,
            initialData: null,
            applicationId: null,
            loadError: 'Could not load this form. The print link may have expired.',
          });
        }
      }
    })();

    return () => { cancelled = true; };
  }, [token, branding]);

  useEffect(() => {
    // Signal readiness once loading has finished, whether the data resolved or
    // errored. This guarantees the headless PDF capturer never waits forever —
    // an error page still produces bounded output instead of hanging.
    if (loadState.loading) return undefined;

    let cancelled = false;
    const markReady = () => {
      if (!cancelled) document.body.setAttribute('data-pdf-ready', 'true');
    };
    // Mark after paint so layout is settled...
    requestAnimationFrame(() => {
      requestAnimationFrame(markReady);
    });
    // ...but always mark within a bounded time even if a rAF never fires.
    const fallback = setTimeout(markReady, 3000);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      document.body.removeAttribute('data-pdf-ready');
    };
  }, [loadState.loading]);

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
      />
    </div>
  );
}
