import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, ClipboardCheck, UserRound } from 'lucide-react';
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

function formatDayLabel(dateValue) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateValue;
  return parsed.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRangeLabel(from, to) {
  if (!from && !to) return null;
  const start = from ? formatDayLabel(from) : '…';
  const end = to ? formatDayLabel(to) : '…';
  return `${start} → ${end}`;
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
  const selectedChild = useMemo(
    () => children.find((child) => resolveChildStudentId(child) === studentId) || null,
    [children, studentId],
  );

  const displayName = student?.name
    || (selectedChild ? childLabel(selectedChild) : '')
    || '';
  const displayClass = student?.className
    || selectedChild?.className
    || selectedChild?.student?.className
    || '';
  const displaySection = student?.sectionName
    || selectedChild?.sectionName
    || '';
  const rangeLabel = formatRangeLabel(history?.from || from, history?.to || to);
  const percentage = summary?.percentage;

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

  const title = displayName ? `${displayName} · Attendance` : 'Attendance History';
  const subtitle = displayClass
    ? `${displayClass}${displaySection ? ` · ${displaySection}` : ''}`
    : 'Daily attendance status and period summary for your child.';

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
            <div className="mb-4 overflow-hidden rounded-2xl border border-[#e8ebf2] bg-gradient-to-br from-[#0b1c30] to-[#1a3a5c] p-5 text-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
                    <UserRound size={22} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
                      Attendance overview
                    </p>
                    <h2 className="mt-1 text-xl font-bold tracking-tight">
                      {displayName || 'Student'}
                    </h2>
                    <p className="mt-1 text-sm text-white/70">
                      {[displayClass, displaySection, rangeLabel].filter(Boolean).join(' · ') || 'Selected period'}
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 px-5 py-3 text-center backdrop-blur-sm">
                  <p className="text-3xl font-bold tabular-nums">
                    {percentage != null ? `${Number(percentage).toFixed(0)}%` : '—'}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/60">
                    Present rate
                  </p>
                </div>
              </div>
            </div>

            {summary && <AttendanceSummaryCards summary={summary} className="mb-4" />}

            {records.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No records"
                description={MSG.empty}
              />
            ) : (
              <div className="overflow-hidden rounded-xl border border-[#e8ebf2] bg-white">
                <div className="flex items-center justify-between gap-3 border-b border-[#eef0f5] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0b1c30]">Daily records</p>
                    <p className="text-xs text-[#8a93a3]">
                      {records.length} day{records.length === 1 ? '' : 's'} in this period
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-[#eef0f5]">
                  {records.map((record) => (
                    <li
                      key={record.recordId || `${record.date}-${record.status}-${record.sessionId || ''}`}
                      className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0b1c30]">
                          {formatDayLabel(record.date)}
                        </p>
                        <p className="mt-0.5 text-sm text-[#5a6270]">
                          {record.displayNote || getAttendanceStatusLabel(record.status)}
                        </p>
                        {record.markedAt ? (
                          <p className="mt-0.5 text-[11px] text-[#8a93a3]">
                            Marked {new Date(record.markedAt).toLocaleString()}
                          </p>
                        ) : null}
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
