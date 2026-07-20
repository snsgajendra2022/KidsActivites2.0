import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getApplication, requestCorrection, approveApplication, rejectApplication,
  verifyDocuments, verifyDocument, rejectDocument, confirmAdmission, createAccount,
  downloadKidzeeEnrollmentPdf,
} from '../../services/enrollmentService.js';
import { assignFee, verifyPayment, rejectPayment, getFeeByApplication } from '../../services/feeService.js';
import { getFeeStructures, resolveFeeBreakdownForClass } from '../../services/settingsService.js';
import { listClassFees, listClasses, resolveFeeBreakdownFromClassFees } from '../../services/classManagementService.js';
import { STATUS_LABELS, ENROLLMENT_STATUSES } from '../../constants/enrollmentStatuses.js';
import { getAdminActionAvailability } from '../../utils/adminApplicationActions.js';
import { PERMISSIONS } from '../../constants/permissions.js';
import { usePermission } from '../../hooks/usePermission.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import {
  getEnrollmentDocumentFields,
  formatDocumentFieldLabel,
  getCorrectionRequestedDocuments,
  getCorrectionRequestNote,
} from '../../utils/enrollmentDocumentFields.js';
import DocumentPreviewModal from '../../components/documents/DocumentPreviewModal.jsx';
import KidzeeApplicationDetails from './KidzeeApplicationDetails.jsx';
import '../../styles/application-review.css';
import '../../styles/document-preview.css';

function documentBadgeProps(status) {
  if (status === 'verified') {
    return { status: 'documents_verified', variant: 'success', label: 'verified' };
  }
  if (status === 'rejected') {
    return { status: 'rejected', variant: 'danger', label: 'rejected' };
  }
  return { status: 'documents_pending', variant: 'warning', label: status || 'pending' };
}

const SECTION_TITLES = {
  student: 'Student Details',
  parent: 'Parent / Guardian',
  address: 'Address',
  academic: 'Academic Background',
  medical: 'Medical & Emergency',
};

const HIDDEN_FIELD_KEYS = new Set(['countryCode', 'stateCode']);

function formatFieldLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function firstNonBlankEmail(...candidates) {
  for (const value of candidates) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text) return text;
  }
  return '';
}

/** Matches backend EnrollmentParentContactHelper.resolveParentEmail */
function resolveParentEmailFromApplication(app) {
  if (!app) return '';
  const formData = app.formData || {};
  const father = formData.fatherGuardian || {};
  const mother = formData.motherGuardian || {};
  const fromGuardians = firstNonBlankEmail(father.email, mother.email);
  if (fromGuardians) return fromGuardians;
  const parent = app.parent || {};
  return firstNonBlankEmail(parent.fatherEmail, parent.motherEmail, parent.email);
}

function actionErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  return err?.message || err?.details?.[0]?.message || fallback;
}

const PARENT_EMAIL_REQUIRED_MESSAGE =
  'Mother or Father email is required to create a parent account. Please add at least one parent email on the application first.';

function ReviewSection({ title, data }) {
  const entries = Object.entries(data || {}).filter(
    ([key, v]) => !HIDDEN_FIELD_KEYS.has(key)
      && v !== null
      && v !== undefined
      && v !== ''
      && typeof v !== 'object',
  );
  if (entries.length === 0) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">{title}</h3>
      <dl className="app-review-grid">
        {entries.map(([key, value]) => (
          <div key={key} className="app-review-field">
            <dt>{formatFieldLabel(key)}</dt>
            <dd>{formatFieldValue(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DeclarationSection({ declaration, signature }) {
  if (!declaration && !signature) return null;

  const consentEntries = Object.entries(declaration || {}).filter(
    ([key, value]) => key !== 'signature' && key !== 'signatureDate' && typeof value === 'boolean',
  );
  const signatureData = declaration?.signature
    || (typeof signature?.data === 'string' ? signature.data : null);
  const signatureDate = declaration?.signatureDate || signature?.date;

  if (!consentEntries.length && !signatureData && !signatureDate) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">Declaration & Signature</h3>
      {consentEntries.length > 0 && (
        <dl className="app-review-grid">
          {consentEntries.map(([key, value]) => (
            <div key={key} className="app-review-field">
              <dt>{formatFieldLabel(key)}</dt>
              <dd>{formatFieldValue(value)}</dd>
            </div>
          ))}
        </dl>
      )}
      {signatureDate && (
        <dl className="app-review-grid mt-3">
          <div className="app-review-field">
            <dt>Signature Date</dt>
            <dd>{formatFieldValue(signatureDate)}</dd>
          </div>
        </dl>
      )}
      {signatureData && (
        <div className="app-review-signature mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#45474c]">Digital Signature</p>
          <img src={signatureData} alt="Applicant signature" className="app-review-signature__image" />
        </div>
      )}
    </section>
  );
}

function ApplicationReviewSkeleton() {
  return (
    <div className="app-review-loading">
      <div className="app-review-skeleton" />
      <div className="app-review-skeleton app-review-skeleton--tall" />
      <div className="app-review-skeleton app-review-skeleton--tall" />
    </div>
  );
}

export default function ApplicationReview() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const { enrollmentForm } = usePortalConfig();
  const canVerifyDocuments = usePermission(PERMISSIONS.VERIFY_DOCUMENTS);
  const canRejectDocuments = usePermission(PERMISSIONS.REJECT_DOCUMENTS);
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);
  const [feeStructures, setFeeStructures] = useState([]);
  const [managedClasses, setManagedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [selectedCorrectionDocs, setSelectedCorrectionDocs] = useState([]);
  const [rejectDocField, setRejectDocField] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [correctionDelivery, setCorrectionDelivery] = useState(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const documentFieldOptions = useMemo(
    () => getEnrollmentDocumentFields(enrollmentForm),
    [enrollmentForm],
  );
  const resolvedParentEmail = resolveParentEmailFromApplication(app);
  const needsParentEmailInput = !resolvedParentEmail;
  const activeCorrectionNote = getCorrectionRequestNote(app);
  const activeCorrectionDocs = getCorrectionRequestedDocuments(app);

  const toggleCorrectionDoc = (key) => {
    setSelectedCorrectionDocs((prev) => (
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    ));
  };

  const openCorrectionModal = () => {
    const existing = getCorrectionRequestedDocuments(app);
    setSelectedCorrectionDocs(existing.length ? existing : documentFieldOptions.filter((f) => f.required).map((f) => f.key));
    setReason(getCorrectionRequestNote(app) || '');
    setParentEmailInput('');
    setModal('correction');
  };

  const handleDownloadPdf = async () => {
    if (!app?.id) return;
    setPdfDownloading(true);
    try {
      await downloadKidzeeEnrollmentPdf(app.id);
      toast('PDF downloaded.', 'success');
    } catch (err) {
      toast(err?.message || 'PDF download failed.', 'error');
    } finally {
      setPdfDownloading(false);
    }
  };

  const load = async () => {
    setPageLoading(true);
    setLoadError(null);
    try {
      const [data, structures, daycareClasses] = await Promise.all([
        getApplication(id),
        getFeeStructures(),
        listClasses({ status: 'active' }),
      ]);
      if (!data) {
        setApp(null);
        setFee(null);
        setLoadError('Application not found.');
        return;
      }
      setApp(data);
      setFeeStructures(structures);
      setManagedClasses(Array.isArray(daycareClasses) ? daycareClasses : []);
      setFee(await getFeeByApplication(data.id));
    } catch {
      setApp(null);
      setFee(null);
      setLoadError('Unable to load this application.');
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const act = async (fn, successMsg) => {
    setLoading(true);
    try {
      await fn();
      toast(successMsg, 'success');
      setModal(null);
      setReason('');
      setParentEmailInput('');
      setRejectDocField(null);
      load();
    } catch (err) {
      toast(actionErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const actCorrection = async (fn) => {
    if (needsParentEmailInput && parentEmailInput.trim()) {
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmailInput.trim());
      if (!ok) {
        toast('Please enter a valid parent email address.', 'error');
        return;
      }
    }
    setLoading(true);
    try {
      const result = await fn();
      const emailSent = Boolean(result?.emailSent);
      const correctionUrl = result?.correctionUrl || null;
      setCorrectionDelivery({
        correctionUrl,
        emailSent,
        parentEmail: result?.parentEmail || parentEmailInput.trim() || null,
      });
      setLinkCopied(false);
      setModal('correctionLink');
      setReason('');
      setParentEmailInput('');
      setSelectedCorrectionDocs([]);
      setRejectDocField(null);
      toast(
        emailSent
          ? 'Correction requested. Email sent to parent.'
          : 'Correction requested. No parent email on file — copy the link below to share manually.',
        emailSent ? 'success' : 'warning',
      );
      load();
    } catch (err) {
      toast(actionErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyCorrectionLink = async () => {
    const url = correctionDelivery?.correctionUrl;
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      toast('Correction link copied.', 'success');
    } catch {
      toast('Could not copy link. Select and copy it manually.', 'error');
    }
  };

  const handleCreateAccount = () => {
    if (!resolveParentEmailFromApplication(app)) {
      toast(PARENT_EMAIL_REQUIRED_MESSAGE, 'error');
      return;
    }
    act(() => createAccount(id), 'Parent account created successfully.');
  };

  const documentRows = Object.entries(app?.documents || {}).map(([key, doc]) => ({ key, doc }));

  const DOC_COLUMNS = [
    {
      label: 'Document',
      primary: true,
      render: (row) => (
        <div>
          <span className="capitalize">{formatFieldLabel(row.key)}</span>
          {row.doc?.status === 'rejected' && row.doc?.rejectReason && (
            <p className="mt-1 text-xs text-[#b42318]">{row.doc.rejectReason}</p>
          )}
        </div>
      ),
    },
    {
      label: 'File',
      render: (row) => row.doc?.name || '—',
    },
    {
      label: 'Status',
      badge: true,
      render: (row) => {
        const badge = documentBadgeProps(row.doc?.status);
        return (
          <StatusBadge status={badge.status} variant={badge.variant}>
            {badge.label}
          </StatusBadge>
        );
      },
    },
  ];

  const actions = app ? getAdminActionAvailability(app.status, fee) : null;
  const showDocReviewActions = Boolean(actions?.verifyDocuments || actions?.requestCorrection);

  const sidebar = app ? (
    <>
      <section className="sb-card app-review-card">
        <h3 className="app-review-card-title">Admin Actions</h3>
        {actions?.isTerminal ? (
          <p className="text-sm text-[#45474c]">
            No further actions are available for this application.
          </p>
        ) : actions?.hasAnyAction ? (
          <div className="app-review-actions">
            {actions.requestCorrection && (
              <Button variant="outline" onClick={openCorrectionModal}>Request Correction</Button>
            )}
            {actions.verifyDocuments && canVerifyDocuments && (
              <Button variant="secondary" onClick={() => act(() => verifyDocuments(id), 'Documents verified successfully.')}>Verify All Documents</Button>
            )}
            {actions.approve && (
              <Button variant="primary" onClick={() => setModal('approve')}>Approve Application</Button>
            )}
            {actions.reject && (
              <Button variant="danger" onClick={() => setModal('reject')}>Reject Application</Button>
            )}
            {actions.assignFee && (
              <Button variant="secondary" onClick={() => setModal('assignFee')}>Assign Fee</Button>
            )}
            {actions.verifyPayment && (
              <Button variant="success" onClick={() => setModal('verifyPayment')}>Verify Payment</Button>
            )}
            {actions.rejectPayment && (
              <Button variant="danger" onClick={() => setModal('rejectPayment')}>Reject Payment</Button>
            )}
            {actions.createAccount && (
              <Button variant="primary" onClick={handleCreateAccount}>Create Account</Button>
            )}
            {actions.confirmAdmission && (
              <Button variant="success" onClick={() => act(() => confirmAdmission(id), 'Admission confirmed successfully.')}>Confirm Admission</Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#45474c]">
            No actions are available at the current stage.
          </p>
        )}
      </section>

      {fee && (
        <section className="sb-card app-review-card">
          <h3 className="app-review-card-title">Fee Status</h3>
          <div>
            {fee.breakdown && Object.entries(fee.breakdown).map(([k, v]) => (
              <div key={k} className={`app-review-fee-row ${k === 'discount' ? 'discount' : ''}`}>
                <span>{formatFieldLabel(k)}</span>
                <span>₹{Number(v ?? 0).toLocaleString()}</span>
              </div>
            ))}
            <div className="app-review-fee-row total">
              <span>Total Payable</span>
              <span>₹{fee.total?.toLocaleString()}</span>
            </div>
          </div>
          {fee.payment && (
            <div className="app-review-fee-meta">
              <div>Method: {fee.payment.method}</div>
              <div>Txn ID: {fee.payment.transactionId}</div>
              {fee.payment.receiptNo && <div>Receipt: {fee.payment.receiptNo}</div>}
            </div>
          )}
        </section>
      )}
    </>
  ) : null;

  return (
    <DashboardLayout>
      <PageTransition>
        <Link to={tenantPath('/admin/applications')} className="app-review-back">
          <ArrowLeft size={16} />
          Back to Applications
        </Link>

        {pageLoading ? (
          <ApplicationReviewSkeleton />
        ) : loadError ? (
          <section className="sb-card app-review-card">
            <p className="text-sm text-[#45474c]">{loadError}</p>
            <Link to={tenantPath('/admin/applications')} className="mt-3 inline-block text-sm font-medium text-[#0058be]">
              Back to Applications
            </Link>
          </section>
        ) : !app ? (
          <ApplicationReviewSkeleton />
        ) : (
          <>
            <PageHeader
              title={`Application ${app.applicationNo}`}
              subtitle={app.student?.fullName || app.formData?.child?.fullName}
              actions={(
                <div className="flex flex-wrap items-center gap-2">
                  {app.formType === 'kidzee_printable' ? (
                    <>
                      <Link
                        to={tenantPath(`/enrollment/kidzee-print-form?applicationId=${app.id}`)}
                        className="sb-button-secondary text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Kidzee Form
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pdfDownloading}
                        onClick={handleDownloadPdf}
                      >
                        {pdfDownloading ? 'Generating PDF…' : 'Download PDF'}
                      </Button>
                    </>
                  ) : (
                    <Link
                      to={tenantPath(`/enrollment/printable-form?applicationId=${app.id}`)}
                      className="sb-button-secondary text-sm"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Printable Form
                    </Link>
                  )}
                  <StatusBadge status={app.status} />
                </div>
              )}
            />

            <section className="sb-card app-review-card mb-4">
              <dl className="app-review-meta">
                <div className="app-review-meta-item">
                  <dt>Class Applying</dt>
                  <dd>{app.student?.classApplying?.toUpperCase() || '—'}</dd>
                </div>
                <div className="app-review-meta-item">
                  <dt>Submitted</dt>
                  <dd>{app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : '—'}</dd>
                </div>
                <div className="app-review-meta-item">
                  <dt>Reviewer</dt>
                  <dd>{app.assignedReviewer || '—'}</dd>
                </div>
                <div className="app-review-meta-item">
                  <dt>Parent Mobile</dt>
                  <dd>{app.parent?.fatherMobile || app.parent?.motherMobile || '—'}</dd>
                </div>
              </dl>
            </section>

            {app.status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED && (activeCorrectionNote || activeCorrectionDocs.length > 0) && (
              <section className="sb-card app-review-card mb-4" style={{ borderColor: '#f59e0b', background: '#fffbeb' }}>
                <h3 className="app-review-card-title">Active correction request</h3>
                {activeCorrectionNote && (
                  <p className="text-sm text-[#7c2d12] whitespace-pre-wrap mb-2">{activeCorrectionNote}</p>
                )}
                {activeCorrectionDocs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#92400e] mb-1">Documents requested</p>
                    <ul className="text-sm text-[#7c2d12] list-disc pl-5">
                      {activeCorrectionDocs.map((key) => (
                        <li key={key}>{formatDocumentFieldLabel(key)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="mt-3 text-xs text-[#92400e]">
                  This also appears on the Kidzee Download / Print form while correction is open.
                </p>
              </section>
            )}

            <div className="app-review-layout">
              <div className="app-review-main">
                {app.formType === 'kidzee_printable' ? (
                  <KidzeeApplicationDetails app={app} />
                ) : (
                  ['student', 'parent', 'address', 'academic', 'medical'].map((section) => (
                    <ReviewSection
                      key={section}
                      title={SECTION_TITLES[section]}
                      data={app[section]}
                    />
                  ))
                )}

                <DeclarationSection declaration={app.declaration} signature={app.signature} />

                <section className="sb-card app-review-card">
                  <h3 className="app-review-card-title">Documents</h3>
                  <ResponsiveDataTable
                    nested
                    columns={DOC_COLUMNS}
                    data={documentRows}
                    keyExtractor={(row) => row.key}
                    minWidth={520}
                    renderActions={(row) => (
                      <div className="flex flex-wrap gap-2">
                        <TableActionButton
                          variant="outline"
                          onClick={() => setPreviewDoc({ key: row.key, doc: row.doc })}
                        >
                          Preview
                        </TableActionButton>
                        {showDocReviewActions && canVerifyDocuments && row.doc?.status !== 'verified' && row.doc?.fileKey && (
                          <TableActionButton
                            variant="secondary"
                            disabled={loading}
                            onClick={() => act(
                              () => verifyDocument(id, row.key),
                              `${formatFieldLabel(row.key)} verified.`,
                            )}
                          >
                            Verify
                          </TableActionButton>
                        )}
                        {showDocReviewActions && canRejectDocuments && row.doc?.status !== 'rejected' && (
                          <TableActionButton
                            variant="danger"
                            disabled={loading}
                            onClick={() => {
                              setRejectDocField(row.key);
                              setReason('');
                              setModal('rejectDocument');
                            }}
                          >
                            Reject
                          </TableActionButton>
                        )}
                      </div>
                    )}
                  />
                </section>

                <section className="sb-card app-review-card">
                  <h3 className="app-review-card-title">Status History</h3>
                  <div className="app-review-timeline">
                    {(app.statusHistory || []).map((h, i) => (
                      <div key={i} className="app-review-timeline-item done">
                        <div className="app-review-timeline-dot" />
                        <div className="app-review-timeline-content">
                          <h4>{STATUS_LABELS[h.status] || h.status}</h4>
                          <p>{h.note} · {new Date(h.date).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <aside className="app-review-sidebar" aria-label="Application actions">
                {sidebar}
              </aside>
            </div>
          </>
        )}

        <Modal
          open={modal === 'correction'}
          onClose={() => { setModal(null); setParentEmailInput(''); setSelectedCorrectionDocs([]); }}
          title="Request Correction?"
          footer={(
            <>
              <Button variant="secondary" onClick={() => { setModal(null); setParentEmailInput(''); setSelectedCorrectionDocs([]); }}>Cancel</Button>
              <Button
                variant="primary"
                loading={loading}
                disabled={!reason.trim() || selectedCorrectionDocs.length === 0}
                onClick={() => actCorrection(() => requestCorrection(
                  id,
                  reason,
                  parentEmailInput.trim() || null,
                  selectedCorrectionDocs,
                ))}
              >
                Request Correction
              </Button>
            </>
          )}
        >
          <Textarea
            label="Reason for correction"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Please provide a clear reason so the parent understands what needs to be corrected."
          />
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-[#0b1c30]">
              Documents the parent must upload / update
              <span className="text-[#ba1a1a]"> *</span>
            </p>
            <p className="mb-3 text-xs text-[#45474c]">
              Select at least one. These appear on the parent correction link and on Download / Print while correction is open.
            </p>
            <div className="grid gap-2">
              {documentFieldOptions.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedCorrectionDocs.includes(field.key)}
                    onChange={() => toggleCorrectionDoc(field.key)}
                  />
                  <span>{field.label}{field.required ? ' (usually required)' : ''}</span>
                </label>
              ))}
            </div>
          </div>
          {needsParentEmailInput ? (
            <div className="mt-4">
              <Input
                type="email"
                label="Parent email (to send correction link)"
                value={parentEmailInput}
                onChange={(e) => setParentEmailInput(e.target.value)}
                placeholder="parent@example.com"
                helper="No parent email on this application. Add one to email the link, or leave blank and copy the link after submitting."
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#45474c]">
              Correction email will be sent to <strong>{resolvedParentEmail}</strong>.
            </p>
          )}
        </Modal>

        <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject Application?"
          footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" loading={loading} onClick={() => act(() => rejectApplication(id, reason), 'Application rejected.')}>Reject Application</Button></>}>
          <Textarea label="Reason for rejection" required value={reason} onChange={(e) => setReason(e.target.value)} />
        </Modal>

        <Modal
          open={modal === 'rejectDocument'}
          onClose={() => { setModal(null); setRejectDocField(null); setReason(''); setParentEmailInput(''); }}
          title={`Reject ${rejectDocField ? formatFieldLabel(rejectDocField) : 'Document'}?`}
          footer={(
            <>
              <Button variant="secondary" onClick={() => { setModal(null); setRejectDocField(null); setReason(''); setParentEmailInput(''); }}>Cancel</Button>
              <Button
                variant="danger"
                loading={loading}
                disabled={!rejectDocField || !reason.trim()}
                onClick={() => actCorrection(() => rejectDocument(
                  id,
                  rejectDocField,
                  reason,
                  parentEmailInput.trim() || null,
                ))}
              >
                Reject Document
              </Button>
            </>
          )}
        >
          <Textarea
            label="Reason for rejection"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain what is wrong so the parent can re-upload the correct document."
          />
          {needsParentEmailInput ? (
            <div className="mt-4">
              <Input
                type="email"
                label="Parent email (to send correction link)"
                value={parentEmailInput}
                onChange={(e) => setParentEmailInput(e.target.value)}
                placeholder="parent@example.com"
                helper="No parent email on this application. Add one to email the link, or leave blank and copy the link after submitting."
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-[#45474c]">
              Correction email will be sent to <strong>{resolvedParentEmail}</strong>.
            </p>
          )}
        </Modal>

        <Modal
          open={modal === 'correctionLink'}
          onClose={() => { setModal(null); setCorrectionDelivery(null); setLinkCopied(false); }}
          title={correctionDelivery?.emailSent ? 'Correction email sent' : 'Share correction link'}
          footer={(
            <>
              {correctionDelivery?.correctionUrl && (
                <Button variant="secondary" onClick={copyCorrectionLink}>
                  {linkCopied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy link</>}
                </Button>
              )}
              <Button variant="primary" onClick={() => { setModal(null); setCorrectionDelivery(null); setLinkCopied(false); }}>
                Done
              </Button>
            </>
          )}
        >
          {correctionDelivery?.emailSent ? (
            <p className="text-sm text-[#45474c]">
              An email with the secure correction link was sent to{' '}
              <strong>{correctionDelivery.parentEmail}</strong>.
              You can still copy the link below if you need to share it another way.
            </p>
          ) : (
            <p className="text-sm text-[#45474c]">
              No parent email was available, so nothing was emailed. Copy this link and share it with the parent
              (WhatsApp, SMS, etc.). The link does not require login.
            </p>
          )}
          {correctionDelivery?.correctionUrl && (
            <div className="mt-4 rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#45474c]">Correction link</p>
              <p className="break-all text-sm text-[#0058be]">{correctionDelivery.correctionUrl}</p>
            </div>
          )}
        </Modal>

        <ConfirmModal open={modal === 'approve'} onClose={() => setModal(null)} onConfirm={() => act(() => approveApplication(id), 'Application approved successfully.')} title="Approve Application?" message="This will approve the application and assign fee to the parent." confirmText="Approve Application" loading={loading} />

        <ConfirmModal open={modal === 'assignFee'} onClose={() => setModal(null)} onConfirm={async () => {
          if (!app) return;
          const classCode = app.student?.classApplying;
          const matchedClass = managedClasses.find(
            (c) => c.code?.toLowerCase() === String(classCode || '').toLowerCase(),
          );
          let breakdown = resolveFeeBreakdownForClass(feeStructures, classCode);
          if (matchedClass) {
            try {
              const classFees = await listClassFees(matchedClass.id);
              const fromClassFees = resolveFeeBreakdownFromClassFees(classFees);
              if (Object.keys(fromClassFees).length > 1) {
                breakdown = fromClassFees;
              }
            } catch {
              // use legacy fee structure fallback
            }
          }
          return act(
            () => assignFee(app.id, app.applicationNo, app.student?.fullName, classCode, breakdown),
            'Fee assigned successfully.',
          );
        }} title="Assign Fee?" message={`Fee structure for ${app?.student?.classApplying?.toUpperCase() || 'this class'} will be applied from Class Management or Settings.`} confirmText="Assign Fee" loading={loading} />

        <ConfirmModal open={modal === 'verifyPayment'} onClose={() => setModal(null)} onConfirm={() => fee && act(() => verifyPayment(fee.id, user?.name || 'Admin'), 'Fee payment verified successfully.')} title="Verify Fee Payment?" message="This will mark the fee as received and allow the admission process to continue." confirmText="Verify Payment" confirmVariant="success" loading={loading} />

        <Modal open={modal === 'rejectPayment'} onClose={() => { setModal(null); setReason(''); }} title="Reject Payment?"
          footer={<><Button variant="secondary" onClick={() => { setModal(null); setReason(''); }}>Cancel</Button><Button variant="danger" loading={loading} disabled={!fee} onClick={() => fee && act(() => rejectPayment(fee.id, reason), 'Payment rejected. Parent can resubmit proof.')}>Reject Payment</Button></>}>
          <Textarea label="Reason for rejection" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain what needs to be corrected." />
        </Modal>

        <DocumentPreviewModal
          open={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          docKey={previewDoc?.key}
          doc={previewDoc?.doc}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
