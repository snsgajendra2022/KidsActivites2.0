import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Download, History, RotateCcw, UserRound } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import {
  ResponsiveDataTable,
  TableActionButton,
} from '../../components/ui/DataTable.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import AttendanceFilters, {
  monthStartISODate,
  parseClassKey,
  todayISODate,
} from '../../components/attendance/AttendanceFilters.jsx';
import AttendanceSummaryCards from '../../components/attendance/AttendanceSummaryCards.jsx';
import AttendanceAuditLogModal from '../../components/attendance/AttendanceAuditLogModal.jsx';
import AttendanceStatusChip from '../../components/attendance/AttendanceStatusChip.jsx';
import {
  exportAttendanceReport,
  getAttendanceAuditLogs,
  getAttendanceClasses,
  getAttendanceReportSummary,
  reopenAttendanceSession,
} from '../../services/attendanceService.js';
import '../../styles/admin-modules.css';

const MSG = {
  empty: 'No attendance records found for this period.',
  loadError: 'Unable to load attendance. Please check your connection and try again.',
};

function displayCount(value) {
  return value == null ? '—' : value;
}

export default function AttendanceDashboard() {
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();

  const [from, setFrom] = useState(monthStartISODate());
  const [to, setTo] = useState(todayISODate());
  const [classKey, setClassKey] = useState('');
  const [status, setStatus] = useState('');
  const [classes, setClasses] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState(null);
  const [reopeningId, setReopeningId] = useState(null);

  const { classId, sectionId } = useMemo(() => parseClassKey(classKey), [classKey]);

  useEffect(() => {
    getAttendanceClasses(to || todayISODate())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, [to]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch loading flag
    setLoading(true);
    setError(null);

    getAttendanceReportSummary({
      from: from || undefined,
      to: to || undefined,
      classId: classId || undefined,
      sectionId: sectionId || undefined,
      status: status || undefined,
    })
      .then((data) => {
        if (!cancelled) setReport(data || null);
      })
      .catch((err) => {
        if (!cancelled) {
          setReport(null);
          setError(err?.message || MSG.loadError);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [from, to, classId, sectionId, status]);

  const students = report?.students || [];
  const summary = report?.summary || null;

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAttendanceReport({
        format: 'csv',
        from: from || undefined,
        to: to || undefined,
        classId: classId || undefined,
        sectionId: sectionId || undefined,
        status: status || undefined,
      });
      toast('Attendance report downloaded.', 'success');
    } catch (err) {
      toast(err?.message || 'Export failed.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const openAudit = async (sessionId) => {
    if (!sessionId) {
      toast('No session available for audit logs.', 'warning');
      return;
    }
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditError(null);
    setAuditLogs([]);
    try {
      const logs = await getAttendanceAuditLogs(sessionId);
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      setAuditError(err?.message || MSG.loadError);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleReopen = async (row) => {
    const sessionId = row.sessionId || row.attendanceSessionId;
    if (!sessionId) {
      toast('No session id available to reopen.', 'warning');
      return;
    }
    const reason = window.prompt('Reason for reopening attendance:');
    if (!reason?.trim()) {
      toast('A reason is required to reopen.', 'warning');
      return;
    }
    setReopeningId(sessionId);
    try {
      await reopenAttendanceSession(sessionId, { reason: reason.trim() });
      toast('Attendance reopened successfully.', 'success');
      setReport((prev) => {
        if (!prev?.students) return prev;
        return {
          ...prev,
          students: prev.students.map((s) => (
            (s.sessionId || s.attendanceSessionId) === sessionId
              ? { ...s, sessionStatus: 'REOPENED' }
              : s
          )),
        };
      });
    } catch (err) {
      toast(err?.message || 'Unable to reopen attendance.', 'error');
    } finally {
      setReopeningId(null);
    }
  };

  const historyPath = (row) => {
    const id = row.studentId;
    if (!id || String(id).startsWith('row-') || String(id).startsWith('agg-')) return null;
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const query = params.toString();
    return `${tenantPath(`/attendance/students/${id}`)}${query ? `?${query}` : ''}`;
  };

  const sessionPath = (row) => {
    const params = new URLSearchParams();
    if (row.classId || classId) params.set('classId', row.classId || classId);
    if (row.sectionId || sectionId) params.set('sectionId', row.sectionId || sectionId);
    if (row.date) params.set('date', row.date);
    else if (to) params.set('date', to);
    const studentId = row.studentId
      && !String(row.studentId).startsWith('row-')
      && !String(row.studentId).startsWith('agg-')
      ? row.studentId
      : '';
    if (studentId) params.set('studentId', studentId);
    if (row.studentName) params.set('studentName', row.studentName);
    // Always open with student focus — session page resolves class if needed.
    if (!studentId && !params.get('classId')) return null;
    return `${tenantPath('/admin/attendance/session')}?${params.toString()}`;
  };

  const columns = [
    {
      label: 'Student',
      primary: true,
      render: (row) => row.studentName || '—',
    },
    {
      label: 'Roll',
      muted: true,
      render: (row) => row.rollNumber || '—',
    },
    {
      label: 'Present',
      render: (row) => displayCount(row.present),
    },
    {
      label: 'Absent',
      render: (row) => displayCount(row.absent),
    },
    {
      label: 'Late',
      render: (row) => displayCount(row.late),
    },
    {
      label: '%',
      render: (row) => (row.percentage != null ? `${Number(row.percentage).toFixed(1)}%` : '—'),
    },
    {
      label: 'Status',
      badge: true,
      render: (row) => (
        row.lastStatus || row.sessionStatus
          ? <AttendanceStatusChip status={row.lastStatus || row.sessionStatus} />
          : '—'
      ),
    },
  ];

  const statusOptions = [
    { value: 'PRESENT', label: 'Present' },
    { value: 'ABSENT', label: 'Absent' },
    { value: 'LATE', label: 'Late' },
    { value: 'HALF_DAY', label: 'Half Day' },
    { value: 'EXCUSED', label: 'Excused' },
  ];

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Attendance"
          subtitle="Review class attendance, export reports, and reopen finalized sessions when needed."
          actions={(
            <>
              <Link to={tenantPath('/admin/attendance/session')} className="sb-button-secondary">
                Mark attendance
              </Link>
              <button
                type="button"
                className="sb-button-primary inline-flex items-center gap-2"
                disabled={exporting || loading}
                onClick={handleExport}
              >
                <Download size={16} />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </>
          )}
        />

        <div className="mb-4 rounded-xl border border-[#e8ebf2] bg-white p-4">
          <AttendanceFilters
            mode="range"
            from={from}
            to={to}
            classKey={classKey}
            classes={classes}
            status={status}
            statusOptions={statusOptions}
            onFromChange={setFrom}
            onToChange={setTo}
            onClassChange={setClassKey}
            onStatusChange={setStatus}
          />
        </div>

        {loading ? (
          <LoadingState message="Loading attendance report…" />
        ) : error ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Unable to load"
            description={error}
          />
        ) : (
          <>
            {summary && <AttendanceSummaryCards summary={summary} className="mb-4" />}

            {students.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="No records"
                description={MSG.empty}
              />
            ) : (
              <div className="rounded-xl border border-[#e8ebf2] bg-white p-2 sm:p-4">
                <ResponsiveDataTable
                  layout="cards"
                  columns={columns}
                  data={students}
                  keyExtractor={(row, index) => (
                    row.studentId
                    || `${row.studentName || 'student'}-${row.rollNumber || index}`
                  )}
                  emptyMessage={MSG.empty}
                  minWidth={720}
                  renderActions={(row) => {
                    const sessionId = row.sessionId || row.attendanceSessionId;
                    const finalized = (row.sessionStatus || row.status) === 'FINALIZED';
                    const historyHref = historyPath(row);
                    const sessionHref = sessionPath(row);

                    return (
                      <>
                        {historyHref ? (
                          <Link to={historyHref} className="table-action-btn table-action-btn-outline">
                            <UserRound size={14} /> History
                          </Link>
                        ) : null}
                        {sessionHref ? (
                          <Link to={sessionHref} className="table-action-btn table-action-btn-outline">
                            Open session
                          </Link>
                        ) : null}
                        {sessionId ? (
                          <TableActionButton variant="outline" onClick={() => openAudit(sessionId)}>
                            <History size={14} /> Audit
                          </TableActionButton>
                        ) : null}
                        {finalized && sessionId ? (
                          <TableActionButton
                            variant="outline"
                            disabled={reopeningId === sessionId}
                            onClick={() => handleReopen(row)}
                          >
                            <RotateCcw size={14} />
                            {reopeningId === sessionId ? 'Reopening…' : 'Reopen'}
                          </TableActionButton>
                        ) : null}
                      </>
                    );
                  }}
                />
              </div>
            )}
          </>
        )}

        <AttendanceAuditLogModal
          open={auditOpen}
          logs={auditLogs}
          loading={auditLoading}
          error={auditError}
          onClose={() => setAuditOpen(false)}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
