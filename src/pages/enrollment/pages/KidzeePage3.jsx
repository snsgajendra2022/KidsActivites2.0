import {
  PrintPage,
  GuardianColumn,
  PaperCheckbox,
  PaperTable,
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
            {[0, 1].map((i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={siblings[i]?.name ?? ""}
                    onChange={(e) => set(`siblings.${i}.name`, e.target.value)}
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={siblings[i]?.gender ?? ""}
                    onChange={(e) =>
                      set(`siblings.${i}.gender`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={siblings[i]?.dateOfBirth ?? ""}
                    onChange={(e) =>
                      set(`siblings.${i}.dateOfBirth`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={siblings[i]?.school ?? ""}
                    onChange={(e) =>
                      set(`siblings.${i}.school`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={siblings[i]?.standard ?? ""}
                    onChange={(e) =>
                      set(`siblings.${i}.standard`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input kz-table-input--center"
                    value={siblings[i]?.alumni ?? ""}
                    onChange={(e) =>
                      set(`siblings.${i}.alumni`, e.target.value)
                    }
                    readOnly={readOnly}
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
            {[0].map((i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={familyMembers[i]?.name ?? ""}
                    onChange={(e) =>
                      set(`otherFamilyMembers.${i}.name`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={familyMembers[i]?.gender ?? ""}
                    onChange={(e) =>
                      set(`otherFamilyMembers.${i}.gender`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={familyMembers[i]?.relationship ?? ""}
                    onChange={(e) =>
                      set(
                        `otherFamilyMembers.${i}.relationship`,
                        e.target.value,
                      )
                    }
                    readOnly={readOnly}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="kz-table-input"
                    value={familyMembers[i]?.dateOfBirth ?? ""}
                    onChange={(e) =>
                      set(`otherFamilyMembers.${i}.dateOfBirth`, e.target.value)
                    }
                    readOnly={readOnly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </PaperTable>
      </div>

      <div className="kz-p3-learn-mark" aria-hidden>
        <span className="kz-p3-learn-mark__z">Z</span>
        <span className="kz-p3-learn-mark__text">LEARN</span>
      </div>
    </PrintPage>
  );
}
