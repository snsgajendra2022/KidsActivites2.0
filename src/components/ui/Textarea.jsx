export default function Textarea({
  label,
  error,
  required,
  className = '',
  id,
  variant = 'default',
  ...props
}) {
  const textareaId = id || props.name;
  const isEnroll = variant === 'enrollment';

  if (isEnroll) {
    const spanClass = className.includes('full') ? 'md:col-span-2' : '';
    return (
      <div className={`space-y-2 ${spanClass} ${className.replace('full', '').trim()}`}>
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-semibold text-[#0b1c30]">
            {label}
            {required && <span className="text-[#ba1a1a]"> *</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          className={`min-h-[100px] w-full rounded-lg border bg-[#f8f9ff] px-4 py-3 outline-none transition-all ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-[#c5c6cd] focus:border-[#0058be] focus:shadow-[0_0_0_4px_rgba(0,88,190,0.1)]'
          }`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  }

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
