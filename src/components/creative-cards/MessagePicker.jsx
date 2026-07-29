import { Check, WandSparkles } from 'lucide-react';
import { cx, getLabel, messages as defaultMessages } from './utils.js';

export default function MessagePicker({ messages = defaultMessages, value, onChange, maxLength = 240 }) {
  return (
    <section className="cc-message-picker" aria-labelledby="cc-message-title">
      <div className="mb-3 flex items-center justify-between">
        <h3 id="cc-message-title" className="flex items-center gap-2 font-bold text-slate-900"><WandSparkles size={17} /> Message</h3>
        <span className="text-xs text-slate-500">{String(value || '').length}/{maxLength}</span>
      </div>
      <textarea value={value || ''} onChange={(event) => onChange?.(event.target.value)} maxLength={maxLength} rows={4} placeholder="Write a warm message…" className="w-full resize-y rounded-xl border border-slate-200 p-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-100" />
      <div className="mt-3 grid gap-2" role="list" aria-label="Suggested messages">
        {messages.map((message, index) => {
          const text = getLabel(message, String(message));
          const active = value === text;
          return <button key={`${text}-${index}`} type="button" onClick={() => onChange?.(text)} className={cx('flex items-start justify-between gap-3 rounded-xl border p-3 text-left text-sm', active ? 'border-violet-500 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50')}><span>{text}</span>{active && <Check size={16} className="shrink-0 text-violet-600" />}</button>;
        })}
      </div>
    </section>
  );
}
