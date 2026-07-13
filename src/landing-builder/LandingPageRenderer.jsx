import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import CinematicHero from '../components/public/CinematicHero.jsx';
import EditorialTimeline from '../components/public/EditorialTimeline.jsx';
import MapFeatureSection from '../components/public/MapFeatureSection.jsx';
import FinalImageCTA from '../components/public/FinalImageCTA.jsx';
import EditorialFooter from '../components/public/EditorialFooter.jsx';
import StaticCampusBanner from '../components/public/StaticCampusBanner.jsx';
import { DEFAULT_PORTAL_CONFIG } from '../data/defaultPortalConfig.js';
import { BLOCK_TYPES } from './blockRegistry.js';

function resolveHref(href, tenantPath) {
  if (!href) return tenantPath('/');
  if (href.startsWith('http')) return href;
  return tenantPath(href.startsWith('/') ? href : `/${href}`);
}

function HeroBlock({ block, branding, tenantPath, defaultHeroImage }) {
  const { content, style, layout } = block;
  const bg = style?.backgroundImageUrl || branding?.heroImageUrl || defaultHeroImage;

  return (
    <CinematicHero
      imageUrl={layout === 'minimal' ? null : bg}
      badge={content.badge ? (
        <>
          <Sparkles size={14} />
          {content.badge}
        </>
      ) : null}
      title={content.title}
      subtitle={content.subtitle}
      primaryAction={content.showPrimaryButton !== false && content.primaryButton ? {
        to: resolveHref(content.primaryButton.href, tenantPath),
        label: <>{content.primaryButton.label} <ArrowRight size={18} /></>,
      } : null}
      secondaryAction={content.showSecondaryButton !== false && content.secondaryButton ? {
        to: resolveHref(content.secondaryButton.href, tenantPath),
        label: content.secondaryButton.label,
      } : null}
    />
  );
}

function FeaturesBlock({ block }) {
  const { content, layout } = block;
  const items = content.items || [];

  if (layout === 'circular-icons') {
    return (
      <section className="landing-block landing-block--features-circles" style={{ background: block.style?.backgroundColor }}>
        <div className="landing-block__inner">
          {content.title && <h2>{content.title}</h2>}
          {content.subtitle && <p className="landing-block__subtitle">{content.subtitle}</p>}
          <div className="landing-features-circles">
            {items.map((item) => (
              <article key={item.id} className="landing-features-circles__item">
                <div className="landing-features-circles__circle">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt="" />
                  ) : (
                    <span>{item.title?.charAt(0) || '•'}</span>
                  )}
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

  if (layout === 'grid-3') {
    return (
      <section className="landing-block landing-block--features-grid" style={{ background: block.style?.backgroundColor }}>
        <div className="landing-block__inner">
          {content.title && <h2>{content.title}</h2>}
          {content.subtitle && <p className="landing-block__subtitle">{content.subtitle}</p>}
          <div className="landing-features-grid">
            {items.map((item) => (
              <article key={item.id} className="landing-features-grid__item">
                {item.imageUrl && <img src={item.imageUrl} alt="" />}
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <EditorialTimeline
      title={content.title}
      subtitle={content.subtitle}
      steps={items.map((item) => ({
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
      }))}
    />
  );
}

function ImageBannerBlock({ block }) {
  const { content } = block;
  if (!content.imageUrl) return null;
  return (
    <StaticCampusBanner
      imageUrl={content.imageUrl}
      title={content.title}
      subtitle={content.subtitle}
    />
  );
}

function MapBlock({ block, school }) {
  const { content } = block;
  return (
    <MapFeatureSection
      title={content.title}
      subtitle={content.subtitle}
      address={content.showAddress !== false ? school?.address : undefined}
      embedUrl={content.embedUrl}
      imageUrl={content.imageUrl || undefined}
    />
  );
}

function CtaBlock({ block, tenantPath, portalName, school }) {
  const { content, style, layout } = block;
  const title = content.title || school?.name || portalName;
  const subtitle = content.subtitle || school?.address;

  if (layout === 'solid-color') {
    return (
      <section
        className="landing-block landing-block--cta-solid"
        style={{ background: style?.backgroundColor || '#5B4BDB' }}
      >
        <div className="landing-block__inner landing-block__inner--cta">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
          {content.button && (
            <Link to={resolveHref(content.button.href, tenantPath)} className="sb-purple-cta sb-purple-cta--gold">
              {content.button.label} <ArrowRight size={18} />
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <FinalImageCTA
      title={title}
      subtitle={subtitle}
      imageUrl={style?.backgroundImageUrl || undefined}
      action={content.button ? {
        to: resolveHref(content.button.href, tenantPath),
        label: <>{content.button.label} <ArrowRight size={18} /></>,
      } : null}
    />
  );
}

function FooterBlock({ block }) {
  if (block.content?.compact !== false) {
    return <EditorialFooter compact />;
  }
  return <EditorialFooter />;
}

export default function LandingPageRenderer({
  page,
  branding,
  school,
  portalName,
  tenantPath,
}) {
  if (!page?.blocks?.length) return null;

  const defaultHeroImage = branding?.heroImageUrl || DEFAULT_PORTAL_CONFIG.branding.heroImageUrl;
  const visible = page.blocks.filter((b) => b.visible !== false);

  return (
    <>
      {visible.map((block) => {
        switch (block.type) {
          case BLOCK_TYPES.HERO:
            return (
              <HeroBlock
                key={block.id}
                block={block}
                branding={branding}
                tenantPath={tenantPath}
                defaultHeroImage={defaultHeroImage}
              />
            );
          case BLOCK_TYPES.FEATURES:
            return <FeaturesBlock key={block.id} block={block} />;
          case BLOCK_TYPES.IMAGE_BANNER:
            return <ImageBannerBlock key={block.id} block={block} />;
          case BLOCK_TYPES.MAP:
            return <MapBlock key={block.id} block={block} school={school} />;
          case BLOCK_TYPES.CTA:
            return (
              <CtaBlock
                key={block.id}
                block={block}
                tenantPath={tenantPath}
                portalName={portalName}
                school={school}
              />
            );
          case BLOCK_TYPES.FOOTER:
            return <FooterBlock key={block.id} block={block} />;
          default:
            return null;
        }
      })}
    </>
  );
}
