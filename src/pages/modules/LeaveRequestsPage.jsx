import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, CheckCircle2, Clock3, MessageSquareText, UserRound, XCircle,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout.jsx';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import {
  EmptyState, LoadingState, PageHeader, SearchField,
} from '../../components/ui/index.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Modal from '../../components/ui/Modal.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import { leaveService } from '../../services/schoolModules/index.js';
import {
  loadClassOptions,
  loadStudentOptions,
} from '../../services/schoolModules/relationshipOptions.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { ROLES } from '../../constants/roles.js';
import '../../styles/admin-modules.css';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function daySpan(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  const days = Math.round((to - from) / 86400000) + 1;
  return days > 0 ? days : null;
}

function initials(name) {
  const parts = String(name || 'S').trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || '').join('') || 'S';
}

function statusTone(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'success';
  if (value === 'rejected') return 'danger';
  if (value === 'pending') return 'warning';
  return 'info';
}

function statusCardClass(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'approved') return 'leave-card--approved';
  if (value === 'rejected') return 'leave-card--rejected';
  if (value === 'pending') return 'leave-card--pending';
  return '';
}

function emptyForm(user) {
  return {
    classId: '',
    studentId: '',
    fromDate: '',
    toDate: '',
    reason: '',
    requestedByUserId: user?.id || '',
  };
}

export default function LeaveRequestsPage({ layout = 'app' }) {
  const Layout = layout === 'dashboard' ? DashboardLayout : AppLayout;
  const { user } = useAuth();
  const { toast } = useToast();
  const isParent = user?.role === ROLES.PARENT || user?.role === ROLES.STUDENT;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(() => emptyForm(user));
  const [classOptions, setClassOptions] = useState([]);
  const [studentOptions, setStudentOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [reviewItem, setReviewItem] = useState(null);
  const [reviewAction, setReviewAction] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await leaveService.list({}));
    } catch (err) {
      toast(err?.message || 'Unable to load leave requests.', 'error');
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
        if (!isParent) {
          const classes = await loadClassOptions(user);
          if (active) setClassOptions(classes);
        } else {
          const students = await loadStudentOptions(user, {});
          if (active) setStudentOptions(students);
        }
      } catch (err) {
        if (active) toast(err?.message || 'Unable to load students.', 'error');
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [createOpen, isParent, toast, user]);

  useEffect(() => {
    if (!createOpen || isParent || !form.classId) {
      if (!isParent) setStudentOptions([]);
      return undefined;
    }
    let active = true;
    (async () => {
      setOptionsLoading(true);
      try {
        const students = await loadStudentOptions(user, { classId: form.classId });
        if (active) setStudentOptions(students);
      } catch (err) {
        if (active) {
          setStudentOptions([]);
          toast(err?.message || 'Unable to load class students.', 'error');
        }
      } finally {
        if (active) setOptionsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [createOpen, form.classId, isParent, toast, user]);

  const counts = useMemo(() => {
    const next = { all: items.length, pending: 0, approved: 0, rejected: 0 };
    items.forEach((item) => {
      const status = String(item.status || '').toLowerCase();
      if (status === 'pending') next.pending += 1;
      else if (status === 'approved') next.approved += 1;
      else if (status === 'rejected') next.rejected += 1;
    });
    return next;
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items
      .filter((item) => {
        const status = String(item.status || '').toLowerCase();
        if (filter !== 'all' && status !== filter) return false;
        if (!query) return true;
        return [item.studentName, item.className, item.reason, item.status, item.reviewNote]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => String(b.fromDate || '').localeCompare(String(a.fromDate || '')));
  }, [items, filter, search]);

  const openCreate = () => {
    setForm(emptyForm(user));
    setCreateOpen(true);
  };

  const openReview = (item, action) => {
    setReviewItem(item);
    setReviewAction(action);
    setReviewNote('');
  };

  const closeReview = () => {
    setReviewItem(null);
    setReviewAction(null);
    setReviewNote('');
  };

  const submitCreate = async () => {
    if (!form.studentId) {
      toast('Select a student.', 'warning');
      return;
    }
    if (!form.fromDate || !form.toDate) {
      toast('From and To dates are required.', 'warning');
      return;
    }
    if (form.toDate < form.fromDate) {
      toast('To date must be on or after from date.', 'warning');
      return;
    }
    if (!form.reason.trim()) {
      toast('Reason is required.', 'warning');
      return;
    }

    const selected = studentOptions.find((option) => String(option.value) === String(form.studentId));
    setSaving(true);
    try {
      await leaveService.create({
        studentId: form.studentId,
        classId: form.classId || selected?.meta?.classId || '',
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
        status: 'pending',
        requestedByUserId: user?.id || null,
      });
      toast(isParent ? 'Leave request submitted.' : 'Leave request added.', 'success');
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to submit leave request.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    if (!reviewItem?.id || !reviewAction) return;
    if (reviewAction === 'reject' && !reviewNote.trim()) {
      toast('Please add a short rejection note.', 'warning');
      return;
    }
    setReviewing(true);
    try {
      if (reviewAction === 'approve') {
        await leaveService.approve(reviewItem.id, {
          reviewNote: reviewNote.trim() || undefined,
        });
        toast('Leave request approved.', 'success');
      } else {
        await leaveService.reject(reviewItem.id, {
          reviewNote: reviewNote.trim(),
        });
        toast('Leave request rejected.', 'success');
      }
      closeReview();
      await load();
    } catch (err) {
      toast(err?.message || 'Unable to update leave request.', 'error');
    } finally {
      setReviewing(false);
    }
  };

  return (
    <Layout>
      <PageTransition>
        <PageHeader
          title={isParent ? 'Leave Requests' : 'Leave Approvals'}
          subtitle={isParent
            ? 'Request leave for your child and track school decisions.'
            : 'Review pending requests quickly and keep families informed.'}
          actions={isParent ? (
            <Button onClick={openCreate}>Request Leave</Button>
          ) : (
            <Button variant="secondary" onClick={openCreate}>Add leave request</Button>
          )}
        />

        {isParent ? (
          <section className="leave-parent-hero sb-card">
            <div>
              <h2 className="leave-parent-hero__title">Need time off for your child?</h2>
              <p className="leave-parent-hero__text">
                Submit a leave request with dates and reason. The school will review it and update the status here.
              </p>
            </div>
            <Button onClick={openCreate}>Request Leave</Button>
          </section>
        ) : null}

        <div className="leave-kpi-grid">
          <button type="button" className="admin-stat-card admin-stat-card--sky text-left" onClick={() => setFilter('all')}>
            <div className="admin-stat-card__icon"><CalendarDays size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.all}</p>
              <p className="admin-stat-card__label">Total</p>
            </div>
          </button>
          <button type="button" className="admin-stat-card admin-stat-card--amber text-left" onClick={() => setFilter('pending')}>
            <div className="admin-stat-card__icon"><Clock3 size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.pending}</p>
              <p className="admin-stat-card__label">Pending</p>
            </div>
          </button>
          <button type="button" className="admin-stat-card admin-stat-card--emerald text-left" onClick={() => setFilter('approved')}>
            <div className="admin-stat-card__icon"><CheckCircle2 size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.approved}</p>
              <p className="admin-stat-card__label">Approved</p>
            </div>
          </button>
          <button type="button" className="admin-stat-card admin-stat-card--rose text-left" onClick={() => setFilter('rejected')}>
            <div className="admin-stat-card__icon"><XCircle size={18} /></div>
            <div>
              <p className="admin-stat-card__value">{counts.rejected}</p>
              <p className="admin-stat-card__label">Rejected</p>
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
            placeholder="Search student, class, or reason…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="leave-search"
          />
        </div>

        {loading ? (
          <LoadingState message="Loading leave requests…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={filter === 'pending' ? 'No pending leave' : 'No leave requests'}
            description={isParent
              ? 'Submit a leave request when your child needs time away from school.'
              : 'When parents submit leave, pending items will appear here for review.'}
            action={isParent ? <Button onClick={openCreate}>Request Leave</Button> : null}
          />
        ) : (
          <div className="leave-list">
            {filtered.map((item) => {
              const status = String(item.status || '').toLowerCase();
              const pending = status === 'pending';
              const days = daySpan(item.fromDate, item.toDate);
              return (
                <article
                  key={item.id}
                  className={`leave-card ${statusCardClass(status)}`.trim()}
                >
                  <div className="leave-card__main">
                    <div className="leave-card__avatar" aria-hidden="true">
                      {initials(item.studentName)}
                    </div>
                    <div className="leave-card__body">
                      <div className="leave-card__top">
                        <div>
                          <h3 className="leave-card__title">{item.studentName || 'Student'}</h3>
                          <p className="leave-card__meta">
                            <span className="leave-card__class">
                              <UserRound size={12} />
                              {item.className || 'Class not linked'}
                            </span>
                          </p>
                        </div>
                        <StatusBadge status={item.status} variant={statusTone(item.status)} />
                      </div>

                      <div className="leave-card__dates">
                        <span>
                          <CalendarDays size={14} />
                          {formatDate(item.fromDate)}
                          <span className="leave-card__sep">→</span>
                          {formatDate(item.toDate)}
                        </span>
                        {days ? (
                          <span className="leave-card__days">
                            {days} day{days === 1 ? '' : 's'}
                          </span>
                        ) : null}
                      </div>

                      <div className="leave-card__reason-block">
                        <span className="leave-card__label">Reason</span>
                        <p className="leave-card__reason">{item.reason || 'No reason provided.'}</p>
                      </div>

                      {item.reviewNote ? (
                        <div className="leave-card__note">
                          <MessageSquareText size={15} className="leave-card__note-icon" aria-hidden />
                          <div className="leave-card__note-copy">
                            <strong>Review note</strong>
                            <span>{item.reviewNote}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {!isParent && pending ? (
                    <div className="leave-card__actions">
                      <Button variant="primary" onClick={() => openReview(item, 'approve')}>
                        <CheckCircle2 size={16} /> Approve
                      </Button>
                      <Button variant="danger" onClick={() => openReview(item, 'reject')}>
                        <XCircle size={16} /> Reject
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
          title="Request Leave"
          size="lg"
          footer={(
            <>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button loading={saving} onClick={submitCreate}>Submit Request</Button>
            </>
          )}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {!isParent ? (
              <Select
                label="Class"
                required
                value={form.classId}
                onChange={(event) => setForm((current) => ({
                  ...current,
                  classId: event.target.value,
                  studentId: '',
                }))}
                options={classOptions}
                placeholder={optionsLoading ? 'Loading classes…' : 'Select class'}
                disabled={optionsLoading}
              />
            ) : null}
            <Select
              label="Student"
              required
              value={form.studentId}
              onChange={(event) => setForm((current) => ({
                ...current,
                studentId: event.target.value,
              }))}
              options={studentOptions}
              placeholder={
                optionsLoading
                  ? 'Loading students…'
                  : (!isParent && !form.classId ? 'Select a class first' : 'Select student')
              }
              disabled={optionsLoading || (!isParent && !form.classId)}
            />
            <Input
              label="From Date"
              type="date"
              required
              value={form.fromDate}
              onChange={(event) => setForm((current) => ({ ...current, fromDate: event.target.value }))}
            />
            <Input
              label="To Date"
              type="date"
              required
              value={form.toDate}
              onChange={(event) => setForm((current) => ({ ...current, toDate: event.target.value }))}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Reason"
                required
                value={form.reason}
                onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Share why leave is needed"
              />
            </div>
          </div>
        </Modal>

        <Modal
          open={Boolean(reviewItem)}
          onClose={closeReview}
          title={reviewAction === 'approve' ? 'Approve leave request' : 'Reject leave request'}
          size="md"
          footer={(
            <>
              <Button variant="secondary" onClick={closeReview}>Cancel</Button>
              <Button
                variant={reviewAction === 'reject' ? 'danger' : 'primary'}
                loading={reviewing}
                onClick={submitReview}
              >
                {reviewAction === 'approve' ? 'Confirm Approve' : 'Confirm Reject'}
              </Button>
            </>
          )}
        >
          {reviewItem ? (
            <div className="leave-review">
              <div className="leave-review__header">
                <div className="leave-card__avatar leave-card__avatar--lg" aria-hidden="true">
                  {initials(reviewItem.studentName)}
                </div>
                <div>
                  <h3 className="leave-card__title">{reviewItem.studentName || 'Student'}</h3>
                  <p className="leave-card__meta">
                    <span className="leave-card__class">{reviewItem.className || 'Class'}</span>
                    <span>
                      {formatDate(reviewItem.fromDate)} → {formatDate(reviewItem.toDate)}
                    </span>
                  </p>
                </div>
              </div>
              <div className="leave-card__reason-block">
                <span className="leave-card__label">Reason</span>
                <p className="leave-card__reason">{reviewItem.reason}</p>
              </div>
              <Textarea
                label={reviewAction === 'reject' ? 'Rejection note' : 'Note (optional)'}
                required={reviewAction === 'reject'}
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder={reviewAction === 'reject'
                  ? 'Tell the parent why this leave was rejected'
                  : 'Optional note for school records'}
              />
            </div>
          ) : null}
        </Modal>
      </PageTransition>
    </Layout>
  );
}
