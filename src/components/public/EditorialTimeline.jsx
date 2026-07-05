import { Play } from 'lucide-react';

const DEFAULT_MEDIA = '/assets/schoolbridge-timeline-placeholder.svg';

export default function EditorialTimeline({
  steps = [],
  title,
  subtitle,
  className = '',
}) {
  return (
    <section className={`sb-editorial-section sb-editorial-section--cream ${className}`.trim()}>
      <div className="sb-container">
        {(title || subtitle) && (
          <div className="sb-editorial-section__header">
            {title && <h2 className="sb-editorial-heading">{title}</h2>}
            {subtitle && <p className="sb-editorial-subheading">{subtitle}</p>}
          </div>
        )}

        <div className="sb-vertical-timeline">
          {steps.map((step, index) => (
            <article key={step.title || index} className="sb-vertical-timeline__item">
              <span className="sb-vertical-timeline__marker" aria-hidden="true" />
              <div className="sb-vertical-timeline__content">
                <span className="sb-vertical-timeline__number">{String(index + 1).padStart(2, '0')}</span>
                <h3 className="sb-vertical-timeline__title">{step.title}</h3>
                <p className="sb-vertical-timeline__desc">{step.description || step.desc}</p>
              </div>
              <div className="sb-vertical-timeline__media">
                <div className="sb-media-card">
                  <img src={step.imageUrl || DEFAULT_MEDIA} alt="" loading="lazy" />
                  {step.showPlay && (
                    <button type="button" className="sb-play-button" aria-label={`Learn more about ${step.title}`}>
                      <span className="sb-play-button__circle">
                        <Play size={22} fill="currentColor" />
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
