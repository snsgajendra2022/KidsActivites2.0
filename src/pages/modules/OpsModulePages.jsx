import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/roles.js';
import {
  certificateService,
  expenseService,
  hrStaffService,
  inventoryService,
  payrollService,
  performanceNoteService,
  subscriptionService,
} from '../../services/schoolModules/index.js';
import {
  loadClassOptions,
  loadStudentOptions,
} from '../../services/schoolModules/relationshipOptions.js';

export function InventoryPage() {
  return (
    <ModuleCrudPage
      title="Inventory Management"
      subtitle="Track computers, furniture, lab and sports equipment."
      service={inventoryService}
      columns={[
        { key: 'name', label: 'Item', primary: true },
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Qty' },
        { key: 'location', label: 'Location' },
        { key: 'condition', label: 'Condition' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { key: 'name', label: 'Item Name', required: true },
        { key: 'category', label: 'Category', required: true },
        { key: 'quantity', label: 'Quantity', type: 'number', required: true },
        { key: 'location', label: 'Location', required: true },
        { key: 'condition', label: 'Condition', defaultValue: 'good' },
        { key: 'purchaseDate', label: 'Purchase Date', type: 'date' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'in_stock',
          options: [
            { value: 'in_stock', label: 'In Stock' },
            { value: 'issued', label: 'Issued' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'disposed', label: 'Disposed' },
          ],
        },
      ]}
      createLabel="Add Asset"
      searchKeys={['name', 'category', 'location', 'status']}
    />
  );
}

export function HrStaffPage() {
  return (
    <ModuleCrudPage
      title="HR & Staff Management"
      subtitle="Teacher and staff profiles, documents, and employment status."
      service={hrStaffService}
      columns={[
        { key: 'name', label: 'Name', primary: true },
        { key: 'employeeId', label: 'Employee ID' },
        { key: 'role', label: 'Role' },
        { key: 'department', label: 'Department' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { key: 'name', label: 'Full Name', required: true },
        { key: 'employeeId', label: 'Employee ID', required: true },
        { key: 'role', label: 'Role', required: true },
        { key: 'department', label: 'Department', required: true },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'joiningDate', label: 'Joining Date', type: 'date' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'active',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'on_leave', label: 'On Leave' },
            { value: 'exited', label: 'Exited' },
          ],
        },
      ]}
      createLabel="Add Staff"
      searchKeys={['name', 'employeeId', 'role', 'department', 'status']}
    />
  );
}

export function PayrollPage() {
  return (
    <ModuleCrudPage
      title="Payroll Management"
      subtitle="Salary structure, deductions, bonuses, and payslips."
      service={payrollService}
      columns={[
        { key: 'employeeName', label: 'Employee', primary: true },
        { key: 'month', label: 'Month' },
        { key: 'basic', label: 'Basic' },
        { key: 'allowances', label: 'Allowances' },
        { key: 'deductions', label: 'Deductions' },
        { key: 'bonuses', label: 'Bonuses' },
        { key: 'netPay', label: 'Net Pay' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { key: 'employeeName', label: 'Employee Name', required: true },
        { key: 'month', label: 'Payroll Month', type: 'month', required: true },
        { key: 'basic', label: 'Basic', type: 'number', required: true },
        { key: 'allowances', label: 'Allowances', type: 'number', defaultValue: '0' },
        { key: 'deductions', label: 'Deductions', type: 'number', defaultValue: '0' },
        { key: 'bonuses', label: 'Bonuses', type: 'number', defaultValue: '0' },
        { key: 'netPay', label: 'Net Pay', type: 'number', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'generated',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'generated', label: 'Generated' },
            { value: 'paid', label: 'Paid' },
          ],
        },
      ]}
      createLabel="Generate Payslip"
      searchKeys={['employeeName', 'month', 'status']}
    />
  );
}

export function ExpensesPage() {
  return (
    <ModuleCrudPage
      title="School Expenses"
      subtitle="Track operating expenses for the accounting dashboard."
      service={expenseService}
      columns={[
        { key: 'title', label: 'Expense', primary: true },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'category', label: 'Category', required: true },
        { key: 'amount', label: 'Amount', type: 'number', required: true },
        { key: 'date', label: 'Date', type: 'date', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'pending',
          options: [
            { value: 'pending', label: 'Pending' },
            { value: 'paid', label: 'Paid' },
            { value: 'rejected', label: 'Rejected' },
          ],
        },
      ]}
      createLabel="Add Expense"
      searchKeys={['title', 'category', 'status']}
    />
  );
}

export function CertificatesPage() {
  const { user } = useAuth();
  const isPlatformWorkspace = String(user?.tenantSlug || '').toLowerCase() === 'admin'
    || String(user?.role || '').toLowerCase() === 'super_admin';

  return (
    <ModuleCrudPage
      title="Document Automation"
      subtitle={isPlatformWorkspace
        ? "School document certificates are per-workspace. Open a school (e.g. /shri/admin/certificates) with a school admin account."
        : "Generate bonafide, ID card, certificates, and transfer documents."}
      service={certificateService}
      columns={[
        { key: 'certificateNumber', label: 'Certificate No.', primary: true },
        { key: 'type', label: 'Type' },
        { key: 'studentName', label: 'Student' },
        { key: 'className', label: 'Class' },
        { key: 'purpose', label: 'Purpose' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        {
          key: 'type',
          label: 'Document Type',
          type: 'select',
          required: true,
          defaultValue: 'bonafide',
          options: [
            { value: 'bonafide', label: 'Bonafide Certificate' },
            { value: 'id_card', label: 'ID Card' },
            { value: 'character', label: 'Character Certificate' },
            { value: 'transfer', label: 'Transfer Certificate' },
            { value: 'report_card', label: 'Report Card' },
          ],
        },
        {
          key: 'classId',
          label: 'Class',
          type: 'entity',
          required: true,
          clears: ['studentId'],
          loadOptions: async (_form, currentUser) => loadClassOptions(currentUser),
        },
        {
          key: 'studentId',
          label: 'Student',
          type: 'entity',
          required: true,
          dependsOn: 'classId',
          dependsOnLabel: 'a class',
          emptyText: 'No enrolled students found for this class.',
          loadOptions: async (form, currentUser) => loadStudentOptions(currentUser, {
            classId: form.classId,
          }),
        },
        { key: 'purpose', label: 'Purpose', required: true },
        { key: 'certificateNumber', label: 'Certificate Number', required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'issued',
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'issued', label: 'Issued' },
            { value: 'revoked', label: 'Revoked' },
          ],
        },
      ]}
      createLabel="Generate Document"
      searchKeys={['certificateNumber', 'type', 'studentName', 'status']}
    />
  );
}

export function SubscriptionPlansPage() {
  const { user } = useAuth();
  const canManagePlans = user?.role === ROLES.SUPER_ADMIN;

  return (
    <ModuleCrudPage
      title="Subscription & Billing"
      subtitle={canManagePlans
        ? 'Manage Starter, Professional, and Enterprise plans for schools.'
        : 'Review the subscription plans available to your school.'}
      service={subscriptionService}
      columns={[
        { key: 'name', label: 'Plan', primary: true },
        { key: 'priceMonthly', label: 'Monthly Price' },
        { key: 'studentLimit', label: 'Student Limit' },
        { key: 'features', label: 'Features' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { key: 'name', label: 'Plan Name', required: true },
        { key: 'priceMonthly', label: 'Monthly Price', type: 'number', required: true },
        { key: 'studentLimit', label: 'Student Limit', type: 'number', required: true },
        { key: 'features', label: 'Features', type: 'textarea', fullWidth: true, required: true },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'available',
          options: [
            { value: 'available', label: 'Available' },
            { value: 'deprecated', label: 'Deprecated' },
          ],
        },
      ]}
      createLabel="Add Plan"
      searchKeys={['name', 'features', 'status']}
      readOnly={!canManagePlans}
    />
  );
}

export function PerformanceNotesPage({ layout = 'app' }) {
  return (
    <ModuleCrudPage
      title="Student Performance Notes"
      subtitle="Private teacher notes about student progress."
      service={performanceNoteService}
      columns={[
        { key: 'studentName', label: 'Student', primary: true },
        { key: 'className', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'note', label: 'Note' },
        { key: 'visibility', label: 'Visibility' },
      ]}
      fields={[
        {
          key: 'classId',
          label: 'Class',
          type: 'entity',
          required: true,
          clears: ['studentId'],
          loadOptions: async (_form, currentUser) => loadClassOptions(currentUser),
        },
        {
          key: 'studentId',
          label: 'Student',
          type: 'entity',
          required: true,
          dependsOn: 'classId',
          dependsOnLabel: 'a class',
          emptyText: 'No enrolled students found for this class.',
          loadOptions: async (form, currentUser) => loadStudentOptions(currentUser, {
            classId: form.classId,
          }),
        },
        { key: 'subject', label: 'Subject', required: true },
        { key: 'note', label: 'Performance Note', type: 'textarea', fullWidth: true, required: true },
        {
          key: 'visibility',
          label: 'Visibility',
          type: 'select',
          required: true,
          defaultValue: 'private',
          options: [
            { value: 'private', label: 'Private (Teachers/Admin)' },
            { value: 'shared_parent', label: 'Shared with Parent' },
          ],
        },
      ]}
      createLabel="Add Note"
      layout={layout}
      searchKeys={['studentName', 'className', 'subject', 'note']}
    />
  );
}
