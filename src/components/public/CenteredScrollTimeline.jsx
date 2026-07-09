import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';

export function CenteredScrollTimeline({ steps, renderContent }) {
  const containerRef = useRef(null);
  
  // Track the scroll progress of the entire container
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start center", "end center"]
  });

  // Smooth out the progress line
  const scaleY = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  return (
    <div ref={containerRef} className="relative w-full py-10">
      {/* Background Track (Inactive) */}
      <div className="absolute top-10 bottom-10 left-[29px] w-[2px] bg-gray-200 md:left-1/2 md:-translate-x-1/2" />

      {/* Foreground Progress Line (Active) */}
      <motion.div
        className="absolute top-10 bottom-10 left-[29px] w-[2px] origin-top bg-brand md:left-1/2 md:-translate-x-1/2"
        style={{ scaleY }}
      />

      <div className="flex flex-col gap-12 md:gap-24">
        {steps.map((step, index) => (
          <TimelineStep key={step.id || index} step={step} index={index}>
            {renderContent(step, index)}
          </TimelineStep>
        ))}
      </div>
    </div>
  );
}

function TimelineStep({ step, index, children }) {
  const stepRef = useRef(null);
  const [isActive, setIsActive] = useState(false);

  // We use scroll relative to this specific step's center to determine if it's "active"
  const { scrollYProgress } = useScroll({
    target: stepRef,
    offset: ["start center", "end center"]
  });

  useEffect(() => {
    // Subscribe to the scroll progress to toggle the active state
    return scrollYProgress.on('change', (latest) => {
      // If we've started scrolling past the start of this element's center point
      if (latest > 0) {
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    });
  }, [scrollYProgress]);
  
  return (
    <div ref={stepRef} className="relative flex flex-row md:flex-row gap-4 md:gap-0 w-full items-center">
      
      {/* Mobile: Circle on Left. Desktop: Circle Absolute Center */}
      <div className="relative z-10 flex w-[60px] md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 shrink-0 justify-start md:justify-center md:w-auto">
        <div
          className={`flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 transition-all duration-500 ease-out ${
            isActive 
              ? 'border-brand bg-brand text-white shadow-lg scale-105' 
              : 'border-gray-200 bg-white text-gray-400'
          }`}
        >
          <span className="font-display text-xl font-bold">{index + 1}</span>
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1 w-full relative z-0">
        {children}
      </div>
    </div>
  );
}
