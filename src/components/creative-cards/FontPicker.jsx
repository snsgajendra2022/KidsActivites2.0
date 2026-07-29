import { Check } from 'lucide-react';
import { cx, fonts as defaultFonts, getId, getLabel } from './utils.js';

export default function FontPicker({ fonts = defaultFonts, value, onChange }) {
  return (
    <fieldset className="cc-font-picker">
      <legend className="mb-3 font-bold text-slate-900">Font style</legend>
      <div className="grid gap-2">
        {fonts.map((font, index) => {
          const id = getId(font, index);
          const active = String(value) === id;
          return (
            <button key={id} type="button" onClick={() => onChange?.(id, font)} aria-pressed={active} className={cx('flex items-center justify-between rounded-xl border px-4 py-3 text-left', active ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white')} style={{ fontFamily: font.family }}>
              <span className="text-base">{getLabel(font, `Font ${index + 1}`)} — Aa</span>
              {active && <Check size={17} className="text-violet-600" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
