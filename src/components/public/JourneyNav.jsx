import { Check } from 'lucide-react';

export default function JourneyNav({
  steps = [],
  activeIndex = 0,
  onStepClick,
  compact = false,
  className = '',
}) {
  const clickable = typeof onStepClick === 'function';

  return (
    <nav
      className={`sb-journey-nav ${compact ? 'sb-journey-nav--compact' : ''} ${clickable ? 'sb-journey-nav--clickable' : ''} ${className}`.trim()}
      aria-label="Progress steps"
    >
      <div className="sb-container">
        <div className="sb-journey-nav__track" role={clickable ? 'tablist' : undefined}>
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isCompleted = index < activeIndex;
            const stepClass = [
              'sb-journey-nav__step',
              isActive && 'sb-journey-nav__step--active',
              isCompleted && 'sb-journey-nav__step--completed',
              clickable && 'sb-journey-nav__step--clickable',
            ].filter(Boolean).join(' ');

            const content = (
              <>
                <div className="sb-journey-nav__dot" aria-current={isActive ? 'step' : undefined}>
                  {isCompleted && !clickable ? <Check size={12} strokeWidth={3} /> : index + 1}
                </div>
                <span className="sb-journey-nav__label">{step.label || step.title}</span>
              </>
            );

            if (clickable) {
              return (
                <button
                  key={step.id || step.title || index}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={stepClass}
                  onClick={() => onStepClick(index, step)}
                >
                  {content}
                </button>
              );
            }

            return (
              <div key={step.id || step.title || index} className={stepClass}>
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
