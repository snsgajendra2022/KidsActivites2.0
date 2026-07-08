import {
  PrintPage,
  SectionBar,
  CharBoxInput,
  DateInput,
  PaperCheckbox,
  PhotoBox,
  KidzeeHeaderBrand,
  useBoxChain,
} from "../kidzeeFormComponents.jsx";
import {
  CLASS_OPTIONS,
  UNIFORM_SIZES,
  STAYS_WITH_OPTIONS,
} from "../kidzeePrintFields.js";

export default function KidzeePage1({
  formData,
  onChange,
  readOnly,
  isAdmin = false,
  branding,
  showGrid,
}) {
  const set = (path, value) => onChange(path, value);
  const child = formData.child || {};
  const formNoReadOnly = readOnly || (!isAdmin && Boolean(formData.formNo));
  const addrChain = useBoxChain(4);

  const classRow1 = CLASS_OPTIONS.slice(0, 6);
  const classRow2 = CLASS_OPTIONS.slice(6);

  return (
    <PrintPage pageNumber={1} showGrid={showGrid} branding={branding}>
      {/* Brand header — top right */}
      <div className="kz-p1-row kz-p1-row--brand">
        <KidzeeHeaderBrand branding={branding} />
      </div>

      {/* Tel / Form No / Admission — stacked left */}
      <div className="kz-p1-top-fields">
        <CharBoxInput
          label="Tel. No.:"
          boxes={10}
          filter="numeric"
          value={formData.telNo}
          onChange={(v) => set("telNo", v)}
          readOnly={readOnly}
        />
        <CharBoxInput
          label="Form No.:"
          boxes={6}
          value={formData.formNo}
          onChange={(v) => set("formNo", v)}
          readOnly={formNoReadOnly}
        />
        <CharBoxInput
          label="Admission No.:"
          boxes={16}

          value={formData.admissionNo}
          onChange={(v) => set("admissionNo", v)}
          readOnly={readOnly}
        />
      </div>

      <SectionBar>CHILD REGISTRATION FORM</SectionBar>

      {/* Class row 1 — 6 checkboxes */}
      <div className="kz-p1-row kz-p1-row--class">
        <span className="kz-field-label kz-p1-class__label">Class enrolled for:</span>
        <div className="kz-p1-class__checks">
          {classRow1.map(({ key, label }) => (
            <PaperCheckbox
              key={key}
              label={label}
              checked={formData.class?.[key]}
              onChange={(v) => set(`class.${key}`, v)}
              readOnly={readOnly}
            />
          ))}
        </div>
      </div>

      {/* Class row 2 — 3 checkboxes, indented */}
      <div className="kz-p1-row kz-p1-row--class2">
        {classRow2.map(({ key, label }) => (
          <PaperCheckbox
            key={key}
            label={label}
            checked={formData.class?.[key]}
            onChange={(v) => set(`class.${key}`, v)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Batch + Timing (left) | Photos (right) */}
      <div className="kz-p1-row kz-p1-row--batch-photos">
        <div className="kz-p1-batch-timing">
          <CharBoxInput
            label="Batch:"
            boxes={8}

            value={formData.batch}
            onChange={(v) => set("batch", v)}
            readOnly={readOnly}
          />
          <CharBoxInput
            label="Timing:"
            boxes={4}

            value={formData.timing}
            onChange={(v) => set("timing", v)}
            readOnly={readOnly}
          />
        </div>
        <div className="kz-p1-photos">
          <PhotoBox
            label="Child's Photo"
            value={formData.photos?.child}
            onChange={(v) => set("photos.child", v)}
            readOnly={readOnly}
          />
          <PhotoBox
            label="Father's / Guardian's Photo"
            value={formData.photos?.father}
            onChange={(v) => set("photos.father", v)}
            readOnly={readOnly}
          />
          <PhotoBox
            label="Mother's / Guardian's Photo"
            value={formData.photos?.mother}
            onChange={(v) => set("photos.mother", v)}
            readOnly={readOnly}
          />
        </div>
      </div>

      {/* Name — 32 boxes + hints */}
      <div className="kz-p1-row kz-p1-row--name">
        <CharBoxInput
          label="Name of the child:"
          boxes={32}
          filter="alpha"
          value={child.fullName}
          onChange={(v) => set("child.fullName", v)}
          readOnly={readOnly}
        />
        <div className="kz-p1-name-hints">
          <span>(Surname)</span>
          <span>(First Name)</span>
          <span>(Middle Name)</span>
        </div>
      </div>

      {/* Gender — own row */}
      <div className="kz-p1-row kz-p1-row--gender">
        <span className="kz-field-label kz-p1-field-label--wide">Gender:</span>
        <PaperCheckbox
          label="Male"
          checked={child.gender?.male}
          onChange={(v) => set("child.gender.male", v)}
          readOnly={readOnly}
        />
        <PaperCheckbox
          label="Female"
          checked={child.gender?.female}
          onChange={(v) => set("child.gender.female", v)}
          readOnly={readOnly}
        />
      </div>

      {/* DOB 8 | Place 10 */}
      <div className="kz-p1-row kz-p1-row--dob-place">
        <DateInput
          label="Date of birth:"
          value={child.dateOfBirth}
          onChange={(v) => set("child.dateOfBirth", v)}
          readOnly={readOnly}
          inline
        />
        <CharBoxInput
          label="Place of birth:"
          boxes={10}
          filter="alpha"
          value={child.placeOfBirth}
          onChange={(v) => set("child.placeOfBirth", v)}
          readOnly={readOnly}
          inline
        />
      </div>

      {/* Height 15 | Weight 7 */}
      <div className="kz-p1-row kz-p1-row--height-weight">
        <CharBoxInput
          label="Height:"
          boxes={15}
          value={child.height}
          onChange={(v) => set("child.height", v)}
          readOnly={readOnly}
          inline
        />
        <CharBoxInput
          label="Weight:"
          boxes={7}
          value={child.weight}
          onChange={(v) => set("child.weight", v)}
          readOnly={readOnly}
          inline
        />
      </div>

      {/* Blood Group — 2 boxes */}
      <div className="kz-p1-row kz-p1-row--blood">
        <CharBoxInput
          label="Blood Group:"
          boxes={2}
          value={child.bloodGroup}
          onChange={(v) => set("child.bloodGroup", v)}
          readOnly={readOnly}
        />
      </div>

      {/* Uniform */}
      <div className="kz-p1-row kz-p1-row--uniform-label">
        <span className="kz-field-label">Uniform:</span>
      </div>
      <div className="kz-p1-row kz-p1-row--uniform">
        <span className="kz-p1-uniform__type">Regular:</span>
        {UNIFORM_SIZES.map((size) => (
          <PaperCheckbox
            key={`reg-${size}`}
            label={size}
            checked={child.uniformRegular?.[size]}
            onChange={(v) => set(`child.uniformRegular.${size}`, v)}
            readOnly={readOnly}
          />
        ))}
      </div>
      <div className="kz-p1-row kz-p1-row--uniform-winter">
        <span className="kz-p1-uniform__type">Winter:</span>
        {UNIFORM_SIZES.map((size) => (
          <PaperCheckbox
            key={`win-${size}`}
            label={size}
            checked={child.uniformWinter?.[size]}
            onChange={(v) => set(`child.uniformWinter.${size}`, v)}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Languages — 28 boxes */}
      <div className="kz-p1-row kz-p1-row--languages">
        <CharBoxInput
          label="Language(s) spoken at home:"
          boxes={28}
          filter="alpha"
          value={child.languagesAtHome}
          onChange={(v) => set("child.languagesAtHome", v)}
          readOnly={readOnly}
        />
      </div>

      {/* Address — 35 + 35 indented + 27 + Pin 6 */}
      <div className="kz-p1-address-block">
        <CharBoxInput
          {...addrChain(0)}
          label="Address:"
          boxes={35}
          value={child.addressLine1}
          onChange={(v) => set("child.addressLine1", v)}
          readOnly={readOnly}
        />
        <div className="kz-p1-address-line2">
          <CharBoxInput
            {...addrChain(1)}
            bare
            boxes={35}
            value={child.addressLine2}
            onChange={(v) => set("child.addressLine2", v)}
            readOnly={readOnly}
          />
        </div>
        <div className="kz-p1-address-line3">
          <div className="kz-p1-address-line3__boxes">
            <CharBoxInput
              {...addrChain(2)}
              bare
              boxes={24}
              value={child.addressLine3}
              onChange={(v) => set("child.addressLine3", v)}
              readOnly={readOnly}
            />
          </div>
          <CharBoxInput
            {...addrChain(3)}
            label="Pin:"
            boxes={6}
            filter="numeric"
            value={child.pin}
            onChange={(v) => set("child.pin", v)}
            readOnly={readOnly}
            inline
          />
        </div>
      </div>

      {/* Contact — 18 boxes */}
      <div className="kz-p1-row kz-p1-row--contact">
        <CharBoxInput
          label="Contact No.:"
          boxes={18}
          filter="numeric"
          value={child.contactNo}
          onChange={(v) => set("child.contactNo", v)}
          readOnly={readOnly}
        />
      </div>

      {/* Stays with — kept from existing form */}
      <div className="kz-p1-row kz-p1-row--stays">
        <span className="kz-field-label">Child stays/lives with:</span>
        {STAYS_WITH_OPTIONS.map(({ key, label }) => (
          <PaperCheckbox
            key={key}
            label={label}
            checked={child.staysWith?.[key]}
            onChange={(v) => set(`child.staysWith.${key}`, v)}
            readOnly={readOnly}
          />
        ))}
      </div>

      <div className="kz-p1-row kz-p1-row--stays-others">
        <PaperCheckbox
          label="Others (Please specify):"
          checked={child.staysWith?.others}
          onChange={(v) => set("child.staysWith.others", v)}
          readOnly={readOnly}
        />
        <CharBoxInput
          boxes={22}

          value={child.staysWith?.othersText}
          onChange={(v) => set("child.staysWith.othersText", v)}
          readOnly={readOnly}
          inline
        />
      </div>

    </PrintPage>
  );
}
