import {
  PrintPage,
  CharBoxInput,
  MultiRowBoxes,
  PaperTable,
  KidzeeHeaderBrand,
} from "../kidzeeFormComponents.jsx";
import {
  IMMUNIZATION_ROWS,
  IMMUNIZATION_COLUMNS,
} from "../kidzeePrintFields.js";

const P4_ROW_BOXES = 13;
const P4_ADDR_LINE3_BOXES = 6;
const P4_PIN_BOXES = 6;

function EmergencyContactCol({ index, contact, onChange, readOnly }) {
  const set = (field, value) =>
    onChange(`emergencyContacts.${index}.${field}`, value);
  const c = contact || {};

  const pinSuffix = (
    <>
      <span className="kz-p4-inline-label kz-field-label">Pin:</span>
      <CharBoxInput
        bare
        boxes={P4_PIN_BOXES}
        value={c.pin}
        onChange={(v) => set("pin", v)}
        readOnly={readOnly}
      />
    </>
  );

  return (
    <div className="kz-emergency-col">
      <CharBoxInput
        label="Name:"
        labelClass="kz-p4-field-label"
        boxes={P4_ROW_BOXES}
        value={c.name}
        onChange={(v) => set("name", v)}
        readOnly={readOnly}
      />
      <MultiRowBoxes
        label="Address:"
        rows={[P4_ROW_BOXES, P4_ROW_BOXES, P4_ADDR_LINE3_BOXES]}
        values={[c.addressLine1, c.addressLine2, c.addressLine3]}
        onChange={(i, v) => set(`addressLine${i + 1}`, v)}
        readOnly={readOnly}
        addressGrid
        lastRowSuffix={pinSuffix}
        className="kz-emergency-col__address"
      />
      <CharBoxInput
        label="Contact No.:"
        labelClass="kz-p4-field-label"
        boxes={P4_ROW_BOXES}
        value={c.contactNo}
        onChange={(v) => set("contactNo", v)}
        readOnly={readOnly}
      />
      <CharBoxInput
        label="Mobile:"
        labelClass="kz-p4-field-label"
        boxes={P4_ROW_BOXES}
        value={c.mobile}
        onChange={(v) => set("mobile", v)}
        readOnly={readOnly}
      />
      <CharBoxInput
        label="E-mail:"
        labelClass="kz-p4-field-label"
        boxes={P4_ROW_BOXES}
        value={c.email}
        onChange={(v) => set("email", v)}
        readOnly={readOnly}
      />
    </div>
  );
}

export default function KidzeePage4({
  formData,
  onChange,
  readOnly,
  branding,
  showGrid,
}) {
  const set = (path, value) => onChange(path, value);
  const immunization = formData.immunization || {};
  const contacts = formData.emergencyContacts || [];

  return (
    <PrintPage pageNumber={4} showGrid={showGrid} branding={branding}>
      <header className="kz-p4-header">
        <h2 className="kz-section-title">Medical History</h2>
        <KidzeeHeaderBrand branding={branding} />
      </header>

      <h3 className="kz-section-title kz-p4-subtitle">Child&apos;s Immunisation History</h3>

      <PaperTable className="kz-immun-table">
        <thead>
          <tr>
            <th>Age</th>
            <th>Recommendation</th>
            {IMMUNIZATION_COLUMNS.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {IMMUNIZATION_ROWS.map((row) => (
            <tr key={row.key}>
              <td className="kz-immun-table__age">{row.age}</td>
              <td className="kz-immun-table__rec">{row.recommendation}</td>
              {IMMUNIZATION_COLUMNS.map((col) => (
                <td key={col.key}>
                  <input
                    type="text"
                    className="kz-table-input kz-table-input--date"
                    value={immunization[row.key]?.[col.key] ?? ""}
                    onChange={(e) =>
                      set(`immunization.${row.key}.${col.key}`, e.target.value)
                    }
                    readOnly={readOnly}
                    placeholder="d/m/y"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </PaperTable>

      <h3 className="kz-section-title kz-p4-emergency-title">EMERGENCY CONTACT</h3>
      <p className="kz-instruction-text kz-p4-emergency-intro">
        In the event, when the teachers can&apos;t reach the parent/guardian,
        the preschool will call the people listed below:
      </p>
      <ul className="kz-instruction-text kz-p4-emergency-bullets">
        <li>Give permission to administer health care</li>
        <li>Pick up the child if the child is ill</li>
        <li>Give advice about caring for your child</li>
      </ul>

      <div className="kz-p4-emergency-grid">
        <EmergencyContactCol
          index={0}
          contact={contacts[0]}
          onChange={set}
          readOnly={readOnly}
        />
        <EmergencyContactCol
          index={1}
          contact={contacts[1]}
          onChange={set}
          readOnly={readOnly}
        />
      </div>

      <div className="kz-p4-learn-mark" aria-hidden>
        <span className="kz-p4-learn-mark__z">
          {branding?.learnMark ?? "Z"}
        </span>
        <span className="kz-p4-learn-mark__text">
          {branding?.learnSubtext ?? "LEARN"}
        </span>
      </div>
    </PrintPage>
  );
}
