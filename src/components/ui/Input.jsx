export default function Input({
  label,
  error,
  helper,
  required,
  className = '',
  id,
  variant = 'default',
  ...props
}) {
  const inputId = id || props.name;
  const isEnroll = variant === 'enrollment';

  if (isEnroll) {
    const spanClass = className.includes('full') || className.includes('col-span') ? 'md:col-span-2' : '';
    return (
      <div className={`space-y-2 ${spanClass} ${className.replace('full', '').trim()}`}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-[#0b1c30]">
            {label}
            {required && <span className="text-[#ba1a1a]"> *</span>}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            className={`w-full rounded-lg border bg-[#f8f9ff] px-4 outline-none transition-all ${
              props.type === 'date' ? 'h-12 pr-12' : 'h-12'
            } ${
              error
                ? 'border-rose-400 focus:border-rose-500'
                : 'border-[#c5c6cd] focus:border-[#0058be] focus:shadow-[0_0_0_4px_rgba(0,88,190,0.1)]'
            }`}
            {...props}
          />
          {props.type === 'date' && (
            <span className="material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#45474c]">
              calendar_today
            </span>
          )}
        </div>
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
        {helper && !error && <p className="text-xs text-[#45474c]/70">{helper}</p>}
      </div>
    );
  }

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
