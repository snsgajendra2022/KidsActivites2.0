import { useRef, useEffect, useState } from 'react';
import Button from './Button.jsx';
import { ENROLLMENT_STEPS } from '../../constants/enrollmentStatuses.js';

export { default as PublicHero } from './PublicHero.jsx';
export { default as ProcessJourney } from './ProcessJourney.jsx';
export { default as PremiumCTA } from './PremiumCTA.jsx';
export { default as SectionHeader } from './SectionHeader.jsx';
export { default as StatusBadge } from './StatusBadge.jsx';
export { default as EmptyState } from './EmptyState.jsx';
export { default as LoadingState } from './LoadingState.jsx';
export { default as PremiumCard } from './PremiumCard.jsx';
export { default as DashboardCard } from './DashboardCard.jsx';
export { default as FormPanel } from './FormPanel.jsx';
export { default as PageHeader } from './PageHeader.jsx';
export { default as WorkspaceUrlPreview } from './WorkspaceUrlPreview.jsx';

export function Stepper({ currentStep }) {
  return (
    <div className="stepper">
      {ENROLLMENT_STEPS.map((label, i) => {
        const step = i + 1;
        const state = step < currentStep ? 'done' : step === currentStep ? 'active' : '';
        return (
          <div key={label} className={`stepper-step ${state}`}>
            <div className="stepper-num">{step < currentStep ? '✓' : step}</div>
            <span className="stepper-label">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function SignaturePad({ onChange, value, width = 600, height = 160, compact = false }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0B1F3A';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    if (!value) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (typeof value === 'string' && value.startsWith('data:image/')) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value, width, height]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const { x, y } = getPos(e, canvas);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDraw = () => {
    if (!drawing) return;
    setDrawing(false);
    const canvas = canvasRef.current;
    onChange?.(canvas.toDataURL());
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange?.(null);
  };

  return (
    <div className={`signature-pad-wrap${compact ? ' signature-pad-wrap--compact' : ''}`}>
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        width={width}
        height={height}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="signature-actions">
        <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
        {!compact && value && (
          <span className="text-small" style={{ color: 'var(--success)' }}>Signature captured</span>
        )}
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, value, label }) {
  return (
    <div className="stat-card">
      {Icon && <Icon size={22} className="stat-card-icon" />}
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
