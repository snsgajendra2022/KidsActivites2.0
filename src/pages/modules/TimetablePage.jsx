import { useMemo } from 'react';
import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  parentTimetableService,
  teacherTimetableService,
  timetableService,
} from '../../services/schoolModules/index.js';
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

export default function TimetablePage({
  layout = 'dashboard',
  readOnly = false,
  audience = 'staff',
}) {
  const { user } = useAuth();
  const isParent = audience === 'parent';
  const isTeacher = audience === 'teacher';

  const service = isParent
    ? parentTimetableService
    : (isTeacher ? teacherTimetableService : timetableService);

  const listFilters = useMemo(() => {
    if (isParent) {
      return {
        parentId: user?.id || null,
        schoolId: user?.schoolId || null,
      };
    }
    if (isTeacher) {
      return {
        teacherId: user?.id || null,
        userId: user?.id || null,
      };
    }
    return {};
  }, [isParent, isTeacher, user?.id, user?.schoolId]);

  return (
    <ModuleCrudPage
      title={isParent ? 'Class Timetable' : (isTeacher ? 'My Timetable' : 'Timetable Management')}
      subtitle={
        isParent
          ? 'Weekly schedule for your child’s class only.'
          : (isTeacher
            ? 'Your assigned teaching periods.'
            : 'Schedule periods using existing classes, subjects, and teachers.')
      }
      service={service}
      columns={columns}
      fields={isParent || isTeacher ? [] : fields}
      createLabel="Add Period"
      layout={layout}
      readOnly={readOnly || isParent || isTeacher}
      listFilters={listFilters}
      searchKeys={['className', 'day', 'subject', 'teacherName', 'room']}
      emptyTitle={isParent ? 'No timetable for this class yet' : 'No timetable periods yet'}
      emptyDescription={
        isParent
          ? 'Once the school publishes a timetable for your child’s class, it will appear here.'
          : 'Create the first period to get started.'
      }
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
