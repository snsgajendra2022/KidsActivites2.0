import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  UserCheck,
  Layers,
  SearchX,
  User,
  FileText,
  ExternalLink,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import { EmptyState } from '../../components/ui/index.jsx';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import BentoStatCard from '../../components/dashboard/BentoStatCard.jsx';
import { getEnrolledStudents, updateStudentClass } from '../../services/enrollmentService.js';
import { listClasses } from '../../services/classManagementService.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { ENROLLMENT_STATUSES } from '../../constants/enrollmentStatuses.js';
import '../../styles/admin-users.css';
import '../../styles/admin-modules.css';
import '../../styles/admin-teachers.css';

function studentInitials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'S';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function resolveClassLabel(classValue, classOptions) {
  if (!classValue) return null;
  const match = classOptions.find(
    (opt) => opt.value.toLowerCase() === String(classValue).toLowerCase(),
  );
  return match?.label || classValue.toUpperCase();
}

function StudentCardSkeleton() {
  return (
    <div className="admin-teacher-card-skeleton" aria-hidden>
      <div className="admin-teacher-card-skeleton__bar" />
      <div className="admin-teacher-card-skeleton__body">
        <div className="admin-teacher-card-skeleton__head">
          <div className="admin-teacher-card-skeleton__avatar" />
          <div className="admin-teacher-card-skeleton__lines">
            <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--md" />
            <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--sm" />
          </div>
        </div>
        <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--lg" />
        <div className="admin-teacher-card-skeleton__tags">
          <div className="admin-teacher-card-skeleton__pill" />
          <div className="admin-teacher-card-skeleton__pill" />
        </div>
        <div className="admin-teacher-card-skeleton__line admin-teacher-card-skeleton__line--md" />
      </div>
    </div>
  );
}

function StudentCard({ student, classOptions, onSaved, applicationPath }) {
  const { toast } = useToast();
  const [selectedClass, setSelectedClass] = useState(student.classApplying || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setSelectedClass(student.classApplying || '');
  }, [student.classApplying]);

  const isDirty = selectedClass !== (student.classApplying || '');
  const currentClassLabel = resolveClassLabel(student.classApplying, classOptions);

  const handleUpdateClass = async () => {
    if (!selectedClass || !isDirty) return;
    setSaving(true);
    try {
      const updated = await updateStudentClass(student.id, selectedClass);
      onSaved(updated);
      toast(`Class updated for ${student.name || 'student'}.`, 'success');
    } catch (err) {
      toast(err.message || 'Failed to update class', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="admin-teacher-card admin-teacher-card--student">
      <div className="admin-teacher-card__inner">
        <div className="admin-teacher-card__head">
          <div className="admin-teacher-card__avatar-wrap">
            <div className="admin-teacher-card__avatar" aria-hidden>
              {studentInitials(student.name)}
            </div>
          </div>
          <div className="admin-teacher-card__meta">
            <h2 className="admin-teacher-card__name">{student.name || 'Unnamed Student'}</h2>
            {student.applicationNo && (
              <p className="admin-teacher-card__employee">App No. · {student.applicationNo}</p>
            )}
            <StatusBadge status={student.status} className="admin-student-card__status" />
          </div>
        </div>

        {(student.parentName || student.submittedAt) && (
          <div className="admin-teacher-card__contact">
            {student.parentName ? (
              <div className="admin-teacher-card__contact-item" title={student.parentName}>
                <span className="admin-teacher-card__contact-icon">
                  <User size={13} aria-hidden />
                </span>
                <span>{student.parentName}</span>
              </div>
            ) : null}
            {student.submittedAt ? (
              <div className="admin-teacher-card__contact-item">
                <span className="admin-teacher-card__contact-icon">
                  <FileText size={13} aria-hidden />
                </span>
                <span>Submitted {new Date(student.submittedAt).toLocaleDateString()}</span>
              </div>
            ) : null}
          </div>
        )}

        <div className="admin-student-card__class">
          <div className="admin-student-card__class-header">
            <p className="admin-teacher-card__section-label">
              <Layers size={11} aria-hidden />
              Class
            </p>
            {currentClassLabel ? (
              <span className="admin-teacher-card__tag admin-teacher-card__tag--class">
                {currentClassLabel}
              </span>
            ) : (
              <span className="admin-teacher-card__tag admin-teacher-card__tag--empty">
                Not assigned
              </span>
            )}
          </div>
          <div className="admin-student-card__class-row">
            <select
              className="admin-users-filters__select admin-student-card__class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={saving || classOptions.length === 0}
              aria-label={`Class for ${student.name || student.applicationNo}`}
            >
              <option value="">Select class</option>
              {classOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              loading={saving}
              disabled={!isDirty || !selectedClass || saving}
              onClick={handleUpdateClass}
              className="admin-student-card__update-btn"
            >
              Update
            </Button>
          </div>
        </div>

        <div className="admin-teacher-card__actions admin-teacher-card__actions--single">
          <Link
            to={applicationPath}
            className="admin-teacher-card__action-btn admin-teacher-card__action-btn--secondary"
          >
            <ExternalLink size={15} aria-hidden />
            View Application
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function AdminStudents() {
  const { school, isPlatformAdmin } = usePortalConfig();
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();

  const [students, setStudents] = useState([]);
  const [classOptions, setClassOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadData = useCallback(() => {
    setLoading(true);
    setLoadError(null);

    return Promise.all([
      getEnrolledStudents(),
      listClasses({ status: 'active' }),
    ])
      .then(([studentData, classes]) => {
        setStudents(Array.isArray(studentData) ? studentData : []);
        setClassOptions(
          (Array.isArray(classes) ? classes : [])
            .map((cls) => ({
              value: cls.code,
              label: cls.name || cls.code?.toUpperCase(),
            }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load students');
        setStudents([]);
        setClassOptions([]);
        toast(err.message || 'Failed to load students', 'error');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClassSaved = useCallback((updated) => {
    setStudents((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
  }, []);

  const filteredStudents = useMemo(() => {
    const query = search.toLowerCase();
    return students.filter((student) => {
      const classLabel = resolveClassLabel(student.classApplying, classOptions);
      const matchesSearch = !query || [
        student.name,
        student.applicationNo,
        student.parentName,
        student.classApplying,
        classLabel,
      ].some((value) => String(value || '').toLowerCase().includes(query));

      const matchesClass = !classFilter
        || (student.classApplying || '').toLowerCase() === classFilter.toLowerCase();

      return matchesSearch && matchesClass;
    });
  }, [students, search, classFilter, classOptions]);

  const stats = useMemo(() => ({
    total: students.length,
    withClass: students.filter((s) => s.classApplying).length,
    confirmed: students.filter((s) => s.status === ENROLLMENT_STATUSES.ADMISSION_CONFIRMED).length,
  }), [students]);

  const showInitialLoading = loading && !students.length && !loadError;
  const hasFilters = Boolean(search) || Boolean(classFilter);

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Students"
          subtitle={
            isPlatformAdmin
              ? `Enrolled students for ${school?.name || 'selected school'}. Confirm admission on approved applications to add students here.`
              : `Manage confirmed students and class assignments at ${school?.name || 'your school'}.`
          }
        />

        <div className="admin-users-filters">
          <Input
            placeholder="Search name, application no., parent, class…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="admin-users-filters__search"
          />
          <select
            className="admin-users-filters__select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            aria-label="Filter by class"
          >
            <option value="">All classes</option>
            {classOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {!showInitialLoading && !loadError && students.length > 0 && (
          <div className="admin-teachers-stats">
            <BentoStatCard icon={Users} value={stats.total} label="Total Students" variant="indigo" />
            <BentoStatCard icon={UserCheck} value={stats.withClass} label="Class Assigned" variant="emerald" />
            <BentoStatCard icon={Layers} value={stats.confirmed} label="Admission Confirmed" variant="rose" />
          </div>
        )}

        {loadError ? (
          <EmptyState
            icon={GraduationCap}
            title="Could Not Load Students"
            description={loadError}
            action={(
              <Button variant="primary" onClick={loadData}>
                Try Again
              </Button>
            )}
          />
        ) : showInitialLoading ? (
          <div className="admin-teachers-loading" aria-busy="true" aria-label="Loading students">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <StudentCardSkeleton key={i} />
            ))}
          </div>
        ) : students.length === 0 && !hasFilters ? (
          <EmptyState
            icon={GraduationCap}
            title="No Students Yet"
            description="Students appear here after you confirm admission on an approved application. Review pending applications, verify fees, and confirm admission to enroll students."
            action={(
              <Link to={tenantPath('/admin/applications')}>
                <Button variant="primary">Review Applications</Button>
              </Link>
            )}
          />
        ) : (
          <div className="admin-teachers-grid">
            {filteredStudents.length === 0 ? (
              <div className="admin-teachers-empty-filter">
                <div className="admin-teachers-empty-filter__icon">
                  <SearchX size={24} aria-hidden />
                </div>
                <p className="admin-teachers-empty-filter__title">No matching students</p>
                <p className="admin-teachers-empty-filter__desc">
                  Try adjusting your search or class filter to find the student you&apos;re looking for.
                </p>
              </div>
            ) : filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                classOptions={classOptions}
                onSaved={handleClassSaved}
                applicationPath={tenantPath(`/admin/applications/${student.id}`)}
              />
            ))}
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
