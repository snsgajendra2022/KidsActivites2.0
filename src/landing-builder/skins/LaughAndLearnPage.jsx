import { useEffect } from 'react';
import { isLaughAndLearnBlock, renderLaughAndLearnBlock } from './laughAndLearnRenderers.jsx';
import '../../styles/landing-template-laugh-and-learn.css';

export default function LaughAndLearnPage({ blocks, tenantPath }) {
  const visible = (blocks || []).filter((b) => b.visible !== false);
  let headerRendered = false;

  useEffect(() => {
    const sections = document.querySelectorAll('.lal-page section, .lal-page footer');
    sections.forEach((section) => section.classList.add('lal-reveal'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('lal-reveal--visible');
        });
      },
      { threshold: 0.1 },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [visible.length]);

  return (
    <div className="lal-page">
      {visible.map((block) => {
        const includeHeader = !headerRendered
          && block.type === 'hero'
          && isLaughAndLearnBlock(block);
        if (includeHeader) headerRendered = true;

        const node = renderLaughAndLearnBlock(block, { tenantPath, includeHeader });
        if (!node) return null;
        return <div key={block.id}>{node}</div>;
      })}
    </div>
  );
}
