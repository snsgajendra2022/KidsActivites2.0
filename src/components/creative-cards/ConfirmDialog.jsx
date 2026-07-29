import { AlertTriangle, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKeyDown = (event) => event.key === 'Escape' && !loading && onCancel?.();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [loading, onCancel, open]);
  if (!open) return null;
  return (
    <div className="cc-confirm-dialog fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && !loading && onCancel?.()}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${destructive ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}><AlertTriangle size={22} /></span>
          <div className="min-w-0 flex-1"><h2 id={titleId} className="text-lg font-black text-slate-900">{title}</h2>{description && <p id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}</div>
          <button type="button" onClick={onCancel} disabled={loading} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Close dialog"><X size={19} /></button>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancelRef} type="button" onClick={onCancel} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} disabled={loading} className={`rounded-xl px-4 py-2 font-semibold text-white disabled:opacity-60 ${destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-violet-600 hover:bg-violet-700'}`}>{loading ? 'Working…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
