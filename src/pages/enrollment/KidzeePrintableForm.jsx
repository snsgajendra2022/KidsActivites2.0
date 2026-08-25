import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Download, Mail, Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext.jsx';
import PortalLogo from '../../components/brand/PortalLogo.jsx';
import Button from '../../components/ui/Button.jsx';
import {
  saveDraft,
  submitApplication,
  getAdmissionsStatus,
  downloadKidzeeEnrollmentPdf,
  shareEnrollmentFormInvite,
} from '../../services/enrollmentService.js';
import {
  KIDZEE_BRANDING,
  getEmptyKidzeeFormData,
  setNestedValue,
  saveKidzeeDraft,
  wrapKidzeeFormForEnrollment,
  validateKidzeeFormForSubmit,
  mergeKidzeeFormNoFromApplication,
} from './kidzeePrintFields.js';
import KidzeePage1 from './pages/KidzeePage1.jsx';
import KidzeePage2 from './pages/KidzeePage2.jsx';
import KidzeePage3 from './pages/KidzeePage3.jsx';
import KidzeePage4 from './pages/KidzeePage4.jsx';
import KidzeePage5 from './pages/KidzeePage5.jsx';
import './KidzeePrintableForm.css';

const TOTAL_PAGES = 5;

function CorrectionPrintBanner({ note, requestedDocuments = [], documentFieldLabels = {} }) {
  const hasDocs = Array.isArray(requestedDocuments) && requestedDocuments.length > 0;
  if (!note && !hasDocs) return null;
  return (
    <aside className="kidzee-correction-banner" aria-label="Correction request">
      <h2 className="kidzee-correction-banner__title">
        {hasDocs ? 'Correction requested — documents required' : 'Correction requested'}
      </h2>
      {note && (
        <p className="kidzee-correction-banner__note">{note}</p>
      )}
      {hasDocs && (
        <ul className="kidzee-correction-banner__list">
          {requestedDocuments.map((key) => (
            <li key={key}>
              {documentFieldLabels[key]
                || key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim()}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

export default function KidzeePrintableForm({
  initialData,
  readOnly = false,
  isAdmin = false,
  branding = KIDZEE_BRANDING,
  applicationId: initialApplicationId = null,
  parentId = null,
  schoolId = null,
  onSubmitted,
  correctionToken = null,
  printOnly = false,
  onSaveDraft: onSaveDraftOverride = null,
  onSubmitApplication: onSubmitOverride = null,
  backHref = null,
  backLabel = 'Back to Enrollment',
  onBackClick = null,
  applicationStatus = null,
  correctionNote = '',
  requestedDocuments = [],
  documentFieldLabels = {},
  parentShareUrl = null,
}) {
  const showCorrectionBanner = applicationStatus === 'correction_required'
    || Boolean(correctionToken)
    || (requestedDocuments && requestedDocuments.length > 0);
  const [formData, setFormData] = useState(() => initialData || getEmptyKidzeeFormData(branding));
  const [draftId, setDraftId] = useState(initialApplicationId);
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const busy = submitting || downloading;
  const [currentPage, setCurrentPage] = useState(1);
  const [fieldErrors, setFieldErrors] = useState({});
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharing, setSharing] = useState(false);
  const printRef = useRef(null);
  const { toast } = useToast();
  const formTitle = branding.formTitle || `${branding.brandName || 'School'} Enrollment Form`;
  const shareUrl = parentShareUrl || (typeof window !== 'undefined' ? window.location.href : '');

  const copyShareLink = async () => {
    if (!shareUrl) {
      toast('Share link is not available.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast('Public enrollment link copied (no login required).', 'success');
    } catch {
      toast('Could not copy link. Select and copy it manually.', 'error');
    }
  };

  const sendShareEmail = async () => {
    const email = String(shareEmail || '').trim();
    if (!email || !email.includes('@')) {
      toast('Enter a valid parent email address.', 'error');
      return;
    }
    if (!shareUrl) {
      toast('Enrollment form link is missing.', 'error');
      return;
    }

    setSharing(true);
    try {
      const result = await shareEnrollmentFormInvite({
        parentEmail: email,
        formUrl: shareUrl,
        schoolName: branding.brandName,
        message: [
          `Hello,`,
          ``,
          `Please complete the ${branding.brandName || 'school'} enrollment form using this link (no login required):`,
          shareUrl,
          ``,
          `Thank you.`,
        ].join('\n'),
      });

      if (result?.queuedLocally) {
        const subject = encodeURIComponent(`${branding.brandName || 'School'} enrollment form`);
        const body = encodeURIComponent(
          `Hello,\n\nPlease fill the enrollment form for ${branding.brandName || 'our school'} (no login needed):\n${shareUrl}\n\nThank you.`,
        );
        window.open(`mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`, '_blank');
        toast('Server email API is not available yet — opened your mail app with the public form link.', 'warning');
      } else {
        toast(`Enrollment link emailed to ${result?.parentEmail || email} via school API.`, 'success');
      }
      setShareOpen(false);
      setShareEmail('');
    } catch (err) {
      toast(err?.message || 'Could not send the form link.', 'error');
    } finally {
      setSharing(false);
    }
  };

  useEffect(() => {
    if (printOnly) return undefined;
    const root = printRef.current;
    if (!root) return undefined;

    const pages = Array.from(root.querySelectorAll('.print-page[data-page]'));
    if (!pages.length) return undefined;

    const ratios = new Map();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const page = Number(entry.target.getAttribute('data-page'));
          if (!page) return;
          ratios.set(page, entry.isIntersecting ? entry.intersectionRatio : 0);
        });
        let bestPage = 1;
        let bestRatio = -1;
        ratios.forEach((ratio, page) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestPage = page;
          }
        });
        setCurrentPage(bestPage);
      },
      {
        root: null,
        threshold: [0, 0.15, 0.35, 0.5, 0.65, 0.85, 1],
        rootMargin: '-20% 0px -35% 0px',
      },
    );

    pages.forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [printOnly]);

  const handleFieldChange = useCallback((path, value) => {
    setFormData((prev) => setNestedValue(prev, path, value));
    setFieldErrors((prev) => {
      if (!Object.keys(prev).length) return prev;
      const next = { ...prev };
      delete next[path];
      if (path === 'child.gender' || path.startsWith('child.gender.')) delete next['child.gender'];
      if (path === 'class' || path.startsWith('class.')) delete next.class;
      if (path === 'emergencyContacts.0.contactNo') delete next['emergencyContacts.0.mobile'];
      if (path === 'emergencyContacts.0.mobile') delete next['emergencyContacts.0.mobile'];
      return next;
    });
  }, []);

  const scrollToFirstError = (errors) => {
    const firstPath = Object.keys(errors)[0];
    if (!firstPath) return;
    requestAnimationFrame(() => {
      const el = document.querySelector(`[data-field-path="${firstPath}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const ensureDraftSaved = async () => {
    const payload = wrapKidzeeFormForEnrollment(formData);
    const saved = onSaveDraftOverride
      ? await onSaveDraftOverride(payload)
      : await saveDraft(payload, draftId, { parentId, schoolId });
    setDraftId(saved.id);
    const merged = mergeKidzeeFormNoFromApplication(formData, saved);
    setFormData(merged);
    if (!correctionToken) saveKidzeeDraft(merged);
    return saved.id;
  };

  const handleDownloadOrPrint = async () => {
    if (busy) return;
    setDownloading(true);
    try {
      // Guests (no login): print locally — PDF capture needs a saved draft id.
      if (!draftId && !parentId && !isAdmin) {
        window.print();
        return;
      }
      let appId = draftId;
      if (!appId) {
        appId = await ensureDraftSaved();
      }
      await downloadKidzeeEnrollmentPdf(appId);
      toast('PDF downloaded.', 'success');
    } catch (err) {
      toast(err?.message || 'PDF download failed. Opening print dialog…', 'warning');
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const { success, errors } = validateKidzeeFormForSubmit(formData);
    if (!success) {
      setFieldErrors(errors);
      const first = Object.values(errors)[0];
      toast(first || 'Please complete required fields before submitting.', 'warning');
      scrollToFirstError(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);
    try {
      if (!correctionToken) {
        const admissions = await getAdmissionsStatus();
        if (admissions && admissions.admissionsOpen === false) {
          toast('Admissions are currently closed.', 'warning');
          return;
        }
      }

      const payload = wrapKidzeeFormForEnrollment(formData);
      let result;
      if (onSubmitOverride) {
        result = await onSubmitOverride(payload);
      } else {
        const appId = draftId || (await saveDraft(payload, null, { parentId, schoolId })).id;
        result = await submitApplication(payload, appId, parentId, schoolId);
      }
      setDraftId(result.id);
      const merged = mergeKidzeeFormNoFromApplication(formData, result);
      setFormData(merged);
      if (!correctionToken) saveKidzeeDraft(merged);
      toast(correctionToken
        ? 'Corrected application resubmitted successfully.'
        : 'Enrollment form submitted successfully.', 'success');
      onSubmitted?.(result);
    } catch (err) {
      toast(err?.message || 'Submission failed. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pageProps = {
    formData,
    onChange: handleFieldChange,
    readOnly,
    branding,
    showGrid: false,
    isAdmin,
    fieldErrors,
  };

  return (
    <div className={`kidzee-print-root${correctionToken ? ' kidzee-print-root--correction' : ''}`}>
      {!printOnly && (
      <div className="print-toolbar no-print">
        <div className="print-toolbar__left">
          {onBackClick ? (
            <button type="button" className="print-toolbar__back" onClick={onBackClick}>
              <ArrowLeft size={14} aria-hidden />
              <span>{backLabel}</span>
            </button>
          ) : backHref ? (
            <Link to={backHref} className="print-toolbar__back">
              <ArrowLeft size={14} aria-hidden />
              <span>{backLabel}</span>
            </Link>
          ) : null}
          <PortalLogo size="sm" inverse className="print-toolbar__logo" />
        </div>
        <div className="print-toolbar__titles">
          <h1 className="print-toolbar__title">{formTitle}</h1>
          <p className="print-toolbar__subtitle">
            CHILD REGISTRATION FORM
            <span className="print-toolbar__page-badge" aria-live="polite">
              Page {currentPage} of {TOTAL_PAGES}
            </span>
          </p>
        </div>
        <div className="print-toolbar__actions">
          {isAdmin && !correctionToken ? (
            <Button
              type="button"
              variant="secondary"
              className="sb-button-secondary print-toolbar__btn"
              onClick={() => setShareOpen((open) => !open)}
            >
              <Mail size={16} aria-hidden />
              Share with parent
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            className="sb-button-secondary print-toolbar__btn"
            onClick={handleDownloadOrPrint}
            loading={downloading}
            disabled={busy}
          >
            <Download size={16} aria-hidden />
            {downloading ? 'Preparing…' : 'Download / Print'}
          </Button>
          {!readOnly && (
            <Button
              type="button"
              variant="primary"
              className="sb-button-primary print-toolbar__btn"
              onClick={handleSubmit}
              loading={submitting}
              disabled={busy}
            >
              <Send size={16} aria-hidden />
              {submitting
                ? (correctionToken ? 'Resubmitting…' : 'Submitting…')
                : (correctionToken ? 'Resubmit Application' : 'Submit Application')}
            </Button>
          )}
        </div>
      </div>
      )}

      {isAdmin && shareOpen && !printOnly ? (
        <div className="print-share-panel no-print" role="region" aria-label="Share enrollment form">
          <p className="print-share-panel__title">Email the public enrollment link to a parent</p>
          <p className="print-share-panel__hint">
            Parents open this link without logging in, fill the form, and submit.
          </p>
          <p className="print-share-panel__link">{shareUrl}</p>
          <div className="print-share-panel__row">
            <input
              type="email"
              value={shareEmail}
              onChange={(e) => setShareEmail(e.target.value)}
              placeholder="parent@email.com"
              aria-label="Parent email"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void sendShareEmail();
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={() => void copyShareLink()}>
              <Copy size={14} aria-hidden />
              Copy link
            </Button>
            <Button type="button" variant="primary" loading={sharing} onClick={() => void sendShareEmail()}>
              <Mail size={14} aria-hidden />
              Send email
            </Button>
          </div>
        </div>
      ) : null}

      <div className="kidzee-print-pages" ref={printRef}>
        {showCorrectionBanner && (
          <CorrectionPrintBanner
            note={correctionNote}
            requestedDocuments={requestedDocuments}
            documentFieldLabels={documentFieldLabels}
          />
        )}
        <KidzeePage1 {...pageProps} />
        <KidzeePage2 {...pageProps} />
        <KidzeePage3 {...pageProps} />
        <KidzeePage4 {...pageProps} />
        <KidzeePage5 {...pageProps} />
      </div>
    </div>
  );
}
