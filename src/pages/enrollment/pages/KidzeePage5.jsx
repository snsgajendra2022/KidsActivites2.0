import {
  PrintPage,
  CharBoxInput,
  SignatureLine,
  KidzeeHeaderBrand,
} from "../kidzeeFormComponents.jsx";

function PermissionSignRow({
  date,
  place,
  signature,
  onDate,
  onPlace,
  onSignature,
  readOnly,
}) {
  return (
    <div className="kz-perm-sign">
      <CharBoxInput
        label="Date:"
        boxes={8}

        value={date}
        onChange={onDate}
        readOnly={readOnly}
      />
      <CharBoxInput
        label="Place:"
        boxes={12}

        value={place}
        onChange={onPlace}
        readOnly={readOnly}
      />
      <SignatureLine
        label="Parent's/Guardian's Signature"
        value={signature}
        onChange={onSignature}
        readOnly={readOnly}
        className="kz-perm-sign__sig"
        hidePreview={true}
      />
    </div>
  );
}

export default function KidzeePage5({
  formData,
  onChange,
  readOnly,
  isAdmin,
  branding,
  showGrid,
}) {
  const set = (path, value) => onChange(path, value);
  const permissions = formData.permissions || {};
  const officeUse = formData.officeUse || {};
  const officeReadOnly = readOnly || !isAdmin;

  return (
    <PrintPage
      pageNumber={5}
      showGrid={showGrid}
      showFooter
      branding={branding}
      isLast
    >
      <header className="kz-p5-header">
        <h2 className="kz-section-title kz-p5-header__title">Official Enrollment Document</h2>
        <KidzeeHeaderBrand branding={branding} />
      </header>

      <div className="kz-p5-perm">
        <h2 className="kz-section-title kz-p5-perm__title">Emergency Permission</h2>
        <p className="kz-instruction-text kz-p5-perm__text">
          I give my consent for emergency measures to be taken in case of an
          emergency situation arising due to an accident/violent injury/medical
          or surgical emergency with the understanding that I (the father/the
          mother/the guardian of the child) shall be notified/informed as soon
          as possible. The school will accept no responsibility for any
          unforeseen incident that may occur due to the administration of
          medicine/treatment in both emergency and non-emergency situations,
          though necessary precautions are taken.
        </p>
        <PermissionSignRow
          date={permissions.emergency?.date}
          place={permissions.emergency?.place}
          signature={permissions.emergency?.signature}
          onDate={(v) => set("permissions.emergency.date", v)}
          onPlace={(v) => set("permissions.emergency.place", v)}
          onSignature={(v) => set("permissions.emergency.signature", v)}
          readOnly={readOnly}
        />
      </div>

      <div className="kz-p5-perm">
        <h2 className="kz-section-title kz-p5-perm__title">Field Trip Permission</h2>
        <p className="kz-instruction-text kz-p5-perm__text">
          I do hereby allow my child to attend the field trips planned and
          arranged by the preschool and I shall not hold Kidzee authorities
          responsible for any mishap during the said trip.
        </p>
        <PermissionSignRow
          date={permissions.fieldTrip?.date}
          place={permissions.fieldTrip?.place}
          signature={permissions.fieldTrip?.signature}
          onDate={(v) => set("permissions.fieldTrip.date", v)}
          onPlace={(v) => set("permissions.fieldTrip.place", v)}
          onSignature={(v) => set("permissions.fieldTrip.signature", v)}
          readOnly={readOnly}
        />
      </div>

      <hr className="kz-p5-divider" />

      <div className="kz-p5-verify">
        <p className="kz-instruction-text kz-p5-verify__text">
          I/We, parent(s)/guardian(s) of{" "}
          <input
            type="text"
            className="kz-p5-verify__name"
            value={permissions.verification?.childName ?? ""}
            onChange={(e) =>
              set("permissions.verification.childName", e.target.value)
            }
            readOnly={readOnly}
          />{" "}
          have read the rules, regulations and guidelines applicable with
          respect to Kidzee as given and have understood the same and have
          thereafter decided to enrol my son/daughter in the preschool. I/We
          hereby agree and undertake to abide by all the policies of Kidzee and
          to strictly adhere to all the rules and guidelines as laid down by
          them.
        </p>

        <h2 className="kz-section-title kz-p5-perm__title">Verification</h2>
        <p className="kz-instruction-text kz-p5-perm__text">
          I hereby verify that I have read the information included in this form
          and the information provided by me is complete and correct.
        </p>
        <PermissionSignRow
          date={permissions.verification?.date}
          place={permissions.verification?.place}
          signature={permissions.verification?.signature}
          onDate={(v) => set("permissions.verification.date", v)}
          onPlace={(v) => set("permissions.verification.place", v)}
          onSignature={(v) => set("permissions.verification.signature", v)}
          readOnly={readOnly}
        />
      </div>

      <div className="kz-p5-office">
        <h2 className="kz-section-title kz-p5-office__title">For office use only</h2>
        {!isAdmin && (
          <p className="kz-p5-office__note no-print">
            Office fields are editable by school administrators.
          </p>
        )}
        <div
          className={`kz-p5-office__grid ${!isAdmin ? "kz-p5-office__grid--restricted" : ""}`}
        >
          <CharBoxInput
            label="Class details:"
            boxes={10}

            value={officeUse.classDetails}
            onChange={(v) => set("officeUse.classDetails", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label="Term:"
            boxes={10}

            value={officeUse.term}
            onChange={(v) => set("officeUse.term", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label="Invoice/Receipt No.:"
            boxes={10}

            value={officeUse.invoiceReceiptNo}
            onChange={(v) => set("officeUse.invoiceReceiptNo", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label="Timing:"
            boxes={10}

            value={officeUse.timing}
            onChange={(v) => set("officeUse.timing", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label="Amount:"
            boxes={10}

            value={officeUse.amount}
            onChange={(v) => set("officeUse.amount", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label="Date:"
            boxes={10}

            value={officeUse.date}
            onChange={(v) => set("officeUse.date", v)}
            readOnly={officeReadOnly}
          />
        </div>
        <SignatureLine
          label="Signature with Seal/Stamp"
          value={officeUse.signature}
          onChange={(v) => set("officeUse.signature", v)}
          readOnly={officeReadOnly}
          className="kz-p5-office__sig"
          hidePreview={true}
        />
      </div>
    </PrintPage>
  );
}
