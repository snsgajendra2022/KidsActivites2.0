/**
 * Multi-select student roster for a chosen class.
 * Clears selection when class changes (caller should pass empty selectedIds).
 */
export default function StudentMultiSelect({
  label = 'Students',
  required = false,
  classId = '',
  options = [],
  selectedIds = [],
  onChange,
  loading = false,
  error = '',
  disabled = false,
  className = '',
}) {
  const selectedSet = new Set((selectedIds || []).map(String));
  const allValues = options.map((opt) => String(opt.value));
  const allSelected = allValues.length > 0 && allValues.every((id) => selectedSet.has(id));
  const someSelected = selectedSet.size > 0 && !allSelected;

  const toggleOne = (id) => {
    const next = new Set(selectedSet);
    const key = String(id);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onChange?.(Array.from(next));
  };

  const toggleAll = () => {
    if (allSelected) onChange?.([]);
    else onChange?.(allValues);
  };

  return (
    <div className={`form-field md:col-span-2 ${className}`}>
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
        <label className="form-label mb-0">
          {label}
          {required ? <span className="required">*</span> : null}
          {selectedSet.size > 0 && (
            <span className="ml-2 text-xs font-semibold text-[#0058be]">
              {selectedSet.size} selected
            </span>
          )}
        </label>
        {classId && options.length > 0 && (
          <button
            type="button"
            className="text-xs font-semibold text-[#0058be] hover:underline disabled:opacity-50"
            onClick={toggleAll}
            disabled={disabled || loading}
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        )}
      </div>

      {!classId ? (
        <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
          Select a class first to load the student roster.
        </p>
      ) : loading ? (
        <p className="rounded-lg border border-[#d0d5dd] bg-white px-3 py-3 text-sm text-[#667085]">
          Loading students…
        </p>
      ) : error ? (
        <p className="text-xs text-[#b42318]">{error}</p>
      ) : options.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#c5c6cd] bg-[#f8f9ff] px-3 py-3 text-sm text-[#667085]">
          No enrolled students found for this class.
        </p>
      ) : (
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#d0d5dd] bg-white p-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold text-[#0b1c30] hover:bg-[#f7f9fc]">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-[#c5c6cd]"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected;
              }}
              onChange={toggleAll}
              disabled={disabled}
            />
            All students in class
          </label>
          <div className="border-t border-[#eaecf0]" />
          {options.map((opt) => {
            const id = String(opt.value);
            const checked = selectedSet.has(id);
            return (
              <label
                key={id}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#f7f9fc] ${
                  checked ? 'bg-[#eef4ff]' : ''
                }`}
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-[#c5c6cd]"
                  checked={checked}
                  onChange={() => toggleOne(id)}
                  disabled={disabled}
                />
                <span className="min-w-0 flex-1 truncate text-[#0b1c30]">{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
