import { useEffect, useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, GraduationCap, FileText, CreditCard, FolderOpen, CheckCircle2,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import {
  ApplicationOverviewSection,
  StandardApplicationSections,
  KidzeeApplicationSections,
  DocumentsSection,
  FeeSection,
  DeclarationSection,
  StatusTimelineSection,
} from '../../components/parent/ParentEnrollmentSections.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { getParentDashboard, getParentEnrollmentDetail } from '../../services/parentService.js';
import { ENROLLMENT_STATUSES, STATUS_LABELS } from '../../constants/enrollmentStatuses.js';
import { feeStatusLabel, formatTimelineDate } from '../../utils/parentEnrollmentDisplay.js';
import '../../styles/application-review.css';
import '../../styles/parent-enrollment.css';

function statusBadgeVariant(status) {
  if (status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED || status === ENROLLMENT_STATUSES.ACCOUNT_CREATED) return 'success';
  if (status === ENROLLMENT_STATUSES.REJECTED || status === ENROLLMENT_STATUSES.CORRECTION_REQUIRED) return 'danger';
  if (status === ENROLLMENT_STATUSES.FEE_PENDING) return 'warning';
  return 'info';
}

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

function countDocs(documents) {
  const rows = documents ? Object.values(documents) : [];
  const total = rows.length;
  const verified = rows.filter((d) => d?.status === 'verified').length;
  return { total, verified };
}

export default function ParentEnrollmentStatus() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [searchParams] = useSearchParams();
  const childId = searchParams.get('child');
  const [dashboard, setDashboard] = useState(null);
  const [selected, setSelected] = useState(null);
  const [fee, setFee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        if (childId) {
          const detail = await getParentEnrollmentDetail(childId, user);
          if (cancelled) return;
          setDashboard({
            children: detail.children || [],
            school: detail.school,
          });
          setSelected(detail.child);
          setFee(detail.fee);
          return;
        }

        const data = await getParentDashboard(user.id, user.schoolId, user);
        if (cancelled) return;

        if (data.children?.length === 1) {
          const detail = await getParentEnrollmentDetail(data.children[0].applicationId, user);
          if (cancelled) return;
          setDashboard({
            children: detail.children || data.children,
            school: detail.school || data.school,
          });
          setSelected(detail.child);
          setFee(detail.fee);
          return;
        }

        setDashboard(data);
        setSelected(null);
        setFee(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (user?.id) load();
    return () => { cancelled = true; };
  }, [user, childId]);

  const timeline = useMemo(
    () => normalizeStatusHistory(selected?.statusHistory).map((entry) => ({
      ...entry,
      statusLabel: STATUS_LABELS[entry.status] || entry.status?.replace(/_/g, ' '),
      dateFormatted: formatTimelineDate(entry.date),
    })),
    [selected?.statusHistory],
  );

  if (loading) {
    return (
      <AppLayout>
        <LoadingState message="Loading enrollment details…" />
      </AppLayout>
    );
  }

  const { children = [], school } = dashboard || {};
  const enrollmentHref = tenantPath('/enrollment/kidzee-print-form');
  const child = selected || (childId ? children.find((c) => c.applicationId === childId) : null);
  const isKidzee = child?.formType === 'kidzee_printable';
  const documentsLink = tenantPath('/parent/documents');
  const feesLink = tenantPath('/parent/fees');
  const childName = child?.student?.fullName || child?.studentName || 'Student';
  const classLabel = child?.className
    || (child?.student?.classApplying ? String(child.student.classApplying).toUpperCase() : null);
  const docStats = countDocs(child?.documents);
  const docsStatValue = docStats.total
    ? (docStats.verified === docStats.total ? 'All verified' : `${docStats.verified}/${docStats.total}`)
    : '—';

  return (
    <AppLayout>
      <PageTransition>
        <div className="parent-enrollment-page">
          <Link to={tenantPath('/parent/dashboard')} className="app-review-back">
            <ArrowLeft size={16} aria-hidden />
            Back to Dashboard
          </Link>

          <PageHeader
            title="Enrollment Status"
            subtitle={
              child
                ? `${childName}${school?.name ? ` · ${school.name}` : ''}`
                : school?.name || 'Track your children\'s enrollment applications'
            }
            actions={(
              <Link to={enrollmentHref} className="premium-btn premium-btn-primary premium-btn-sm">
                <Plus size={16} aria-hidden />
                Enroll Another Child
              </Link>
            )}
          />

          {children.length > 1 && (
            <div className="parent-enrollment-tabs" role="tablist" aria-label="Select child">
              {children.map((c) => {
                const name = c.student?.fullName || c.studentName || 'Child';
                const isActive = child?.applicationId === c.applicationId;
                return (
                  <Link
                    key={c.applicationId}
                    to={tenantPath(`/parent/enrollment?child=${c.applicationId}`)}
                    role="tab"
                    aria-selected={isActive}
                    className={`parent-enrollment-tab${isActive ? ' is-active' : ''}`}
                  >
                    <GraduationCap size={14} aria-hidden />
                    {name}
                    {c.className && (
                      <span className="parent-enrollment-tab__class">{c.className}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {!child ? (
            <div className="sb-card parent-enrollment-empty">
              <div className="parent-enrollment-empty__icon" aria-hidden>
                <FileText size={28} />
              </div>
              {children.length > 1 ? (
                <>
                  <h2>Select a Child</h2>
                  <p>Choose a child above to view their enrollment details.</p>
                </>
              ) : (
                <>
                  <h2>No Enrollment Found</h2>
                  <p>Start a new enrollment application for your child.</p>
                  <Link to={enrollmentHref} className="premium-btn premium-btn-primary premium-btn-sm parent-enrollment-empty__cta">
                    <Plus size={16} aria-hidden />
                    Start Enrollment
                  </Link>
                </>
              )}
            </div>
          ) : (
            <>
              <div className="bento-grid parent-enrollment-stats">
                <div className="bento-span-3">
                  <BentoStatCard
                    icon={FileText}
                    value={child.statusLabel || child.status?.replace(/_/g, ' ')}
                    label="Application Status"
                    variant="indigo"
                  />
                </div>
                <div className="bento-span-3">
                  <BentoStatCard
                    icon={GraduationCap}
                    value={classLabel || '—'}
                    label="Class"
                    variant="emerald"
                  />
                </div>
                <div className="bento-span-3">
                  <BentoStatCard
                    icon={CreditCard}
                    value={fee ? feeStatusLabel(fee.status) : '—'}
                    label="Fee Status"
                    variant="amber"
                  />
                </div>
                <div className="bento-span-3">
                  <BentoStatCard
                    icon={FolderOpen}
                    value={docsStatValue}
                    label="Documents Verified"
                    variant="sky"
                  />
                </div>
              </div>

              <div className="parent-enrollment-hero sb-card">
                <div className="parent-enrollment-hero__main">
                  <h2 className="parent-enrollment-hero__name">{childName}</h2>
                  <p className="parent-enrollment-hero__meta">
                    {child.applicationNo && <span>{child.applicationNo}</span>}
                    {classLabel && <span>Class {classLabel}</span>}
                    {school?.academicYear && <span>{school.academicYear}</span>}
                  </p>
                </div>
                <StatusBadge
                  status={child.status}
                  variant={statusBadgeVariant(child.status)}
                >
                  {child.statusLabel}
                </StatusBadge>
              </div>

              <div className="parent-enrollment-layout">
                <div className="parent-enrollment-main">
                  <ApplicationOverviewSection child={child} />
                  {isKidzee ? (
                    <KidzeeApplicationSections child={child} />
                  ) : (
                    <StandardApplicationSections child={child} />
                  )}
                  <DocumentsSection documents={child.documents} documentsLink={documentsLink} />
                  <DeclarationSection declaration={child.declaration} signature={child.signature} />
                  <StatusTimelineSection timeline={timeline} />
                </div>

                <aside className="parent-enrollment-sidebar" aria-label="Fee summary">
                  <FeeSection fee={fee} feesLink={feesLink} />
                  {fee?.status === 'verified' && (
                    <div className="sb-card app-review-card parent-enrollment-sidebar-note">
                      <div className="parent-enrollment-sidebar-note__icon" aria-hidden>
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4>Fee Verified</h4>
                        <p>Your fee payment has been confirmed by the school.</p>
                      </div>
                    </div>
                  )}
                </aside>
              </div>
            </>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}
