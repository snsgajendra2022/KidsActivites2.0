export default function PaperTextarea({
  label,
  value,
  onChange,
  readOnly = false,
  rows = 3,
  className = '',
  id,
}) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`html-form-field html-form-field--textarea ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="html-form-field__label">{label}</span>}
      <textarea
        id={inputId}
        className="html-form-textarea"
        rows={rows}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}
