export default function Textarea({ label, error, required, className = '', id, ...props }) {
  const textareaId = id || props.name;
  return (
    <div className={`form-field ${className}`}>
      {label && (
        <label className="form-label" htmlFor={textareaId}>
          {label}{required && <span className="required">*</span>}
        </label>
      )}
      <textarea id={textareaId} className={`form-textarea ${error ? 'error' : ''}`} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
