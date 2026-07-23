import { useRef, useEffect, useState } from 'react';
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
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: width, h: height });

  // Keep canvas bitmap size in sync with CSS box so strokes align on narrow screens.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof ResizeObserver === 'undefined') return undefined;

    const applySize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height || height));
      setCanvasSize((prev) => (
        prev.w === nextW && prev.h === nextH ? prev : { w: nextW, h: nextH }
      ));
    };

    applySize();
    const ro = new ResizeObserver(applySize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [height, compact]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#0B1F3A';
    ctx.lineWidth = compact ? 1.75 : 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

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
  }, [value, canvasSize.w, canvasSize.h, compact]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocPointer = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / Math.max(rect.width, 1);
    const scaleY = canvas.height / Math.max(rect.height, 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setMenuOpen(false);
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
    setMenuOpen(false);
  };

  const downloadSignature = () => {
    if (!value || typeof value !== 'string') return;
    const link = document.createElement('a');
    link.href = value;
    link.download = 'signature.png';
    link.click();
    setMenuOpen(false);
  };

  const hasSignature = Boolean(value && (typeof value === 'string' ? value.trim() : value));

  return (
    <div
      ref={wrapRef}
      className={`signature-pad-wrap${compact ? ' signature-pad-wrap--compact' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        width={canvasSize.w}
        height={canvasSize.h}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
      />
      <div className="signature-actions" ref={menuRef}>
        <button
          type="button"
          className="signature-menu-btn"
          aria-label="Signature options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden>⋮</span>
        </button>
        {menuOpen && (
          <div className="signature-menu" role="menu">
            <button type="button" role="menuitem" onClick={clear} disabled={!hasSignature}>
              Clear
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={downloadSignature}
              disabled={!hasSignature}
            >
              Download PNG
            </button>
            {!compact && hasSignature && (
              <p className="signature-menu__status">Signature captured</p>
            )}
          </div>
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
