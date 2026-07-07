export default function SignatureInput({
  label,
  value,
  onChange,
  readOnly = false,
  className = '',
  id,
}) {
  const inputId = id || (label ? `sig-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  const isDataUrl = typeof value === 'string' && value.startsWith('data:image');

  return (
    <div className={`html-form-signature ${className}`.trim()}>
      {label && <span className="html-form-field__label">{label}</span>}
      {isDataUrl ? (
        <div className="html-form-signature__line">
          <img src={value} alt="Signature" className="html-form-signature__img" />
        </div>
      ) : (
        <input
          id={inputId}
          type="text"
          className="html-form-signature__input"
          value={value ?? ''}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={readOnly ? '' : 'Type signature'}
        />
      )}
    </div>
  );
}
