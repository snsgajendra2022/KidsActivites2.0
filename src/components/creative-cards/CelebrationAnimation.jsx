import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const PIECES = ['🎉', '⭐', '🎊', '✨', '💛', '🌈'];

export default function CelebrationAnimation({ show, message = 'Card saved!', onComplete }) {
  const reduceMotion = useReducedMotion();
  return (
    <AnimatePresence onExitComplete={onComplete}>
      {show && (
        <motion.div className="cc-celebration pointer-events-none fixed inset-0 z-[100] grid place-items-center overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} aria-live="polite" role="status">
          <motion.div className="rounded-2xl bg-slate-950/85 px-6 py-4 text-lg font-bold text-white shadow-2xl" initial={{ scale: .8 }} animate={{ scale: 1 }} exit={{ scale: .9 }}>{message}</motion.div>
          {!reduceMotion && Array.from({ length: 28 }, (_, index) => (
            <motion.span
              key={index}
              className="absolute top-[-10%] text-2xl"
              style={{ left: `${(index * 37) % 100}%` }}
              initial={{ y: '-10vh', rotate: 0 }}
              animate={{ y: '115vh', rotate: 360 + index * 15, x: (index % 3 - 1) * 70 }}
              transition={{ duration: 1.7 + (index % 5) * .15, delay: (index % 8) * .07, ease: 'easeIn' }}
              aria-hidden="true"
            >
              {PIECES[index % PIECES.length]}
            </motion.span>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
