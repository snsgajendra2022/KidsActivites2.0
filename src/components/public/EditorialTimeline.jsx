import { CenteredScrollTimeline } from './CenteredScrollTimeline.jsx';
import { Play } from 'lucide-react';
import { motion } from 'framer-motion';

const DEFAULT_MEDIA = '/assets/kidsactivites-timeline-placeholder.svg';

export default function EditorialTimeline({
  steps = [],
  title,
  subtitle,
  className = '',
}) {
  const renderStepContent = (step, index) => {
    // On mobile, everything is standard row.
    // On desktop, we alternate image/text sides.
    const isEven = index % 2 === 0;

    return (
      <div className={`flex w-full flex-col gap-6 md:gap-8 overflow-hidden md:flex-row md:items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
        
        {/* TEXT COLUMN */}
        <div className={`flex-1 flex flex-col justify-center ${isEven ? 'md:pr-16 lg:pr-24' : 'md:pl-16 lg:pl-24'}`}>
          <h3 className="font-display text-2xl font-bold text-navy md:text-3xl">{step.title}</h3>
          <p className="mt-4 text-base text-gray-600 md:text-lg">{step.description || step.desc}</p>
        </div>

        {/* IMAGE COLUMN */}
        <div className={`w-full flex-1 md:w-1/2 flex justify-center ${isEven ? 'md:pl-16 lg:pl-24' : 'md:pr-16 lg:pr-24'}`}>
          <div className="feature-image-card relative group">
            <img 
              src={step.imageUrl || DEFAULT_MEDIA} 
              alt={step.title} 
              loading="lazy" 
              className="transition-transform duration-700 group-hover:scale-105" 
            />
            {step.showPlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/10">
                <button type="button" className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-navy shadow-lg backdrop-blur-sm transition-transform hover:scale-110" aria-label={`Play video about ${step.title}`}>
                  <Play size={28} className="ml-1" fill="currentColor" />
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    );
  };

  return (
    <section className={`sb-editorial-section sb-editorial-section--cream ${className}`.trim()}>
      <div className="sb-container">
        {(title || subtitle) && (
          <div className="sb-editorial-section__header text-center mb-12">
            {title && <h2 className="font-display text-3xl font-bold text-navy md:text-4xl">{title}</h2>}
            {subtitle && <p className="mt-4 text-lg text-gray-600">{subtitle}</p>}
          </div>
        )}

        <div className="px-4 md:px-0 max-w-6xl mx-auto">
          <CenteredScrollTimeline steps={steps} renderContent={renderStepContent} />
        </div>
      </div>
    </section>
  );
}
