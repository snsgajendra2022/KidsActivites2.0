import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { leaveService } from '../../services/schoolModules/index.js';
import {
  loadClassOptions,
  loadStudentOptions,
} from '../../services/schoolModules/relationshipOptions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';

const columns = [
  { key: 'studentName', label: 'Student', primary: true },
  { key: 'className', label: 'Class' },
  { key: 'fromDate', label: 'From' },
  { key: 'toDate', label: 'To' },
  { key: 'reason', label: 'Reason' },
  { key: 'status', label: 'Status', badge: true },
];

function buildFields(user) {
  const isParent = user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT;

  return [
    {
      key: 'classId',
      label: 'Class',
      type: 'entity',
      required: !isParent,
      visibleWhen: ({ user: currentUser }) => (
        currentUser?.role !== ROLES.PARENT && currentUser?.role !== ROLES.STUDENT
      ),
      clears: ['studentId'],
      loadOptions: async (_form, currentUser) => loadClassOptions(currentUser),
    },
    {
      key: 'studentId',
      label: 'Student',
      type: 'entity',
      required: true,
      dependsOn: isParent ? undefined : 'classId',
      dependsOnLabel: 'a class',
      metaKeys: ['classId'],
      loadOptions: async (form, currentUser) => loadStudentOptions(currentUser, {
        classId: form.classId,
      }),
    },
    { key: 'fromDate', label: 'From Date', type: 'date', required: true },
    {
      key: 'toDate',
      label: 'To Date',
      type: 'date',
      required: true,
      validate: (value, form) => {
        if (form.fromDate && value && value < form.fromDate) {
          return 'To date must be on or after from date.';
        }
        return null;
      },
    },
    { key: 'reason', label: 'Reason', type: 'textarea', fullWidth: true, required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
      visibleWhen: ({ user: currentUser }) => (
        currentUser?.role !== ROLES.PARENT && currentUser?.role !== ROLES.STUDENT
      ),
    },
    {
      key: 'requestedByUserId',
      label: 'Requested By',
      visible: false,
      defaultValue: user?.id || '',
    },
  ];
}

export default function LeaveRequestsPage({ layout = 'app', readOnly = false }) {
  const { user } = useAuth();
  const isParent = user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT;

  return (
    <ModuleCrudPage
      title="Leave Requests"
      subtitle={isParent
        ? 'Request leave for your enrolled child. Requests are submitted as pending for school review.'
        : 'Review leave requests linked to enrolled students and class records.'}
      service={leaveService}
      columns={columns}
      fields={buildFields(user)}
      createLabel="Request Leave"
      layout={layout}
      readOnly={readOnly}
      searchKeys={['studentName', 'className', 'status', 'reason']}
      transformCreate={(form, _editing, { user: currentUser }) => {
        const parentLike = currentUser?.role === ROLES.PARENT || currentUser?.role === ROLES.STUDENT;
        return {
          studentId: form.studentId,
          classId: form.classId || '',
          fromDate: form.fromDate,
          toDate: form.toDate,
          reason: form.reason,
          status: parentLike ? 'pending' : (form.status || 'pending'),
          requestedByUserId: form.requestedByUserId || currentUser?.id || null,
        };
      }}
    />
  );
}
