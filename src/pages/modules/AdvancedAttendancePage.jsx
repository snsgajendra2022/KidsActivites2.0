import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import { PageHeader } from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Link } from 'react-router-dom';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useClassStudentOptions } from '../../hooks/useClassStudentOptions.js';

const MODES = [
  { id: 'daily', title: 'Daily Attendance', detail: 'Mark whole-day present/absent/late/half-day/excused.' },
  { id: 'period', title: 'Period-wise Attendance', detail: 'Mark attendance for each timetable period.' },
  { id: 'late', title: 'Late Entry', detail: 'Capture arrival time and late reason.' },
  { id: 'early', title: 'Early Leave', detail: 'Capture early departure with guardian authorization.' },
  { id: 'qr', title: 'QR Attendance', detail: 'Scan student QR codes for check-in/out.' },
  { id: 'rfid', title: 'RFID Integration', detail: 'Ingest RFID reader events for automated attendance.' },
  { id: 'face', title: 'Face Recognition', detail: 'Optional biometric check-in with consent controls.' },
];

export default function AdvancedAttendancePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [mode, setMode] = useState('period');
  const [form, setForm] = useState({
    classId: '',
    period: '1',
    studentId: '',
    status: 'LATE',
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

  const handleSave = () => {
    if (!form.classId) {
      toast('Select a class.', 'warning');
      return;
    }
    if (!form.studentId) {
      toast('Select a student from the class roster.', 'warning');
      return;
    }
    const studentLabel = studentOptions.find((option) => option.value === form.studentId)?.label || 'student';
    toast(
      `${MODES.find((item) => item.id === mode)?.title} recorded for ${studentLabel}. Parent notification: ${form.notifyParent === 'yes' ? 'queued' : 'skipped'}.`,
      'success',
    );
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Advanced Attendance"
          subtitle="Period-wise marking, late/early leave, parent alerts, and device adapters."
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
              onClick={() => setMode(item.id)}
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
            {MODES.find((item) => item.id === mode)?.title} Capture
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Select
                label="Class"
                required
                value={form.classId}
                onChange={(event) => setForm({ ...form, classId: event.target.value, studentId: '' })}
                options={classOptions}
                placeholder={classesLoading ? 'Loading classes…' : 'Select class'}
                disabled={classesLoading}
              />
              {classesError && <p className="mt-1 text-xs text-[#b42318]">{classesError}</p>}
            </div>
            {(mode === 'period') && (
              <Input label="Period" type="number" value={form.period} onChange={(event) => setForm({ ...form, period: event.target.value })} />
            )}
            <div>
              <Select
                label="Student"
                required
                value={form.studentId}
                onChange={(event) => setForm({ ...form, studentId: event.target.value })}
                options={studentOptions}
                placeholder={!form.classId
                  ? 'Select class first'
                  : (studentsLoading ? 'Loading students…' : 'Select student')}
                disabled={!form.classId || studentsLoading}
              />
              {studentsError && <p className="mt-1 text-xs text-[#b42318]">{studentsError}</p>}
              {form.classId && !studentsLoading && !studentsError && studentOptions.length === 0 && (
                <p className="mt-1 text-xs text-[#667085]">No enrolled students found for this class.</p>
              )}
            </div>
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              options={[
                { value: 'PRESENT', label: 'Present' },
                { value: 'ABSENT', label: 'Absent' },
                { value: 'LATE', label: 'Late' },
                { value: 'EARLY_LEAVE', label: 'Early Leave' },
                { value: 'HALF_DAY', label: 'Half Day' },
                { value: 'EXCUSED', label: 'Excused' },
              ]}
            />
            <Input label="Time" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} />
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
            />
          </div>
          <div className="mt-5">
            <Button onClick={handleSave}>Save Attendance Event</Button>
          </div>
        </section>
      </PageTransition>
    </DashboardLayout>
  );
}
