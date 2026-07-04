export default function ProcessJourney({
  steps = [],
  title,
  subtitle,
  activeIndex,
  compact = false,
  className = '',
}) {
  return (
    <section className={`sb-section ${compact ? 'sb-section--compact' : ''} ${className}`.trim()}>
      <div className="sb-container">
        {(title || subtitle) && (
          <div className={`text-center ${compact ? 'mb-6' : 'mb-12'}`}>
            {title && (
              <h2 className={`font-display mb-3 font-bold tracking-tight text-brand ${compact ? 'text-xl' : 'text-3xl'}`}>{title}</h2>
            )}
            {subtitle && <p className="text-muted">{subtitle}</p>}
          </div>
        )}
        <div className={`grid grid-cols-1 gap-5 ${compact ? 'sm:grid-cols-3 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
          {steps.map((step, i) => {
            const isActive = activeIndex === i;
            const isComplete = typeof activeIndex === 'number' && activeIndex > i;
            return (
            <div
              key={step.title || i}
              className={[
                'sb-card sb-card-gold-accent text-center transition-premium',
                compact ? 'p-4' : 'p-6',
                isActive && 'ring-2 ring-[var(--sb-gold)] ring-offset-2',
                isComplete && 'opacity-90',
                !compact && 'hover:-translate-y-0.5 hover:shadow-md',
              ].filter(Boolean).join(' ')}
            >
              <div className={`mx-auto mb-4 flex items-center justify-center rounded-full bg-brand-muted font-display text-sm font-bold text-accent ${compact ? 'h-8 w-8 text-xs' : 'h-10 w-10'}`}>
                {isComplete ? '✓' : String(i + 1).padStart(2, '0')}
              </div>
              {step.icon && (
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-muted text-accent">
                  <step.icon size={22} />
                </div>
              )}
              <h3 className={`mb-2 font-display font-bold text-brand ${compact ? 'text-sm' : 'text-base'}`}>{step.title}</h3>
              <p className={`leading-relaxed text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{step.desc || step.description}</p>
            </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
