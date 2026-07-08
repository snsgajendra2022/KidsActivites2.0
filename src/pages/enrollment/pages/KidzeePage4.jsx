import { useRef } from "react";
import {
  PrintPage,
  CharBoxInput,
  MultiRowBoxes,
  PaperTable,
  TableInput,
  KidzeeHeaderBrand,
} from "../kidzeeFormComponents.jsx";
import {
  IMMUNIZATION_ROWS,
  IMMUNIZATION_COLUMNS,
} from "../kidzeePrintFields.js";

const P4_ROW_BOXES = 13;
const P4_ADDR_LINE3_BOXES = 5;
const P4_PIN_BOXES = 6;
const P4_EMAIL_ROWS = [14, 14, 12];
const P4_EMAIL_OFFSETS = [0, 14, 28];

function EmergencyContactCol({ index, contact, onChange, readOnly }) {
  const emailRef0 = useRef(null);
  const emailRef1 = useRef(null);
  const emailRef2 = useRef(null);
  const emailRefs = [emailRef0, emailRef1, emailRef2];
  const set = (field, value) =>
    onChange(`emergencyContacts.${index}.${field}`, value);
  const c = contact || {};

  const emailLines = P4_EMAIL_ROWS.map((n, i) =>
    (c.email || '').slice(P4_EMAIL_OFFSETS[i], P4_EMAIL_OFFSETS[i] + n),
  );

  const setEmailRow = (rowIndex, val) => {
    const rows = [...emailLines];
    rows[rowIndex] = val;
    const combined = rows
      .map((r, idx) => r.padEnd(P4_EMAIL_ROWS[idx], ' '))
      .join('');
    set('email', combined.replace(/\s+$/, ''));
  };

  const pinSuffix = (
    <>
      <span className="kz-p4-inline-label kz-field-label">Pin:</span>
      <div className="kz-p4-pin-wrapper">
        <CharBoxInput
          bare
          boxes={P4_PIN_BOXES}
          value={c.pin}
          onChange={(v) => set("pin", v)}
          readOnly={readOnly}
        />
      </div>
    </>
  );

  return (
    <div className="kz-emergency-col">
      <CharBoxInput
        label="Name:"
        labelClass="kz-p4-field-label"
        boxes={P4_ROW_BOXES}
        filter="alpha"
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
        filter="numeric"
        value={c.contactNo}
        onChange={(v) => set("contactNo", v)}
        readOnly={readOnly}
      />
      <CharBoxInput
        label="Mobile:"
        labelClass="kz-p4-field-label"
        boxes={P4_ROW_BOXES}
        filter="numeric"
        value={c.mobile}
        onChange={(v) => set("mobile", v)}
        readOnly={readOnly}
      />
      <CharBoxInput
        ref={emailRef0}
        label="E-mail:"
        labelClass="kz-p4-field-label"
        className="kz-p4-email-row"
        boxes={P4_EMAIL_ROWS[0]}
        boxWidth="4.3mm"
        filter="email"
        caseSensitive
        value={emailLines[0]}
        onChange={(v) => setEmailRow(0, v)}
        onFilled={() => emailRefs[1].current?.focus()}
        readOnly={readOnly}
      />
      {[1, 2].map((r) => (
        <div className="kz-char-field kz-p4-email-row" key={r}>
          <div className="kz-p4-field-label kz-field-label" aria-hidden />
          <CharBoxInput
            ref={emailRefs[r]}
            bare
            boxes={P4_EMAIL_ROWS[r]}
            boxWidth="4.3mm"
            filter="email"
            caseSensitive
            value={emailLines[r]}
            onChange={(v) => setEmailRow(r, v)}
            onFilled={() => emailRefs[r + 1]?.current?.focus()}
            onBackspaceAtStart={() => emailRefs[r - 1].current?.focus()}
            readOnly={readOnly}
          />
        </div>
      ))}
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
                  <TableInput
                    type="date"
                    className="kz-table-input--date"
                    value={immunization[row.key]?.[col.key]}
                    onChange={(v) =>
                      set(`immunization.${row.key}.${col.key}`, v)
                    }
                    readOnly={readOnly}
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

    </PrintPage>
  );
}
