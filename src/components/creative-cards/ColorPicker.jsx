import { Plus } from 'lucide-react';
import { cx } from './utils.js';

const DEFAULT_COLORS = ['#7c3aed', '#db2777', '#ea580c', '#ca8a04', '#16a34a', '#0284c7', '#334155', '#ffffff'];

export default function ColorPicker({ value, onChange, colors = DEFAULT_COLORS, label = 'Text color' }) {
  const normalized = String(value || '').toLowerCase();
  return (
    <fieldset className="cc-color-picker">
      <legend className="mb-3 font-bold text-slate-900">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {colors.map((color) => (
          <button key={color} type="button" onClick={() => onChange?.(color)} aria-label={`Use color ${color}`} aria-pressed={normalized === color.toLowerCase()} className={cx('h-9 w-9 rounded-full border-2 shadow-sm', normalized === color.toLowerCase() ? 'border-violet-600 ring-2 ring-violet-200' : 'border-white')} style={{ backgroundColor: color }} />
        ))}
        <label className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-dashed border-slate-300 text-slate-500" title="Custom color">
          <Plus size={16} />
          <span className="sr-only">Choose custom color</span>
          <input type="color" value={value || '#7c3aed'} onChange={(event) => onChange?.(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
      </div>
    </fieldset>
  );
}
