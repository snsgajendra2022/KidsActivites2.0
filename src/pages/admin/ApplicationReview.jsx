import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getApplication, requestCorrection, approveApplication, rejectApplication,
  verifyDocuments, confirmAdmission, createAccount,
} from '../../services/enrollmentService.js';
import { assignFee, verifyPayment, rejectPayment, getFeeByApplication } from '../../services/feeService.js';
import { getFeeStructures, resolveFeeBreakdownForClass } from '../../services/settingsService.js';
import { listClassFees, listClasses, resolveFeeBreakdownFromClassFees } from '../../services/classManagementService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import DocumentPreviewModal from '../../components/documents/DocumentPreviewModal.jsx';
import '../../styles/application-review.css';
import '../../styles/document-preview.css';

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
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);
  const [feeStructures, setFeeStructures] = useState([]);
  const [managedClasses, setManagedClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);

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
      load();
    } catch {
      toast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const documentRows = Object.entries(app?.documents || {}).map(([key, doc]) => ({ key, doc }));

  const DOC_COLUMNS = [
    {
      label: 'Document',
      primary: true,
      render: (row) => <span className="capitalize">{formatFieldLabel(row.key)}</span>,
    },
    {
      label: 'File',
      render: (row) => row.doc?.name || '—',
    },
    {
      label: 'Status',
      badge: true,
      render: (row) => (
        <StatusBadge
          status={row.doc?.status === 'verified' ? 'documents_verified' : 'documents_pending'}
          variant={row.doc?.status === 'verified' ? 'success' : 'warning'}
        >
          {row.doc?.status || 'pending'}
        </StatusBadge>
      ),
    },
  ];

  const sidebar = app ? (
    <>
      <section className="sb-card app-review-card">
        <h3 className="app-review-card-title">Admin Actions</h3>
        <div className="app-review-actions">
          <Button variant="outline" onClick={() => setModal('correction')}>Request Correction</Button>
          <Button variant="secondary" onClick={() => act(() => verifyDocuments(id), 'Documents verified successfully.')}>Verify Documents</Button>
          <Button variant="primary" onClick={() => setModal('approve')}>Approve Application</Button>
          <Button variant="danger" onClick={() => setModal('reject')}>Reject Application</Button>
          <Button variant="secondary" onClick={() => setModal('assignFee')}>Assign Fee</Button>
          {fee?.status === 'payment_submitted' && (
            <>
              <Button variant="success" onClick={() => setModal('verifyPayment')}>Verify Payment</Button>
              <Button variant="danger" onClick={() => setModal('rejectPayment')}>Reject Payment</Button>
            </>
          )}
          <Button variant="primary" onClick={() => act(() => createAccount(id), 'Parent account created successfully.')}>Create Account</Button>
          <Button variant="success" onClick={() => act(() => confirmAdmission(id), 'Admission confirmed successfully.')}>Confirm Admission</Button>
        </div>
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
              subtitle={app.student?.fullName}
              actions={<StatusBadge status={app.status} />}
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

            <div className="app-review-layout">
              <div className="app-review-main">
                {['student', 'parent', 'address', 'academic', 'medical'].map((section) => (
                  <ReviewSection
                    key={section}
                    title={SECTION_TITLES[section]}
                    data={app[section]}
                  />
                ))}

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
                      <TableActionButton
                        variant="outline"
                        onClick={() => setPreviewDoc({ key: row.key, doc: row.doc })}
                      >
                        Preview
                      </TableActionButton>
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

        <Modal open={modal === 'correction'} onClose={() => setModal(null)} title="Request Correction?"
          footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button variant="primary" loading={loading} onClick={() => act(() => requestCorrection(id, reason), 'Correction request sent.')}>Submit Reason</Button></>}>
          <Textarea label="Reason for correction" required value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Please provide a clear reason so the parent understands what needs to be corrected." />
        </Modal>

        <Modal open={modal === 'reject'} onClose={() => setModal(null)} title="Reject Application?"
          footer={<><Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button><Button variant="danger" loading={loading} onClick={() => act(() => rejectApplication(id, reason), 'Application rejected.')}>Reject Application</Button></>}>
          <Textarea label="Reason for rejection" required value={reason} onChange={(e) => setReason(e.target.value)} />
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
