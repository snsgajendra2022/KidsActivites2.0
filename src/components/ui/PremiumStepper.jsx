import { ENROLLMENT_STEPS } from '../../constants/enrollmentStatuses.js';

export default function PremiumStepper({ currentStep }) {
  const progress = ((currentStep - 1) / (ENROLLMENT_STEPS.length - 1)) * 100;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <span className="enrollment-progress-pill">Step {currentStep} of {ENROLLMENT_STEPS.length}</span>
        <span className="text-muted" style={{ fontSize: 13, fontWeight: 600 }}>{Math.round((currentStep / ENROLLMENT_STEPS.length) * 100)}% Complete</span>
      </div>
      <div className="premium-stepper">
        <div className="premium-stepper-progress">
          <div className="premium-stepper-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {ENROLLMENT_STEPS.map((label, i) => {
          const num = i + 1;
          const state = num < currentStep ? 'done' : num === currentStep ? 'active' : '';
          return (
            <div key={label} className={`premium-step ${state}`}>
              <div className="premium-step-circle">{num < currentStep ? '✓' : num}</div>
              <span className="premium-step-label">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
