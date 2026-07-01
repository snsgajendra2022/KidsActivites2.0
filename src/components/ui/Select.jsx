export default function Select({
  label,
  error,
  required,
  options = [],
  placeholder,
  className = '',
  id,
  variant = 'default',
  ...props
}) {
  const selectId = id || props.name;
  const isEnroll = variant === 'enrollment';

  if (isEnroll) {
    const spanClass = className.includes('full') ? 'md:col-span-2' : '';
    return (
      <div className={`space-y-2 ${spanClass} ${className.replace('full', '').trim()}`}>
        {label && (
          <label htmlFor={selectId} className="block text-sm font-semibold text-[#0b1c30]">
            {label}
            {required && <span className="text-[#ba1a1a]"> *</span>}
          </label>
        )}
        <select
          id={selectId}
          className={`h-12 w-full rounded-lg border bg-[#f8f9ff] px-4 outline-none transition-all ${
            error
              ? 'border-rose-400 focus:border-rose-500'
              : 'border-[#c5c6cd] focus:border-[#0058be] focus:shadow-[0_0_0_4px_rgba(0,88,190,0.1)]'
          }`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  }

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
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
