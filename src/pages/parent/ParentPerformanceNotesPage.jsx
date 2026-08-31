import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollText, UserRound } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import {
  EmptyState, LoadingState, PageHeader, SearchField,
} from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { parentPerformanceNoteService } from '../../services/schoolModules/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/admin-modules.css';

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function visibilityLabel(value) {
  const key = String(value || '').toLowerCase();
  if (key === 'shared_parent') return 'Shared';
  if (key === 'private') return 'Private';
  return value || '—';
}

function initials(name) {
  const parts = String(name || 'N').trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'N';
}

function DetailRow({ label, value }) {
  if (value == null || value === '') return null;
  return (
    <div className="rounded-xl border border-[#e8ebf2] bg-[#f8f9ff] px-3.5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a93a3]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0b1c30] break-words">{value}</p>
    </div>
  );
}

export default function ParentPerformanceNotesPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await parentPerformanceNoteService.list({}));
    } catch (err) {
      toast(err?.message || 'Unable to load teacher notes.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [
      item.studentName,
      item.className,
      item.subject,
      item.note,
      item.teacherName,
    ].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [items, search]);

  const openDetail = async (item) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const detail = await parentPerformanceNoteService.getById(item.id);
      if (detail) setSelected(detail);
    } catch {
      // Keep list item if detail endpoint is unavailable.
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Teacher Notes"
          subtitle="Performance notes teachers have shared about your child."
        />

        <div className="admin-record-toolbar">
          <SearchField
            className="admin-record-search min-w-[200px] flex-1"
            maxWidthClass=""
            placeholder="Search student, subject, note…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {!loading && items.length > 0 && (
          <div className="admin-record-kpi">
            <div className="admin-record-kpi__card">
              <p className="admin-record-kpi__label">Shared notes</p>
              <p className="admin-record-kpi__value">{items.length}</p>
              <p className="admin-record-kpi__hint">For your children</p>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading teacher notes…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={items.length ? 'No matching notes' : 'No shared notes yet'}
            description={
              items.length
                ? 'Try another search.'
                : 'When a teacher shares a performance note for your child, it will appear here.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                className="leave-card leave-card--pending w-full text-left transition hover:border-[#0058be]/40 hover:shadow-sm"
                onClick={() => openDetail(item)}
              >
                <div className="leave-card__main">
                  <div className="leave-card__avatar" aria-hidden>
                    {initials(item.studentName || item.subject)}
                  </div>
                  <div className="leave-card__body">
                    <div className="leave-card__top">
                      <h3 className="leave-card__title">
                        {item.studentName || 'Student'}
                      </h3>
                      <StatusBadge status="shared" variant="success">
                        {visibilityLabel(item.visibility)}
                      </StatusBadge>
                    </div>
                    <p className="leave-card__meta">
                      {[item.subject, item.className].filter(Boolean).join(' · ') || 'Performance note'}
                    </p>
                    {item.teacherName ? (
                      <div className="leave-card__dates">
                        <span className="inline-flex items-center gap-1">
                          <UserRound size={13} /> {item.teacherName}
                        </span>
                      </div>
                    ) : null}
                    {item.note ? (
                      <p className="leave-card__reason line-clamp-2">{item.note}</p>
                    ) : null}
                  </div>
                </div>
                <div className="leave-card__actions">
                  <span className="text-xs font-semibold text-[#0058be]">View note →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <Modal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title="Performance note"
          size="lg"
          footer={(
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
          )}
        >
          {detailLoading && !selected ? (
            <LoadingState message="Loading note…" />
          ) : selected ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#e8ebf2] bg-gradient-to-br from-[#0b1c30] to-[#1a3a5c] p-4 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                  Student
                </p>
                <h3 className="mt-1 text-xl font-bold">{selected.studentName || 'Student'}</h3>
                <p className="mt-1 text-sm text-white/70">
                  {[selected.subject, selected.className].filter(Boolean).join(' · ') || 'Note'}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Subject" value={selected.subject || '—'} />
                <DetailRow label="Class" value={selected.className || '—'} />
                <DetailRow label="Teacher" value={selected.teacherName || '—'} />
                <DetailRow label="Shared on" value={formatDateTime(selected.createdAt || selected.updatedAt)} />
              </div>

              <div className="rounded-xl border border-[#e8ebf2] bg-white p-4">
                <p className="mb-2 text-sm font-semibold text-[#0b1c30]">Note</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#5a6270]">
                  {selected.note || 'No note text.'}
                </p>
              </div>
            </div>
          ) : null}
        </Modal>
      </PageTransition>
    </AppLayout>
  );
}
