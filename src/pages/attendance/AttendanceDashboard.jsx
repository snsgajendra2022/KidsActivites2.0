import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Download, History, RotateCcw } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { EmptyState, LoadingState, PageHeader } from '../../components/ui/index.jsx';
import { ResponsiveDataTable } from '../../components/ui/DataTable.jsx';
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

  const sessionLink = (row) => {
    const params = new URLSearchParams();
    if (row.classId || classId) params.set('classId', row.classId || classId);
    if (row.sectionId || sectionId) params.set('sectionId', row.sectionId || sectionId);
    if (row.date) params.set('date', row.date);
    else if (to) params.set('date', to);
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
      render: (row) => row.present ?? '—',
    },
    {
      label: 'Absent',
      render: (row) => row.absent ?? '—',
    },
    {
      label: 'Late',
      render: (row) => row.late ?? '—',
    },
    {
      label: '%',
      render: (row) => (row.percentage != null ? `${Number(row.percentage).toFixed(1)}%` : '—'),
    },
    {
      label: 'Status',
      render: (row) => (
        row.lastStatus || row.sessionStatus
          ? <AttendanceStatusChip status={row.lastStatus || row.sessionStatus} />
          : '—'
      ),
    },
    {
      label: 'Actions',
      render: (row) => {
        const sessionId = row.sessionId || row.attendanceSessionId;
        const finalized = (row.sessionStatus || row.status) === 'FINALIZED';
        return (
          <div className="flex flex-wrap gap-2">
            <Link to={sessionLink(row)} className="text-xs font-semibold text-[#0058be] hover:underline">
              Open session
            </Link>
            {sessionId && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#5a6270] hover:text-[#0b1c30]"
                onClick={() => openAudit(sessionId)}
              >
                <History size={12} /> Audit
              </button>
            )}
            {finalized && sessionId && (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
                disabled={reopeningId === sessionId}
                onClick={() => handleReopen(row)}
              >
                <RotateCcw size={12} />
                {reopeningId === sessionId ? 'Reopening…' : 'Reopen'}
              </button>
            )}
          </div>
        );
      },
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
                  columns={columns}
                  data={students}
                  keyExtractor={(row) => row.studentId || `${row.studentName}-${row.rollNumber}`}
                  emptyMessage={MSG.empty}
                  minWidth={720}
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
