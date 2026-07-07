import FormHeader from '../components/FormHeader.jsx';
import PrintPage from '../components/PrintPage.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import LineInput from '../components/LineInput.jsx';
import PaperCheckbox from '../components/PaperCheckbox.jsx';
import PaperTextarea from '../components/PaperTextarea.jsx';
import PaperTable from '../components/PaperTable.jsx';
import { HOUSEHOLD_INCOME_OPTIONS } from '../printableEnrollmentFields.js';

function GuardianColumn({ title, prefix, data, onChange, readOnly }) {
  const set = (field, value) => onChange(`${prefix}.${field}`, value);
  const g = data || {};

  return (
    <div className="html-form-guardian-col">
      <h3 className="html-form-guardian-col__title">{title}</h3>
      <LineInput label="Name" value={g.name} onChange={(v) => set('name', v)} readOnly={readOnly} />
      <PaperTextarea label="Residential Address" value={g.residentialAddress} onChange={(v) => set('residentialAddress', v)} readOnly={readOnly} rows={2} />
      <div className="html-form-row html-form-row--2">
        <LineInput label="PIN" value={g.pin} onChange={(v) => set('pin', v)} readOnly={readOnly} />
        <LineInput label="Contact No." value={g.contactNo} onChange={(v) => set('contactNo', v)} readOnly={readOnly} />
      </div>
      <div className="html-form-row html-form-row--2">
        <LineInput label="Qualification" value={g.qualification} onChange={(v) => set('qualification', v)} readOnly={readOnly} />
        <LineInput label="Occupation" value={g.occupation} onChange={(v) => set('occupation', v)} readOnly={readOnly} />
      </div>
      <LineInput label="Designation" value={g.designation} onChange={(v) => set('designation', v)} readOnly={readOnly} />
      <PaperTextarea label="Office Address" value={g.officeAddress} onChange={(v) => set('officeAddress', v)} readOnly={readOnly} rows={2} />
      <div className="html-form-row html-form-row--2">
        <LineInput label="Office PIN" value={g.officePin} onChange={(v) => set('officePin', v)} readOnly={readOnly} />
        <LineInput label="Office Contact" value={g.officeContactNo} onChange={(v) => set('officeContactNo', v)} readOnly={readOnly} />
      </div>
      <div className="html-form-row html-form-row--2">
        <LineInput label="Mobile" value={g.mobile} onChange={(v) => set('mobile', v)} readOnly={readOnly} />
        <LineInput label="Email" value={g.email} onChange={(v) => set('email', v)} readOnly={readOnly} />
      </div>
      <PaperTextarea label="Medical History" value={g.medicalHistory} onChange={(v) => set('medicalHistory', v)} readOnly={readOnly} rows={2} />
    </div>
  );
}

export default function HtmlFormPage3({
  formData,
  onChange,
  readOnly,
  schoolName,
  logoUrl,
}) {
  const set = (path, value) => onChange(path, value);
  const siblings = formData.siblings || [];
  const familyMembers = formData.otherFamilyMembers || [];

  return (
    <PrintPage pageNumber={3}>
      <FormHeader schoolName={schoolName} logoUrl={logoUrl} />

      <div className="html-form-guardian-grid">
        <GuardianColumn
          title="Mother / Guardian"
          prefix="motherGuardian"
          data={formData.motherGuardian}
          onChange={set}
          readOnly={readOnly}
        />
        <GuardianColumn
          title="Father / Guardian"
          prefix="fatherGuardian"
          data={formData.fatherGuardian}
          onChange={set}
          readOnly={readOnly}
        />
      </div>

      <SectionTitle>Household Income (Monthly)</SectionTitle>
      <div className="html-form-income-row">
        {HOUSEHOLD_INCOME_OPTIONS.map(({ key, label }) => (
          <PaperCheckbox
            key={key}
            label={label}
            checked={formData.householdIncome?.[key]}
            onChange={(v) => set(`householdIncome.${key}`, v)}
            readOnly={readOnly}
          />
        ))}
      </div>

      <SectionTitle>Siblings</SectionTitle>
      <PaperTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Date of Birth</th>
            <th>School</th>
            <th>Standard</th>
            <th>Alumni</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i}>
              <td><input type="text" className="html-form-table-input" value={siblings[i]?.name ?? ''} onChange={(e) => set(`siblings.${i}.name`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="text" className="html-form-table-input" value={siblings[i]?.gender ?? ''} onChange={(e) => set(`siblings.${i}.gender`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="date" className="html-form-table-input" value={siblings[i]?.dateOfBirth ?? ''} onChange={(e) => set(`siblings.${i}.dateOfBirth`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="text" className="html-form-table-input" value={siblings[i]?.school ?? ''} onChange={(e) => set(`siblings.${i}.school`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="text" className="html-form-table-input" value={siblings[i]?.standard ?? ''} onChange={(e) => set(`siblings.${i}.standard`, e.target.value)} readOnly={readOnly} /></td>
              <td className="html-form-table-checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(siblings[i]?.alumni)}
                  onChange={(e) => set(`siblings.${i}.alumni`, e.target.checked)}
                  disabled={readOnly}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </PaperTable>

      <SectionTitle>Other Family Members</SectionTitle>
      <PaperTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Gender</th>
            <th>Relationship</th>
            <th>Date of Birth</th>
          </tr>
        </thead>
        <tbody>
          {[0, 1, 2].map((i) => (
            <tr key={i}>
              <td><input type="text" className="html-form-table-input" value={familyMembers[i]?.name ?? ''} onChange={(e) => set(`otherFamilyMembers.${i}.name`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="text" className="html-form-table-input" value={familyMembers[i]?.gender ?? ''} onChange={(e) => set(`otherFamilyMembers.${i}.gender`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="text" className="html-form-table-input" value={familyMembers[i]?.relationship ?? ''} onChange={(e) => set(`otherFamilyMembers.${i}.relationship`, e.target.value)} readOnly={readOnly} /></td>
              <td><input type="date" className="html-form-table-input" value={familyMembers[i]?.dateOfBirth ?? ''} onChange={(e) => set(`otherFamilyMembers.${i}.dateOfBirth`, e.target.value)} readOnly={readOnly} /></td>
            </tr>
          ))}
        </tbody>
      </PaperTable>
    </PrintPage>
  );
}
