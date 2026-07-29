import { Sparkles } from 'lucide-react';

export default function EmptyState({
  icon: Icon = Sparkles,
  title = 'Nothing here yet',
  description,
  actionLabel,
  onAction,
  children,
}) {
  return (
    <section className="cc-empty-state rounded-3xl border border-dashed border-violet-200 bg-gradient-to-br from-violet-50 to-fuchsia-50 px-6 py-12 text-center">
      <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm" aria-hidden="true"><Icon size={30} /></span>
      <h2 className="text-xl font-black text-slate-900">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>}
      {children || (actionLabel && <button type="button" onClick={onAction} className="mt-5 rounded-xl bg-violet-600 px-5 py-2.5 font-semibold text-white hover:bg-violet-700">{actionLabel}</button>)}
    </section>
  );
}
