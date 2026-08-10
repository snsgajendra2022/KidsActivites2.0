import ModuleCrudPage from '../../components/modules/ModuleCrudPage.jsx';
import { libraryBookService } from '../../services/schoolModules/index.js';

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

export { default as LibraryIssuesPage } from './LibraryIssuesPage.jsx';
