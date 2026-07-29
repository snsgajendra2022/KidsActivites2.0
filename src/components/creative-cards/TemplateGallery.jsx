import { Search, SlidersHorizontal, Sparkles, WandSparkles, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import EmptyState from './EmptyState.jsx';
import TemplateCard from './TemplateCard.jsx';
import { data, getId, getLabel, templates as defaultTemplates } from './utils.js';

const ALL = 'all';
const FIELD_KEYS = { category: 'categoryId', age: 'ageGroup', theme: 'themeId', orientation: 'orientation' };
const valueOf = (item, key) => String(item?.[FIELD_KEYS[key]] || item?.[key] || '').toLowerCase();
const optionsFor = (items, key) => [...new Set(items.map((item) => item?.[FIELD_KEYS[key]] || item?.[key]).filter(Boolean))];
const optionLabel = (key, value) => {
  if (key === 'category') return data.categories?.find((item) => item.id === value)?.name || value;
  if (key === 'theme') return data.themes?.find((item) => item.id === value)?.name || value;
  return value;
};

export default function TemplateGallery({
  templates = defaultTemplates,
  selectedId,
  favoriteIds = [],
  onSelect,
  onFavorite,
  onCreateBlank,
  title = 'Choose a template',
  initialCategory = ALL,
  albumImages = [],
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ category: initialCategory || ALL, age: ALL, theme: ALL, orientation: ALL });
  const [visibleCount, setVisibleCount] = useState(12);
  const filtered = useMemo(() => templates.filter((template) => {
    const haystack = `${getLabel(template)} ${template.description || ''} ${template.tags || ''}`.toLowerCase();
    return haystack.includes(query.toLowerCase())
      && Object.entries(filters).every(([key, value]) => value === ALL || valueOf(template, key) === value.toLowerCase());
  }), [filters, query, templates]);
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisibleCount(12);
  };
  const clear = () => {
    setQuery('');
    setFilters({ category: ALL, age: ALL, theme: ALL, orientation: ALL });
    setVisibleCount(12);
  };
  const hasFilters = query || Object.values(filters).some((value) => value !== ALL);
  const activeCategory = data.categories?.find((item) => item.id === filters.category);
  const previewPhotoAt = (index) => {
    if (!albumImages.length) return undefined;
    const photo = albumImages[index % albumImages.length];
    return typeof photo === 'string' ? photo : (photo?.imageUrl || photo?.url);
  };

  return (
    <section className="cc-template-gallery space-y-6" aria-labelledby="cc-gallery-title">
      <div className="cc-template-hero relative overflow-hidden rounded-[2.5rem] px-6 py-8 sm:px-10 sm:py-10">
        <div className="cc-template-hero__scribble" aria-hidden="true" />
        <span className="absolute right-[7%] top-[9%] rotate-12 text-4xl opacity-70" aria-hidden="true">⭐</span>
        <span className="absolute bottom-[8%] right-[40%] -rotate-12 text-4xl opacity-70" aria-hidden="true">🖍️</span>
        <div className="relative grid items-center gap-7 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-violet-700"><WandSparkles size={16} /> The design cupboard</p>
            <h1 id="cc-gallery-title" className="mt-3 max-w-2xl text-4xl font-black leading-[1.02] tracking-[-.04em] text-slate-900 sm:text-5xl">{title}</h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-relaxed text-slate-600">Find a card that matches the moment, then make it completely yours with happy words, colours and stickers.</p>
          </div>
          <div className="cc-recipe">
            <p className="cc-recipe__title">Three happy steps</p>
            <ol className="cc-recipe__list">
              {[
                { step: '1', label: 'Pick a design', emoji: '🖼️' },
                { step: '2', label: 'Make it yours', emoji: '🎨' },
                { step: '3', label: 'Save & share', emoji: '💌' },
              ].map((item) => (
                <li key={item.step} className="cc-recipe__step">
                  <span className="cc-recipe__num" aria-hidden="true">{item.step}</span>
                  <span className="cc-recipe__emoji" aria-hidden="true">{item.emoji}</span>
                  <span className="cc-recipe__label">{item.label}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="relative mt-7 flex flex-col gap-3 sm:flex-row">
          <label className="relative block flex-1">
            <span className="sr-only">Search templates</span>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-500" size={21} />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(12); }} placeholder="Search birthday, teacher, reading, sports…" className="cc-big-search w-full rounded-2xl border-2 border-white bg-white py-4 pl-12 pr-12 text-base font-semibold text-slate-800 shadow-lg outline-none placeholder:text-slate-400" />
            {query && <button type="button" onClick={() => { setQuery(''); setVisibleCount(12); }} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-2 text-slate-500 hover:bg-violet-50" aria-label="Clear search"><X size={16} /></button>}
          </label>
          {onCreateBlank && <button type="button" onClick={onCreateBlank} className="cc-primary-action inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 font-black text-white"><Sparkles size={18} /> Surprise me</button>}
        </div>
      </div>

      <section className="cc-occasion-shelf rounded-[2rem] border border-violet-100 bg-white p-4 shadow-sm sm:p-5" aria-labelledby="cc-occasion-filter">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-pink-600">First, choose the moment</p><h2 id="cc-occasion-filter" className="text-lg font-black text-slate-900">What kind of card?</h2></div>
          <span className="hidden rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 sm:block">{activeCategory ? `${activeCategory.emoji} ${activeCategory.name}` : '✨ All celebrations'}</span>
        </div>
        <div className="cc-occasion-chips flex gap-2 overflow-x-auto pb-2">
          <button type="button" onClick={() => setFilter('category', ALL)} aria-pressed={filters.category === ALL} className={`cc-occasion-chip ${filters.category === ALL ? 'is-active' : ''}`}><span aria-hidden="true">✨</span> All cards</button>
          {data.categories.map((category) => <button key={category.id} type="button" onClick={() => setFilter('category', category.id)} aria-pressed={filters.category === category.id} className={`cc-occasion-chip ${filters.category === category.id ? 'is-active' : ''}`}><span aria-hidden="true">{category.emoji}</span> {category.name}</button>)}
        </div>
      </section>

      <div className="cc-template-gallery__filters flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:flex-row lg:items-center">
        <div className="flex items-center gap-2 text-sm font-black text-slate-700"><SlidersHorizontal size={17} className="text-violet-600" /> Fine-tune your choices</div>
        <div className="grid flex-1 gap-2 sm:grid-cols-3 lg:max-w-2xl">
          {[
            ['age', 'All ages'],
            ['theme', 'All themes'],
            ['orientation', 'Any shape'],
          ].map(([key, label]) => <label key={key}><span className="sr-only">{label}</span><select value={filters[key]} onChange={(event) => setFilter(key, event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700"><option value={ALL}>{label}</option>{optionsFor(templates, key).map((option) => <option key={option} value={option}>{optionLabel(key, option)}</option>)}</select></label>)}
        </div>
        {hasFilters && <button type="button" onClick={clear} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black text-rose-600 hover:bg-rose-50"><X size={15} /> Reset</button>}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
        <div><p className="text-xs font-black uppercase tracking-widest text-sky-600">{activeCategory ? activeCategory.name : 'Every celebration'}</p><h2 className="mt-1 text-2xl font-black text-slate-900">Pick a card to begin</h2></div>
        <p className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600" aria-live="polite">{filtered.length} lovely {filtered.length === 1 ? 'design' : 'designs'}</p>
      </div>
      {filtered.length ? (
        <div className="cc-template-grid grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {filtered.slice(0, visibleCount).map((template, index) => <TemplateCard key={getId(template, index)} template={template} previewPhoto={previewPhotoAt(index)} selected={String(selectedId) === getId(template, index)} favorite={favoriteIds.includes(getId(template, index))} onSelect={onSelect} onFavorite={onFavorite} />)}
        </div>
      ) : <EmptyState title="No templates found" description="Try clearing a filter or searching with a different word." actionLabel="Clear filters" onAction={clear} />}
      {filtered.length > visibleCount && <div className="pt-3 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + 12)} className="inline-flex items-center gap-2 rounded-2xl border-2 border-violet-200 bg-white px-6 py-3 font-black text-violet-700 shadow-sm transition hover:-translate-y-1 hover:border-violet-400 hover:shadow-lg"><Sparkles size={17} /> Show 12 more designs</button></div>}
    </section>
  );
}
