import { X } from 'lucide-react';

export default function NoticeConfirmPublishModal({ open, preview, loading, onClose, onConfirm }) {
  if (!open) return null;
  const b = preview?.breakdown || {};
  return (
    <div className="notice-modal" role="dialog" aria-modal="true" aria-label="Confirm publish">
      <div className="notice-modal__backdrop" onClick={onClose} />
      <div className="notice-modal__panel">
        <header className="notice-modal__head">
          <div>
            <h2>Publish notice?</h2>
            <p>
              You are sending this notice to <strong>{preview?.total || 0}</strong> users
              {b.parents ? `: ${b.parents} parents` : ''}
              {b.teachers ? `, ${b.teachers} teachers` : ''}
              {b.staff ? `, ${b.staff} staff` : ''}.
            </p>
          </div>
          <button type="button" className="notice-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>
        <footer className="notice-modal__foot">
          <button type="button" className="sb-button-secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="sb-button-primary" disabled={loading || !preview?.total} onClick={onConfirm}>
            {loading ? 'Publishing…' : 'Publish notice'}
          </button>
        </footer>
      </div>
    </div>
  );
}
