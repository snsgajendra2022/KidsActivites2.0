import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { libraryBookService, libraryIssueService } from '../../services/schoolModules/index.js';
import {
  loadBookOptions,
  loadClassOptions,
  loadStudentOptions,
} from '../../services/schoolModules/relationshipOptions.js';

export function LibraryBooksPage() {
  return (
    <ModuleCrudPage
      title="Library Books"
      subtitle="Catalog books with barcode, copies, and availability."
      service={libraryBookService}
      columns={[
        { key: 'title', label: 'Title', primary: true },
        { key: 'author', label: 'Author' },
        { key: 'barcode', label: 'Barcode' },
        { key: 'copies', label: 'Copies' },
        { key: 'available', label: 'Available' },
        { key: 'status', label: 'Status', badge: true },
      ]}
      fields={[
        { key: 'title', label: 'Title', required: true },
        { key: 'author', label: 'Author', required: true },
        { key: 'isbn', label: 'ISBN' },
        { key: 'barcode', label: 'Barcode', required: true },
        { key: 'category', label: 'Category' },
        { key: 'copies', label: 'Copies', type: 'number', required: true, defaultValue: '1' },
        { key: 'available', label: 'Available', type: 'number', required: true, defaultValue: '1' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'available',
          options: [
            { value: 'available', label: 'Available' },
            { value: 'unavailable', label: 'Unavailable' },
          ],
        },
      ]}
      createLabel="Add Book"
      searchKeys={['title', 'author', 'barcode', 'isbn', 'category']}
      transformCreate={(form) => ({
        ...form,
        copies: Number(form.copies || 0),
        available: Number(form.available || 0),
      })}
    />
  );
}

export function LibraryIssuesPage() {
  return (
    <ModuleCrudPage
      title="Library Issue / Return"
      subtitle="Issue books to enrolled students using book and student IDs."
      service={libraryIssueService}
      columns={[
        { key: 'bookTitle', label: 'Book', primary: true },
        { key: 'studentName', label: 'Student' },
        { key: 'issueDate', label: 'Issued' },
        { key: 'dueDate', label: 'Due' },
        { key: 'fine', label: 'Fine' },
        { key: 'status', label: 'Status', badge: true },
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
          key: 'bookId',
          label: 'Book',
          type: 'entity',
          required: true,
          loadOptions: async () => loadBookOptions(),
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
        { key: 'issueDate', label: 'Issue Date', type: 'date', required: true },
        {
          key: 'dueDate',
          label: 'Due Date',
          type: 'date',
          required: true,
          validate: (value, form) => {
            if (form.issueDate && value && value < form.issueDate) {
              return 'Due date must be on or after issue date.';
            }
            return null;
          },
        },
        { key: 'returnDate', label: 'Return Date', type: 'date' },
        { key: 'fine', label: 'Fine Amount', type: 'number', defaultValue: '0' },
        {
          key: 'status',
          label: 'Status',
          type: 'select',
          required: true,
          defaultValue: 'issued',
          options: [
            { value: 'issued', label: 'Issued' },
            { value: 'returned', label: 'Returned' },
            { value: 'overdue', label: 'Overdue' },
          ],
        },
      ]}
      createLabel="Issue Book"
      searchKeys={['bookTitle', 'studentName', 'status']}
      transformCreate={(form) => ({
        bookId: form.bookId,
        studentId: form.studentId,
        classId: form.classId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        returnDate: form.returnDate || '',
        fine: Number(form.fine || 0),
        status: form.status || 'issued',
      })}
    />
  );
}
