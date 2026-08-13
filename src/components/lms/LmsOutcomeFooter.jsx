import { CheckCircle2, XCircle } from 'lucide-react';

export default function LmsOutcomeFooter({
  outcome,
  emptyLabel = '',
  compact = false,
}) {
  if (!outcome || (outcome.passed == null && !outcome.attempted)) {
    if (!emptyLabel) return null;
    return <p className="lms-outcome lms-outcome--empty">{emptyLabel}</p>;
  }

  const passed = outcome.passed === true;
  const label = outcome.technical || (passed ? 'PASS' : 'FAIL');
  const copy = outcome.headline || (passed ? 'Great Job!' : 'Keep Practicing!');
  const pct = outcome.percentage != null ? `${outcome.percentage}%` : '';

  return (
    <div className={`lms-outcome ${passed ? 'lms-outcome--pass' : 'lms-outcome--fail'}`}>
      <span className="lms-outcome__badge">
        {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
        {label}
      </span>
      {compact ? null : <span className="lms-outcome__copy">{copy}</span>}
      {pct ? <span className="lms-outcome__pct">{pct}</span> : null}
    </div>
  );
}
