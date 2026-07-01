import { useRef, useEffect, useState } from 'react';
import Button from './Button.jsx';
import { ENROLLMENT_STEPS } from '../../constants/enrollmentStatuses.js';

export default function Stepper({ currentStep }) {
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

export function SignaturePad({ onChange, value }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
  }, []);

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
    <div className="signature-pad-wrap">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        width={600}
        height={160}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="signature-actions">
        <Button variant="ghost" size="sm" onClick={clear}>Clear Signature</Button>
        {value && <span className="text-small" style={{ color: 'var(--success)' }}>Signature captured</span>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state-icon"><Icon size={48} /></div>}
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="btn-group">{actions}</div>}
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
