import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function NoticeAudiencePreviewModal({ open, preview, loading, onClose, onConfirm }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = preview?.recipients || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      r.name?.toLowerCase().includes(q)
      || r.email?.toLowerCase().includes(q)
      || r.role?.toLowerCase().includes(q));
  }, [preview, search]);

  if (!open) return null;

  const breakdown = preview?.breakdown || {};

  return (
    <div className="notice-modal" role="dialog" aria-modal="true" aria-label="Preview recipients">
      <div className="notice-modal__backdrop" onClick={onClose} />
      <div className="notice-modal__panel notice-modal__panel--wide">
        <header className="notice-modal__head">
          <div>
            <h2>Recipient preview</h2>
            <p>
              {loading ? 'Calculating recipients…' : (
                <>
                  <strong>{preview?.total || 0}</strong> users
                  {breakdown.parents ? ` · ${breakdown.parents} parents` : ''}
                  {breakdown.teachers ? ` · ${breakdown.teachers} teachers` : ''}
                  {breakdown.staff ? ` · ${breakdown.staff} staff` : ''}
                </>
              )}
            </p>
          </div>
          <button type="button" className="notice-modal__close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="notice-modal__search">
          <Search size={16} aria-hidden />
          <input
            type="search"
            placeholder="Search recipients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="notice-modal__list">
          {loading ? (
            <p className="notice-modal__empty">Loading preview…</p>
          ) : filtered.length === 0 ? (
            <p className="notice-modal__empty">No recipients match this audience.</p>
          ) : (
            <table className="notice-recipient-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Class</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.userId}>
                    <td>{r.name}</td>
                    <td>{r.role}</td>
                    <td>{r.className || r.sectionName || '—'}</td>
                    <td>{r.email || r.mobile || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="notice-modal__foot">
          <button type="button" className="sb-button-secondary" onClick={onClose}>Close</button>
          {onConfirm && (
            <button type="button" className="sb-button-primary" disabled={!preview?.total || loading} onClick={onConfirm}>
              Confirm audience
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
