import { useCallback, useEffect, useState } from 'react';
import Modal from '../ui/Modal.jsx';
import Button from '../ui/Button.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Textarea from '../ui/Textarea.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { getApplication } from '../../services/enrollmentService.js';
import {
  assignFee,
  getFeeById,
  recordAdminFeePayment,
  rejectPayment,
  verifyPayment,
} from '../../services/feeService.js';
import { getFeeStructures, resolveFeeBreakdownForClass } from '../../services/settingsService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import '../../styles/application-review.css';
import '../../styles/application-view-modal.css';

const SECTION_TITLES = {
  student: 'Student Details',
  parent: 'Parent / Guardian',
  address: 'Address',
  academic: 'Academic Background',
  medical: 'Medical & Emergency',
};

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'upi', label: 'UPI' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'cash', label: 'Cash' },
];

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
    <section className="application-view-modal__section">
      <h3 className="application-view-modal__section-title">{title}</h3>
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

function ApplicationViewSkeleton() {
  return (
    <div className="app-review-loading">
      <div className="app-review-skeleton" />
      <div className="app-review-skeleton app-review-skeleton--tall" />
    </div>
  );
}

function feeStatusKey(status) {
  if (status === 'verified') return 'fee_verified';
  if (status === 'payment_submitted') return 'fee_submitted';
  if (status === 'fee_pending') return 'fee_pending';
  return status;
}

export default function ApplicationViewModal({
  open,
  onClose,
  applicationId,
  feeRecord = null,
  feeId = null,
  onFeeUpdated,
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [app, setApp] = useState(null);
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    method: 'cash',
    transactionId: '',
    amount: '',
    note: '',
  });
  const [rejectReason, setRejectReason] = useState('');

  const resolvedFeeId = feeId || feeRecord?.id;

  const reloadFee = useCallback(async () => {
    if (!resolvedFeeId) return;
    const updated = await getFeeById(resolvedFeeId);
    setFee(updated);
    onFeeUpdated?.(updated);
  }, [resolvedFeeId, onFeeUpdated]);

  const loadData = useCallback(async () => {
    if (!applicationId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const feePromise = resolvedFeeId
        ? getFeeById(resolvedFeeId).catch(() => feeRecord)
        : Promise.resolve(feeRecord);
      const [data, feeData] = await Promise.all([getApplication(applicationId), feePromise]);
      if (!data) {
        setApp(null);
        setFee(null);
        setLoadError('Application not found.');
        return;
      }
      setApp(data);
      setFee(feeData || null);
      if (feeData?.total) {
        setPaymentForm((prev) => ({
          ...prev,
          amount: prev.amount || String(feeData.total),
        }));
      }
    } catch {
      setApp(null);
      setFee(null);
      setLoadError('Unable to load this application.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, resolvedFeeId, feeRecord]);

  useEffect(() => {
    if (!open || !applicationId) {
      setApp(null);
      setFee(null);
      setLoadError(null);
      setRejectReason('');
      return;
    }
    loadData();
  }, [open, applicationId, loadData]);

  const displayFee = fee || feeRecord;
  const canAssignFee = displayFee && (!displayFee.breakdown || displayFee.status === 'not_assigned' || Number(displayFee.total || 0) === 0);
  const canRecordPayment = displayFee?.id
    && !canAssignFee
    && ['fee_pending', 'payment_submitted'].includes(displayFee.status);
  const isVerified = displayFee?.status === 'verified';

  const handleAssignFee = async () => {
    if (!app || !displayFee?.id) return;
    setActionLoading(true);
    try {
      const structures = await getFeeStructures();
      const classCode = app.student?.classApplying || displayFee.classApplying;
      const breakdown = resolveFeeBreakdownForClass(structures, classCode);
      await assignFee(
        app.id,
        app.applicationNo,
        app.student?.fullName,
        classCode,
        breakdown,
      );
      toast('Fee assigned successfully.', 'success');
      await loadData();
      onFeeUpdated?.();
    } catch {
      toast('Unable to assign fee. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordPaidFee = async () => {
    if (!displayFee?.id) return;
    if (!paymentForm.method || !paymentForm.transactionId.trim()) {
      toast('Please enter payment method and transaction/reference ID.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        method: paymentForm.method,
        transactionId: paymentForm.transactionId.trim(),
        amount: paymentForm.amount ? Number(paymentForm.amount) : Number(displayFee.total || 0),
        note: paymentForm.note.trim() || undefined,
      };
      if (displayFee.status === 'payment_submitted') {
        await verifyPayment(displayFee.id, user?.name || 'Admin');
      } else {
        await recordAdminFeePayment(displayFee.id, payload, user?.name || 'Admin');
      }
      toast('Fee marked as paid successfully.', 'success');
      await reloadFee();
    } catch (err) {
      toast(err?.message || 'Unable to record payment. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!displayFee?.id || !rejectReason.trim()) {
      toast('Please provide a reason for rejection.', 'warning');
      return;
    }
    setActionLoading(true);
    try {
      await rejectPayment(displayFee.id, rejectReason.trim());
      toast('Payment rejected. Parent can resubmit proof.', 'success');
      setRejectReason('');
      await reloadFee();
    } catch {
      toast('Unable to reject payment. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const title = app?.applicationNo
    ? `Application ${app.applicationNo}`
    : displayFee?.applicationNo
      ? `Application ${displayFee.applicationNo}`
      : 'Application Details';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      footer={(
        <Button variant="secondary" onClick={onClose}>Close</Button>
      )}
    >
      <div className="application-view-modal">
        {loading ? (
          <ApplicationViewSkeleton />
        ) : loadError ? (
          <p className="application-view-modal__error">{loadError}</p>
        ) : app ? (
          <>
            <div className="application-view-modal__head">
              <div>
                <p className="application-view-modal__student">{app.student?.fullName || displayFee?.studentName}</p>
                <p className="application-view-modal__subtitle">
                  {app.student?.classApplying?.toUpperCase() || displayFee?.classApplying?.toUpperCase() || '—'}
                  {' · '}
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'Not submitted'}
                </p>
              </div>
              <StatusBadge status={app.status} />
            </div>

            <dl className="app-review-meta application-view-modal__meta">
              <div className="app-review-meta-item">
                <dt>Parent Mobile</dt>
                <dd>{app.parent?.fatherMobile || app.parent?.motherMobile || '—'}</dd>
              </div>
              <div className="app-review-meta-item">
                <dt>Reviewer</dt>
                <dd>{app.assignedReviewer || '—'}</dd>
              </div>
              {displayFee && (
                <>
                  <div className="app-review-meta-item">
                    <dt>Fee Status</dt>
                    <dd><StatusBadge status={feeStatusKey(displayFee.status)} /></dd>
                  </div>
                  <div className="app-review-meta-item">
                    <dt>Fee Total</dt>
                    <dd>₹{Number(displayFee.total || 0).toLocaleString('en-IN')}</dd>
                  </div>
                </>
              )}
            </dl>

            {displayFee && (
              <section className="application-view-modal__section application-view-modal__fee-actions">
                <h3 className="application-view-modal__section-title">Fee &amp; Payment</h3>

                {canAssignFee && (
                  <div className="application-view-modal__action-block">
                    <p className="application-view-modal__hint">No fee structure is assigned yet for this application.</p>
                    <Button variant="secondary" loading={actionLoading} onClick={handleAssignFee}>
                      Assign Fee
                    </Button>
                  </div>
                )}

                {isVerified && (
                  <div className="application-view-modal__paid-banner">
                    <StatusBadge status="fee_verified">Paid</StatusBadge>
                    {displayFee.payment?.receiptNo && (
                      <span>Receipt: {displayFee.payment.receiptNo}</span>
                    )}
                    {displayFee.payment?.verifiedAt && (
                      <span>
                        Verified {new Date(displayFee.payment.verifiedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {canRecordPayment && !isVerified && (
                  <div className="application-view-modal__payment-form">
                    <p className="application-view-modal__hint">
                      {displayFee.status === 'payment_submitted'
                        ? 'Payment proof submitted — verify or reject below.'
                        : 'Record fee payment received from the student/parent.'}
                    </p>
                    {displayFee.status !== 'payment_submitted' && (
                      <>
                        <div className="application-view-modal__payment-grid">
                          <Select
                            label="Payment Method"
                            required
                            options={PAYMENT_METHODS}
                            value={paymentForm.method}
                            onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                          />
                          <Input
                            label="Transaction / Reference ID"
                            required
                            value={paymentForm.transactionId}
                            onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                            placeholder="e.g. TXN20260701001"
                          />
                          <Input
                            label="Amount Paid (₹)"
                            type="number"
                            min="0"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            placeholder={String(displayFee.total || '')}
                          />
                        </div>
                        <Textarea
                          label="Note (optional)"
                          value={paymentForm.note}
                          onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                          placeholder="e.g. Cash received at admission desk"
                        />
                      </>
                    )}
                    <div className="application-view-modal__payment-actions">
                      <Button
                        variant="success"
                        loading={actionLoading}
                        onClick={handleRecordPaidFee}
                      >
                        {displayFee.status === 'payment_submitted' ? 'Verify Payment' : 'Record Paid Fee'}
                      </Button>
                      {displayFee.status === 'payment_submitted' && (
                        <>
                          <Textarea
                            label="Rejection reason"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason if rejecting payment proof"
                          />
                          <Button
                            variant="danger"
                            loading={actionLoading}
                            onClick={handleRejectPayment}
                          >
                            Reject Payment
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {displayFee.breakdown && (
                  <div className="application-view-modal__fee">
                    {Object.entries(displayFee.breakdown).map(([key, value]) => (
                      <div key={key} className={`app-review-fee-row ${key === 'discount' ? 'discount' : ''}`}>
                        <span>{formatFieldLabel(key)}</span>
                        <span>₹{Number(value ?? 0).toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="app-review-fee-row total">
                      <span>Total Payable</span>
                      <span>₹{Number(displayFee.total || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                )}

                {displayFee.payment && (
                  <div className="app-review-fee-meta">
                    <div>Method: {displayFee.payment.method || '—'}</div>
                    <div>Txn ID: {displayFee.payment.transactionId || '—'}</div>
                    {displayFee.payment.amount != null && (
                      <div>Amount: ₹{Number(displayFee.payment.amount).toLocaleString('en-IN')}</div>
                    )}
                    {displayFee.payment.receiptNo && <div>Receipt: {displayFee.payment.receiptNo}</div>}
                  </div>
                )}
              </section>
            )}

            {['student', 'parent', 'address', 'academic', 'medical'].map((section) => (
              <ReviewSection key={section} title={SECTION_TITLES[section]} data={app[section]} />
            ))}

            {Object.keys(app.documents || {}).length > 0 && (
              <section className="application-view-modal__section">
                <h3 className="application-view-modal__section-title">Documents</h3>
                <ul className="application-view-modal__docs">
                  {Object.entries(app.documents).map(([key, doc]) => (
                    <li key={key}>
                      <span className="capitalize">{formatFieldLabel(key)}</span>
                      <span>{doc?.name || '—'}</span>
                      <StatusBadge
                        status={doc?.status === 'verified' ? 'documents_verified' : 'documents_pending'}
                      >
                        {doc?.status || 'pending'}
                      </StatusBadge>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(app.statusHistory || []).length > 0 && (
              <section className="application-view-modal__section">
                <h3 className="application-view-modal__section-title">Status History</h3>
                <div className="app-review-timeline">
                  {app.statusHistory.map((h, i) => (
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
            )}
          </>
        ) : null}
      </div>
    </Modal>
  );
}
