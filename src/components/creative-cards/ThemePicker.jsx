import { Check } from 'lucide-react';
import { cx, getId, getLabel, themes as defaultThemes } from './utils.js';

export default function ThemePicker({ themes = defaultThemes, value, onChange }) {
  return (
    <fieldset className="cc-theme-picker">
      <legend className="mb-3 font-bold text-slate-900">Theme</legend>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((theme, index) => {
          const id = getId(theme, index);
          const active = String(value) === id;
          const colors = theme.colors || theme.palette || [theme.primaryColor, theme.secondaryColor].filter(Boolean);
          const palette = Array.isArray(colors) ? colors : [colors.primary, colors.secondary];
          return (
            <button key={id} type="button" onClick={() => onChange?.(id, theme)} aria-pressed={active} className={cx('relative overflow-hidden rounded-2xl border p-3 text-left', active ? 'border-violet-500 ring-2 ring-violet-200' : 'border-slate-200')}>
              <span className="mb-2 block h-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${palette[0] || '#7c3aed'}, ${palette[1] || '#ec4899'})` }} />
              <span className="text-sm font-semibold text-slate-800">{getLabel(theme, `Theme ${index + 1}`)}</span>
              {active && <Check className="absolute right-4 top-4 rounded-full bg-white p-1 text-violet-600" size={20} />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
