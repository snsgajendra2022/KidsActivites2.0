import { CheckCircle2, RotateCcw, XCircle } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { canRetryQuiz } from '../../utils/lmsQuizScoring.js';

export default function QuizResultsPanel({
  result,
  quiz,
  onRetry,
  onBackToLessons,
  retrying = false,
}) {
  if (!result) return null;
  const passed = Boolean(result.passed);
  const copy = result.copy || { headline: passed ? 'Great Job!' : 'Keep Practicing!', technical: passed ? 'PASS' : 'FAIL' };
  const canRetry = canRetryQuiz(quiz, result);
  const remaining = quiz?.maxAttempts
    ? Math.max(0, Number(quiz.maxAttempts) - Number(result.attemptNumber || quiz.attemptCount || 1))
    : null;

  return (
    <div className="space-y-4">
      <div className={`lms-result ${passed ? 'lms-result--success' : 'lms-result--practice'}`}>
        <span className="lms-result__badge" style={{
          background: passed ? '#12b76a' : '#f04438',
          color: '#fff',
        }}>
          {passed ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {copy.technical}
        </span>
        <h2 className="mt-3 text-2xl font-extrabold text-[#0b1b33]">{copy.headline}</h2>
        <p className="lms-result__score mt-2">{result.percentage}%</p>
        <p className="mt-1 text-sm text-[#475467]">
          {result.earnedPoints} / {result.totalPoints || '—'} points
          {' · '}Pass mark {result.passingPercentage}%
        </p>
        {result.bestScore != null && (
          <p className="mt-1 text-xs font-semibold text-[#667085]">Best score {result.bestScore}%</p>
        )}
      </div>

      {result.review?.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-[#0b1b33]">Question review</h3>
          {result.review.map((row) => (
            <div
              key={row.id}
              className={`lms-review-row ${
                row.correct === true ? 'is-correct' : row.correct === false ? 'is-wrong' : ''
              }`}
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="font-medium text-[#0b1b33]">{row.index + 1}. {row.prompt}</p>
                {row.correct === true && <CheckCircle2 size={18} className="text-[#12b76a]" />}
                {row.correct === false && <XCircle size={18} className="text-[#f04438]" />}
              </div>
              <p className="text-sm text-[#475467]">
                Your answer: {row.selectedText || '—'}
              </p>
              {row.correctText ? (
                <p className="text-sm text-[#027a48]">Answer key: {row.correctText}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {canRetry && (
          <Button className="lms-btn-lg" onClick={onRetry} loading={retrying}>
            <RotateCcw size={16} /> Try again
          </Button>
        )}
        <Button className="lms-btn-lg" variant="secondary" onClick={onBackToLessons}>
          Back to lessons
        </Button>
      </div>
      {quiz?.maxAttempts > 0 && (
        <p className="text-xs text-[#667085]">
          {remaining != null ? `${remaining} attempt${remaining === 1 ? '' : 's'} left` : ''}
          {quiz.maxAttempts ? ` · Max ${quiz.maxAttempts}` : ''}
        </p>
      )}
    </div>
  );
}
