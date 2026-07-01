import { ENROLLMENT_STEPS } from '../../constants/enrollmentStatuses.js';

const SHORT_LABELS = [
  'Student Details',
  'Parent Details',
  'Address',
  'Academic',
  'Medical',
  'Documents',
  'Declaration',
  'Review',
];

export default function EnrollmentStepper({ currentStep }) {
  const total = ENROLLMENT_STEPS.length;
  const percent = Math.round((currentStep / total) * 100);
  const progressWidth = `${((currentStep - 0.5) / total) * 100}%`;

  return (
    <div className="mb-10 md:mb-12">
      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full bg-brand-muted px-4 py-1 text-xs font-semibold text-accent">
          Step {currentStep} of {total}
        </span>
        <span className="text-xs font-medium text-muted">{percent}% Complete</span>
      </div>

      <div className="relative mb-8 h-1.5 overflow-hidden rounded-full bg-brand-muted">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-accent transition-all duration-500 ease-out"
          style={{ width: progressWidth }}
        />
      </div>

      <div className="hidden justify-between md:flex">
        {SHORT_LABELS.map((label, i) => {
          const num = i + 1;
          const done = num < currentStep;
          const active = num === currentStep;
          const inactive = num > currentStep;

          return (
            <div
              key={label}
              className={`flex w-24 flex-col items-center space-y-2 text-center ${
                inactive ? 'opacity-50 grayscale' : ''
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${
                  active || done
                    ? 'bg-accent text-white shadow-md'
                    : 'bg-brand-muted text-muted'
                }`}
              >
                {done ? (
                  <span className="material-symbols-outlined text-[18px]">check</span>
                ) : (
                  num
                )}
              </div>
              <span
                className={`text-[11px] font-medium leading-tight ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-center text-sm font-semibold text-accent md:hidden">
        {ENROLLMENT_STEPS[currentStep - 1]}
      </p>
    </div>
  );
}
