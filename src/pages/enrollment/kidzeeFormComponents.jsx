import { useId } from 'react';
import { SignaturePad } from '../../components/ui/index.jsx';

/** A4 page shell with optional alignment grid and wave decorations. */
export function PrintPage({
  children,
  pageNumber,
  totalPages = 5,
  showGrid = false,
  showHeader = false,
  showFooter = false,
  branding,
  className = '',
  isLast = false,
}) {
  return (
    <section
      className={`print-page kz-page ${isLast ? 'kz-page--last' : ''} ${className}`.trim()}
      data-page={pageNumber}
    >
      {showGrid && <CalibrationGrid />}
      <KidzeeWaveDecor position="top" />
      <KidzeeWaveDecor position="bottom" />
      <div className={`kz-page__content ${showFooter ? 'kz-page__content--with-footer' : ''}`}>
        {showHeader && <KidzeeHeader branding={branding} />}
        {children}
      </div>
      {showFooter && <KidzeeFooter branding={branding} />}
      {pageNumber != null && (
        <div className="kz-page__pagenum no-print">Page {pageNumber} / {totalPages}</div>
      )}
    </section>
  );
}

export function CalibrationGrid() {
  const lines = [];
  for (let mm = 0; mm <= 210; mm += 5) {
    lines.push(
      <div key={`v-${mm}`} className="kz-grid__v" style={{ left: `${mm}mm` }}>
        {mm % 10 === 0 && <span>{mm}</span>}
      </div>,
    );
  }
  for (let mm = 0; mm <= 297; mm += 5) {
    lines.push(
      <div key={`h-${mm}`} className="kz-grid__h" style={{ top: `${mm}mm` }}>
        {mm % 10 === 0 && <span>{mm}</span>}
      </div>,
    );
  }
  return <div className="kz-grid no-print" aria-hidden>{lines}</div>;
}

export function KidzeeWaveDecor({ position }) {
  const waves = position === 'top' ? (
    <svg viewBox="0 0 210 16" preserveAspectRatio="none" className="kz-waves__svg">
      <path d="M0,8 C18,2 36,14 54,7 C72,1 90,12 108,6 C126,2 144,11 162,7 C180,4 195,9 210,6" fill="none" stroke="#d4a8c8" strokeWidth="0.25" />
      <path d="M0,10 C22,4 44,13 66,7 C88,2 110,12 132,6 C154,3 176,10 198,6 C205,5 210,7 210,7" fill="none" stroke="#e8a0b8" strokeWidth="0.3" />
      <path d="M0,6 C20,12 40,3 60,9 C80,14 100,4 120,10 C140,5 160,12 180,7 C195,4 205,9 210,8" fill="none" stroke="#c49bc4" strokeWidth="0.28" />
      <path d="M0,12 C25,6 50,14 75,8 C100,3 125,13 150,7 C170,4 190,11 210,9" fill="none" stroke="#b8a0d4" strokeWidth="0.22" />
      <path d="M0,4 C30,10 60,2 90,8 C120,13 150,5 180,10 C195,7 205,5 210,6" fill="none" stroke="#dda0c0" strokeWidth="0.35" />
      <path d="M0,14 C28,8 56,15 84,10 C112,5 140,14 168,9 C190,6 205,12 210,10" fill="none" stroke="#c8b0d8" strokeWidth="0.2" />
      <path d="M0,9 C15,14 30,5 45,10 C60,15 75,6 90,11 C105,5 120,13 135,8 C150,4 165,11 180,7 C195,5 205,8 210,7" fill="none" stroke="#e0a8c8" strokeWidth="0.18" />
    </svg>
  ) : (
    <svg viewBox="0 0 210 18" preserveAspectRatio="none" className="kz-waves__svg">
      <path d="M0,12 C20,4 40,16 60,8 C80,0 100,14 120,6 C140,2 160,12 180,8 C195,5 205,10 210,8 L210,18 L0,18 Z" fill="none" stroke="#c4b5d4" strokeWidth="0.3" />
      <path d="M0,10 C25,2 50,14 75,6 C100,0 125,12 150,5 C170,2 190,10 210,6" fill="none" stroke="#e8a0b8" strokeWidth="0.4" />
      <path d="M0,14 C30,8 60,16 90,10 C120,4 150,14 180,9 C195,7 205,12 210,10" fill="none" stroke="#9bb8e8" strokeWidth="0.35" />
    </svg>
  );

  return (
    <div className={`kz-waves kz-waves--${position}`} aria-hidden>
      {waves}
      {position === 'bottom' && (
        <div className="kz-waves__bar">
          <span className="kz-waves__bar-red" />
          <span className="kz-waves__bar-blue" />
        </div>
      )}
    </div>
  );
}

export function KidzeeHeader({ branding }) {
  return (
    <header className="kz-header">
      <KidzeeHeaderBrand branding={branding} />
    </header>
  );
}

export function KidzeeHeaderBrand({ branding }) {
  const logoSrc = branding.wordmarkUrl || branding.logoUrl;
  const tagline = branding.preschoolTagline || 'PRESCHOOL IS';

  return (
    <div className="kz-header__brand">
      <span className="kz-header__tagline">{tagline}</span>
      <img
        src={logoSrc}
        alt={branding.brandName}
        className="kz-header__logo"
      />
    </div>
  );
}

export function KidzeeFooter({ branding }) {
  return (
    <footer className="kz-footer">
      <div className="kz-footer__social">
        <span>f {branding.social.facebook}</span>
        <span>◎ {branding.social.instagram}</span>
        <span>⌂ {branding.social.website}</span>
      </div>
      <div className="kz-footer__badges">
        <span className="kz-footer__trusted">{branding.trustedBrandText}</span>
        <div className="kz-footer__learn">
          <span className="kz-footer__learn-z">{branding.learnMark}</span>
          <span className="kz-footer__learn-text">{branding.learnSubtext}</span>
        </div>
      </div>
    </footer>
  );
}

export function SectionBar({ children }) {
  return <div className="kz-section-bar">{children}</div>;
}

export function LineInput({ label, value, onChange, readOnly, suffix, className = '', boxes }) {
  if (boxes) {
    return (
      <CharBoxInput
        label={label}
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        boxes={boxes}
        className={className}
        suffix={suffix}
      />
    );
  }
  return (
    <label className={`kz-line-field ${className}`.trim()}>
      {label && <span className="kz-field-label">{label}</span>}
      <input
        type="text"
        className="kz-line-input"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
      {suffix}
    </label>
  );
}

export function BoxInput(props) {
  return <CharBoxInput {...props} />;
}

export function CharBoxInput({
  label,
  value = '',
  onChange,
  readOnly = false,
  boxes = 10,
  className = '',
  labelClass = '',
  suffix = null,
  inline = false,
  fluid = false,
  bare = false,
  boxWidth = '4.8mm',
  style,
}) {
  const uid = useId();
  const display = (value || '').slice(0, boxes);
  const colTemplate = fluid
    ? `repeat(${boxes}, minmax(0, 1fr))`
    : `repeat(${boxes}, ${boxWidth})`;

  const boxesEl = (
    <div
      className={`kz-char-boxes${fluid ? ' kz-char-boxes--fluid' : ''}`}
      style={{ gridTemplateColumns: colTemplate }}
    >
      {Array.from({ length: boxes }, (_, i) => (
        <span
          key={i}
          className="kz-char-box"
          aria-hidden
        >
          {display[i] || ''}
        </span>
      ))}
      {!readOnly && (
        <input
          id={uid}
          type="text"
          className="kz-char-input"
          value={display}
          maxLength={boxes}
          onChange={(e) => onChange?.(e.target.value.slice(0, boxes))}
          aria-label={label || 'Character input'}
        />
      )}
    </div>
  );

  if (bare) {
    return boxesEl;
  }

  return (
    <div
      className={`kz-char-field ${inline ? 'kz-char-field--inline' : ''} ${fluid ? 'kz-char-field--fluid' : ''} ${className}`.trim()}
      style={style}
    >
      {label && <span className={`kz-field-label ${labelClass}`.trim()}>{label}</span>}
      {boxesEl}
      {suffix}
    </div>
  );
}

export function MultiRowBoxes({
  label,
  rows,
  values = [],
  onChange,
  readOnly,
  className = '',
  lastRowSuffix = null,
  fluid = false,
  boxWidth,
  addressGrid = false,
}) {
  if (addressGrid && label) {
    return (
      <div className={`kz-address-grid ${className}`.trim()}>
        <span className="kz-field-label kz-address-grid__label">{label}</span>
        {rows.map((boxes, rowIndex) => {
          const isLast = rowIndex === rows.length - 1;
          const rowClass = `kz-address-grid__row${isLast && lastRowSuffix ? ' kz-address-grid__row--with-suffix' : ''}`;

          if (isLast && lastRowSuffix) {
            return (
              <div
                key={rowIndex}
                className={`kz-address-line3 ${rowClass}`.trim()}
                style={{ gridRow: rowIndex + 1 }}
              >
                <CharBoxInput
                  bare
                  boxes={boxes}
                  value={values[rowIndex] ?? ''}
                  onChange={(v) => onChange?.(rowIndex, v)}
                  readOnly={readOnly}
                  boxWidth={boxWidth}
                />
                {lastRowSuffix}
              </div>
            );
          }

          return (
            <CharBoxInput
              key={rowIndex}
              boxes={boxes}
              value={values[rowIndex] ?? ''}
              onChange={(v) => onChange?.(rowIndex, v)}
              readOnly={readOnly}
              boxWidth={boxWidth}
              className={rowClass}
              style={{ gridRow: rowIndex + 1 }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className={`kz-multi-row ${className}`.trim()}>
      {rows.map((boxes, rowIndex) => {
        const isFirst = rowIndex === 0;
        const isLast = rowIndex === rows.length - 1;
        const lineClass = `kz-multi-row__line${!isFirst ? ' kz-multi-row__line--indent' : ''}${isLast && lastRowSuffix ? ' kz-multi-row__line--with-suffix' : ''}`;

        if (isLast && lastRowSuffix) {
          return (
            <div key={rowIndex} className={lineClass}>
              <CharBoxInput
                boxes={boxes}
                value={values[rowIndex] ?? ''}
                onChange={(v) => onChange?.(rowIndex, v)}
                readOnly={readOnly}
                fluid={fluid}
                boxWidth={boxWidth}
              />
              {lastRowSuffix}
            </div>
          );
        }

        return (
          <CharBoxInput
            key={rowIndex}
            label={isFirst ? label : undefined}
            boxes={boxes}
            value={values[rowIndex] ?? ''}
            onChange={(v) => onChange?.(rowIndex, v)}
            readOnly={readOnly}
            fluid={fluid}
            boxWidth={boxWidth}
            className={lineClass}
          />
        );
      })}
    </div>
  );
}

export function PaperCheckbox({ label, checked, onChange, readOnly, className = '' }) {
  return (
    <label className={`kz-checkbox ${className}`.trim()}>
      <input
        type="checkbox"
        checked={Boolean(checked)}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={readOnly}
      />
      <span>{label}</span>
    </label>
  );
}

export function YesNoGroup({ value = {}, onChange, readOnly, className = '' }) {
  const set = (key, checked) => {
    if (checked) onChange?.({ yes: key === 'yes', no: key === 'no' });
    else onChange?.({ ...value, [key]: false });
  };
  return (
    <span className={`kz-yesno ${className}`.trim()}>
      <PaperCheckbox label="Yes" checked={value.yes} onChange={(v) => set('yes', v)} readOnly={readOnly} />
      <PaperCheckbox label="No" checked={value.no} onChange={(v) => set('no', v)} readOnly={readOnly} />
    </span>
  );
}

export function PaperTextarea({ label, value, onChange, readOnly, rows = 3, className = '' }) {
  return (
    <label className={`kz-textarea-field ${className}`.trim()}>
      {label && <span className="kz-field-label">{label}</span>}
      <textarea
        className="kz-textarea"
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}

export function PhotoBox({ label, value, onChange, readOnly, className = '' }) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className={`kz-photo ${className}`.trim()}>
      <span className="kz-photo__label">{label}</span>
      <label className="kz-photo__frame">
        {value ? (
          <img src={value} alt={label} className="kz-photo__img" />
        ) : (
          <span className="kz-photo__placeholder">{label}</span>
        )}
        {!readOnly && (
          <input type="file" accept="image/*" onChange={handleFile} className="kz-photo__input no-print" />
        )}
      </label>
    </div>
  );
}

export function SignatureLine({ label, value, onChange, readOnly, className = '' }) {
  const hasSignature = Boolean(value && (typeof value === 'string' ? value.trim() : value));

  return (
    <div className={`kz-signature ${className}`.trim()}>
      {label && <span className="kz-signature__label">{label}</span>}
      {readOnly ? (
        hasSignature ? (
          <img src={value} alt={label || 'Signature'} className="kz-signature__img" />
        ) : (
          <div className="kz-signature__line" aria-hidden />
        )
      ) : (
        <>
          {hasSignature && (
            <img
              src={value}
              alt={label || 'Signature'}
              className="kz-signature__img"
            />
          )}
          <div className="kz-signature__pad no-print">
            <SignaturePad
              value={value}
              onChange={onChange}
              width={280}
              height={70}
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}

export function PaperTable({ children, className = '', caption }) {
  return (
    <div className="kz-table-wrap">
      <table className={`kz-table ${className}`.trim()}>
        {caption && <caption className="kz-table__caption">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

const P3_ROW_BOXES = 12;
const P3_ADDR_LINE3_BOXES = 6;
const P3_PIN_BOXES = 5;

function P3LabelSpacer() {
  return <div className="kz-p3-label-fixed kz-field-label" aria-hidden />;
}

function P3FieldRow({ label, boxes, value, onChange, readOnly }) {
  return (
    <div className="kz-p3-form-row">
      <span className="kz-p3-label-fixed kz-field-label">{label}</span>
      <div className="kz-p3-grid-input-wrapper">
        <CharBoxInput
          bare
          boxes={boxes}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function P3AddressBlock({
  label,
  line1,
  line2,
  line3,
  pin,
  onLineChange,
  onPinChange,
  readOnly,
}) {
  return (
    <>
      <div className="kz-p3-form-row">
        <span className="kz-p3-label-fixed kz-field-label">{label}</span>
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_ROW_BOXES}
            value={line1}
            onChange={(v) => onLineChange(0, v)}
            readOnly={readOnly}
          />
        </div>
      </div>
      <div className="kz-p3-form-row">
        <P3LabelSpacer />
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_ROW_BOXES}
            value={line2}
            onChange={(v) => onLineChange(1, v)}
            readOnly={readOnly}
          />
        </div>
      </div>
      <div className="kz-p3-form-row kz-p3-form-row--center">
        <P3LabelSpacer />
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_ADDR_LINE3_BOXES}
            value={line3}
            onChange={(v) => onLineChange(2, v)}
            readOnly={readOnly}
          />
        </div>
        <span className="kz-p3-inline-label kz-field-label">Pin:</span>
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_PIN_BOXES}
            value={pin}
            onChange={onPinChange}
            readOnly={readOnly}
          />
        </div>
      </div>
    </>
  );
}

function P3MedicalBlock({ line1, line2, line3, onLineChange, readOnly }) {
  return (
    <>
      <div className="kz-p3-form-row">
        <span className="kz-p3-label-fixed kz-field-label">Medical History:</span>
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_ROW_BOXES}
            value={line1}
            onChange={(v) => onLineChange(0, v)}
            readOnly={readOnly}
          />
        </div>
      </div>
      <div className="kz-p3-form-row">
        <P3LabelSpacer />
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_ROW_BOXES}
            value={line2}
            onChange={(v) => onLineChange(1, v)}
            readOnly={readOnly}
          />
        </div>
      </div>
      <div className="kz-p3-form-row">
        <P3LabelSpacer />
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            bare
            boxes={P3_ROW_BOXES}
            value={line3}
            onChange={(v) => onLineChange(2, v)}
            readOnly={readOnly}
          />
        </div>
      </div>
    </>
  );
}

export function GuardianColumn({ title, prefix, data, onChange, readOnly }) {
  const set = (field, value) => onChange(`${prefix}.${field}`, value);
  const g = data || {};

  return (
    <div className="kz-guardian-col">
      <h3 className="kz-section-title kz-p3-col-title">{title}</h3>

      <P3FieldRow
        label="Name:"
        boxes={P3_ROW_BOXES}
        value={g.name}
        onChange={(v) => set('name', v)}
        readOnly={readOnly}
      />

      <P3AddressBlock
        label="Residential Address:"
        line1={g.addressLine1}
        line2={g.addressLine2}
        line3={g.addressLine3}
        pin={g.pin}
        onLineChange={(i, v) => set(`addressLine${i + 1}`, v)}
        onPinChange={(v) => set('pin', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="Contact No.:"
        boxes={P3_ROW_BOXES}
        value={g.contactNo}
        onChange={(v) => set('contactNo', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="Qualification:"
        boxes={P3_ROW_BOXES}
        value={g.qualification}
        onChange={(v) => set('qualification', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="Occupation:"
        boxes={P3_ROW_BOXES}
        value={g.occupation}
        onChange={(v) => set('occupation', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="Designation:"
        boxes={P3_ROW_BOXES}
        value={g.designation}
        onChange={(v) => set('designation', v)}
        readOnly={readOnly}
      />

      <P3AddressBlock
        label="Office Address:"
        line1={g.officeLine1}
        line2={g.officeLine2}
        line3={g.officeLine3}
        pin={g.officePin}
        onLineChange={(i, v) => set(`officeLine${i + 1}`, v)}
        onPinChange={(v) => set('officePin', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="Contact No.:"
        boxes={P3_ROW_BOXES}
        value={g.officeContactNo}
        onChange={(v) => set('officeContactNo', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="Mobile:"
        boxes={P3_ROW_BOXES}
        value={g.mobile}
        onChange={(v) => set('mobile', v)}
        readOnly={readOnly}
      />

      <P3FieldRow
        label="E-mail:"
        boxes={P3_ROW_BOXES}
        value={g.email}
        onChange={(v) => set('email', v)}
        readOnly={readOnly}
      />

      <P3MedicalBlock
        line1={g.medicalLine1}
        line2={g.medicalLine2}
        line3={g.medicalLine3}
        onLineChange={(i, v) => set(`medicalLine${i + 1}`, v)}
        readOnly={readOnly}
      />
    </div>
  );
}
