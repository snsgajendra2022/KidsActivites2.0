export default function PaperCheckbox({
  label,
  checked,
  onChange,
  readOnly = false,
  className = '',
  id,
}) {
  const inputId = id || (label ? `cb-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);
  return (
    <label className={`html-form-checkbox ${className}`.trim()} htmlFor={inputId}>
      <input
        id={inputId}
        type="checkbox"
        className="html-form-checkbox__input"
        checked={Boolean(checked)}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={readOnly}
      />
      {label && <span className="html-form-checkbox__label">{label}</span>}
    </label>
  );
}
