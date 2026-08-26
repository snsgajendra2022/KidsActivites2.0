import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Users } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import AttendanceFilters, {
  buildClassKey,
  parseClassKey,
  todayISODate,
} from '../../components/attendance/AttendanceFilters.jsx';
import AttendanceSummaryCards from '../../components/attendance/AttendanceSummaryCards.jsx';
import AttendanceStudentRow from '../../components/attendance/AttendanceStudentRow.jsx';
import {
  finalizeAttendanceSession,
  getAttendanceClasses,
  getAttendanceSession,
  getAttendanceStatuses,
  getStudentAttendanceHistory,
  saveAttendanceSession,
} from '../../services/attendanceService.js';
import { getSchoolOperationsForDate } from '../../services/calendarFeedService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import '../../styles/admin-modules.css';

const MSG = {
  select: 'Select a class and date to start marking attendance.',
  noStudents: 'No students found in this class.',
  finalized: 'Attendance has been finalized for this date. Contact admin to reopen it.',
  loadError: 'Unable to load attendance. Please check your connection and try again.',
};

function normalizePersonName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function studentMatchesFocus(student, focusStudentId, focusStudentName) {
  if (!student) return false;
  if (focusStudentId) {
    const ids = [
      student.studentId,
      student.id,
      student.applicationId,
      student.enrollmentId,
    ].filter(Boolean).map(String);
    if (ids.some((id) => id === String(focusStudentId))) return true;
  }
  if (focusStudentName) {
    const target = normalizePersonName(focusStudentName);
    const names = [
      student.studentName,
      student.name,
      student.fullName,
    ].map(normalizePersonName).filter(Boolean);
    if (names.some((name) => name === target)) return true;
  }
  return false;
}

function computeLocalSummary(students) {
  const summary = {
    total: students.length,
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    excused: 0,
    percentage: 0,
  };
  students.forEach((s) => {
    if (s.status === 'PRESENT') summary.present += 1;
    else if (s.status === 'ABSENT') summary.absent += 1;
    else if (s.status === 'LATE') summary.late += 1;
    else if (s.status === 'HALF_DAY') summary.halfDay += 1;
    else if (s.status === 'EXCUSED') summary.excused += 1;
  });
  const attended = summary.present + summary.late + summary.halfDay + summary.excused;
  summary.percentage = summary.total
    ? Number(((attended / summary.total) * 100).toFixed(2))
    : 0;
  return summary;
}

export default function AttendanceSessionPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [date, setDate] = useState(searchParams.get('date') || todayISODate());
  const [classKey, setClassKey] = useState(() => {
    const classId = searchParams.get('classId') || '';
    const sectionId = searchParams.get('sectionId') || '';
    return classId ? buildClassKey(classId, sectionId) : '';
  });
  const focusStudentId = searchParams.get('studentId') || '';
  const focusStudentName = searchParams.get('studentName') || '';
  const [classes, setClasses] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [session, setSession] = useState(null);
  const [students, setStudents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [classesLoading, setClassesLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [holidayImpact, setHolidayImpact] = useState(null);
  const [resolvingFocusClass, setResolvingFocusClass] = useState(false);

  const { classId, sectionId } = useMemo(() => parseClassKey(classKey), [classKey]);
  const isFinalized = session?.status === 'FINALIZED';
  const canEdit = !isFinalized && (session == null || session.canEdit !== false);

  const syncUrl = useCallback((nextDate, nextClassKey, focus = {}) => {
    const params = new URLSearchParams();
    if (nextDate) params.set('date', nextDate);
    const parsed = parseClassKey(nextClassKey);
    if (parsed.classId) params.set('classId', parsed.classId);
    if (parsed.sectionId) params.set('sectionId', parsed.sectionId);
    const studentId = focus.studentId ?? searchParams.get('studentId');
    const studentName = focus.studentName ?? searchParams.get('studentName');
    if (studentId) params.set('studentId', studentId);
    if (studentName) params.set('studentName', studentName);
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    let cancelled = false;
    getSchoolOperationsForDate(date, { role: user?.role, userId: user?.id })
      .then((impact) => {
        if (!cancelled) setHolidayImpact(impact);
      })
      .catch(() => {
        if (!cancelled) setHolidayImpact(null);
      });
    return () => { cancelled = true; };
  }, [date, user?.id, user?.role]);

  useEffect(() => {
    let cancelled = false;
    getAttendanceStatuses()
      .then((data) => {
        if (!cancelled) setStatuses(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setStatuses([]);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch loading flag
    setClassesLoading(true);
    getAttendanceClasses(date)
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        // Do not auto-pick a class when we are focusing a specific student —
        // that student may belong to another class (e.g. Nitin vs Ankit).
        if (!classKey && list.length === 1 && !focusStudentId && !focusStudentName) {
          const nextKey = buildClassKey(list[0].id, list[0].sectionId);
          setClassKey(nextKey);
          syncUrl(date, nextKey);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setClasses([]);
          toast(MSG.loadError, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setClassesLoading(false);
      });
    return () => { cancelled = true; };
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve class/section for Open session when report row only had studentId/name.
  useEffect(() => {
    if (classKey || (!focusStudentId && !focusStudentName)) return undefined;
    let cancelled = false;
    setResolvingFocusClass(true);

    (async () => {
      try {
        let resolvedClassId = '';
        let resolvedSectionId = '';

        if (focusStudentId) {
          const history = await getStudentAttendanceHistory(focusStudentId, {
            from: date || undefined,
            to: date || undefined,
          });
          const records = Array.isArray(history?.records) ? history.records : [];
          const withClass = records.find((record) => record.classId)
            || records[0]
            || null;
          resolvedClassId = withClass?.classId || history?.student?.classId || '';
          resolvedSectionId = withClass?.sectionId || history?.student?.sectionId || '';
        }

        // Fallback: scan today's class sessions for a matching student name/id.
        if (!resolvedClassId && classes.length) {
          for (const cls of classes) {
            if (cancelled) return;
            try {
              const payload = await getAttendanceSession({
                classId: cls.id,
                sectionId: cls.sectionId || undefined,
                date,
              });
              const roster = Array.isArray(payload?.students) ? payload.students : [];
              const hit = roster.find((student) => (
                studentMatchesFocus(student, focusStudentId, focusStudentName)
              ));
              if (hit) {
                resolvedClassId = cls.id;
                resolvedSectionId = cls.sectionId || '';
                break;
              }
            } catch {
              // try next class
            }
          }
        }

        if (cancelled || !resolvedClassId) return;
        const nextKey = buildClassKey(resolvedClassId, resolvedSectionId);
        setClassKey(nextKey);
        syncUrl(date, nextKey, {
          studentId: focusStudentId || undefined,
          studentName: focusStudentName || undefined,
        });
      } catch {
        // Leave class unselected; user can pick manually.
      } finally {
        if (!cancelled) setResolvingFocusClass(false);
      }
    })();

    return () => { cancelled = true; };
  }, [classKey, focusStudentId, focusStudentName, date, classes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!classId || !date) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when filters cleared
      setSession(null);
      setStudents([]);
      setSummary(null);
      setError(null);
      return undefined;
    }

    let cancelled = false;
    setSessionLoading(true);
    setError(null);

    getAttendanceSession({ classId, sectionId: sectionId || undefined, date })
      .then((data) => {
        if (cancelled) return;
        setSession(data?.session || null);
        setStudents(Array.isArray(data?.students) ? data.students : []);
        setSummary(data?.summary || null);
      })
      .catch((err) => {
        if (cancelled) return;
        setSession(null);
        setStudents([]);
        setSummary(null);
        setError(err?.message || MSG.loadError);
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });

    return () => { cancelled = true; };
  }, [classId, sectionId, date]);

  const displaySummary = useMemo(
    () => (students.length ? computeLocalSummary(students) : summary),
    [students, summary],
  );

  const orderedStudents = useMemo(() => {
    if (!focusStudentId && !focusStudentName) return students;
    const focused = [];
    const rest = [];
    students.forEach((student) => {
      if (studentMatchesFocus(student, focusStudentId, focusStudentName)) focused.push(student);
      else rest.push(student);
    });
    return focused.length ? [...focused, ...rest] : students;
  }, [students, focusStudentId, focusStudentName]);

  const focusedStudent = orderedStudents.find((student) => (
    studentMatchesFocus(student, focusStudentId, focusStudentName)
  )) || null;

  useEffect(() => {
    if ((!focusStudentId && !focusStudentName) || sessionLoading || !focusedStudent) return undefined;
    const focusId = focusedStudent.studentId || focusStudentId;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(`attendance-student-${focusId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [focusStudentId, focusStudentName, sessionLoading, focusedStudent]);

  const handleDateChange = (value) => {
    setDate(value);
    syncUrl(value, classKey);
  };

  const handleClassChange = (value) => {
    setClassKey(value);
    syncUrl(date, value);
  };

  const handleStatusChange = (studentId, status) => {
    setStudents((prev) => prev.map((s) => (
      s.studentId === studentId ? { ...s, status } : s
    )));
  };

  const handleNoteChange = (studentId, note) => {
    setStudents((prev) => prev.map((s) => (
      s.studentId === studentId ? { ...s, note } : s
    )));
  };

  const handleMarkAllPresent = () => {
    if (!canEdit) return;
    setStudents((prev) => prev.map((s) => ({ ...s, status: 'PRESENT' })));
  };

  const buildRecords = () => students.map((s) => ({
    studentId: s.studentId,
    status: s.status || 'PRESENT',
    note: s.note || '',
  }));

  const handleSaveDraft = async () => {
    if (!classId || !date) return;
    setSaving(true);
    try {
      const result = await saveAttendanceSession({
        classId,
        sectionId: sectionId || undefined,
        date,
        mode: 'DRAFT',
        records: buildRecords(),
      });
      setSession((prev) => ({
        ...prev,
        id: result?.sessionId || prev?.id,
        status: result?.status || 'DRAFT',
        canEdit: true,
      }));
      if (result?.summary) setSummary(result.summary);
      toast(result?.message || 'Attendance saved successfully.', 'success');
    } catch (err) {
      toast(err?.message || 'Unable to save draft.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (!classId || !date) return;
    setSaving(true);
    try {
      let sessionId = session?.id;
      const saveResult = await saveAttendanceSession({
        classId,
        sectionId: sectionId || undefined,
        date,
        mode: 'SUBMITTED',
        records: buildRecords(),
      });
      sessionId = saveResult?.sessionId || sessionId;
      if (saveResult?.summary) setSummary(saveResult.summary);

      if (sessionId) {
        const finalized = await finalizeAttendanceSession(sessionId, {
          confirm: true,
          note: 'Attendance completed.',
        });
        setSession((prev) => ({
          ...prev,
          id: finalized?.sessionId || sessionId,
          status: finalized?.status || 'FINALIZED',
          finalizedAt: finalized?.finalizedAt || null,
          canEdit: false,
        }));
        toast(finalized?.message || 'Attendance finalized successfully.', 'success');
      } else {
        setSession((prev) => ({
          ...prev,
          id: saveResult?.sessionId || prev?.id,
          status: saveResult?.status || 'SUBMITTED',
          canEdit: false,
        }));
        toast(saveResult?.message || 'Attendance submitted.', 'success');
      }
    } catch (err) {
      toast(err?.message || 'Unable to finalize attendance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const statusList = statuses.length
    ? statuses
    : ['PRESENT', 'ABSENT', 'LATE', 'EARLY_LEAVE', 'HALF_DAY', 'EXCUSED'];

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Mark Attendance"
          subtitle="Select a class and date, then mark each student before saving or finalizing."
          actions={session?.status ? (
            <span className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4338ca]">
              {session.status}
            </span>
          ) : null}
        />

        <div className="mb-4 rounded-xl border border-[#e8ebf2] bg-white p-4">
          <AttendanceFilters
            mode="session"
            date={date}
            classKey={classKey}
            classes={classes}
            onDateChange={handleDateChange}
            onClassChange={handleClassChange}
          />
          {classesLoading && (
            <p className="mt-2 text-sm text-[#5a6270]">Loading classes…</p>
          )}
          {resolvingFocusClass && (
            <p className="mt-2 text-sm text-[#5a6270]">
              Finding class session for {focusStudentName || 'selected student'}…
            </p>
          )}
        </div>

          {holidayImpact ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
              {holidayImpact.title} is on this date
              {holidayImpact.operations?.studentAttendance === 'holiday' || holidayImpact.operations?.schoolStatus === 'closed'
                ? '. Do not mark students absent for a school holiday — use Excused if you still need a session record. Historical attendance is not changed.'
                : '.'}
            </div>
          ) : null}

          {(focusStudentId || focusStudentName) && focusedStudent ? (
            <div className="mb-4 rounded-xl border border-[#c7d7f5] bg-[#eef5ff] px-4 py-3 text-sm text-[#0b1c30]">
              Opened session for <strong>{focusedStudent.studentName || focusedStudent.name || focusStudentName}</strong>
              {' '}— their row is highlighted below.
            </div>
          ) : null}

          {!classId || !date ? (
          <EmptyState
            icon={ClipboardCheck}
            title={resolvingFocusClass ? 'Opening student session…' : 'Get started'}
            description={resolvingFocusClass
              ? `Looking up the class for ${focusStudentName || 'this student'}.`
              : MSG.select}
          />
        ) : sessionLoading || resolvingFocusClass ? (
          <LoadingState message={resolvingFocusClass ? 'Opening student session…' : 'Loading attendance…'} />
        ) : error ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Unable to load"
            description={error || MSG.loadError}
          />
        ) : (
          <>
            {isFinalized && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {MSG.finalized}
              </div>
            )}

            {displaySummary && (
              <AttendanceSummaryCards summary={displaySummary} className="mb-4" />
            )}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-[#45474c]">
                <Users size={14} className="mr-1 inline" />
                {students.length} student{students.length === 1 ? '' : 's'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="sb-button-secondary"
                  disabled={!canEdit || !students.length || saving}
                  onClick={handleMarkAllPresent}
                >
                  Mark All Present
                </button>
                <button
                  type="button"
                  className="sb-button-secondary"
                  disabled={!canEdit || !students.length || saving}
                  onClick={handleSaveDraft}
                >
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  className="sb-button-primary"
                  disabled={!canEdit || !students.length || saving}
                  onClick={handleFinalize}
                >
                  Finalize
                </button>
              </div>
            </div>

            {students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students"
                description={MSG.noStudents}
              />
            ) : (
              <div className="space-y-2">
                {orderedStudents.map((student) => (
                  <AttendanceStudentRow
                    key={student.studentId}
                    student={student}
                    statuses={statusList}
                    canEdit={canEdit}
                    highlighted={studentMatchesFocus(student, focusStudentId, focusStudentName)}
                    onStatusChange={handleStatusChange}
                    onNoteChange={handleNoteChange}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </PageTransition>
    </DashboardLayout>
  );
}
