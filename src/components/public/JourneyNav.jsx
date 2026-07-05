import { Check } from 'lucide-react';

export default function JourneyNav({
  steps = [],
  activeIndex = 0,
  compact = false,
  className = '',
}) {
  return (
    <nav
      className={`sb-journey-nav ${compact ? 'sb-journey-nav--compact' : ''} ${className}`.trim()}
      aria-label="Progress steps"
    >
      <div className="sb-container">
        <div className="sb-journey-nav__track">
          {steps.map((step, index) => {
            const isActive = index === activeIndex;
            const isCompleted = index < activeIndex;
            const stepClass = [
              'sb-journey-nav__step',
              isActive && 'sb-journey-nav__step--active',
              isCompleted && 'sb-journey-nav__step--completed',
            ].filter(Boolean).join(' ');

            return (
              <div key={step.id || step.title || index} className={stepClass}>
                <div className="sb-journey-nav__dot" aria-current={isActive ? 'step' : undefined}>
                  {isCompleted ? <Check size={12} strokeWidth={3} /> : index + 1}
                </div>
                <span className="sb-journey-nav__label">{step.label || step.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
