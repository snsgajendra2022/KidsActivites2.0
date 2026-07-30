import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { lmsService } from '../../services/schoolModules/index.js';
import { loadClassOptions } from '../../services/schoolModules/relationshipOptions.js';

const columns = [
  { key: 'title', label: 'Title', primary: true },
  { key: 'type', label: 'Type' },
  { key: 'className', label: 'Class' },
  { key: 'subject', label: 'Subject' },
  { key: 'status', label: 'Status', badge: true },
];

const fields = [
  { key: 'title', label: 'Title', required: true },
  {
    key: 'type',
    label: 'Type',
    type: 'select',
    required: true,
    defaultValue: 'notes',
    options: [
      { value: 'video_lesson', label: 'Video Lesson' },
      { value: 'notes', label: 'Notes' },
      { value: 'study_material', label: 'Study Material' },
      { value: 'quiz', label: 'Online Quiz' },
      { value: 'practice_test', label: 'Practice Test' },
      { value: 'question_bank', label: 'Question Bank' },
    ],
  },
  {
    key: 'classId',
    label: 'Class',
    type: 'entity',
    required: true,
    loadOptions: async (_form, currentUser) => loadClassOptions(currentUser),
  },
  { key: 'subject', label: 'Subject', required: true },
  {
    key: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    defaultValue: 'draft',
    options: [
      { value: 'draft', label: 'Draft' },
      { value: 'published', label: 'Published' },
      { value: 'archived', label: 'Archived' },
    ],
  },
  { key: 'resourceUrl', label: 'Resource URL', fullWidth: true },
  { key: 'description', label: 'Description', type: 'textarea', fullWidth: true },
];

export default function LmsPage({ layout = 'dashboard', readOnly = false }) {
  return (
    <ModuleCrudPage
      title="Digital Classroom (LMS)"
      subtitle="Video lessons, notes, quizzes, practice tests, and question bank."
      service={lmsService}
      columns={columns}
      fields={fields}
      createLabel="Add Learning Content"
      layout={layout}
      readOnly={readOnly}
      searchKeys={['title', 'type', 'className', 'subject', 'status']}
    />
  );
}
