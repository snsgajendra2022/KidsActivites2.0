import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { timetableService } from '../../services/schoolModules/index.js';
import {
  loadClassOptions,
  loadSubjectOptions,
  loadTeacherOptions,
} from '../../services/schoolModules/relationshipOptions.js';

const columns = [
  { key: 'className', label: 'Class', primary: true },
  { key: 'day', label: 'Day' },
  { key: 'period', label: 'Period' },
  { key: 'startTime', label: 'Start' },
  { key: 'endTime', label: 'End' },
  { key: 'subject', label: 'Subject' },
  { key: 'teacherName', label: 'Teacher' },
  { key: 'room', label: 'Room' },
];

const fields = [
  {
    key: 'classId',
    label: 'Class',
    type: 'entity',
    required: true,
    loadOptions: async (_form, currentUser) => loadClassOptions(currentUser),
  },
  {
    key: 'day',
    label: 'Day',
    type: 'select',
    required: true,
    options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => ({
      value: day,
      label: day,
    })),
  },
  { key: 'period', label: 'Period', type: 'number', required: true },
  { key: 'startTime', label: 'Start Time', type: 'time', required: true },
  {
    key: 'endTime',
    label: 'End Time',
    type: 'time',
    required: true,
    validate: (value, form) => {
      if (form.startTime && value && value <= form.startTime) {
        return 'End time must be after start time.';
      }
      return null;
    },
  },
  {
    key: 'subjectId',
    label: 'Subject',
    type: 'entity',
    required: true,
    loadOptions: async () => loadSubjectOptions(),
  },
  {
    key: 'teacherId',
    label: 'Teacher',
    type: 'entity',
    required: true,
    loadOptions: async () => loadTeacherOptions(),
  },
  { key: 'room', label: 'Room' },
];

export default function TimetablePage({ layout = 'dashboard', readOnly = false }) {
  return (
    <ModuleCrudPage
      title="Timetable Management"
      subtitle="Schedule periods using existing classes, subjects, and teachers."
      service={timetableService}
      columns={columns}
      fields={fields}
      createLabel="Add Period"
      layout={layout}
      readOnly={readOnly}
      searchKeys={['className', 'day', 'subject', 'teacherName', 'room']}
      transformCreate={async (form, editing) => {
        const existing = await timetableService.list({ classId: form.classId, day: form.day });
        const conflict = existing.find((slot) => {
          if (editing?.id && slot.id === editing.id) return false;
          return Number(slot.period) === Number(form.period);
        });
        if (conflict) {
          throw new Error('This class already has a period scheduled for that day and period number.');
        }
        return {
          classId: form.classId,
          day: form.day,
          period: Number(form.period || 0),
          startTime: form.startTime,
          endTime: form.endTime,
          subjectId: form.subjectId,
          teacherId: form.teacherId,
          room: form.room || '',
        };
      }}
    />
  );
}
