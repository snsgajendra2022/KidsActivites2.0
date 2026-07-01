import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Button from '../../components/ui/Button.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import {
  getApplication, requestCorrection, approveApplication, rejectApplication,
  verifyDocuments, confirmAdmission, createAccount,
} from '../../services/enrollmentService.js';
import { assignFee, verifyPayment } from '../../services/feeService.js';
import { getFeeByApplication } from '../../services/feeService.js';
import { STATUS_LABELS } from '../../constants/enrollmentStatuses.js';

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

  if (!app) return <DashboardLayout><div className="page-content">Loading...</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <PageHeader
        title={`Application ${app.applicationNo}`}
        subtitle={app.student?.fullName}
        actions={<StatusBadge status={app.status} />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
        <div>
          {['student', 'parent', 'address', 'academic'].map((section) => (
            <div key={section} className="card" style={{ marginBottom: 16 }}>
              <h3 className="card-title">{section.charAt(0).toUpperCase() + section.slice(1)} Summary</h3>
              <div className="review-grid">
                {Object.entries(app[section] || {}).filter(([, v]) => v && typeof v !== 'object').map(([k, v]) => (
                  <div key={k} className="review-item"><label>{k.replace(/([A-Z])/g, ' $1')}</label><span>{String(v)}</span></div>
                ))}
              </div>
            </div>
          ))}

          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="card-title">Documents</h3>
            <div className="data-table-wrap" style={{ border: 0 }}>
              <table className="data-table">
                <thead><tr><th>Document</th><th>File</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {Object.entries(app.documents || {}).map(([key, doc]) => (
                    <tr key={key}>
                      <td>{key.replace(/([A-Z])/g, ' $1')}</td>
                      <td>{doc?.name || '—'}</td>
                      <td><span className={`badge badge-${doc?.status === 'verified' ? 'approved' : 'review'}`}>{doc?.status || 'pending'}</span></td>
                      <td><Button variant="ghost" size="sm">Preview</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Status History</h3>
            <div className="status-timeline">
              {(app.statusHistory || []).map((h, i) => (
                <div key={i} className="timeline-item done">
                  <div className="timeline-dot" />
                  <div className="timeline-content">
                    <h4>{STATUS_LABELS[h.status] || h.status}</h4>
                    <p>{h.note} · {new Date(h.date).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 className="card-title">Admin Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
          </div>

          {fee && (
            <div className="card">
              <h3 className="card-title">Fee Status</h3>
              <div className="fee-breakdown">
                {fee.breakdown && Object.entries(fee.breakdown).map(([k, v]) => (
                  <div key={k} className={`fee-row ${k === 'discount' ? 'discount' : ''}`}>
                    <span>{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span>₹{v.toLocaleString()}</span>
                  </div>
                ))}
                <div className="fee-row total"><span>Total Payable</span><span>₹{fee.total?.toLocaleString()}</span></div>
              </div>
              {fee.payment && (
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  <div>Method: {fee.payment.method}</div>
                  <div>Txn ID: {fee.payment.transactionId}</div>
                  {fee.payment.receiptNo && <div>Receipt: {fee.payment.receiptNo}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
    </DashboardLayout>
  );
}
