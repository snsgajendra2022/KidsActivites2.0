import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, BookMarked, CalendarDays, CheckCircle2, Clock3, UserRound,
} from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import {
  EmptyState, LoadingState, PageHeader, SearchField,
} from '../../components/ui/index.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { parentLibraryIssueService } from '../../services/schoolModules/index.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { useToast } from '../../context/ToastContext.jsx';
import '../../styles/admin-modules.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'issued', label: 'Issued' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'returned', label: 'Returned' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function initials(name) {
  const parts = String(name || 'B').trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'B';
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'returned') return 'success';
  if (value === 'overdue') return 'danger';
  if (value === 'issued') return 'warning';
  return 'info';
}

function resolveStatus(item) {
  const raw = String(item?.status || '').toLowerCase();
  if (raw === 'returned') return 'returned';
  if (raw === 'overdue') return 'overdue';
  if ((raw === 'issued' || !raw) && item?.dueDate) {
    const due = new Date(`${String(item.dueDate).slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due < today) return 'overdue';
  }
  return raw || 'issued';
}

function statusCardClass(status) {
  if (status === 'overdue') return 'leave-card--rejected';
  if (status === 'returned') return 'leave-card--approved';
  if (status === 'issued') return 'leave-card--pending';
  return '';
}

export default function ParentLibraryPage() {
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('issued');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await parentLibraryIssueService.list({});
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      toast(err?.message || 'Unable to load library books.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const enriched = useMemo(() => items.map((item) => ({
    ...item,
    status: resolveStatus(item),
  })), [items]);

  const counts = useMemo(() => {
    const next = { all: enriched.length, issued: 0, overdue: 0, returned: 0 };
    enriched.forEach((item) => {
      if (item.status === 'issued') next.issued += 1;
      else if (item.status === 'overdue') next.overdue += 1;
      else if (item.status === 'returned') next.returned += 1;
    });
    return next;
  }, [enriched]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enriched
      .filter((item) => {
        if (filter !== 'all' && item.status !== filter) return false;
        if (!query) return true;
        return [
          item.bookTitle,
          item.studentName,
          item.className,
          item.status,
        ].filter(Boolean).join(' ').toLowerCase().includes(query);
      })
      .sort((a, b) => String(b.issueDate || '').localeCompare(String(a.issueDate || '')));
  }, [enriched, filter, search]);

  return (
    <AppLayout>
      <PageTransition>
        <PageHeader
          title="Library Books"
          subtitle="Books currently issued to your children, including due dates and returns."
          actions={(
            <Link to={tenantPath('/parent/notice-board')} className="sb-button-secondary">
              Notice Board
            </Link>
          )}
        />

        <div className="leave-kpi-grid">
          <button type="button" className="admin-stat-card admin-stat-card--sky text-left" onClick={() => setFilter('all')}>
            <div className="admin-stat-card__icon"><BookMarked size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.all}</p>
              <p className="admin-stat-card__label">Total</p>
            </div>
          </button>
          <button type="button" className="admin-stat-card admin-stat-card--amber text-left" onClick={() => setFilter('issued')}>
            <div className="admin-stat-card__icon"><Clock3 size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.issued}</p>
              <p className="admin-stat-card__label">Issued</p>
            </div>
          </button>
          <button type="button" className="admin-stat-card admin-stat-card--rose text-left" onClick={() => setFilter('overdue')}>
            <div className="admin-stat-card__icon"><AlertTriangle size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.overdue}</p>
              <p className="admin-stat-card__label">Overdue</p>
            </div>
          </button>
          <button type="button" className="admin-stat-card admin-stat-card--emerald text-left" onClick={() => setFilter('returned')}>
            <div className="admin-stat-card__icon"><CheckCircle2 size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.returned}</p>
              <p className="admin-stat-card__label">Returned</p>
            </div>
          </button>
        </div>

        <div className="leave-toolbar">
          <div className="admin-modules-tabs leave-filter-tabs">
            {FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`admin-modules-tab${filter === tab.id ? ' is-active' : ''}`}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
                <span className="leave-filter-count">{counts[tab.id] ?? 0}</span>
              </button>
            ))}
          </div>
          <SearchField
            placeholder="Search book, student, or class…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="leave-search"
          />
        </div>

        {loading ? (
          <LoadingState message="Loading library books…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title={filter === 'issued' ? 'No books issued' : 'No library records'}
            description="When the school issues a book to your child, it will appear here with the due date."
          />
        ) : (
          <div className="leave-list">
            {filtered.map((item) => (
              <article
                key={item.id}
                className={`leave-card ${statusCardClass(item.status)}`.trim()}
              >
                <div className="leave-card__main">
                  <div className="leave-card__avatar" aria-hidden>
                    {initials(item.bookTitle || item.studentName)}
                  </div>
                  <div className="leave-card__body">
                    <div className="leave-card__top">
                      <div>
                        <h3 className="leave-card__title">{item.bookTitle || 'Library book'}</h3>
                        <p className="leave-card__meta">
                          <span className="leave-card__class">
                            <UserRound size={12} />
                            {item.studentName || 'Student'}
                            {item.className ? ` · ${item.className}` : ''}
                          </span>
                        </p>
                      </div>
                      <StatusBadge status={item.status} variant={statusTone(item.status)} />
                    </div>

                    <div className="leave-card__dates">
                      <span>
                        <CalendarDays size={14} />
                        Issued {formatDate(item.issueDate)}
                        <span className="leave-card__sep">·</span>
                        Due {formatDate(item.dueDate)}
                      </span>
                      {item.returnDate ? (
                        <span className="leave-card__days">Returned {formatDate(item.returnDate)}</span>
                      ) : null}
                    </div>

                    {Number(item.fine) > 0 ? (
                      <p className="leave-card__note" style={{ marginTop: '0.65rem' }}>
                        Fine: ₹{Number(item.fine).toLocaleString('en-IN')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </PageTransition>
    </AppLayout>
  );
}
