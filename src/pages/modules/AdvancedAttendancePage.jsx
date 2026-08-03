import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import StudentMultiSelect from '../../components/ui/StudentMultiSelect.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';
import { todayISODate } from '../../components/attendance/AttendanceFilters.jsx';
import { saveAttendanceEventsForStudents } from '../../services/attendanceService.js';

const MODES = [
  { id: 'daily', title: 'Daily Attendance', detail: 'Mark whole-day present/absent/late/half-day/excused.' },
  { id: 'period', title: 'Period-wise Attendance', detail: 'Mark attendance for each timetable period.' },
  { id: 'late', title: 'Late Entry', detail: 'Capture arrival time and late reason.' },
  { id: 'early', title: 'Early Leave', detail: 'Capture early departure with guardian authorization.' },
  { id: 'qr', title: 'QR Attendance', detail: 'Scan student QR codes for check-in/out.' },
  { id: 'rfid', title: 'RFID Integration', detail: 'Ingest RFID reader events for automated attendance.' },
  { id: 'face', title: 'Face Recognition', detail: 'Optional biometric check-in with consent controls.' },
];

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LATE', label: 'Late' },
  { value: 'EARLY_LEAVE', label: 'Early Leave' },
  { value: 'HALF_DAY', label: 'Half Day' },
  { value: 'EXCUSED', label: 'Excused' },
];

function defaultStatusForMode(modeId) {
  if (modeId === 'late') return 'LATE';
  if (modeId === 'early') return 'EARLY_LEAVE';
  if (modeId === 'daily' || modeId === 'period') return 'PRESENT';
  return 'PRESENT';
}

function buildEventPayload(mode, form) {
  const isDeviceMode = mode === 'qr' || mode === 'rfid' || mode === 'face';
  const periodValue = mode === 'period' ? Number(form.period) : null;

  return {
    mode,
    date: form.date,
    classId: form.classId,
    status: form.status,
    time: form.time || null,
    period: Number.isFinite(periodValue) && periodValue > 0 ? periodValue : null,
    notifyParent: form.notifyParent === 'yes',
    note: form.note?.trim() || '',
    deviceEventId: isDeviceMode ? (form.note?.trim() || undefined) : undefined,
  };
}

export default function AdvancedAttendancePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [mode, setMode] = useState('period');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: todayISODate(),
    classId: '',
    period: '1',
    studentIds: [],
    status: 'PRESENT',
    time: '09:15',
    notifyParent: 'yes',
    note: '',
  });
  const {
    classOptions,
    studentOptions,
    classesLoading,
    studentsLoading,
    classesError,
    studentsError,
  } = useClassStudentOptions(user, form.classId);

  const activeMode = useMemo(
    () => MODES.find((item) => item.id === mode) || MODES[0],
    [mode],
  );

  const handleModeChange = (nextMode) => {
    setMode(nextMode);
    setForm((prev) => ({
      ...prev,
      status: defaultStatusForMode(nextMode),
    }));
  };

  const handleSave = async () => {
    if (!form.date) {
      toast('Select a date.', 'warning');
      return;
    }
    if (!form.classId) {
      toast('Select a class.', 'warning');
      return;
    }
    if (!form.studentIds?.length) {
      toast('Select one or more students from the class roster.', 'warning');
      return;
    }
    if (mode === 'period') {
      const period = Number(form.period);
      if (!Number.isFinite(period) || period < 1) {
        toast('Enter a valid period number.', 'warning');
        return;
      }
    }
    if ((mode === 'qr' || mode === 'rfid' || mode === 'face') && !form.note.trim()) {
      toast('Enter a scanner/device event reference.', 'warning');
      return;
    }

    setSaving(true);
    try {
      const payload = buildEventPayload(mode, form);
      const result = await saveAttendanceEventsForStudents(payload, form.studentIds);
      toast(
        result?.message
          || `${activeMode.title} recorded for ${form.studentIds.length} student(s). Parent notification: ${payload.notifyParent ? 'queued' : 'skipped'}.`,
        'success',
      );
      if (mode === 'qr' || mode === 'rfid' || mode === 'face') {
        setForm((prev) => ({ ...prev, note: '', studentIds: [] }));
      }
    } catch (err) {
      toast(err?.message || 'Unable to save attendance event.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Advanced Attendance"
          subtitle="Mark many students at once — period-wise, late/early leave, parent alerts, and device adapters."
          actions={(
            <Link to={tenantPath('/admin/attendance')} className="sb-button-secondary">
              Open Daily Reports
            </Link>
          )}
        />

        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleModeChange(item.id)}
              className={`rounded-xl border p-4 text-left transition ${
                mode === item.id
                  ? 'border-[#0058be] bg-[#eef5ff]'
                  : 'border-[#e5e8ef] bg-white hover:border-[#c5d0e0]'
              }`}
            >
              <p className="font-bold text-[#0b1c30]">{item.title}</p>
              <p className="mt-1 text-xs text-[#667085]">{item.detail}</p>
            </button>
          ))}
        </div>

        <section className="sb-card p-5">
          <h2 className="mb-4 text-base font-bold text-[#0b1c30]">
            {activeMode.title} Capture
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Date"
              type="date"
              required
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
            <div>
              <Select
                label="Class"
                required
                value={form.classId}
                onChange={(event) => setForm({ ...form, classId: event.target.value, studentIds: [] })}
                options={classOptions}
                placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                disabled={classesLoading}
              />
              {classesError && <p className="mt-1 text-xs text-[#b42318]">{classesError}</p>}
            </div>
            {mode === 'period' && (
              <Input
                label="Period"
                type="number"
                min="1"
                value={form.period}
                onChange={(event) => setForm({ ...form, period: event.target.value })}
              />
            )}
            <StudentMultiSelect
              required
              classId={form.classId}
              options={studentOptions}
              selectedIds={form.studentIds}
              onChange={(studentIds) => setForm({ ...form, studentIds })}
              loading={studentsLoading}
              error={studentsError}
              disabled={!form.classId || studentsLoading}
            />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              options={STATUS_OPTIONS}
            />
            <Input
              label="Time"
              type="time"
              value={form.time}
              onChange={(event) => setForm({ ...form, time: event.target.value })}
            />
            <Select
              label="Notify Parent (App/SMS)"
              value={form.notifyParent}
              onChange={(event) => setForm({ ...form, notifyParent: event.target.value })}
              options={[
                { value: 'yes', label: 'Yes' },
                { value: 'no', label: 'No' },
              ]}
            />
            <Input
              className="md:col-span-2"
              label="Note / Device Event ID"
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              placeholder={mode === 'qr' || mode === 'rfid' || mode === 'face' ? 'Scanner/device event reference' : 'Optional note'}
              required={mode === 'qr' || mode === 'rfid' || mode === 'face'}
            />
          </div>
          <div className="mt-5">
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              {form.studentIds.length > 1
                ? `Save for ${form.studentIds.length} Students`
                : 'Save Attendance Event'}
            </Button>
          </div>
        </section>
      </PageTransition>
    </DashboardLayout>
  );
}
