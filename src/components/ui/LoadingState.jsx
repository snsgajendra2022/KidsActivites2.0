export default function LoadingState({ message = 'Loading…', className = '' }) {
  return (
    <div className={`sb-loading-state ${className}`} role="status" aria-live="polite">
      <div className="sb-loading-spinner" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
