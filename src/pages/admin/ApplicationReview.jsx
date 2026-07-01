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
import { assignFee, verifyPayment, getFeeByApplication } from '../../services/feeService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import '../../styles/application-review.css';

const SECTION_TITLES = {
  student: 'Student Details',
  parent: 'Parent / Guardian',
  address: 'Address',
  academic: 'Academic Background',
};

function formatFieldLabel(key) {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function ReviewSection({ title, data }) {
  const entries = Object.entries(data || {}).filter(([, v]) => v && typeof v !== 'object');
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
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [reason, setReason] = useState('');

  const load = async () => {
    const data = await getApplication(id);
    setApp(data);
    if (data) setFee(await getFeeByApplication(data.id));
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
            <Button variant="success" onClick={() => setModal('verifyPayment')}>Verify Payment</Button>
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
                <span>₹{v.toLocaleString()}</span>
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
        <Link to="/admin/applications" className="app-review-back">
          <ArrowLeft size={16} />
          Back to Applications
        </Link>

        {!app ? (
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
                  <dd>{app.parent?.fatherMobile || '—'}</dd>
                </div>
              </dl>
            </section>

            <div className="app-review-layout">
              <div className="app-review-main">
                {['student', 'parent', 'address', 'academic'].map((section) => (
                  <ReviewSection
                    key={section}
                    title={SECTION_TITLES[section]}
                    data={app[section]}
                  />
                ))}

                <section className="sb-card app-review-card">
                  <h3 className="app-review-card-title">Documents</h3>
                  <ResponsiveDataTable
                    nested
                    columns={DOC_COLUMNS}
                    data={documentRows}
                    keyExtractor={(row) => row.key}
                    minWidth={520}
                    renderActions={() => (
                      <TableActionButton variant="outline">Preview</TableActionButton>
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

        <ConfirmModal open={modal === 'assignFee'} onClose={() => setModal(null)} onConfirm={() => act(() => assignFee(app.id, app.applicationNo, app.student.fullName, app.student.classApplying, { admissionFee: 15000, registrationFee: 5000, tuitionFee: 42000, transportFee: 10000, activityFee: 3000, discount: 0 }), 'Fee assigned successfully.')} title="Assign Fee?" message="Default fee structure will be assigned for this class." confirmText="Assign Fee" loading={loading} />

        <ConfirmModal open={modal === 'verifyPayment'} onClose={() => setModal(null)} onConfirm={() => act(() => verifyPayment(fee.id, 'Priya Sharma'), 'Fee payment verified successfully.')} title="Verify Fee Payment?" message="This will mark the fee as received and allow the admission process to continue." confirmText="Verify Payment" confirmVariant="success" loading={loading} />
      </PageTransition>
    </DashboardLayout>
  );
}
