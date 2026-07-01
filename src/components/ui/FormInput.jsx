import { forwardRef } from 'react';

const FormInput = forwardRef(function FormInput(
  {
    label,
    error,
    helper,
    required,
    className = '',
    inputClassName = '',
    leftIcon: LeftIcon,
    id,
    ...props
  },
  ref
) {
  const inputId = id || props.name;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-slate-600">
          {label}
          {required && <span className="ml-0.5 text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <LeftIcon
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm transition-all duration-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            LeftIcon ? 'pl-10' : ''
          } ${
            error
              ? 'border-rose-200 focus:border-rose-300 focus:ring-rose-300/40'
              : 'border-stone-200/80 focus:border-stone-300 focus:ring-slate-300/40'
          } ${inputClassName}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      {helper && !error && <p className="text-xs text-slate-500">{helper}</p>}
    </div>
  );
});

export default FormInput;
