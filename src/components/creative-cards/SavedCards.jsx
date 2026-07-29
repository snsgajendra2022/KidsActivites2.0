import { Copy, Download, Edit3, MoreHorizontal, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CardPreview from './CardPreview.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import EmptyState from './EmptyState.jsx';
import { callStorage, formatDate, getId, templates } from './utils.js';

export default function SavedCards({
  cards: controlledCards,
  onCardsChange,
  onCreate,
  onEdit,
  onDuplicate,
  onDownload,
  onDelete,
}) {
  const [loadedCards, setLoadedCards] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState('');
  const cards = controlledCards ?? loadedCards;
  useEffect(() => {
    if (controlledCards !== undefined) return undefined;
    let active = true;
    Promise.all([
      callStorage(['getCreativeCards', 'getCards', 'getSavedCards', 'listCards']),
      callStorage(['getCreativeDrafts', 'getDrafts']).catch(() => []),
    ])
      .then(([saved, drafts]) => active && setLoadedCards([
        ...(Array.isArray(saved) ? saved : []),
        ...(Array.isArray(drafts) ? drafts : []).map((draft) => ({ ...draft, status: 'draft' })),
      ]))
      .catch((reason) => active && setError(reason.message));
    return () => { active = false; };
  }, [controlledCards]);
  const visible = useMemo(() => cards.filter((card) => {
    const text = `${card.title || ''} ${card.studentName || ''} ${card.className || ''}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (status === 'all' || (card.status || 'saved') === status);
  }).sort((a, b) => {
    if (sort === 'name') return String(a.title || a.studentName).localeCompare(String(b.title || b.studentName));
    const delta = new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
    return sort === 'oldest' ? -delta : delta;
  }), [cards, query, sort, status]);
  const confirmDelete = async () => {
    const card = deleting;
    if (!card) return;
    try {
      if (onDelete) await onDelete(card);
      else if (card.status === 'draft') await callStorage(['deleteCreativeDraft', 'deleteDraft'], getId(card));
      else await callStorage(['deleteCreativeCard', 'deleteCard', 'removeCard'], getId(card));
      const next = cards.filter((item) => getId(item) !== getId(card));
      setLoadedCards(next);
      onCardsChange?.(next);
      setDeleting(null);
    } catch (reason) { setError(reason.message); }
  };
  const duplicate = async (card) => {
    if (onDuplicate) return onDuplicate(card);
    try {
      const copy = await callStorage(['duplicateCreativeCard', 'duplicateCard'], getId(card));
      if (copy) {
        const next = [copy, ...cards];
        setLoadedCards(next);
        onCardsChange?.(next);
      }
      return copy;
    } catch (reason) {
      setError(reason.message);
      return null;
    }
  };

  return (
    <section className="cc-saved-cards" aria-labelledby="cc-saved-title">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-widest text-violet-600">Your scrapbook</p><h1 id="cc-saved-title" className="text-2xl font-black text-slate-900">Saved cards</h1></div>{onCreate && <button type="button" onClick={onCreate} className="rounded-xl bg-violet-600 px-4 py-2.5 font-semibold text-white">Create a card</button>}</div>
      <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto_auto]">
        <label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17} /><span className="sr-only">Search saved cards</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by title, child, or class…" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm" /></label>
        <label><span className="sr-only">Filter cards by status</span><select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All cards</option><option value="draft">Drafts</option><option value="saved">Saved</option><option value="sent">Sent</option></select></label>
        <label><span className="sr-only">Sort cards</span><select value={sort} onChange={(event) => setSort(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name</option></select></label>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {visible.length ? <div className="cc-saved-cards__scrapbook grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((card, index) => {
          const template = templates.find((item) => getId(item) === String(card.templateId)) || card.template || {};
          return (
            <article key={getId(card, index)} className={`cc-saved-card cc-saved-card--tilt-${index % 3} rounded-3xl border border-slate-200 bg-white p-3 shadow-sm`}>
              <CardPreview card={card} template={template} className="w-full shadow-none" />
              <div className="p-2 pt-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-bold text-slate-900">{card.title || card.studentName || 'Untitled card'}</h2><p className="mt-1 text-xs text-slate-500">{formatDate(card.updatedAt || card.createdAt)} · {card.status || 'saved'}</p></div><MoreHorizontal size={18} className="text-slate-400" /></div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {[[Edit3, 'Edit', onEdit], [Copy, 'Duplicate', duplicate], [Download, 'Download', onDownload], [Trash2, 'Delete', setDeleting]].map(([Icon, label, action]) => <button key={label} type="button" onClick={() => action?.(card)} disabled={!action} className="grid place-items-center rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-40" aria-label={`${label} ${card.title || 'card'}`}><Icon size={17} /></button>)}
                </div>
              </div>
            </article>
          );
        })}
      </div> : <EmptyState title="No saved cards found" description={cards.length ? 'Try another search or filter.' : 'Create your first keepsake for a student.'} actionLabel={cards.length ? undefined : 'Create a card'} onAction={onCreate} />}
      <ConfirmDialog open={Boolean(deleting)} title="Delete this card?" description="This removes the card from your scrapbook and cannot be undone." confirmLabel="Delete card" destructive onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
    </section>
  );
}
