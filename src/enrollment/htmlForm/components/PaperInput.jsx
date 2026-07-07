export default function PaperInput({
  label,
  value,
  onChange,
  readOnly = false,
  type = 'text',
  className = '',
  inputClassName = '',
  id,
  required = false,
}) {
  const inputId = id || (label ? `field-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`html-form-field ${className}`.trim()} htmlFor={inputId}>
      {label && <span className="html-form-field__label">{label}{required ? ' *' : ''}</span>}
      <input
        id={inputId}
        type={type}
        className={`html-form-input html-form-input--boxed ${inputClassName}`.trim()}
        value={value ?? ''}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
      />
    </label>
  );
}
