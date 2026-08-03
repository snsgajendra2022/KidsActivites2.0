import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import {
  examMarksService,
  parentExamMarksService,
} from '../../services/schoolModules/index.js';
import {
  gradeFromMarks,
  loadExamOptions,
  loadStudentOptions,
} from '../../services/schoolModules/relationshipOptions.js';

const columns = [
  { key: 'studentName', label: 'Student', primary: true },
  { key: 'examName', label: 'Exam' },
  { key: 'className', label: 'Class' },
  {
    key: 'marksObtained',
    label: 'Marks',
    render: (row) => (
      row.maxMarks != null
        ? `${row.marksObtained ?? 0} / ${row.maxMarks}`
        : String(row.marksObtained ?? '—')
    ),
  },
  { key: 'grade', label: 'Grade' },
  { key: 'rank', label: 'Rank' },
  { key: 'comments', label: 'Comments' },
];

const fields = [
  {
    key: 'examId',
    label: 'Exam',
    type: 'entity',
    required: true,
    metaKeys: ['classId', 'maxMarks'],
    clears: ['studentId', 'grade'],
    loadOptions: async () => loadExamOptions(),
  },
  {
    key: 'studentId',
    label: 'Student',
    type: 'entity',
    required: true,
    dependsOn: 'examId',
    dependsOnLabel: 'an exam',
    loadOptions: async (form, currentUser) => loadStudentOptions(currentUser, {
      classId: form.classId,
    }),
  },
  {
    key: 'marksObtained',
    label: 'Marks Obtained',
    type: 'number',
    required: true,
    validate: (value, form) => {
      const marks = Number(value);
      const maxMarks = Number(form.maxMarks || 100);
      if (Number.isNaN(marks) || marks < 0) return 'Marks cannot be negative.';
      if (marks > maxMarks) return `Marks cannot exceed max marks (${maxMarks}).`;
      return null;
    },
  },
  {
    key: 'grade',
    label: 'Grade',
    placeholder: 'Auto-calculated if left blank',
  },
  { key: 'rank', label: 'Rank', type: 'number' },
  { key: 'comments', label: 'Comments', type: 'textarea', fullWidth: true },
  { key: 'classId', label: 'Class ID', visible: false },
  { key: 'maxMarks', label: 'Max Marks', visible: false },
];

export default function ExamMarksPage({
  layout = 'dashboard',
  readOnly = false,
  audience = 'staff',
}) {
  const isParent = audience === 'parent' || (readOnly && layout === 'app');
  const service = isParent ? parentExamMarksService : examMarksService;

  return (
    <ModuleCrudPage
      title={isParent ? 'Exam Results' : 'Marks Entry'}
      subtitle={
        isParent
          ? 'Published exam results for your children.'
          : 'Select an exam, load students from that class, then enter marks. Publish the exam so parents can see results.'
      }
      service={service}
      columns={columns}
      fields={isParent ? [] : fields}
      createLabel="Enter Marks"
      layout={layout}
      readOnly={readOnly || isParent}
      searchKeys={['studentName', 'examName', 'examId', 'grade', 'className']}
      emptyTitle={isParent ? 'No published results yet' : 'No marks yet'}
      emptyDescription={
        isParent
          ? 'Results appear here after the school publishes an exam. Ask admin to set the exam status to Published.'
          : 'Enter the first marks record for an exam.'
      }
      transformCreate={(form, _editing, { user: currentUser }) => {
        const maxMarks = Number(form.maxMarks || 100);
        const marksObtained = Number(form.marksObtained);
        return {
          examId: form.examId,
          studentId: form.studentId,
          marksObtained,
          maxMarks,
          grade: form.grade || gradeFromMarks(marksObtained, maxMarks),
          rank: form.rank === '' || form.rank == null ? null : Number(form.rank),
          comments: form.comments || '',
          gradedByUserId: currentUser?.id || null,
        };
      }}
    />
  );
}
