import PortalLogo from '../brand/PortalLogo.jsx';

const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function EnrollmentFormHeader({ portalName, school }) {
  return (
    <header className="enrollment-form-header">
      <div className="enrollment-form-header__slant-wrap" aria-hidden="true">
        <div className="enrollment-form-header__slant-navy" />
        <div className="enrollment-form-header__slant-red" />
      </div>
      <div className="enrollment-form-header__bar" />

      <div className="enrollment-form-header__content">
        <div>
          <p className="enrollment-form-header__subtitle">{school?.name || 'School Enrollment'}</p>
          <h1 className="enrollment-form-header__title">
            <span className="enrollment-form-header__title-red">Student</span>
            <span className="enrollment-form-header__title-navy">Enrollment Form</span>
          </h1>
          <p className="enrollment-form-header__year">
            Academic Year {school?.academicYear}
          </p>
        </div>

        <div className="enrollment-form-header__brand">
          <div className="enrollment-form-header__brand-row">
            <div className="enrollment-form-header__logo">
              <PortalLogo size="lg" />
            </div>
          </div>
          <div className="enrollment-form-header__contact">
            {school?.address && <p>{school.address}</p>}
            {school?.phone && <p>{school.phone}</p>}
            {school?.email && <p>{school.email}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}

export function EnrollmentSectionHeader({ step, title }) {
  const SECTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const letter = SECTION_LETTERS[step - 1] || 'A';

  return (
    <div className="enrollment-section-header">
      <span className="enrollment-section-letter">{letter}</span>
      <span>{title}</span>
    </div>
  );
}

export function EnrollmentFormRow({
  label,
  wide = false,
  required = false,
  error,
  footerHint,
  children,
  stacked = false,
}) {
  return (
    <div
      className={[
        'enrollment-form-row',
        stacked && 'enrollment-form-row--stacked',
        wide && 'enrollment-form-row--wide-label',
      ].filter(Boolean).join(' ')}
    >
      <label className="enrollment-form-row__label" aria-required={required || undefined}>
        <span className="enrollment-form-row__label-text">{label}</span>
        {required && <span className="enrollment-required" aria-hidden="true">*</span>}
        {!stacked && <span className="enrollment-form-row__colon">:</span>}
      </label>
      <div className="enrollment-form-row__control">{children}</div>
      {error && (
        <p className="enrollment-form-row__error" role="alert">
          {error}
        </p>
      )}
      {!error && footerHint && (
        <p className="enrollment-form-row__hint enrollment-field-hint">{footerHint}</p>
      )}
    </div>
  );
}

export function EnrollmentFormSplit({ children }) {
  return <div className="enrollment-form-split">{children}</div>;
}

export function EnrollmentInlineInput(props) {
  return <input className="enrollment-inline-input" {...props} />;
}

export function EnrollmentInlineSelect({ options = [], placeholder, ...props }) {
  return (
    <select className="enrollment-inline-select" {...props}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map(({ value, label }) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  );
}

export function EnrollmentInlineTextarea(props) {
  return <textarea className="enrollment-inline-textarea" {...props} />;
}

export function EnrollmentSquareRadioGroup({ name, options, value, onChange }) {
  return (
    <div className="enrollment-check-group" role="radiogroup" aria-label={name}>
      {options.map(({ value: optVal, label }) => (
        <label key={optVal} className="enrollment-check-label">
          <input
            type="radio"
            name={name}
            className="enrollment-square-check"
            checked={value === optVal}
            onChange={() => onChange(optVal)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

export function EnrollmentSquareCheckbox({ checked, onChange, label }) {
  return (
    <label className="enrollment-check-label">
      <input
        type="checkbox"
        className="enrollment-square-check"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

export function EnrollmentNotesPanel({ children }) {
  return (
    <aside className="enrollment-notes-panel">
      <strong>Notes :</strong>
      {children}
    </aside>
  );
}

export function EnrollmentFormStepper({ currentStep, total = 8, sectionLetter }) {
  const percent = Math.round((currentStep / total) * 100);
  const letter = sectionLetter || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[currentStep - 1] || 'A';

  return (
    <div className="enrollment-stepper">
      <div className="enrollment-stepper__meta">
        <span className="enrollment-stepper__badge">Step {currentStep} of {total}</span>
        <span className="enrollment-stepper__percent">{percent}% Complete</span>
      </div>
      <div className="enrollment-stepper__track">
        <div className="enrollment-stepper__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="enrollment-stepper__label">Section {letter}</p>
    </div>
  );
}
