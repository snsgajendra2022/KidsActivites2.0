export default function Select({ label, error, required, options = [], placeholder, className = '', id, ...props }) {
  const selectId = id || props.name;
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="form-label" htmlFor={selectId}>
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      <select id={selectId} className={`form-select ${error ? 'error' : ''}`} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
