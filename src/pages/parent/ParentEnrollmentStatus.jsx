import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Plus, User, MapPin, GraduationCap } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { getParentDashboard, getParentChild } from '../../services/parentService.js';
import { ENROLLMENT_STATUSES, STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import '../../styles/parent-enrollment.css';

function formatDisplayValue(value) {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function formatGender(value) {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatTimelineDate(iso) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function statusBadgeVariant(status) {
  if (status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED || status === ENROLLMENT_STATUSES.ACCOUNT_CREATED) return 'success';
  if (status === ENROLLMENT_STATUSES.REJECTED || status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) return 'danger';
  if (status === ENROLLMENT_STATUSES.FEE_PENDING) return 'warning';
  return 'info';
}

function timelineItemTone(status) {
  if (status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) return 'is-warning';
  if (status === ENROLLMENT_STATUSES.REJECTED) return 'is-danger';
  return '';
}

/** Collapse noisy duplicate timeline entries for parent view */
function normalizeStatusHistory(history = []) {
  const sorted = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
  const result = [];
  const repeatCounts = {};

  sorted.forEach((entry) => {
    const prev = result[result.length - 1];
    if (prev && prev.status === entry.status && (prev.note || '') === (entry.note || '')) {
      result[result.length - 1] = entry;
      return;
    }

    repeatCounts[entry.status] = (repeatCounts[entry.status] || 0) + 1;
    if (
      (entry.status === ENROLLMENT_STATUSES.ACCOUNT_CREATED
        || entry.status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED)
      && repeatCounts[entry.status] > 1
    ) {
      return;
    }

    result.push(entry);
  });

  return result;
}

function InfoGrid({ items }) {
  return (
    <dl className="parent-enrollment-info-grid">
      {items.map(({ label, value }) => (
        <div key={label} className="parent-enrollment-info-item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ParentEnrollmentStatus() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('child');
  const [dashboard, setDashboard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getParentDashboard(user.id, user.schoolId, user)
      .then(async (data) => {
        setDashboard(data);
        if (childId) {
          const child = await getParentChild(user.id, childId, user);
          setSelected(child);
        } else if (data.children?.length === 1) {
          setSelected(data.children[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [user, childId]);

  const timeline = useMemo(
    () => normalizeStatusHistory(selected?.statusHistory),
    [selected?.statusHistory],
  );

  if (loading) {
    return (
      <AppLayout>
        <p className="parent-enrollment-loading">Loading enrollment details…</p>
      </AppLayout>
    );
  }

  const { children = [], enrollPath, school } = dashboard || {};
  const child = selected || (childId ? children.find((c) => c.applicationId === childId) : null);

  return (
    <AppLayout>
      <PageTransition>
        <div className="parent-enrollment-page">
          <header className="parent-enrollment-header">
            <div>
              <Link to="/parent/dashboard" className="parent-enrollment-back">
                <ArrowLeft size={16} /> Back to Dashboard
              </Link>
              <h1>Enrollment Status</h1>
              <p>{school?.name} — track each child&apos;s application</p>
            </div>
            <Link to={enrollPath || '/enrollment'} className="parent-enrollment-enroll-btn">
              <Plus size={16} /> Enroll Another Child
            </Link>
          </header>

          {children.length > 1 && (
            <div className="parent-enrollment-tabs">
              {children.map((c) => (
                <Link
                  key={c.applicationId}
                  to={`/parent/enrollment?child=${c.applicationId}`}
                  className={`parent-enrollment-tab${child?.applicationId === c.applicationId ? ' is-active' : ''}`}
                >
                  {c.student?.fullName || 'Child'}
                </Link>
              ))}
            </div>
          )}

          {!child ? (
            <div className="parent-enrollment-empty">
              No enrollment selected.{' '}
              <Link to={enrollPath || '/enrollment'}>Start a new enrollment</Link>
            </div>
          ) : (
            <>
              <section className="parent-enrollment-summary">
                <div>
                  <h2 className="parent-enrollment-summary__name">{child.student?.fullName}</h2>
                  <p className="parent-enrollment-summary__meta">
                    {child.applicationNo} · {child.statusLabel}
                  </p>
                </div>
                <StatusBadge
                  status={child.status}
                  variant={statusBadgeVariant(child.status)}
                  className="parent-enrollment-summary__badge"
                >
                  {child.statusLabel}
                </StatusBadge>
              </section>

              <section className="parent-enrollment-section">
                <h3 className="parent-enrollment-section__title">
                  <GraduationCap size={20} /> Student Information
                </h3>
                <InfoGrid items={[
                  { label: 'Full Name', value: formatDisplayValue(child.student?.fullName) },
                  { label: 'Date of Birth', value: formatDisplayValue(child.student?.dateOfBirth) },
                  { label: 'Gender', value: formatGender(child.student?.gender) },
                  { label: 'Blood Group', value: formatDisplayValue(child.student?.bloodGroup) },
                  { label: 'Class Applying', value: formatDisplayValue(child.student?.classApplying?.toUpperCase()) },
                  { label: 'Previous School', value: formatDisplayValue(child.student?.previousSchool) },
                  { label: 'Nationality', value: formatDisplayValue(child.student?.nationality) },
                  { label: 'Allergies', value: formatDisplayValue(child.student?.allergies) },
                  { label: 'Medical Conditions', value: formatDisplayValue(child.student?.medicalConditions) },
                  { label: 'Emergency Contact', value: formatDisplayValue(child.student?.emergencyContactName) },
                ]} />
              </section>

              <section className="parent-enrollment-section">
                <h3 className="parent-enrollment-section__title">
                  <User size={20} /> Parent / Guardian
                </h3>
                <InfoGrid items={[
                  { label: 'Father', value: formatDisplayValue(child.parent?.fatherName) },
                  { label: 'Father Mobile', value: formatDisplayValue(child.parent?.fatherMobile) },
                  { label: 'Father Email', value: formatDisplayValue(child.parent?.fatherEmail) },
                  { label: 'Mother', value: formatDisplayValue(child.parent?.motherName) },
                  { label: 'Mother Mobile', value: formatDisplayValue(child.parent?.motherMobile) },
                  { label: 'Alternate Contact', value: formatDisplayValue(child.parent?.alternateContact) },
                ]} />
              </section>

              <section className="parent-enrollment-section">
                <h3 className="parent-enrollment-section__title">
                  <MapPin size={20} /> Address
                </h3>
                <InfoGrid items={[
                  { label: 'Current Address', value: formatDisplayValue(child.address?.currentAddress) },
                  { label: 'City', value: formatDisplayValue(child.address?.city) },
                  { label: 'State', value: formatDisplayValue(child.address?.state) },
                  { label: 'PIN / ZIP', value: formatDisplayValue(child.address?.pinCode) },
                  { label: 'Country', value: formatDisplayValue(child.address?.country) },
                ]} />
              </section>

              <section className="parent-enrollment-section">
                <h3 className="parent-enrollment-section__title">Status Timeline</h3>
                <div className="parent-enrollment-timeline">
                  {timeline.map((entry, index) => {
                    const isCurrent = index === timeline.length - 1;
                    const tone = timelineItemTone(entry.status);
                    return (
                      <div
                        key={`${entry.status}-${entry.date}`}
                        className={`parent-enrollment-timeline-item${isCurrent ? ' is-current' : ''}${tone ? ` ${tone}` : ''}`}
                      >
                        <div className="parent-enrollment-timeline-dot">
                          <CheckCircle2 size={14} />
                        </div>
                        <div>
                          <p className="parent-enrollment-timeline-status">
                            {STATUS_LABELS[entry.status] || entry.status.replace(/_/g, ' ')}
                          </p>
                          {entry.note && (
                            <p className="parent-enrollment-timeline-note">{entry.note}</p>
                          )}
                          <p className="parent-enrollment-timeline-date">
                            {formatTimelineDate(entry.date)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}
