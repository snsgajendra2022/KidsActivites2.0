import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ResponsiveDataTable } from '../ui/DataTable.jsx';

const PREVIEW_COLUMNS = [
  { label: 'Name', key: 'name', primary: true },
  { label: 'Role', key: 'role' },
  {
    label: 'Class',
    accessor: (r) => r.className || r.sectionName || '—',
    muted: true,
  },
  {
    label: 'Contact',
    accessor: (r) => r.email || r.mobile || '—',
    muted: true,
  },
];

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
          ) : (
            <ResponsiveDataTable
              nested
              columns={PREVIEW_COLUMNS}
              data={filtered}
              keyExtractor={(r) => r.userId}
              emptyMessage="No recipients match this audience."
              minWidth={640}
            />
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
