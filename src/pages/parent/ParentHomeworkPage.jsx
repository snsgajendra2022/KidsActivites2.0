import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpen, CalendarDays, ClipboardList, Paperclip, UserRound,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import {
  EmptyState, LoadingState, PageHeader, SearchField,
} from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { parentHomeworkService } from '../../services/schoolModules/index.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/admin-modules.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'closed', label: 'Closed' },
  { id: 'draft', label: 'Draft' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

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

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'assigned') return 'success';
  if (value === 'closed') return 'default';
  if (value === 'draft') return 'warning';
  return 'info';
}

function statusLabel(status) {
  const value = String(status || '').toLowerCase();
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function initials(name) {
  const parts = String(name || 'H').trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'H';
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

export default function ParentHomeworkPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await parentHomeworkService.list({}));
    } catch (err) {
      toast(err?.message || 'Unable to load homework.', 'error');
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
    return items.filter((item) => {
      if (filter !== 'all' && String(item.status).toLowerCase() !== filter) return false;
      if (!q) return true;
      return [
        item.title,
        item.subject,
        item.className,
        item.teacherName,
        item.description,
        item.status,
      ].some((value) => String(value || '').toLowerCase().includes(q));
    });
  }, [items, filter, search]);

  const openDetail = async (item) => {
    setSelected(item);
    setDetailLoading(true);
    try {
      const detail = await parentHomeworkService.getById(item.id);
      if (detail) setSelected(detail);
    } catch {
      // Keep list item as fallback if detail endpoint is unavailable.
    } finally {
      setDetailLoading(false);
    }
  };

  const dueSoonCount = items.filter((item) => {
    if (!item.dueDate || String(item.status).toLowerCase() === 'closed') return false;
    const due = new Date(`${item.dueDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = (due - today) / 86400000;
    return !Number.isNaN(diff) && diff >= 0 && diff <= 3;
  }).length;

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Homework"
          subtitle="Assignments shared by teachers for your child."
        />

        <div className="admin-record-toolbar">
          <SearchField
            className="admin-record-search min-w-[200px] flex-1"
            maxWidthClass=""
            placeholder="Search title, subject, class, teacher…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filter === option.id
                  ? 'border-[#0058be] bg-[#eef5ff] text-[#0058be]'
                  : 'border-[#e8ebf2] bg-white text-[#5a6270] hover:border-[#c5c6cd]'
              }`}
              onClick={() => setFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {!loading && items.length > 0 && (
          <div className="admin-record-kpi">
            <div className="admin-record-kpi__card">
              <p className="admin-record-kpi__label">Total</p>
              <p className="admin-record-kpi__value">{items.length}</p>
              <p className="admin-record-kpi__hint">Assignments</p>
            </div>
            <div className="admin-record-kpi__card">
              <p className="admin-record-kpi__label">Assigned</p>
              <p className="admin-record-kpi__value">
                {items.filter((item) => item.status === 'assigned').length}
              </p>
              <p className="admin-record-kpi__hint">Open now</p>
            </div>
            <div className="admin-record-kpi__card">
              <p className="admin-record-kpi__label">Due soon</p>
              <p className="admin-record-kpi__value">{dueSoonCount}</p>
              <p className="admin-record-kpi__hint">Next 3 days</p>
            </div>
          </div>
        )}

        {loading ? (
          <LoadingState message="Loading homework…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={items.length ? 'No matching homework' : 'No homework yet'}
            description={
              items.length
                ? 'Try another search or filter.'
                : 'When teachers assign homework, it will appear here.'
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
                    {initials(item.subject || item.title)}
                  </div>
                  <div className="leave-card__body">
                    <div className="leave-card__top">
                      <h3 className="leave-card__title">{item.title}</h3>
                      <StatusBadge status={item.status} variant={statusTone(item.status)}>
                        {statusLabel(item.status)}
                      </StatusBadge>
                    </div>
                    <p className="leave-card__meta">
                      {[item.subject, item.className].filter(Boolean).join(' · ') || 'Homework'}
                    </p>
                    <div className="leave-card__dates">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays size={13} /> Due {formatDate(item.dueDate)}
                      </span>
                      {item.teacherName ? (
                        <>
                          <span className="leave-card__sep">·</span>
                          <span className="inline-flex items-center gap-1">
                            <UserRound size={13} /> {item.teacherName}
                          </span>
                        </>
                      ) : null}
                    </div>
                    {item.description ? (
                      <p className="leave-card__reason line-clamp-2">{item.description}</p>
                    ) : null}
                  </div>
                </div>
                <div className="leave-card__actions">
                  <span className="text-xs font-semibold text-[#0058be]">View details →</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <Modal
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          title={selected?.title || 'Homework details'}
          size="lg"
          footer={(
            <Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>
          )}
        >
          {detailLoading && !selected ? (
            <LoadingState message="Loading details…" />
          ) : selected ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[#e8ebf2] bg-gradient-to-br from-[#0b1c30] to-[#1a3a5c] p-4 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/55">
                    Assignment
                  </p>
                  <h3 className="mt-1 text-xl font-bold">{selected.title}</h3>
                  <p className="mt-1 text-sm text-white/70">
                    {[selected.subject, selected.className].filter(Boolean).join(' · ') || 'Homework'}
                  </p>
                </div>
                <StatusBadge status={selected.status} variant={statusTone(selected.status)}>
                  {statusLabel(selected.status)}
                </StatusBadge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow label="Subject" value={selected.subject || '—'} />
                <DetailRow label="Class" value={selected.className || selected.classId || '—'} />
                <DetailRow label="Due date" value={formatDate(selected.dueDate)} />
                <DetailRow label="Teacher" value={selected.teacherName || '—'} />
                <DetailRow label="Assigned students" value={String(selected.assignedCount ?? 0)} />
                <DetailRow label="Status" value={statusLabel(selected.status)} />
                <DetailRow label="Created" value={formatDateTime(selected.createdAt)} />
                <DetailRow label="Updated" value={formatDateTime(selected.updatedAt)} />
              </div>

              <div className="rounded-xl border border-[#e8ebf2] bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0b1c30]">
                  <ClipboardList size={16} /> Description
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#5a6270]">
                  {selected.description || 'No description provided.'}
                </p>
              </div>

              {Array.isArray(selected.assignedStudentIds) && selected.assignedStudentIds.length > 0 ? (
                <div className="rounded-xl border border-[#e8ebf2] bg-white p-4">
                  <p className="mb-2 text-sm font-semibold text-[#0b1c30]">Assigned student IDs</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.assignedStudentIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-full border border-[#e8ebf2] bg-[#f8f9ff] px-2.5 py-1 text-xs font-semibold text-[#5a6270]"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-[#e8ebf2] bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#0b1c30]">
                  <Paperclip size={16} /> Attachments
                </div>
                {Array.isArray(selected.attachments) && selected.attachments.length > 0 ? (
                  <ul className="space-y-2">
                    {selected.attachments.map((file, index) => {
                      const label = typeof file === 'string'
                        ? file
                        : (file?.name || file?.fileName || file?.url || `Attachment ${index + 1}`);
                      const href = typeof file === 'string' ? file : (file?.url || file?.href);
                      return (
                        <li key={`${label}-${index}`}>
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-sm font-semibold text-[#0058be] hover:underline"
                            >
                              {label}
                            </a>
                          ) : (
                            <span className="text-sm text-[#5a6270]">{label}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-[#8a93a3]">No attachments.</p>
                )}
              </div>
            </div>
          ) : null}
        </Modal>
      </PageTransition>
    </AppLayout>
  );
}
