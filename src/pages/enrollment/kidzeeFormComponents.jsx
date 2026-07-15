import { createRef, forwardRef, useId, useImperativeHandle, useRef, useState } from 'react';
import { SignaturePad } from '../../components/ui/index.jsx';
import { sanitizeInput } from './kidzeePrintFields.js';

/**
 * Builds a stable set of refs for a group of CharBoxInput rows and returns a
 * helper that spreads the cross-line navigation props onto row `i`:
 *   - onFilled: jump caret to the first box of the next row
 *   - onBackspaceAtStart: jump caret back to the previous row
 */
export function useBoxChain(count) {
  const refs = useRef([]);
  if (refs.current.length !== count) {
    refs.current = Array.from(
      { length: count },
      (_, i) => refs.current[i] || createRef(),
    );
  }
  return (i) => ({
    ref: refs.current[i],
    onFilled: () => refs.current[i + 1]?.current?.focus(),
    onBackspaceAtStart:
      i > 0 ? () => refs.current[i - 1]?.current?.focus() : undefined,
  });
}

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

function SocialIconFacebook() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path
        fill="#fff"
        d="M13.5 21v-8h2.6l.4-3h-3V8.1c0-.9.3-1.4 1.5-1.4H16.6V4.1C16.3 4.1 15.3 4 14.2 4 11.9 4 10.3 5.4 10.3 8v2H7.6v3h2.7v8h3.2z"
      />
    </svg>
  );
}

function SocialIconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="#fff" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.6" stroke="#fff" strokeWidth="2" />
      <circle cx="17" cy="7" r="1.2" fill="#fff" />
    </svg>
  );
}

function SocialIconWeb() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <circle cx="12" cy="12" r="9" stroke="#fff" strokeWidth="2" />
      <path
        d="M3 12h18M12 3c2.7 2.6 2.7 15.4 0 18M12 3c-2.7 2.6-2.7 15.4 0 18"
        stroke="#fff"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function KidzeeFooter({ branding }) {
  return (
    <footer className="kz-footer">
      <div className="kz-footer__social">
        <span className="kz-social">
          <span className="kz-social__badge kz-social__badge--fb">
            <SocialIconFacebook />
          </span>
          <span className="kz-social__label">{branding.social.facebook}</span>
        </span>
        <span className="kz-social">
          <span className="kz-social__badge kz-social__badge--ig">
            <SocialIconInstagram />
          </span>
          <span className="kz-social__label">{branding.social.instagram}</span>
        </span>
        <span className="kz-social">
          <span className="kz-social__badge kz-social__badge--web">
            <SocialIconWeb />
          </span>
          <span className="kz-social__label">{branding.social.website}</span>
        </span>
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

export function TrustedBrandSeal({ className = '' }) {
  return (
    <svg
      className={`kz-seal ${className}`.trim()}
      viewBox="0 0 100 100"
      role="img"
      aria-label="India's Most Trusted Brand seal"
    >
      <defs>
        <path id="kz-seal-arc-top" d="M 14,50 A 36,36 0 0 1 86,50" />
        <path id="kz-seal-arc-bottom" d="M 16,50 A 34,34 0 0 0 84,50" />
      </defs>
      <circle className="kz-seal__ring kz-seal__ring--outer" cx="50" cy="50" r="47" />
      <circle className="kz-seal__ring kz-seal__ring--mid" cx="50" cy="50" r="43" />
      <circle className="kz-seal__ring kz-seal__ring--inner" cx="50" cy="50" r="30" />
      <text className="kz-seal__arc kz-seal__arc--top">
        <textPath href="#kz-seal-arc-top" startOffset="50%" textAnchor="middle">
          {"INDIA'S MOST TRUSTED BRAND"}
        </textPath>
      </text>
      <text className="kz-seal__arc kz-seal__arc--bottom">
        <textPath href="#kz-seal-arc-bottom" startOffset="50%" textAnchor="middle">
          {"\u2605 PRE SCHOOL \u2605"}
        </textPath>
      </text>
      <text className="kz-seal__brand" x="50" y="47" textAnchor="middle">
        KIDZEE
      </text>
      <text className="kz-seal__tag" x="50" y="58" textAnchor="middle">
        {"\u2605 \u2605 \u2605"}
      </text>
    </svg>
  );
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

function isoToDisplayDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  if (!y || !m || !d) return '';
  return `${d}/${m}/${y}`;
}

export function DateInput({
  label,
  value,
  onChange,
  readOnly,
  className = '',
  labelClass = '',
  inline = false,
  required = false,
  error = false,
  fieldPath,
}) {
  const nativeRef = useRef(null);
  const display = isoToDisplayDate(value);

  const openPicker = () => {
    if (readOnly) return;
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        /* fall back to focus */
      }
    }
    el.focus();
  };

  return (
    <label
      className={`kz-line-field kz-date-field ${inline ? 'kz-char-field--inline' : ''} ${error ? 'kz-field--error' : ''} ${className}`.trim()}
      data-field-path={fieldPath || undefined}
    >
      {label && (
        <span className={`kz-field-label ${labelClass}`.trim()}>
          {label}
          {required && <span className="kz-required-mark" aria-hidden>*</span>}
        </span>
      )}
      <span
        className={`kz-date-wrap ${readOnly ? 'kz-date-wrap--ro' : ''}`.trim()}
        onClick={openPicker}
      >
        <span
          className={`kz-date-facade ${display ? '' : 'kz-date-facade--empty'}`.trim()}
        >
          {display || 'dd/mm/yyyy'}
        </span>
        <span className="kz-date-ico" aria-hidden>
          &#128197;
        </span>
        <input
          ref={nativeRef}
          type="date"
          className="kz-date-native"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          disabled={readOnly}
          tabIndex={-1}
          aria-label={typeof label === 'string' ? label : 'date'}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
        />
      </span>
    </label>
  );
}

function TableDateCell({ value, onChange, readOnly, className = '' }) {
  const nativeRef = useRef(null);
  const display = isoToDisplayDate(value);

  const openPicker = () => {
    if (readOnly) return;
    const el = nativeRef.current;
    if (!el) return;
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
        return;
      } catch {
        /* fall back to focus */
      }
    }
    el.focus();
  };

  return (
    <span
      className={`kz-tdate ${readOnly ? 'kz-tdate--ro' : ''} ${className}`.trim()}
      onClick={openPicker}
    >
      <svg className="kz-tdate__ico" viewBox="0 0 24 24" aria-hidden focusable="false">
        <rect x="3" y="4.5" width="18" height="16.5" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3 9.5h18M8 2.5v4M16 2.5v4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span
        className={`kz-tdate__text ${display ? '' : 'kz-tdate__text--empty'}`.trim()}
      >
        {display || 'dd/mm/yyyy'}
      </span>
      <input
        ref={nativeRef}
        type="date"
        className="kz-tdate__native"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        disabled={readOnly}
        tabIndex={-1}
        aria-label="date"
      />
    </span>
  );
}

export function TableInput({ value, onChange, readOnly, filter, className = '', maxLength, type = 'text', placeholder }) {
  if (type === 'date') {
    return (
      <TableDateCell
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        className={className}
      />
    );
  }
  return (
    <input
      type="text"
      className={`kz-table-input ${className}`.trim()}
      value={value ?? ''}
      onChange={(e) => onChange?.(sanitizeInput(e.target.value, filter))}
      readOnly={readOnly}
      maxLength={maxLength}
      placeholder={placeholder}
    />
  );
}

export const BoxInput = forwardRef(function BoxInput(props, ref) {
  return <CharBoxInput {...props} ref={ref} />;
});

export const CharBoxInput = forwardRef(function CharBoxInput({
  label,
  value = '',
  onChange,
  onFilled,
  onBackspaceAtStart,
  readOnly = false,
  boxes = 10,
  className = '',
  labelClass = '',
  suffix = null,
  inline = false,
  fluid = false,
  bare = false,
  boxWidth = '4.8mm',
  filter,
  caseSensitive = false,
  style,
  required = false,
  error = false,
  fieldPath,
}, ref) {
  const uid = useId();
  const inputRef = useRef(null);
  const normalizeCase = (v) => (caseSensitive ? v : (v || '').toUpperCase());
  const display = normalizeCase(value || '').slice(0, boxes);

  useImperativeHandle(ref, () => ({
    focus: () => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const pos = (el.value || '').length;
      el.setSelectionRange(pos, pos);
    },
  }));
  
  const [focused, setFocused] = useState(false);
  const [activeCaretIndex, setActiveCaretIndex] = useState(null);

  const colTemplate = fluid
    ? `repeat(${boxes}, minmax(0, 1fr))`
    : `repeat(${boxes}, ${boxWidth})`;

  const updateCaret = () => {
    if (inputRef.current) {
      setActiveCaretIndex(inputRef.current.selectionStart);
    }
  };

  const handleInputChange = (e) => {
    const caretAtEnd = e.target.selectionStart >= boxes;
    const val = sanitizeInput(normalizeCase(e.target.value), filter).slice(0, boxes);
    onChange?.(val);
    setTimeout(updateCaret, 0);
    if (val.length >= boxes && caretAtEnd) {
      onFilled?.();
    }
  };

  const handleKeyDown = (e) => {
    if (
      e.key === 'Backspace' &&
      e.target.selectionStart === 0 &&
      e.target.selectionEnd === 0
    ) {
      onBackspaceAtStart?.();
    }
    updateCaret();
  };

  const handleBoxClick = (index, e) => {
    if (readOnly) return;
    e.preventDefault();
    const targetIndex = Math.min(index, display.length);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(targetIndex, targetIndex);
      setActiveCaretIndex(targetIndex);
    }
  };

  const boxesEl = (
    <div
      className={`kz-char-boxes${fluid ? ' kz-char-boxes--fluid' : ''}${error ? ' kz-char-boxes--error' : ''}`}
      style={{ gridTemplateColumns: colTemplate, position: 'relative' }}
    >
      {Array.from({ length: boxes }, (_, i) => {
        const char = display[i] || '';
        const isActive = focused && activeCaretIndex === i;
        return (
          <span
            key={i}
            className={`kz-char-box ${isActive ? 'kz-char-box--active' : ''}`}
            onClick={(e) => handleBoxClick(i, e)}
            style={{ cursor: readOnly ? 'default' : 'text', zIndex: 1 }}
          >
            {char}
          </span>
        );
      })}
      {!readOnly && (
        <input
          ref={inputRef}
          id={uid}
          type="text"
          className="kz-char-input"
          value={display}
          maxLength={boxes}
          autoComplete="off"
          onChange={handleInputChange}
          onSelect={updateCaret}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCaret}
          onFocus={() => {
            setFocused(true);
            updateCaret();
          }}
          onBlur={() => {
            setFocused(false);
            setActiveCaretIndex(null);
          }}
          style={{ zIndex: 0 }}
          aria-label={label || 'Character input'}
          aria-invalid={error || undefined}
          aria-required={required || undefined}
        />
      )}
    </div>
  );

  if (bare) {
    return (
      <div
        className={error ? 'kz-field--error kz-field--bare-error' : undefined}
        data-field-path={fieldPath || undefined}
      >
        {boxesEl}
      </div>
    );
  }

  return (
    <div
      className={`kz-char-field ${inline ? 'kz-char-field--inline' : ''} ${fluid ? 'kz-char-field--fluid' : ''} ${error ? 'kz-field--error' : ''} ${className}`.trim()}
      style={style}
      data-field-path={fieldPath || undefined}
    >
      {label && (
        <span className={`kz-field-label ${labelClass}`.trim()}>
          {label}
          {required && <span className="kz-required-mark" aria-hidden>*</span>}
        </span>
      )}
      {boxesEl}
      {suffix}
    </div>
  );
});

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
  const chainProps = useBoxChain(rows.length);

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
                  {...chainProps(rowIndex)}
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
              {...chainProps(rowIndex)}
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
                {...chainProps(rowIndex)}
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
            {...chainProps(rowIndex)}
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

export function PhotoBox({ label, value, onChange, readOnly, className = '', required = false, error = false, fieldPath }) {
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange?.(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div
      className={`kz-photo ${error ? 'kz-field--error' : ''} ${className}`.trim()}
      data-field-path={fieldPath || undefined}
    >
      <span className="kz-photo__label">
        {label}
        {required && <span className="kz-required-mark" aria-hidden>*</span>}
      </span>
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

export function SignatureLine({
  label,
  value,
  onChange,
  readOnly,
  className = '',
  hidePreview = false,
  required = false,
  error = false,
  fieldPath,
}) {
  const hasSignature = Boolean(value && (typeof value === 'string' ? value.trim() : value));

  return (
    <div
      className={`kz-signature ${error ? 'kz-field--error' : ''} ${className}`.trim()}
      data-field-path={fieldPath || undefined}
    >
      {label && (
        <span className="kz-signature__label">
          {label}
          {required && <span className="kz-required-mark" aria-hidden>*</span>}
        </span>
      )}
      {readOnly ? (
        hasSignature && !hidePreview ? (
          <img src={value} alt={label || 'Signature'} className="kz-signature__img" />
        ) : (
          <div className="kz-signature__line" aria-hidden />
        )
      ) : (
        <>
          {hasSignature && !hidePreview && (
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
const P3_ADDR_LINE3_BOXES = 4;
const P3_PIN_BOXES = 6;

function P3LabelSpacer() {
  return <div className="kz-p3-label-fixed kz-field-label" aria-hidden />;
}

function P3FieldRow({ label, boxes, value, onChange, readOnly, filter, caseSensitive, required = false, error = false, fieldPath }) {
  return (
    <div
      className={`kz-p3-form-row ${error ? 'kz-field--error' : ''}`.trim()}
      data-field-path={fieldPath || undefined}
    >
      <span className="kz-p3-label-fixed kz-field-label">
        {label}
        {required && <span className="kz-required-mark" aria-hidden>*</span>}
      </span>
      <div className="kz-p3-grid-input-wrapper">
        <CharBoxInput
          bare
          boxes={boxes}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          filter={filter}
          caseSensitive={caseSensitive}
          error={error}
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
  const chainProps = useBoxChain(4);
  return (
    <>
      <div className="kz-p3-form-row">
        <span className="kz-p3-label-fixed kz-field-label">{label}</span>
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            {...chainProps(0)}
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
            {...chainProps(1)}
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
        <div className="kz-p3-address-line3-inputs">
          <div className="kz-p3-grid-input-wrapper kz-p3-addr-line3-wrapper">
            <CharBoxInput
              {...chainProps(2)}
              bare
              boxes={P3_ADDR_LINE3_BOXES}
              value={line3}
              onChange={(v) => onLineChange(2, v)}
              readOnly={readOnly}
            />
          </div>
          <span className="kz-p3-inline-label kz-field-label">Pin:</span>
          <div className="kz-p3-grid-input-wrapper kz-p3-pin-wrapper">
            <CharBoxInput
              {...chainProps(3)}
              bare
              boxes={P3_PIN_BOXES}
              value={pin}
              onChange={onPinChange}
              readOnly={readOnly}
              filter="numeric"
            />
          </div>
        </div>
      </div>
    </>
  );
}

function P3MedicalBlock({ line1, line2, line3, onLineChange, readOnly }) {
  const chainProps = useBoxChain(3);
  return (
    <>
      <div className="kz-p3-form-row">
        <span className="kz-p3-label-fixed kz-field-label">Medical History:</span>
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            {...chainProps(0)}
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
            {...chainProps(1)}
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
            {...chainProps(2)}
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

const P3_EMAIL_ROWS = [14, 14, 12];
const P3_EMAIL_OFFSETS = [0, 14, 28];

function P3EmailBlock({ value, onChange, readOnly, error = false, fieldPath }) {
  const emailRef0 = useRef(null);
  const emailRef1 = useRef(null);
  const emailRef2 = useRef(null);
  const emailRefs = [emailRef0, emailRef1, emailRef2];

  const emailLines = P3_EMAIL_ROWS.map((n, i) =>
    (value || '').slice(P3_EMAIL_OFFSETS[i], P3_EMAIL_OFFSETS[i] + n),
  );

  const setEmailRow = (rowIndex, val) => {
    const rows = [...emailLines];
    rows[rowIndex] = val;
    const combined = rows
      .map((r, idx) => r.padEnd(P3_EMAIL_ROWS[idx], ' '))
      .join('');
    onChange(combined.replace(/\s+$/, ''));
  };

  return (
    <>
      <div
        className={`kz-p3-form-row ${error ? 'kz-field--error' : ''}`.trim()}
        data-field-path={fieldPath || undefined}
      >
        <span className="kz-p3-label-fixed kz-field-label">E-mail:</span>
        <div className="kz-p3-grid-input-wrapper">
          <CharBoxInput
            ref={emailRef0}
            bare
            boxes={P3_EMAIL_ROWS[0]}
            boxWidth="4.1mm"
            value={emailLines[0]}
            onChange={(v) => setEmailRow(0, v)}
            onFilled={() => emailRefs[1].current?.focus()}
            readOnly={readOnly}
            filter="email"
            caseSensitive
            error={error}
          />
        </div>
      </div>
      {[1, 2].map((r) => (
        <div className={`kz-p3-form-row ${error ? 'kz-field--error' : ''}`.trim()} key={r}>
          <P3LabelSpacer />
          <div className="kz-p3-grid-input-wrapper">
            <CharBoxInput
              ref={emailRefs[r]}
              bare
              boxes={P3_EMAIL_ROWS[r]}
              boxWidth="4.1mm"
              value={emailLines[r]}
              onChange={(v) => setEmailRow(r, v)}
              onFilled={() => emailRefs[r + 1]?.current?.focus()}
              onBackspaceAtStart={() => emailRefs[r - 1].current?.focus()}
              readOnly={readOnly}
              filter="email"
              caseSensitive
              error={error}
            />
          </div>
        </div>
      ))}
    </>
  );
}

export function GuardianColumn({ title, prefix, data, onChange, readOnly, fieldErrors = {} }) {
  const set = (field, value) => onChange(`${prefix}.${field}`, value);
  const g = data || {};
  const err = (field) => Boolean(fieldErrors[`${prefix}.${field}`]);

  return (
    <div className="kz-guardian-col">
      <h3 className="kz-section-title kz-p3-col-title">{title}</h3>

      <P3FieldRow
        label="Name:"
        boxes={P3_ROW_BOXES}
        value={g.name}
        onChange={(v) => set('name', v)}
        readOnly={readOnly}
        filter="alpha"
        required
        error={err('name')}
        fieldPath={`${prefix}.name`}
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
        filter="numeric"
      />

      <P3FieldRow
        label="Qualification:"
        boxes={P3_ROW_BOXES}
        value={g.qualification}
        onChange={(v) => set('qualification', v)}
        readOnly={readOnly}
        filter="alpha"
      />

      <P3FieldRow
        label="Occupation:"
        boxes={P3_ROW_BOXES}
        value={g.occupation}
        onChange={(v) => set('occupation', v)}
        readOnly={readOnly}
        filter="alpha"
      />

      <P3FieldRow
        label="Designation:"
        boxes={P3_ROW_BOXES}
        value={g.designation}
        onChange={(v) => set('designation', v)}
        readOnly={readOnly}
        filter="alpha"
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
        filter="numeric"
      />

      <P3FieldRow
        label="Mobile:"
        boxes={P3_ROW_BOXES}
        value={g.mobile}
        onChange={(v) => set('mobile', v)}
        readOnly={readOnly}
        filter="numeric"
        required
        error={err('mobile')}
        fieldPath={`${prefix}.mobile`}
      />

      <P3EmailBlock
        value={g.email}
        onChange={(v) => set('email', v)}
        readOnly={readOnly}
        error={err('email')}
        fieldPath={`${prefix}.email`}
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
