export default function LineInput({
  label,
  value,
  onChange,
  readOnly = false,
  type = 'text',
  className = '',
  inline = false,
  id,
  required = false,
}) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`html-form-field html-form-field--line ${inline ? 'html-form-field--inline' : ''} ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="html-form-field__label">{label}{required ? ' *' : ''}</span>}
      <input
        id={inputId}
        type={type}
        className="html-form-input html-form-input--line"
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}
