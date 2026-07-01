export default function Input({ label, error, helper, required, className = '', id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="form-label" htmlFor={inputId}>
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      <input id={inputId} className={`form-input ${error ? 'error' : ''}`} {...props} />
      {error && <span className="form-error">{error}</span>}
      {helper && !error && <span className="text-helper">{helper}</span>}
    </div>
  );
}
