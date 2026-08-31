import { ArrowRight, Check, Heart } from 'lucide-react';
import CardPreview from './CardPreview.jsx';
import { cx, data, getLabel } from './utils.js';

export default function TemplateCard({
  template,
  selected = false,
  favorite = false,
  onSelect,
  onFavorite,
  compact = false,
  previewPhoto,
}) {
  const name = getLabel(template, 'Untitled template');
  const category = data.categories?.find((item) => item.id === template.categoryId);
  return (
    <article
      className={cx(
        'cc-template-card group relative rounded-[1.75rem] bg-white p-2.5 transition duration-200 hover:-translate-y-1',
        selected ? 'ring-3 ring-violet-300' : '',
      )}
    >
      <button type="button" className="block w-full text-left" onClick={() => onSelect?.(template)} aria-pressed={selected}>
        <div className="cc-template-card__preview relative overflow-hidden rounded-[1.35rem]">
          <CardPreview
            card={previewPhoto ? { photoUrl: previewPhoto } : {}}
            template={template}
            variant="thumbnail"
            className="cc-template-card__preview-inner w-full max-w-full rounded-[1.35rem] shadow-none transition duration-300 group-hover:scale-[1.02]"
          />
          <span className="absolute left-3 top-3 rounded-full bg-white/88 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700 shadow-sm backdrop-blur">
            {category?.emoji} {category?.name || 'Celebration'}
          </span>
          <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/65 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white backdrop-blur">
            {template.orientation || 'portrait'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 px-2 pt-4">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-slate-900">{name}</h3>
            {!compact && (
              <p className="mt-1 truncate text-xs font-semibold capitalize text-slate-500">
                Ages {template.ageGroup || 'all'} · {(template.theme || template.themeId || 'playful').replaceAll('-', ' ')}
              </p>
            )}
          </div>
          {selected && (
            <span className="rounded-full bg-violet-600 p-1 text-white" aria-label="Selected">
              <Check size={14} />
            </span>
          )}
        </div>
        <span className="mx-2 mb-1 mt-3 flex items-center justify-center gap-2 rounded-xl bg-violet-50 px-4 py-2.5 text-center text-sm font-black text-violet-700 transition group-hover:bg-violet-600 group-hover:text-white">
          {compact ? 'Make this card' : 'Use this design'} <ArrowRight size={15} />
        </span>
      </button>
      {onFavorite && (
        <button
          type="button"
          onClick={() => onFavorite(template)}
          className={cx('absolute right-5 top-5 rounded-full bg-white/90 p-2 shadow-sm', favorite ? 'text-rose-500' : 'text-slate-500')}
          aria-label={`${favorite ? 'Remove' : 'Add'} ${name} ${favorite ? 'from' : 'to'} favorites`}
        >
          <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />
        </button>
      )}
    </article>
  );
}
