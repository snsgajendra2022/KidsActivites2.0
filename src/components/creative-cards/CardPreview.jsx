import { forwardRef } from 'react';
import { cx, data, fonts, getId, templateStyle } from './utils.js';

const CardPreview = forwardRef(function CardPreview({
  card = {},
  template = {},
  orientation = card.orientation || template.orientation || 'portrait',
  className = '',
  showWatermark = false,
  labelledBy,
  variant = 'full',
}, ref) {
  const font = fonts.find((item) => getId(item) === String(card.font || card.fontId)) || fonts[0];
  const emoji = card.stickers?.length ? card.stickers : (template.stickers || template.decorations || [template.emoji || '✨']);
  const recipient = card.recipientName || card.studentName || 'A Wonderful Friend';
  const title = card.title || template.defaultTitle || template.title || template.name || 'You are amazing!';
  const textAlign = card.alignment || 'center';
  const category = data.categories?.find((item) => item.id === template.categoryId);
  const palette = card.colors || template.colors || ['#7c3aed', '#ec4899', '#fbbf24'];
  const colors = Array.isArray(palette) ? palette : [palette.primary, palette.secondary, palette.accent].filter(Boolean);
  const [primary = '#7c3aed', secondary = '#ec4899', accent = '#fbbf24'] = colors;
  const art = emoji.slice(0, 3).map((sticker) => (typeof sticker === 'string' ? sticker : sticker.emoji));

  return (
    <article
      ref={ref}
      className={cx(
        'cc-card-preview relative isolate overflow-hidden rounded-[2rem] shadow-xl',
        variant === 'thumbnail' && 'cc-card-preview--thumbnail',
        variant !== 'thumbnail' && (orientation === 'landscape' ? 'aspect-[7/5]' : 'aspect-[5/7]'),
        className,
      )}
      style={{
        ...templateStyle(template, card),
        '--cc-card-primary': primary,
        '--cc-card-secondary': secondary,
        '--cc-card-accent': accent,
        '--cc-message-scale': card.fontSize ? card.fontSize / 18 : 1,
        fontFamily: font?.family,
        textAlign,
      }}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : `Card preview for ${recipient}`}
      data-orientation={orientation}
    >
      <div className="cc-card-preview__wash absolute inset-0" aria-hidden="true" />
      <div className="cc-card-preview__dots absolute inset-0" aria-hidden="true" />
      <span className="cc-card-preview__blob cc-card-preview__blob--one" aria-hidden="true" />
      <span className="cc-card-preview__blob cc-card-preview__blob--two" aria-hidden="true" />
      <div className="cc-card-preview__frame absolute inset-[4%] rounded-[1.5rem]" aria-hidden="true" />
      <div
        className={`cc-card-preview__content relative z-10 ${textAlign === 'left' ? 'items-start' : textAlign === 'right' ? 'items-end' : 'items-center'}`}
        style={{ textAlign }}
      >
        {variant !== 'thumbnail' && <div className="cc-card-preview__school inline-flex items-center gap-1.5 rounded-full font-black uppercase">
          <span aria-hidden="true">✦</span>{card.schoolName || 'Kids School'}<span aria-hidden="true">✦</span>
        </div>}
        {variant !== 'thumbnail' && <div className="cc-card-preview__occasion rounded-full font-black uppercase">{category?.name || 'A Special Celebration'}</div>}
        <div className={`cc-card-preview__art flex items-center justify-center ${card.photoUrl ? 'cc-card-preview__art--photo' : ''}`} aria-hidden="true">
          {card.photoUrl
            ? <div className="cc-card-preview__photo-wrap"><img src={card.photoUrl} alt="" crossOrigin="anonymous" className="cc-card-preview__photo" /></div>
            : art.map((item, index) => <span key={`${item}-${index}`} className={`cc-card-preview__art-item cc-card-preview__art-item--${index + 1}`}>{item}</span>)}
        </div>
        <h2 id={labelledBy} className="cc-card-preview__title font-black">
          {title}
        </h2>
        {variant !== 'thumbnail' && <p className="cc-card-preview__recipient font-black">For {recipient}</p>}
        <div className="cc-card-preview__divider flex items-center gap-2" aria-hidden="true"><span /><b>★</b><span /></div>
        {variant !== 'thumbnail' && <p className="cc-card-preview__message font-semibold">
          {card.message || template.defaultMessage || template.message || 'Keep shining and sharing your wonderful smile!'}
        </p>}
        {variant !== 'thumbnail' && (card.senderName || card.from) && (
          <p className="cc-card-preview__sender font-bold">Made with ♥ by {card.senderName || card.from}</p>
        )}
        <div className="cc-card-preview__footer font-black" aria-hidden="true">{variant === 'thumbnail' ? '✦  MAKE IT YOURS  ✦' : '• ✦ • ✦ •'}</div>
      </div>
      {showWatermark && <span className="absolute bottom-3 right-4 z-10 text-[10px] font-bold uppercase tracking-widest opacity-60">Creative Cards Studio</span>}
    </article>
  );
});

export default CardPreview;
