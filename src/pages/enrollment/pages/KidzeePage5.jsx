import {
  PrintPage,
  CharBoxInput,
  DateInput,
  SignatureLine,
  KidzeeHeaderBrand,
  TrustedBrandSeal,
} from "../kidzeeFormComponents.jsx";
import { sanitizeInput } from "../kidzeePrintFields.js";

function OfficeIcon({ name }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "kz-office-ico",
    "aria-hidden": true,
  };
  switch (name) {
    case "class":
      return (
        <svg {...common}>
          <path d="M3 7l9-4 9 4-9 4-9-4z" />
          <path d="M7 9.2V14c0 1.1 2.2 2.4 5 2.4s5-1.3 5-2.4V9.2" />
        </svg>
      );
    case "invoice":
      return (
        <svg {...common}>
          <path d="M6 2h8l5 5v15H6z" />
          <path d="M14 2v6h5M9 13h6M9 17h5" />
        </svg>
      );
    case "amount":
      return (
        <svg {...common}>
          <rect x="2.5" y="6" width="19" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.6" />
          <path d="M5.5 9v6M18.5 9v6" />
        </svg>
      );
    case "timing":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3.2 2" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
          <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
        </svg>
      );
    case "building":
      return (
        <svg {...common}>
          <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" />
          <path d="M16 8h2a2 2 0 0 1 2 2v11M4 21h18M8 7h2M8 11h2M8 15h2" />
        </svg>
      );
    default:
      return null;
  }
}

function OfficeLabel({ icon, text }) {
  return (
    <span className="kz-office-label">
      <OfficeIcon name={icon} />
      {text}
    </span>
  );
}

function PermissionSignRow({
  date,
  place,
  signature,
  onDate,
  onPlace,
  onSignature,
  readOnly,
  signatureRequired = false,
  signatureError = false,
  signaturePath,
}) {
  return (
    <div className="kz-perm-sign">
      <DateInput
        label="Date:"
        value={date}
        onChange={onDate}
        readOnly={readOnly}
      />
      <CharBoxInput
        label="Place:"
        boxes={12}
        filter="alpha"
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
        required={signatureRequired}
        error={signatureError}
        fieldPath={signaturePath}
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
  fieldErrors = {},
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
          signatureRequired
          signatureError={Boolean(fieldErrors["permissions.emergency.signature"])}
          signaturePath="permissions.emergency.signature"
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
          signatureRequired
          signatureError={Boolean(fieldErrors["permissions.fieldTrip.signature"])}
          signaturePath="permissions.fieldTrip.signature"
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
              set(
                "permissions.verification.childName",
                sanitizeInput(e.target.value, "alpha"),
              )
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
          signatureRequired
          signatureError={Boolean(fieldErrors["permissions.verification.signature"])}
          signaturePath="permissions.verification.signature"
        />
      </div>

      <div className="kz-p5-spacer" aria-hidden />

      <div className="kz-p5-cutline" aria-hidden>
        <span className="kz-p5-cutline__scissor">&#9986;</span>
        <span className="kz-p5-cutline__hint">Cut here</span>
      </div>

      <div className="kz-p5-office">
        <div className="kz-p5-office__head">
          <span className="kz-p5-office__head-ico">
            <OfficeIcon name="building" />
          </span>
          <h2 className="kz-section-title kz-p5-office__title">For office use only</h2>
        </div>
        {!isAdmin && (
          <p className="kz-p5-office__note no-print">
            Office fields are editable by school administrators.
          </p>
        )}
        <div
          className={`kz-p5-office__grid ${!isAdmin ? "kz-p5-office__grid--restricted" : ""}`}
        >
          <CharBoxInput
            label={<OfficeLabel icon="class" text="Class details:" />}
            boxes={10}
            value={officeUse.classDetails}
            onChange={(v) => set("officeUse.classDetails", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label={<OfficeLabel icon="calendar" text="Term:" />}
            boxes={10}
            value={officeUse.term}
            onChange={(v) => set("officeUse.term", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label={<OfficeLabel icon="invoice" text="Invoice/Receipt No.:" />}
            boxes={10}
            filter="alphanumeric"
            value={officeUse.invoiceReceiptNo}
            onChange={(v) => set("officeUse.invoiceReceiptNo", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label={<OfficeLabel icon="timing" text="Timing:" />}
            boxes={10}
            value={officeUse.timing}
            onChange={(v) => set("officeUse.timing", v)}
            readOnly={officeReadOnly}
          />
          <CharBoxInput
            label={<OfficeLabel icon="amount" text="Amount:" />}
            boxes={10}
            filter="numeric"
            value={officeUse.amount}
            onChange={(v) => set("officeUse.amount", v)}
            readOnly={officeReadOnly}
          />
          <DateInput
            label={<OfficeLabel icon="calendar" text="Date:" />}
            value={officeUse.date}
            onChange={(v) => set("officeUse.date", v)}
            readOnly={officeReadOnly}
          />
        </div>
        <div className="kz-p5-office__signrow">
          <SignatureLine
            label="Signature with Seal/Stamp"
            value={officeUse.signature}
            onChange={(v) => set("officeUse.signature", v)}
            readOnly={officeReadOnly}
            className="kz-p5-office__sig"
            hidePreview={true}
          />
          <TrustedBrandSeal className="kz-p5-office__seal" />
        </div>
      </div>
    </PrintPage>
  );
}
