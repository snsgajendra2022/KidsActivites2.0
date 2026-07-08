import {
  PrintPage,
  GuardianColumn,
  PaperCheckbox,
  PaperTable,
  TableInput,
  KidzeeHeaderBrand,
} from "../kidzeeFormComponents.jsx";
import { HOUSEHOLD_INCOME_OPTIONS } from "../kidzeePrintFields.js";

export default function KidzeePage3({
  formData,
  onChange,
  readOnly,
  branding,
  showGrid,
}) {
  const set = (path, value) => onChange(path, value);
  const siblings = formData.siblings || [];
  const familyMembers = formData.otherFamilyMembers || [];

  return (
    <PrintPage pageNumber={3} showGrid={showGrid} branding={branding}>
      <header className="kz-p3-header">
        <KidzeeHeaderBrand branding={branding} />
      </header>

      <div className="kz-p3-guardians">
        <GuardianColumn
          title="Mother's/Guardian's Details:"
          prefix="motherGuardian"
          data={formData.motherGuardian}
          onChange={set}
          readOnly={readOnly}
        />
        <GuardianColumn
          title="Father's/Guardian's Details:"
          prefix="fatherGuardian"
          data={formData.fatherGuardian}
          onChange={set}
          readOnly={readOnly}
        />
      </div>

      <div className="kz-p3-section kz-p3-section--income">
        <div className="kz-p3-form-row kz-p3-form-row--income">
          <span className="kz-p3-label-fixed kz-field-label">
            Monthly Household Income(₹):
          </span>
          <div className="kz-p3-income__options">
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
        </div>
      </div>

      <div className="kz-p3-section kz-p3-section--siblings">
        <PaperTable className="kz-p3-sibling-table">
          <thead>
            <tr>
              <th>Brother&apos;s/Sister&apos;s Name (if any)</th>
              <th>Gender</th>
              <th>Date of Birth</th>
              <th>School Attending</th>
              <th>Standard</th>
              <th>Kidzee Alumni (Y/N)</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i}>
                <td>
                  <TableInput
                    value={siblings[i]?.name}
                    onChange={(v) => set(`siblings.${i}.name`, v)}
                    readOnly={readOnly}
                    filter="alpha"
                  />
                </td>
                <td>
                  <TableInput
                    value={siblings[i]?.gender}
                    onChange={(v) => set(`siblings.${i}.gender`, v)}
                    readOnly={readOnly}
                    filter="alpha"
                  />
                </td>
                <td>
                  <TableInput
                    type="date"
                    value={siblings[i]?.dateOfBirth}
                    onChange={(v) => set(`siblings.${i}.dateOfBirth`, v)}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <TableInput
                    value={siblings[i]?.school}
                    onChange={(v) => set(`siblings.${i}.school`, v)}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <TableInput
                    value={siblings[i]?.standard}
                    onChange={(v) => set(`siblings.${i}.standard`, v)}
                    readOnly={readOnly}
                    filter="alphanumeric"
                  />
                </td>
                <td>
                  <TableInput
                    className="kz-table-input--center"
                    value={siblings[i]?.alumni}
                    onChange={(v) => set(`siblings.${i}.alumni`, v)}
                    readOnly={readOnly}
                    filter="alpha"
                    maxLength={1}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </PaperTable>
      </div>

      <div className="kz-p3-section kz-p3-section--family">
        <PaperTable
          className="kz-p3-family-table"
          caption="Other members in the family:"
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Gender</th>
              <th>Relationship with Child</th>
              <th>Date of Birth</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((i) => (
              <tr key={i}>
                <td>
                  <TableInput
                    value={familyMembers[i]?.name}
                    onChange={(v) => set(`otherFamilyMembers.${i}.name`, v)}
                    readOnly={readOnly}
                    filter="alpha"
                  />
                </td>
                <td>
                  <TableInput
                    value={familyMembers[i]?.gender}
                    onChange={(v) => set(`otherFamilyMembers.${i}.gender`, v)}
                    readOnly={readOnly}
                    filter="alpha"
                  />
                </td>
                <td>
                  <TableInput
                    value={familyMembers[i]?.relationship}
                    onChange={(v) =>
                      set(`otherFamilyMembers.${i}.relationship`, v)
                    }
                    readOnly={readOnly}
                    filter="alpha"
                  />
                </td>
                <td>
                  <TableInput
                    type="date"
                    value={familyMembers[i]?.dateOfBirth}
                    onChange={(v) =>
                      set(`otherFamilyMembers.${i}.dateOfBirth`, v)
                    }
                    readOnly={readOnly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </PaperTable>
      </div>

    </PrintPage>
  );
}
