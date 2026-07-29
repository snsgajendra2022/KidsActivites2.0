import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { cx, getId, getLabel, stickers as defaultStickers } from './utils.js';

export default function StickerPicker({ stickers = defaultStickers, value = [], onChange, max = 8 }) {
  const [query, setQuery] = useState('');
  const selected = Array.isArray(value) ? value : [];
  const filtered = useMemo(() => stickers.filter((item) => {
    const text = `${getLabel(item)} ${item?.keywords || ''} ${item?.tags || ''} ${item?.emoji || item}`.toLowerCase();
    return text.includes(query.toLowerCase());
  }), [query, stickers]);
  const toggle = (item) => {
    const emoji = typeof item === 'string' ? item : item.emoji;
    const exists = selected.includes(emoji);
    if (!exists && selected.length >= max) return;
    onChange?.(exists ? selected.filter((entry) => entry !== emoji) : [...selected, emoji]);
  };
  return (
    <section className="cc-sticker-picker" aria-labelledby="cc-sticker-title">
      <div className="mb-3 flex items-center justify-between"><h3 id="cc-sticker-title" className="font-bold text-slate-900">Stickers</h3><span className="text-xs text-slate-500">{selected.length}/{max}</span></div>
      <label className="relative block">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} aria-hidden="true" />
        <span className="sr-only">Search stickers</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search stickers" className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-9 text-sm" />
        {query && <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-2 p-1 text-slate-500" aria-label="Clear sticker search"><X size={14} /></button>}
      </label>
      <div className="mt-3 grid grid-cols-6 gap-2" role="group" aria-label="Available stickers">
        {filtered.map((item, index) => {
          const emoji = typeof item === 'string' ? item : item.emoji;
          const active = selected.includes(emoji);
          return <button key={getId(item, `${emoji}-${index}`)} type="button" onClick={() => toggle(item)} disabled={!active && selected.length >= max} aria-pressed={active} aria-label={getLabel(item, emoji)} className={cx('aspect-square rounded-xl border text-xl transition hover:scale-105 disabled:opacity-40', active ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white')}>{emoji}</button>;
        })}
      </div>
    </section>
  );
}
