import { useMemo, useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import Button from '../ui/Button.jsx';
import {
  flashCardsFromLesson,
  loadMarkedForReview,
  practiceItemsFromQuiz,
  toggleMarkedForReview,
} from '../../utils/lmsFlashCards.js';

function shuffle(list) {
  const next = [...list];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export default function LessonPractice({ lesson, quiz, onStartQuiz }) {
  const cards = useMemo(() => flashCardsFromLesson(lesson), [lesson]);
  const practice = useMemo(() => practiceItemsFromQuiz(quiz), [quiz]);
  const [flipped, setFlipped] = useState({});
  const [reviewIds, setReviewIds] = useState(() => loadMarkedForReview(lesson?.id));
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [matches, setMatches] = useState({});
  const chips = useMemo(
    () => shuffle(practice.flatMap((item) => item.options)),
    [practice],
  );

  if (!cards.length && !practice.length) return null;

  const toggleReview = (cardId) => {
    setReviewIds(toggleMarkedForReview(lesson.id, cardId));
  };

  const pickChip = (optionId) => {
    if (!selectedPrompt) return;
    setMatches((prev) => ({ ...prev, [selectedPrompt]: optionId }));
    setSelectedPrompt(null);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#f5e6b0] bg-[#fffdf5] p-4">
      <h3 className="font-bold text-[#0b1b33]">Practice time</h3>
      <p className="text-sm text-[#667085]">
        Warm up with cards and matching. Your scored quiz is separate and uses the course answer key.
      </p>

      {cards.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map((card) => {
            const open = Boolean(flipped[card.id]);
            const marked = reviewIds.includes(String(card.id));
            return (
              <div key={card.id} className="relative">
                <button
                  type="button"
                  className="lms-flash w-full"
                  onClick={() => setFlipped((prev) => ({ ...prev, [card.id]: !open }))}
                >
                  {open ? card.back : card.front}
                  <span className="mt-2 block text-xs font-semibold text-[#98a2b3]">
                    {open ? 'Tap to hide' : 'Tap to flip'}
                  </span>
                </button>
                <button
                  type="button"
                  className="absolute right-3 top-3 text-[#f5b400]"
                  onClick={() => toggleReview(card.id)}
                  aria-label={marked ? 'Unmark review' : 'Mark for review'}
                >
                  {marked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {practice.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[#0b1b33]">Match the answers (practice only)</p>
          {practice.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`lms-quiz-option ${selectedPrompt === item.id ? 'is-selected' : ''}`}
              onClick={() => setSelectedPrompt(item.id)}
            >
              <span className="flex-1">{item.prompt}</span>
              <span className="text-xs font-bold text-[#667085]">
                {matches[item.id]
                  ? (item.options.find((o) => o.id === matches[item.id])?.text || 'Matched')
                  : 'Tap, then pick an answer'}
              </span>
            </button>
          ))}
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`lms-match-chip ${Object.values(matches).includes(chip.id) ? 'is-used' : ''} ${selectedPrompt ? 'is-active' : ''}`}
                onClick={() => pickChip(chip.id)}
              >
                {chip.text}
              </button>
            ))}
          </div>
        </div>
      )}

      {quiz && onStartQuiz && (
        <Button className="lms-btn-lg" onClick={onStartQuiz}>
          I&apos;m ready — start quiz
        </Button>
      )}
    </div>
  );
}
