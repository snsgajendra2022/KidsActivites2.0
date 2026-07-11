import { Link } from 'react-router-dom';
import {
  ResponsiveDataTable,
} from '../ui/DataTable.jsx';
import StatusBadge from '../ui/StatusBadge.jsx';
import KidzeeApplicationDetails from '../../pages/admin/KidzeeApplicationDetails.jsx';
import {
  docStatusKey,
  feeStatusLabel,
  formatDisplayValue,
  formatFieldLabel,
  formatShortDate,
  objectToInfoItems,
} from '../../utils/parentEnrollmentDisplay.js';

const SECTION_TITLES = {
  student: 'Student Information',
  parent: 'Parent / Guardian',
  address: 'Address',
  academic: 'Academic Background',
  medical: 'Medical & Emergency',
};

const MEDICAL_FIELD_KEYS = new Set([
  'medicalConditions',
  'allergies',
  'specialNeeds',
  'emergencyContactName',
  'emergencyContactNumber',
]);

function DetailSection({ title, data, excludeKeys = [] }) {
  const items = objectToInfoItems(data, { excludeKeys });
  if (!items.length) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">{title}</h3>
      <dl className="app-review-grid">
        {items.map(({ label, value }) => (
          <div key={label} className="app-review-field">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function medicalFromLegacyStudent(student) {
  if (!student) return null;
  const medical = {};
  MEDICAL_FIELD_KEYS.forEach((key) => {
    if (student[key] != null && student[key] !== '') {
      medical[key] = student[key];
    }
  });
  return Object.keys(medical).length ? medical : null;
}

export function ApplicationOverviewSection({ child }) {
  const student = child?.student || {};
  const classLabel = child?.className
    || (student.classApplying ? String(student.classApplying).toUpperCase() : null);

  const meta = [
    { label: 'Application No.', value: formatDisplayValue(child?.applicationNo) },
    { label: 'Class Applying', value: formatDisplayValue(classLabel) },
    { label: 'Submitted On', value: formatShortDate(child?.submittedAt) },
    { label: 'Last Updated', value: formatShortDate(child?.updatedAt) },
    {
      label: 'Form Type',
      value: child?.formType === 'kidzee_printable' ? 'Kidzee Printable' : 'Standard Enrollment',
    },
  ].filter((item) => item.value !== '—' || item.label === 'Application No.');

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">Application Overview</h3>
      <dl className="app-review-meta">
        {meta.map(({ label, value }) => (
          <div key={label} className="app-review-meta-item">
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function StandardApplicationSections({ child }) {
  const studentData = { ...(child?.student || {}) };
  MEDICAL_FIELD_KEYS.forEach((key) => {
    delete studentData[key];
  });

  const sections = [
    { key: 'student', data: studentData },
    { key: 'parent', data: child?.parent },
    { key: 'address', data: child?.address },
    { key: 'academic', data: child?.academic },
    {
      key: 'medical',
      data: child?.medical || medicalFromLegacyStudent(child?.student),
    },
  ];

  return (
    <>
      {sections.map(({ key, data }) => (
        <DetailSection key={key} title={SECTION_TITLES[key]} data={data} />
      ))}
    </>
  );
}

export function KidzeeApplicationSections({ child }) {
  const app = {
    ...child,
    id: child.applicationId,
    formData: child.formData || child.printableEnrollment,
    printableEnrollment: child.formData || child.printableEnrollment,
  };

  return (
    <div className="parent-enrollment-kidzee">
      <KidzeeApplicationDetails app={app} includeOfficeUse={false} />
    </div>
  );
}

const DOC_COLUMNS = [
  {
    label: 'Document',
    primary: true,
    render: (row) => formatFieldLabel(row.key),
  },
  {
    label: 'File',
    muted: true,
    render: (row) => row.doc?.name || 'Not uploaded',
  },
  {
    label: 'Status',
    badge: true,
    render: (row) => (
      <StatusBadge
        status={docStatusKey(row.doc?.status)}
        variant={
          row.doc?.status === 'verified'
            ? 'success'
            : row.doc?.status === 'rejected'
              ? 'danger'
              : 'warning'
        }
      >
        {row.doc?.status || 'pending'}
      </StatusBadge>
    ),
  },
];

export function DocumentsSection({ documents, documentsLink }) {
  const rows = Object.entries(documents || {}).map(([key, doc]) => ({ key, doc }));
  if (!rows.length) return null;

  const verified = rows.filter((r) => r.doc?.status === 'verified').length;

  return (
    <section className="sb-card app-review-card">
      <div className="parent-enrollment-section-head">
        <h3 className="app-review-card-title">Submitted Documents</h3>
        <span className="parent-enrollment-doc-badge">
          {verified} of {rows.length} verified
        </span>
      </div>
      <ResponsiveDataTable
        nested
        columns={DOC_COLUMNS}
        data={rows}
        keyExtractor={(row) => row.key}
        minWidth={480}
      />
      {documentsLink && (
        <p className="parent-enrollment-section__footer">
          <Link to={documentsLink}>Manage documents</Link>
        </p>
      )}
    </section>
  );
}

export function FeeSection({ fee, feesLink }) {
  if (!fee) return null;

  const breakdownEntries = fee.breakdown
    ? Object.entries(fee.breakdown).filter(([, value]) => value != null && value !== '')
    : [];

  return (
    <section className="sb-card app-review-card">
      <div className="parent-enrollment-section-head">
        <h3 className="app-review-card-title">Fee Status</h3>
        <StatusBadge
          status={
            fee.status === 'verified'
              ? 'fee_verified'
              : fee.status === 'payment_submitted'
                ? 'fee_submitted'
                : 'fee_pending'
          }
          variant={
            fee.status === 'verified'
              ? 'success'
              : fee.status === 'payment_submitted'
                ? 'info'
                : 'warning'
          }
        >
          {feeStatusLabel(fee.status)}
        </StatusBadge>
      </div>

      {breakdownEntries.length > 0 && (
        <div className="parent-enrollment-fee-breakdown">
          {breakdownEntries.map(([key, value]) => (
            <div
              key={key}
              className={`app-review-fee-row${key === 'discount' ? ' discount' : ''}`}
            >
              <span>{formatFieldLabel(key)}</span>
              <span>₹{Number(value ?? 0).toLocaleString('en-IN')}</span>
            </div>
          ))}
          {fee.total != null && (
            <div className="app-review-fee-row total">
              <span>Total Payable</span>
              <span>₹{Number(fee.total).toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>
      )}

      {fee.total != null && breakdownEntries.length === 0 && (
        <div className="app-review-fee-row total">
          <span>Total Payable</span>
          <span>₹{Number(fee.total).toLocaleString('en-IN')}</span>
        </div>
      )}

      {fee.payment && (
        <div className="app-review-fee-meta">
          {fee.payment.method && <div>Method: {fee.payment.method}</div>}
          {fee.payment.transactionId && <div>Txn ID: {fee.payment.transactionId}</div>}
          {fee.payment.receiptNo && <div>Receipt: {fee.payment.receiptNo}</div>}
          {fee.payment.submittedAt && (
            <div>Submitted: {formatShortDate(fee.payment.submittedAt)}</div>
          )}
          {fee.payment.rejectedReason && (
            <div>Rejection reason: {fee.payment.rejectedReason}</div>
          )}
        </div>
      )}

      {feesLink && fee.status !== 'verified' && (
        <p className="parent-enrollment-section__footer">
          <Link to={feesLink}>Go to fee payment</Link>
        </p>
      )}
    </section>
  );
}

export function DeclarationSection({ declaration, signature }) {
  if (!declaration && !signature) return null;

  const consentItems = Object.entries(declaration || {})
    .filter(([key, value]) => key !== 'signature' && key !== 'signatureDate' && typeof value === 'boolean')
    .map(([key, value]) => ({
      label: formatFieldLabel(key),
      value: formatDisplayValue(value),
    }));

  const signatureDate = declaration?.signatureDate || signature?.date;
  const signatureData = declaration?.signature
    || (typeof signature?.data === 'string' && signature.data.startsWith('data:image/')
      ? signature.data
      : null);
  const signed = Boolean(signatureData)
    || declaration?.signature
    || signature?.signed;

  if (!consentItems.length && !signatureDate && !signed) return null;

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">Declaration & Signature</h3>
      {consentItems.length > 0 && (
        <dl className="app-review-grid">
          {consentItems.map(({ label, value }) => (
            <div key={label} className="app-review-field">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {(signatureDate || signed) && (
        <dl className="app-review-grid mt-3">
          {signatureDate && (
            <div className="app-review-field">
              <dt>Signature Date</dt>
              <dd>{formatDisplayValue(signatureDate)}</dd>
            </div>
          )}
          {signed && !signatureData && (
            <div className="app-review-field">
              <dt>Digital Signature</dt>
              <dd>Signed</dd>
            </div>
          )}
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

export function StatusTimelineSection({ timeline }) {
  if (!timeline?.length) {
    return (
      <section className="sb-card app-review-card">
        <h3 className="app-review-card-title">Status Timeline</h3>
        <p className="text-sm text-[#45474c]">No status updates yet.</p>
      </section>
    );
  }

  return (
    <section className="sb-card app-review-card">
      <h3 className="app-review-card-title">Status Timeline</h3>
      <div className="app-review-timeline">
        {timeline.map((entry, index) => {
          const isCurrent = index === timeline.length - 1;
          return (
            <div
              key={`${entry.status}-${entry.date}`}
              className={`app-review-timeline-item done${isCurrent ? ' is-current' : ''}`}
            >
              <div className="app-review-timeline-dot" />
              <div className="app-review-timeline-content">
                <h4>
                  {entry.statusLabel || entry.status?.replace(/_/g, ' ')}
                  {isCurrent && (
                    <span className="parent-enrollment-timeline-current">Current</span>
                  )}
                </h4>
                <p>
                  {[entry.note, entry.dateFormatted].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
