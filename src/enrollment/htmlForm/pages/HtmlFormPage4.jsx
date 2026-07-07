import FormHeader from '../components/FormHeader.jsx';
import PrintPage from '../components/PrintPage.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LineInput from '../components/LineInput.jsx';
import PaperTextarea from '../components/PaperTextarea.jsx';
import PaperTable from '../components/PaperTable.jsx';
import { IMMUNIZATION_ROWS, IMMUNIZATION_COLUMNS } from '../printableEnrollmentFields.js';

function EmergencyContactCard({ index, contact, onChange, readOnly, title }) {
  const set = (field, value) => onChange(`emergencyContacts.${index}.${field}`, value);
  const c = contact || {};

  return (
    <div className="html-form-emergency-card">
      <h3 className="html-form-emergency-card__title">{title}</h3>
      <LineInput label="Name" value={c.name} onChange={(v) => set('name', v)} readOnly={readOnly} />
      <PaperTextarea label="Address" value={c.address} onChange={(v) => set('address', v)} readOnly={readOnly} rows={2} />
      <div className="html-form-row html-form-row--2">
        <LineInput label="PIN" value={c.pin} onChange={(v) => set('pin', v)} readOnly={readOnly} />
        <LineInput label="Contact No." value={c.contactNo} onChange={(v) => set('contactNo', v)} readOnly={readOnly} />
      </div>
      <div className="html-form-row html-form-row--2">
        <LineInput label="Mobile" value={c.mobile} onChange={(v) => set('mobile', v)} readOnly={readOnly} />
        <LineInput label="Email" value={c.email} onChange={(v) => set('email', v)} readOnly={readOnly} />
      </div>
    </div>
  );
}

export default function HtmlFormPage4({
  formData,
  onChange,
  readOnly,
  schoolName,
  logoUrl,
}) {
  const set = (path, value) => onChange(path, value);
  const immunization = formData.immunization || {};
  const contacts = formData.emergencyContacts || [];

  return (
    <PrintPage pageNumber={4}>
      <FormHeader schoolName={schoolName} logoUrl={logoUrl} />

      <SectionTitle>Immunization Record</SectionTitle>
      <p className="html-form-instruction">
        Please enter dates (DD/MM/YYYY) for each dose administered.
      </p>
      <PaperTable className="html-form-immunization-table">
        <thead>
          <tr>
            <th>Age / Vaccine</th>
            {IMMUNIZATION_COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IMMUNIZATION_ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row" className="html-form-immunization-label">{row.label}</th>
              {IMMUNIZATION_COLUMNS.map((col) => (
                <td key={col.key}>
                  <input
                    type="date"
                    className="html-form-table-input html-form-table-input--date"
                    value={immunization[row.key]?.[col.key] ?? ''}
                    onChange={(e) => set(`immunization.${row.key}.${col.key}`, e.target.value)}
                    readOnly={readOnly}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </PaperTable>

      <SectionTitle>Emergency Contacts</SectionTitle>
      <div className="html-form-emergency-grid">
        <EmergencyContactCard
          index={0}
          contact={contacts[0]}
          onChange={set}
          readOnly={readOnly}
          title="Emergency Contact 1"
        />
        <EmergencyContactCard
          index={1}
          contact={contacts[1]}
          onChange={set}
          readOnly={readOnly}
          title="Emergency Contact 2"
        />
      </div>
    </PrintPage>
  );
}
