import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, ClipboardCheck } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import Select from '../../components/ui/Select.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import AttendanceFilters, {
  monthStartISODate,
  todayISODate,
} from '../../components/attendance/AttendanceFilters.jsx';
import AttendanceSummaryCards from '../../components/attendance/AttendanceSummaryCards.jsx';
import AttendanceStatusChip, {
  ATTENDANCE_STATUS_CODES,
  getAttendanceStatusLabel,
} from '../../components/attendance/AttendanceStatusChip.jsx';
import { getStudentAttendanceHistory } from '../../services/attendanceService.js';
import { getParentChildren, getParentDashboard } from '../../services/parentService.js';
import { ROLES } from '../../constants/roles.js';
import '../../styles/admin-modules.css';

const MSG = {
  empty: 'No attendance records found for this period.',
  loadError: 'Unable to load attendance. Please check your connection and try again.',
};

function resolveChildStudentId(child) {
  return child?.studentId
    || child?.student?.id
    || child?.student?.studentId
    || child?.applicationId
    || child?.id
    || '';
}

function childLabel(child) {
  return child?.studentName
    || child?.student?.fullName
    || [child?.student?.firstName, child?.student?.lastName].filter(Boolean).join(' ')
    || child?.applicationNo
    || 'Child';
}

export default function StudentAttendanceHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { studentId: routeStudentId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const queryStudentId = searchParams.get('studentId') || '';

  const [from, setFrom] = useState(monthStartISODate());
  const [to, setTo] = useState(todayISODate());
  const [children, setChildren] = useState([]);
  const [manualStudentId, setManualStudentId] = useState('');
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isParent = user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT;
  const studentId = routeStudentId || queryStudentId || manualStudentId;

  useEffect(() => {
    if (!isParent || !user) return undefined;
    let cancelled = false;

    (async () => {
      try {
        let list = [];
        try {
          list = await getParentChildren(user);
        } catch {
          const dash = await getParentDashboard(user.id, user.schoolId, user);
          list = dash?.children || [];
        }
        if (cancelled) return;
        const normalized = Array.isArray(list) ? list : [];
        setChildren(normalized);
        if (!studentId && normalized.length === 1) {
          const id = resolveChildStudentId(normalized[0]);
          if (id) {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev);
              next.set('studentId', id);
              return next;
            }, { replace: true });
          }
        }
      } catch {
        if (!cancelled) setChildren([]);
      }
    })();

    return () => { cancelled = true; };
  }, [isParent, user]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!studentId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear when no student selected
      setHistory(null);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    getStudentAttendanceHistory(studentId, {
      from: from || undefined,
      to: to || undefined,
    })
      .then((data) => {
        if (!cancelled) setHistory(data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setHistory(null);
          setError(err?.message || MSG.loadError);
          toast(err?.message || MSG.loadError, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [studentId, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const records = history?.records || [];
  const summary = history?.summary || null;
  const student = history?.student || null;

  const childOptions = useMemo(
    () => children.map((child) => ({
      value: resolveChildStudentId(child),
      label: `${childLabel(child)}${child.className ? ` · ${child.className}` : ''}`,
    })).filter((o) => o.value),
    [children],
  );

  const handleChildChange = (value) => {
    setManualStudentId(value);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set('studentId', value);
      else next.delete('studentId');
      return next;
    }, { replace: true });
  };

  const title = student?.name
    ? `${student.name} · Attendance`
    : 'Attendance History';

  const subtitle = student?.className
    ? `${student.className}${student.sectionName ? ` · ${student.sectionName}` : ''}`
    : 'View daily attendance status and monthly summary.';

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader title={title} subtitle={subtitle} />

        <div className="mb-4 rounded-xl border border-[#e8ebf2] bg-white p-4">
          <div className="flex flex-wrap items-end gap-3">
            {isParent && childOptions.length > 1 && !routeStudentId && (
              <Select
                id="attendance-child"
                label="Child"
                placeholder="Select child"
                value={studentId}
                options={childOptions}
                onChange={(e) => handleChildChange(e.target.value)}
              />
            )}
            {!isParent && !routeStudentId && (
              <div className="form-field">
                <label className="form-label" htmlFor="attendance-student-id">Student ID</label>
                <input
                  id="attendance-student-id"
                  className="form-input"
                  value={studentId}
                  onChange={(e) => handleChildChange(e.target.value.trim())}
                  placeholder="Enter student id"
                />
              </div>
            )}
            <AttendanceFilters
              mode="range"
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {ATTENDANCE_STATUS_CODES.map((code) => (
            <AttendanceStatusChip key={code} status={code} label={getAttendanceStatusLabel(code)} />
          ))}
        </div>

        {!studentId ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Select a student"
            description={isParent ? 'Choose a child to view attendance history.' : 'Provide a student id to load history.'}
          />
        ) : loading ? (
          <LoadingState message="Loading attendance history…" />
        ) : error ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Unable to load"
            description={error}
          />
        ) : (
          <>
            {summary && <AttendanceSummaryCards summary={summary} className="mb-4" />}

            {records.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No records"
                description={MSG.empty}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#e8ebf2] bg-white">
                <ul className="divide-y divide-[#eef0f5]">
                  {records.map((record) => (
                    <li
                      key={`${record.date}-${record.status}-${record.markedAt || ''}`}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-[#0b1c30]">
                          {new Date(record.date).toLocaleDateString(undefined, {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        {record.note ? (
                          <p className="mt-0.5 text-sm text-[#5a6270]">{record.note}</p>
                        ) : null}
                        {record.markedAt && (
                          <p className="mt-0.5 text-[11px] text-[#8a93a3]">
                            Marked {new Date(record.markedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <AttendanceStatusChip status={record.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
