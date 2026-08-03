import { Search } from 'lucide-react';

/**
 * Search input with a leading icon in normal document flow
 * (flex), so icon and text cannot overlap.
 */
export default function SearchField({
  value,
  onChange,
  placeholder = 'Search…',
  className = '',
  inputClassName = '',
  maxWidthClass = 'max-w-md',
  id,
  'aria-label': ariaLabel,
  ...props
}) {
  return (
    <label
      className={`search-field flex h-11 w-full items-center gap-2.5 rounded-lg border border-[#c5c6cd] bg-[#f8f9ff] px-3.5 transition-[border-color,box-shadow] focus-within:border-[#0058be] focus-within:shadow-[0_0_0_4px_rgba(0,88,190,0.1)] ${maxWidthClass} ${className}`.trim()}
    >
      <Search
        size={16}
        className="search-field__icon shrink-0 text-[#667085]"
        aria-hidden
      />
      <input
        id={id}
        type="text"
        role="searchbox"
        aria-label={ariaLabel || placeholder}
        className={`search-field__input min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-[#0b1c30] outline-none placeholder:text-[#667085] ${inputClassName}`.trim()}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        {...props}
      />
    </label>
  );
}
