import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { examService } from '../../services/schoolModules/index.js';
import {
  loadClassOptions,
  loadSubjectOptions,
} from '../../services/schoolModules/relationshipOptions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';

const columns = [
  { key: 'name', label: 'Exam', primary: true },
  { key: 'type', label: 'Type' },
  { key: 'className', label: 'Class' },
  { key: 'subject', label: 'Subject' },
  { key: 'maxMarks', label: 'Max Marks' },
  { key: 'examDate', label: 'Date' },
  { key: 'status', label: 'Status', badge: true },
];

function buildFields(user) {
  return [
    { key: 'name', label: 'Exam Name', required: true },
    {
      key: 'type',
      label: 'Exam Type',
      type: 'select',
      required: true,
      defaultValue: 'unit_test',
      options: [
        { value: 'unit_test', label: 'Unit Test' },
        { value: 'mid_term', label: 'Mid Term' },
        { value: 'final_exam', label: 'Final Exam' },
      ],
    },
    {
      key: 'classId',
      label: 'Class',
      type: 'entity',
      required: true,
      metaKeys: ['sectionId'],
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
      key: 'maxMarks',
      label: 'Max Marks',
      type: 'number',
      required: true,
      defaultValue: '100',
      validate: (value) => {
        const marks = Number(value);
        if (Number.isNaN(marks) || marks <= 0) return 'Max marks must be greater than 0.';
        return null;
      },
    },
    { key: 'examDate', label: 'Exam Date', type: 'date', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'draft',
      options: [
        { value: 'draft', label: 'Draft' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'completed', label: 'Completed' },
        { value: 'published', label: 'Published' },
      ],
      helpText: 'Parents only see marks after this exam is Published.',
      visibleWhen: ({ user: currentUser }) => currentUser?.role !== ROLES.TEACHER,
    },
    { key: 'sectionId', label: 'Section', visible: false },
    {
      key: 'createdByUserId',
      label: 'Created By',
      visible: false,
      defaultValue: user?.id || '',
    },
  ];
}

export default function ExamsPage({ layout = 'dashboard', readOnly = false }) {
  const { user } = useAuth();

  return (
    <ModuleCrudPage
      title="Examination Management"
      subtitle="Create exams against existing classes and subjects. Marks entry uses the exam ID and student roster."
      service={examService}
      columns={columns}
      fields={buildFields(user)}
      createLabel="Create Exam"
      layout={layout}
      readOnly={readOnly}
      searchKeys={['name', 'type', 'className', 'subject', 'status']}
      transformCreate={(form, _editing, { user: currentUser }) => ({
        name: form.name,
        type: form.type,
        classId: form.classId,
        sectionId: form.sectionId || null,
        subjectId: form.subjectId,
        maxMarks: Number(form.maxMarks),
        examDate: form.examDate,
        status: form.status || 'draft',
        createdByUserId: form.createdByUserId || currentUser?.id || null,
      })}
    />
  );
}
