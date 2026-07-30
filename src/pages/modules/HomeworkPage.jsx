import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { homeworkService } from '../../services/schoolModules/index.js';
import {
  loadClassOptions,
  loadStudentOptions,
  loadSubjectOptions,
} from '../../services/schoolModules/relationshipOptions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';

const columns = [
  { key: 'title', label: 'Title', primary: true },
  { key: 'subject', label: 'Subject' },
  { key: 'className', label: 'Class' },
  { key: 'dueDate', label: 'Due Date' },
  { key: 'assignedCount', label: 'Assigned' },
  { key: 'status', label: 'Status', badge: true },
];

function buildFields(user) {
  const isTeacher = user?.role === ROLES.TEACHER;
  return [
    { key: 'title', label: 'Title', required: true },
    {
      key: 'classId',
      label: 'Class',
      type: 'entity',
      required: true,
      metaKeys: ['sectionId', 'teacherId'],
      clears: ['assignedStudentIds'],
      loadOptions: async (_form, currentUser) => loadClassOptions(currentUser),
    },
    {
      key: 'subjectId',
      label: 'Subject',
      type: 'entity',
      required: true,
      loadOptions: async () => loadSubjectOptions(),
    },
    {
      key: 'assignedStudentIds',
      label: 'Assign Students',
      type: 'multiselect',
      fullWidth: true,
      dependsOn: 'classId',
      dependsOnLabel: 'a class',
      helpText: 'Leave empty to assign homework to the entire class roster.',
      emptyText: 'No enrolled students found for this class.',
      loadOptions: async (form, currentUser) => loadStudentOptions(currentUser, {
        classId: form.classId,
      }),
    },
    { key: 'dueDate', label: 'Due Date', type: 'date', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'assigned',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'assigned', label: 'Assigned' },
        { value: 'closed', label: 'Closed' },
      ],
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      fullWidth: true,
      required: true,
      validate: (value, form) => {
        if (form.status === 'assigned' && !String(value || '').trim()) {
          return 'Description is required when assigning homework.';
        }
        return null;
      },
    },
    {
      key: 'teacherId',
      label: 'Teacher ID',
      visible: false,
      defaultValue: isTeacher ? user?.id || '' : '',
    },
    { key: 'sectionId', label: 'Section', visible: false },
  ];
}

export default function HomeworkPage({ layout = 'dashboard', readOnly = false }) {
  const { user } = useAuth();

  return (
    <ModuleCrudPage
      title="Homework & Assignments"
      subtitle="Select a class, optionally choose students, pick a subject, then assign homework by ID."
      service={homeworkService}
      columns={columns}
      fields={buildFields(user)}
      createLabel="Create Homework"
      layout={layout}
      readOnly={readOnly}
      searchKeys={['title', 'subject', 'className', 'status']}
      emptyTitle="No homework yet"
      emptyDescription="Create homework by selecting an existing class and subject. Student names are never typed manually."
      transformCreate={(form, editing, { user: currentUser }) => {
        const assignedStudentIds = Array.isArray(form.assignedStudentIds)
          ? form.assignedStudentIds.map(String)
          : [];
        return {
          title: form.title,
          classId: form.classId,
          sectionId: form.sectionId || null,
          subjectId: form.subjectId,
          teacherId: form.teacherId || currentUser?.id || null,
          assignedStudentIds: assignedStudentIds.length ? assignedStudentIds : null,
          dueDate: form.dueDate,
          status: form.status,
          description: form.description,
          attachments: editing?.attachments || [],
          createdByUserId: editing?.createdByUserId || currentUser?.id || null,
        };
      }}
    />
  );
}
