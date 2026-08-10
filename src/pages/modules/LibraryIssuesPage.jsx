import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookMarked, CheckCircle2, Clock3, IndianRupee, Plus, RotateCcw, UserRound,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import {
  EmptyState, LoadingState, PageHeader, SearchField,
} from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Modal, { ConfirmModal } from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { libraryIssueService } from '../../services/schoolModules/index.js';
import {
  loadBookOptions,
  loadClassOptions,
  loadStudentOptions,
} from '../../services/schoolModules/relationshipOptions.js';
import { useAuth } from '../../context/AuthContext.jsx';
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
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatMoney(value) {
  const amount = Number(value || 0);
  return `₹${amount.toLocaleString('en-IN')}`;
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
  if (raw === 'issued' && item?.dueDate) {
    const due = new Date(`${String(item.dueDate).slice(0, 10)}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Number.isNaN(due.getTime()) && due < today) return 'overdue';
  }
  return raw || 'issued';
}

function emptyForm() {
  return {
    classId: '',
    bookId: '',
    studentId: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    fine: '0',
    status: 'issued',
  };
}

export default function LibraryIssuesPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('issued');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [classOptions, setClassOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [bookOptions, setBookOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [returnItem, setReturnItem] = useState(null);
  const [returning, setReturning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await libraryIssueService.list({}));
    } catch (err) {
      toast(err?.message || 'Unable to load library issues.', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!createOpen) return undefined;
    let active = true;
    (async () => {
      setOptionsLoading(true);
      try {
        const [classes, books] = await Promise.all([
          loadClassOptions(user),
          loadBookOptions(),
        ]);
        if (!active) return;
        setClassOptions(classes);
        setBookOptions(books);
      } catch (err) {
        if (active) toast(err?.message || 'Unable to load issue options.', 'error');
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [createOpen, toast, user]);

  useEffect(() => {
    if (!createOpen || !form.classId) {
      setStudentOptions([]);
      return undefined;
    }
    let active = true;
    (async () => {
      setOptionsLoading(true);
      try {
        const students = await loadStudentOptions(user, { classId: form.classId });
        if (active) setStudentOptions(students);
      } catch (err) {
        if (active) toast(err?.message || 'Unable to load students.', 'error');
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [createOpen, form.classId, toast, user]);

  const enriched = useMemo(
    () => items.map((item) => ({ ...item, resolvedStatus: resolveStatus(item) })),
    [items],
  );

  const counts = useMemo(() => ({
    all: enriched.length,
    issued: enriched.filter((item) => item.resolvedStatus === 'issued').length,
    overdue: enriched.filter((item) => item.resolvedStatus === 'overdue').length,
    returned: enriched.filter((item) => item.resolvedStatus === 'returned').length,
  }), [enriched]);

  const totalFine = useMemo(
    () => enriched.reduce((sum, item) => sum + Number(item.fine || 0), 0),
    [enriched],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return enriched.filter((item) => {
      const matchFilter = filter === 'all' || item.resolvedStatus === filter;
      if (!matchFilter) return false;
      if (!query) return true;
      return [
        item.bookTitle,
        item.studentName,
        item.className,
        item.status,
        item.resolvedStatus,
      ].some((value) => String(value || '').toLowerCase().includes(query));
    });
  }, [enriched, filter, search]);

  const openCreate = () => {
    setForm(emptyForm());
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!form.classId || !form.bookId || !form.studentId || !form.issueDate || !form.dueDate) {
      toast('Class, book, student, issue date, and due date are required.', 'warning');
      return;
    }
    if (form.dueDate < form.issueDate) {
      toast('Due date must be on or after issue date.', 'warning');
      return;
    }
    setSaving(true);
    try {
      await libraryIssueService.create({
        bookId: form.bookId,
        studentId: form.studentId,
        classId: form.classId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        returnDate: '',
        fine: Number(form.fine || 0),
        status: 'issued',
      });
      toast('Book issued successfully.', 'success');
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to issue book.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnItem?.id) return;
    setReturning(true);
    try {
      await libraryIssueService.returnBook(returnItem.id);
      toast('Book marked as returned.', 'success');
      setReturnItem(null);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to return book.', 'error');
    } finally {
      setReturning(false);
    }
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <PageHeader
          title="Library Issue / Return"
          subtitle="Track issued books, overdue returns, and fine amounts."
          actions={<Button onClick={openCreate}><Plus size={16} /> Issue Book</Button>}
        />

        <div className="leave-kpi-grid">
          <div className="admin-stat-card admin-stat-card--amber">
            <div className="admin-stat-card__icon"><Clock3 size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.issued}</p>
              <p className="admin-stat-card__label">Issued</p>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-card--rose">
            <div className="admin-stat-card__icon"><AlertTriangle size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.overdue}</p>
              <p className="admin-stat-card__label">Overdue</p>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-card--emerald">
            <div className="admin-stat-card__icon"><CheckCircle2 size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.returned}</p>
              <p className="admin-stat-card__label">Returned</p>
            </div>
          </div>
          <div className="admin-stat-card admin-stat-card--sky">
            <div className="admin-stat-card__icon"><IndianRupee size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{formatMoney(totalFine)}</p>
              <p className="admin-stat-card__label">Total fines</p>
            </div>
          </div>
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
          <LoadingState message="Loading library issues…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={filter === 'issued' ? 'No issued books' : 'No library issues'}
            description="Issue a book to an enrolled student to start tracking returns and due dates."
            action={<Button onClick={openCreate}>Issue Book</Button>}
          />
        ) : (
          <div className="leave-list">
            {filtered.map((item) => {
              const status = item.resolvedStatus;
              const canReturn = status === 'issued' || status === 'overdue';
              return (
                <article
                  key={item.id}
                  className={`leave-card${status === 'overdue' ? ' leave-card--pending' : ''}`}
                >
                  <div className="leave-card__main">
                    <div className="leave-card__avatar" aria-hidden="true">
                      {initials(item.bookTitle || item.studentName)}
                    </div>
                    <div className="leave-card__body">
                      <div className="leave-card__top">
                        <div>
                          <h3 className="leave-card__title">{item.bookTitle || 'Book'}</h3>
                          <p className="leave-card__meta">
                            <UserRound size={14} />
                            {item.studentName || 'Student'}
                            {item.className ? ` · ${item.className}` : ''}
                          </p>
                        </div>
                        <StatusBadge status={status} variant={statusTone(status)} />
                      </div>

                      <div className="leave-card__dates">
                        <span>
                          <BookMarked size={14} />
                          Issued {formatDate(item.issueDate)}
                          <span className="leave-card__sep">→</span>
                          Due {formatDate(item.dueDate)}
                        </span>
                        {item.returnDate ? (
                          <span className="leave-card__days">Returned {formatDate(item.returnDate)}</span>
                        ) : null}
                      </div>

                      <p className="leave-card__reason">
                        Fine: {formatMoney(item.fine)}
                        {status === 'overdue' ? ' · Past due date — please collect return.' : ''}
                      </p>
                    </div>
                  </div>

                  {canReturn ? (
                    <div className="leave-card__actions">
                      <Button variant="primary" onClick={() => setReturnItem(item)}>
                        <RotateCcw size={16} /> Mark returned
                      </Button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}

        <Modal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Issue Book"
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={handleCreate}>Issue Book</Button>
            </>
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              label="Class"
              required
              value={form.classId}
              options={classOptions}
              placeholder={optionsLoading ? 'Loading classes…' : 'Select class'}
              disabled={optionsLoading}
              onChange={(event) => setForm((current) => ({
                ...current,
                classId: event.target.value,
                studentId: '',
              }))}
            />
            <Select
              label="Student"
              required
              value={form.studentId}
              options={studentOptions}
              placeholder={
                !form.classId
                  ? 'Select class first'
                  : (optionsLoading ? 'Loading students…' : 'Select student')
              }
              disabled={!form.classId || optionsLoading}
              onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Select
                label="Book"
                required
                value={form.bookId}
                options={bookOptions}
                placeholder={optionsLoading ? 'Loading books…' : 'Select book'}
                disabled={optionsLoading}
                onChange={(event) => setForm((current) => ({ ...current, bookId: event.target.value }))}
              />
            </div>
            <Input
              label="Issue Date"
              type="date"
              required
              value={form.issueDate}
              onChange={(event) => setForm((current) => ({ ...current, issueDate: event.target.value }))}
            />
            <Input
              label="Due Date"
              type="date"
              required
              value={form.dueDate}
              onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
            />
            <Input
              label="Fine Amount"
              type="number"
              value={form.fine}
              onChange={(event) => setForm((current) => ({ ...current, fine: event.target.value }))}
            />
          </div>
        </Modal>

        <ConfirmModal
          open={Boolean(returnItem)}
          onClose={() => setReturnItem(null)}
          onConfirm={handleReturn}
          title="Mark book returned?"
          message={
            returnItem
              ? `Confirm return of “${returnItem.bookTitle || 'this book'}” from ${returnItem.studentName || 'the student'}.`
              : 'Confirm return.'
          }
          confirmText="Mark returned"
          confirmVariant="success"
          loading={returning}
        />
      </PageTransition>
    </DashboardLayout>
  );
}
