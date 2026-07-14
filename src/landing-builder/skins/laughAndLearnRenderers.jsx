import { Link } from 'react-router-dom';
import { BLOCK_TYPES } from '../blockRegistry.js';

/** Block types + layouts that use the Laugh & Learn skin renderer. */
export const LAL_LAYOUTS = {
  [BLOCK_TYPES.HERO]: ['split-playful'],
  [BLOCK_TYPES.FEATURES]: ['curriculum-grid'],
  [BLOCK_TYPES.CONTENT_SPLIT]: ['image-left', 'image-right'],
  [BLOCK_TYPES.BENTO_PAIR]: ['default'],
  [BLOCK_TYPES.FEATURE_PANEL]: ['split-card'],
  [BLOCK_TYPES.HIGHLIGHTS]: ['dark-grid'],
  [BLOCK_TYPES.GALLERY]: ['photo-grid'],
  [BLOCK_TYPES.TESTIMONIALS]: ['grid'],
  [BLOCK_TYPES.FOOTER]: ['rich-contact'],
};

export function isLaughAndLearnBlock(block) {
  if (!block?.type) return false;
  const layouts = LAL_LAYOUTS[block.type];
  return layouts ? layouts.includes(block.layout) : false;
}

function MaterialIcon({ name, filled = false, className = '' }) {
  return (
    <span
      className={`material-symbols-outlined ${className}`.trim()}
      style={filled ? { fontVariationSettings: "'FILL' 1" } : undefined}
      aria-hidden
    >
      {name}
    </span>
  );
}

function resolveHref(href, tenantPath) {
  if (!href) return tenantPath('/');
  if (href.startsWith('http') || href.startsWith('#')) return href;
  return tenantPath(href.startsWith('/') ? href : `/${href}`);
}

export function LalHeader({ block, tenantPath }) {
  const c = block.content || {};
  const name = c.brandName || 'Laugh and Learn Academy';
  const links = c.navLinks || [];

  return (
    <header className="lal-header">
      <div className="lal-header__inner">
        <div className="lal-header__brand">
          <div className="lal-header__logo">
            {c.logoUrl ? <img src={c.logoUrl} alt="" /> : <span>{name.charAt(0)}</span>}
          </div>
          <h1 className="lal-header__title">{name}</h1>
        </div>
        <nav className="lal-header__nav" aria-label="Primary">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={link.href === '#home' ? 'lal-header__nav-link lal-header__nav-link--active' : 'lal-header__nav-link'}
            >
              {link.label}
            </a>
          ))}
          <div className="lal-header__actions">
            <Link to={resolveHref(c.loginHref || '/login', tenantPath)} className="lal-header__login">
              {c.loginLabel || 'Login'}
            </Link>
            <Link to={resolveHref(c.enrollHref || '/enrollment/kidzee-print-form', tenantPath)} className="lal-header__cta">
              {c.enrollLabel || 'Enroll Now'}
            </Link>
          </div>
        </nav>
        <button type="button" className="lal-header__menu" aria-label="Menu">
          <MaterialIcon name="menu" />
        </button>
      </div>
    </header>
  );
}

function LalHero({ block, tenantPath }) {
  const c = block.content || {};
  return (
    <section className="lal-hero" id="home">
      <div className="lal-container lal-hero__grid">
        <div className="lal-hero__copy">
          {c.badge && <span className="lal-hero__badge">{c.badge}</span>}
          <h2 className="lal-hero__title">
            {c.title}{' '}
            {c.titleHighlight && <span className="lal-hero__highlight">{c.titleHighlight}</span>}
            {c.titleSuffix && <> {c.titleSuffix}</>}
          </h2>
          {c.subtitle && <p className="lal-hero__subtitle">{c.subtitle}</p>}
          <div className="lal-hero__actions">
            {c.showPrimaryButton !== false && c.primaryButton && (
              <Link to={resolveHref(c.primaryButton.href, tenantPath)} className="lal-btn lal-btn--primary">
                {c.primaryButton.label}
              </Link>
            )}
            {c.showSecondaryButton !== false && c.secondaryButton && (
              <a href={c.secondaryButton.href || '#curriculum'} className="lal-btn lal-btn--outline">
                {c.secondaryButton.label}
              </a>
            )}
          </div>
        </div>
        <div className="lal-hero__visual">
          <div className="lal-hero__blob" aria-hidden />
          <div className="lal-hero__image-wrap">
            {c.heroImageUrl && <img src={c.heroImageUrl} alt="" />}
          </div>
        </div>
      </div>
    </section>
  );
}

function LalCurriculum({ block }) {
  const c = block.content || {};
  const items = c.items || [];
  const iconVariants = ['primary', 'secondary', 'tertiary', 'primary', 'secondary', 'tertiary'];

  return (
    <section className="lal-curriculum" id="curriculum" style={{ background: block.style?.backgroundColor }}>
      <div className="lal-container">
        <div className="lal-section-head">
          {c.title && <h2>{c.title}</h2>}
          {c.subtitle && <p>{c.subtitle}</p>}
        </div>
        <div className="lal-curriculum__grid">
          {items.map((item, i) => (
            <article key={item.id} className="lal-curriculum__card">
              <div className={`lal-curriculum__icon lal-curriculum__icon--${iconVariants[i % iconVariants.length]}`}>
                <MaterialIcon name={item.icon || 'star'} filled />
              </div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LalPhilosophy({ block }) {
  const c = block.content || {};
  const reverse = block.layout === 'image-right';

  return (
    <section className="lal-philosophy">
      <div className={`lal-container lal-philosophy__grid${reverse ? ' lal-philosophy__grid--reverse' : ''}`}>
        <div className="lal-philosophy__media">
          {c.imageUrl && <img src={c.imageUrl} alt="" />}
        </div>
        <div className="lal-philosophy__copy">
          {c.title && <h2>{c.title}</h2>}
          {(c.body || []).map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
          {c.quote && (
            <blockquote className="lal-philosophy__quote">
              <p>&ldquo;{c.quote}&rdquo;</p>
            </blockquote>
          )}
        </div>
      </div>
    </section>
  );
}

function LalBento({ block }) {
  const cards = block.content?.cards || [];

  return (
    <section className="lal-bento" style={{ background: block.style?.backgroundColor }}>
      <div className="lal-container lal-bento__grid">
        {cards.map((card) => (
          <article key={card.id} className={`lal-bento__card lal-bento__card--${card.variant || 'primary'}`}>
            <MaterialIcon name={card.icon || 'star'} className="lal-bento__icon" />
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            {card.imageUrl && (
              <div className="lal-bento__image">
                <img src={card.imageUrl} alt="" />
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function LalEnvironment({ block }) {
  const c = block.content || {};

  return (
    <section className="lal-environment">
      <div className="lal-container">
        <div className="lal-environment__card">
          <div className="lal-environment__copy">
            {c.title && <h2>{c.title}</h2>}
            {c.description && <p>{c.description}</p>}
            <div className="lal-environment__highlights">
              {(c.highlights || []).map((item) => (
                <div key={item.title} className="lal-environment__highlight">
                  <MaterialIcon name={item.icon || 'check'} />
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {c.imageUrl && (
            <div className="lal-environment__media">
              <img src={c.imageUrl} alt="" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LalExpectations({ block }) {
  const c = block.content || {};

  return (
    <section className="lal-expectations">
      <div className="lal-container">
        <div className="lal-section-head lal-section-head--light">
          {c.title && <h2>{c.title}</h2>}
          {c.subtitle && <p>{c.subtitle}</p>}
        </div>
        <div className="lal-expectations__grid">
          {(c.items || []).map((item) => (
            <article key={item.id} className="lal-expectations__item">
              <MaterialIcon name={item.icon || 'favorite'} className="lal-expectations__icon" />
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LalReviews({ block }) {
  const c = block.content || {};
  const rating = c.rating || 5;

  return (
    <section className="lal-reviews" id="reviews" style={{ background: block.style?.backgroundColor }}>
      <div className="lal-container">
        <div className="lal-section-head">
          {c.title && <h2>{c.title}</h2>}
          <div className="lal-reviews__stars" aria-label={`${rating} out of 5 stars`}>
            {Array.from({ length: rating }).map((_, i) => (
              <MaterialIcon key={i} name="star" filled className="lal-reviews__star" />
            ))}
          </div>
        </div>
        <div className={`lal-reviews__grid${(c.items || []).length === 5 ? ' lal-reviews__grid--five' : ''}`}>
          {(c.items || []).map((item, index) => (
            <article key={item.id} className="lal-reviews__card">
              <p>&ldquo;{item.quote}&rdquo;</p>
              <div className="lal-reviews__author">
                {item.avatar && (
                  <div className={`lal-reviews__avatar lal-reviews__avatar--${index % 5}`}>
                    <img src={item.avatar} alt={item.name} />
                  </div>
                )}
                <div>
                  <p className="lal-reviews__name">{item.name}</p>
                  <p className="lal-reviews__role">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LalGallery({ block }) {
  const c = block.content || {};
  const images = (c.images || []).filter((img) => img?.imageUrl);
  const columns = Math.min(4, Math.max(3, Number(c.columns) || 3));

  return (
    <section className="lal-gallery" id="gallery" style={{ background: block.style?.backgroundColor }}>
      <div className="lal-container">
        <div className="lal-section-head">
          {c.title && <h2>{c.title}</h2>}
          {c.subtitle && <p className="lal-section-subtitle">{c.subtitle}</p>}
        </div>
        <div
          className="lal-gallery__grid"
          style={{ '--lal-gallery-cols': columns }}
        >
          {images.map((img) => (
            <figure key={img.id} className="lal-gallery__item">
              <img src={img.imageUrl} alt={img.alt || ''} loading="lazy" />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function LalFooter({ block }) {
  const c = block.content || {};
  const name = c.brandName || 'Laugh and Learn Academy';
  const year = c.copyrightYear || 2024;

  return (
    <footer className="lal-footer">
      <div className="lal-container lal-footer__top">
        <div className="lal-footer__brand">
          <h2>{name}</h2>
          {c.tagline && <p>{c.tagline}</p>}
          {(c.socialLinks || []).length > 0 && (
            <div className="lal-footer__social">
              {c.socialLinks.map((link) => (
                <a key={link.icon} href={link.href || '#'} className="lal-footer__social-btn" aria-label={link.icon}>
                  <MaterialIcon name={link.icon} />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="lal-footer__columns">
          <div>
            <h4>Contact Us</h4>
            <ul>
              {c.address && <li><MaterialIcon name="location_on" /> Address: {c.address}</li>}
              {c.email && <li><MaterialIcon name="mail" /> {c.email}</li>}
              {c.phone && <li><MaterialIcon name="call" /> {c.phone}</li>}
            </ul>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul className="lal-footer__links">
              {(c.links || []).map((link) => (
                <li key={link.label}><a href={link.href}>{link.label}</a></li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="lal-footer__bottom">
        <div className="lal-container lal-footer__bottom-inner">
          <p>© {year} {name}. All rights reserved.</p>
          <div className="lal-footer__badges">
            {(c.badges || []).map((badge) => (
              <span key={badge} className="lal-footer__badge">{badge}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Render one Laugh & Learn section, or null if this block should use the standard renderer. */
export function renderLaughAndLearnBlock(block, { tenantPath, includeHeader = false }) {
  if (!isLaughAndLearnBlock(block)) return null;

  switch (block.type) {
    case BLOCK_TYPES.HERO:
      return (
        <>
          {includeHeader && <LalHeader block={block} tenantPath={tenantPath} />}
          <LalHero block={block} tenantPath={tenantPath} />
        </>
      );
    case BLOCK_TYPES.FEATURES:
      return <LalCurriculum block={block} />;
    case BLOCK_TYPES.CONTENT_SPLIT:
      return <LalPhilosophy block={block} />;
    case BLOCK_TYPES.BENTO_PAIR:
      return <LalBento block={block} />;
    case BLOCK_TYPES.FEATURE_PANEL:
      return <LalEnvironment block={block} />;
    case BLOCK_TYPES.HIGHLIGHTS:
      return <LalExpectations block={block} />;
    case BLOCK_TYPES.GALLERY:
      return <LalGallery block={block} />;
    case BLOCK_TYPES.TESTIMONIALS:
      return <LalReviews block={block} />;
    case BLOCK_TYPES.FOOTER:
      return <LalFooter block={block} />;
    default:
      return null;
  }
}
