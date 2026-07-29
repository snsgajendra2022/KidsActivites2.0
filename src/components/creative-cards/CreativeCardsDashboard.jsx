import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, ChevronDown, Gift, Heart, Palette, Plus, Sparkles, Star, Trophy } from 'lucide-react';
import { useMemo, useState } from 'react';
import CardPreview from './CardPreview.jsx';
import EmptyState from './EmptyState.jsx';
import TemplateCard from './TemplateCard.jsx';
import { data, getId, templates as defaultTemplates } from './utils.js';

export default function CreativeCardsDashboard({
  templates = defaultTemplates,
  recentCards = [],
  stats,
  onCreate,
  onBrowseTemplates,
  onOpenCard,
  onOpenSaved,
  onSelectTemplate,
}) {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const popular = useMemo(() => [...templates].sort((a, b) => (b.uses || b.popularity || 0) - (a.uses || a.popularity || 0)).slice(0, 4), [templates]);
  const visibleCategories = showAllCategories ? data.categories : data.categories.slice(0, 8);
  const heroTemplate = popular[0] || templates[0];
  const values = stats || {
    created: recentCards.length,
  };
  const cards = [
    { label: 'Cards made', value: values.created ?? values.cardsCreated ?? 0, icon: Palette, color: '#7c3aed', tint: '#f3e8ff' },
    { label: 'Favourite looks', value: values.favorites ?? values.favoritesAdded ?? 0, icon: Heart, color: '#ec4899', tint: '#fce7f3' },
    { label: 'Creative stars', value: values.points ?? ((values.cardsCreated ?? 0) * 25), icon: Star, color: '#0284c7', tint: '#e0f2fe' },
    { label: 'Badges earned', value: values.achievements ?? 0, icon: Trophy, color: '#d97706', tint: '#fef3c7' },
  ];

  return (
    <section className="cc-dashboard space-y-10" aria-labelledby="cc-dashboard-title">
      <motion.header className="cc-playground-hero relative overflow-hidden rounded-[2.5rem] border border-violet-100 px-6 py-9 sm:px-10 lg:px-14 lg:py-12" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <span className="cc-doodle cc-doodle--star" aria-hidden="true">★</span>
        <span className="cc-doodle cc-doodle--rainbow" aria-hidden="true">🌈</span>
        <span className="cc-doodle cc-doodle--pencil" aria-hidden="true">✏️</span>
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-violet-700 shadow-sm"><Sparkles size={15} /> Your happy card playground</span>
            <h1 id="cc-dashboard-title" className="mt-5 max-w-2xl text-4xl font-black leading-[.98] tracking-[-.04em] text-slate-900 sm:text-6xl">Make someone feel <span className="cc-marker-text">super special!</span></h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">Pick a celebration, add your words, decorate with stickers, and turn a happy idea into a beautiful greeting card.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={onCreate} className="cc-primary-action inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-black text-white"><Plus size={20} /> Start creating</button>
              <button type="button" onClick={onBrowseTemplates} className="inline-flex items-center gap-2 rounded-2xl border-2 border-violet-200 bg-white px-6 py-3 font-black text-violet-700 shadow-sm">See all cards <ArrowRight size={18} /></button>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600">
              <span className="flex items-center gap-1.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100">✓</span> Kid-friendly</span>
              <span className="flex items-center gap-1.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-sky-100">✓</span> Easy to make</span>
              <span className="flex items-center gap-1.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-amber-100">✓</span> Ready to download</span>
            </div>
          </div>
          {heroTemplate && <div className="cc-hero-card-stage relative mx-auto w-full max-w-md">
            <div className="cc-tape cc-tape--left" aria-hidden="true" />
            <div className="cc-tape cc-tape--right" aria-hidden="true" />
            <motion.button type="button" onClick={() => onSelectTemplate?.(heroTemplate)} className="block w-full rotate-[2deg] text-left" whileHover={{ rotate: 0, scale: 1.02 }} aria-label={`Use ${heroTemplate.name}`}>
              <CardPreview template={heroTemplate} className="w-full" />
            </motion.button>
            <div className="cc-hand-note absolute -bottom-5 -left-5 rotate-[-7deg] rounded-lg bg-amber-200 px-4 py-2 text-sm font-black text-amber-900 shadow-md">Tap me to create! ↗</div>
          </div>}
        </div>
      </motion.header>

      <section className="cc-creative-backpack rounded-[2rem] border border-violet-100 bg-white p-5 shadow-sm sm:p-7" aria-labelledby="cc-progress-title">
        <div className="mb-5 flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-2xl">🎒</span><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Your creative backpack</p><h2 id="cc-progress-title" className="text-xl font-black text-slate-900">Look what you’ve made!</h2></div></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ label, value, icon: Icon, color, tint }) => <article key={label} className="cc-play-stat flex items-center gap-3 rounded-2xl p-4" style={{ background: tint }}><span className="grid h-11 w-11 place-items-center rounded-xl bg-white shadow-sm" style={{ color }}><Icon size={21} /></span><div><strong className="block text-2xl font-black text-slate-900">{value}</strong><span className="text-xs font-bold text-slate-600">{label}</span></div></article>)}</div>
      </section>

      <section aria-labelledby="cc-categories-title">
        <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-pink-600">Choose an adventure</p><h2 id="cc-categories-title" className="text-2xl font-black text-slate-900 sm:text-3xl">What are we celebrating?</h2></div><Gift className="hidden text-pink-400 sm:block" size={34} /></div>
        <div className="cc-category-grid grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          {visibleCategories.map((category, index) => <button key={category.id} type="button" onClick={() => onBrowseTemplates?.(category.id)} title={category.description} className={`cc-category-bubble cc-category-ticket--${index % 5} group flex min-h-32 flex-col items-center justify-center p-3 text-center`}><span className="cc-category-bubble__icon grid h-14 w-14 place-items-center rounded-full bg-white text-3xl shadow-sm transition group-hover:scale-110" aria-hidden="true">{category.emoji}</span><strong className="mt-3 text-sm font-black leading-tight text-slate-900">{category.name}</strong></button>)}
        </div>
        {data.categories.length > 8 && <div className="mt-5 text-center"><button type="button" onClick={() => setShowAllCategories((value) => !value)} className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-5 py-2.5 text-sm font-black text-violet-700 shadow-sm">{showAllCategories ? 'Show fewer celebrations' : `Show all ${data.categories.length} celebrations`}<ChevronDown size={16} className={showAllCategories ? 'rotate-180' : ''} /></button></div>}
      </section>

      {popular.length > 0 && <section aria-labelledby="cc-popular-title"><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-sky-600">Loved by young creators</p><h2 id="cc-popular-title" className="text-2xl font-black text-slate-900 sm:text-3xl">Popular card designs</h2></div><button type="button" onClick={onBrowseTemplates} className="hidden items-center gap-1 text-sm font-black text-violet-700 sm:inline-flex">See every design <ArrowRight size={16} /></button></div><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{popular.map((template, index) => <TemplateCard key={getId(template, index)} template={template} onSelect={onSelectTemplate} compact />)}</div></section>}

      <section aria-labelledby="cc-recent-title" className="cc-scrapbook-section rounded-[2rem] p-5 sm:p-8"><div className="mb-5 flex items-end justify-between gap-3"><div className="flex items-center gap-3"><BookOpen className="text-violet-600" /><div><p className="text-xs font-black uppercase tracking-widest text-violet-600">Your little scrapbook</p><h2 id="cc-recent-title" className="text-2xl font-black text-slate-900">Cards you made</h2></div></div>{onOpenSaved && <button type="button" onClick={onOpenSaved} className="text-sm font-black text-violet-700">Open scrapbook</button>}</div>{recentCards.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{recentCards.slice(0, 4).map((card, index) => <button key={getId(card, index)} type="button" onClick={() => onOpenCard?.(card)} className={`cc-mini-scrap cc-mini-scrap--${index % 3} rounded-xl bg-white p-2 text-left shadow-md`}><CardPreview card={card} template={card.template || {}} className="w-full rounded-lg shadow-none" /><span className="block truncate px-2 pb-1 pt-3 text-sm font-black text-slate-800">{card.title || card.studentName || 'Untitled card'}</span></button>)}</div> : <EmptyState title="Your scrapbook is waiting!" description="Make your first card and it will appear right here." actionLabel="Create my first card" onAction={onCreate} />}</section>
    </section>
  );
}
