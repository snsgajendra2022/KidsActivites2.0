export default function BoxInput({
  label,
  value,
  onChange,
  readOnly = false,
  type = 'text',
  className = '',
  compact = false,
  id,
}) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`html-form-field html-form-field--box ${compact ? 'html-form-field--compact' : ''} ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="html-form-field__label">{label}</span>}
      <input
        id={inputId}
        type={type}
        className="html-form-input html-form-input--box"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}
