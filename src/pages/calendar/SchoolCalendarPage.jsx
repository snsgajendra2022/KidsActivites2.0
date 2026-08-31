import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import Button from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { calendarService } from '../../services/calendarService.js';
import { loadCalendarFeed } from '../../services/calendarFeedService.js';
import { getParentDashboard } from '../../services/parentService.js';
import { getTeacherClasses } from '../../services/teacherService.js';
import { resolveParentStudentId } from '../../services/schoolModules/relationshipOptions.js';
import {
  CALENDAR_CATEGORY_LABELS,
  CALENDAR_EVENT_TYPES,
  CALENDAR_STATUS_LABELS,
  CALENDAR_VIEWS,
  WEEKDAY_LABELS,
  getCalendarEventType,
} from '../../constants/calendar.js';
import { hasPermission, PERMISSIONS } from '../../constants/permissions.js';
import { ROLES } from '../../constants/roles.js';
import {
  addDays,
  daysUntil,
  endOfMonth,
  formatDateLabel,
  monthGrid,
  parseDateKey,
  startOfMonth,
  startOfWeek,
  todayKey,
} from '../../utils/calendarDates.js';
import { appliesToChild } from '../../utils/calendarAudience.js';
import { downloadIcs, eventTimeLabel, googleCalendarUrl } from '../../utils/calendarIcs.js';
import '../../styles/school-calendar.css';

const WEEK_START = 1;

function eventsOnDay(events, day) {
  return (events || []).filter((event) => {
    const start = event.occurrenceDate || event.startDate;
    const end = event.occurrenceEndDate || event.endDate || start;
    return start <= day && end >= day;
  });
}

function EventChip({ event, onOpen }) {
  const type = getCalendarEventType(event.eventType);
  return (
    <button
      type="button"
      className="school-calendar-chip"
      style={{ background: `${type.color}22`, color: type.color }}
      onClick={(e) => { e.stopPropagation(); onOpen(event); }}
      title={`${event.title} · ${CALENDAR_CATEGORY_LABELS[event.eventCategory] || event.eventType}`}
    >
      <span className="school-calendar-dot" style={{ background: type.color }} />
      {event.title}
    </button>
  );
}

export default function SchoolCalendarPage({
  audience = 'admin',
  title = 'School Calendar',
  subtitle = 'Holidays, events, exams, closures and transport changes',
}) {
  const { user } = useAuth();
  const { school } = usePortalConfig();
  const { tenantPath } = useTenantPath();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canManage = hasPermission(user?.role, PERMISSIONS.MANAGE_CALENDAR);
  const timeZone = school?.timezone || 'Asia/Kolkata';
  const [cursor, setCursor] = useState(todayKey(timeZone));
  const [view, setView] = useState(typeof window !== 'undefined' && window.innerWidth < 900 ? 'agenda' : 'month');
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(canManage ? '' : 'published');
  const [selected, setSelected] = useState(null);
  const [childId, setChildId] = useState('all');
  const today = todayKey(timeZone);

  const range = useMemo(() => {
    if (view === 'day') return { from: cursor, to: cursor };
    if (view === 'week' || view === 'agenda') {
      const start = startOfWeek(cursor, WEEK_START);
      return { from: start, to: addDays(start, 6) };
    }
    if (view === 'year') {
      const year = cursor.slice(0, 4);
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    return { from: startOfWeek(startOfMonth(cursor), WEEK_START), to: addDays(endOfMonth(cursor), 7) };
  }, [cursor, view]);

  const childrenQuery = useQuery({
    queryKey: ['calendar-parent-children', user?.id],
    queryFn: () => getParentDashboard(user.id),
    enabled: audience === 'parent' && Boolean(user?.id),
  });
  const teacherQuery = useQuery({
    queryKey: ['calendar-teacher-classes', user?.id],
    queryFn: () => getTeacherClasses(user.id),
    enabled: audience === 'teacher' && Boolean(user?.id),
  });

  const children = useMemo(() => childrenQuery.data?.children || [], [childrenQuery.data]);
  const classIds = audience === 'teacher'
    ? (teacherQuery.data || []).map((item) => item.id || item.classId).filter(Boolean)
    : children.map((child) => child.classId).filter(Boolean);
  const studentIds = children.map((child) => resolveParentStudentId(child)).filter(Boolean);

  const feedQuery = useQuery({
    queryKey: ['calendar-feed', audience, range.from, range.to, typeFilter, statusFilter, user?.id],
    queryFn: () => loadCalendarFeed({
      from: range.from,
      to: range.to,
      role: user?.role,
      userId: user?.id,
      classIds,
      studentIds,
      includeManaged: canManage,
      filters: { eventType: typeFilter, status: statusFilter },
    }),
  });

  const statsQuery = useQuery({
    queryKey: ['calendar-analytics'],
    queryFn: () => calendarService.analytics(),
    enabled: canManage,
  });

  const events = useMemo(() => {
    let items = feedQuery.data || [];
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(q));
    }
    if (audience === 'driver') {
      items = items.filter((item) => (
        item.eventCategory === 'transport'
        || item.eventCategory === 'holiday'
        || item.eventCategory === 'vacation'
        || item.eventCategory === 'emergency'
        || item.eventType === 'half_day'
        || item.eventType === 'late_opening'
        || item.operations?.transportStatus === 'cancelled'
        || item.operations?.transportStatus === 'updated'
      ));
    }
    if (audience === 'parent' && childId !== 'all') {
      const child = children.find((item) => resolveParentStudentId(item) === childId);
      items = items.filter((item) => appliesToChild(item, child));
    }
    return items;
  }, [feedQuery.data, query, audience, childId, children]);

  const periodLabel = useMemo(() => {
    const date = parseDateKey(cursor);
    if (!date) return '';
    if (view === 'day') return formatDateLabel(cursor, { weekday: 'long' });
    if (view === 'week' || view === 'agenda') return `${formatDateLabel(range.from)} – ${formatDateLabel(range.to, { year: false })}`;
    if (view === 'year') return date.getFullYear();
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }, [cursor, view, range.from, range.to]);

  const shift = (dir) => {
    if (view === 'day') setCursor(addDays(cursor, dir));
    else if (view === 'week' || view === 'agenda') setCursor(addDays(cursor, dir * 7));
    else if (view === 'year') setCursor(`${Number(cursor.slice(0, 4)) + dir}-01-01`);
    else {
      const date = parseDateKey(cursor);
      date.setMonth(date.getMonth() + dir, 1);
      setCursor(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`);
    }
  };

  const openCreate = (date) => {
    if (!canManage) return;
    navigate(tenantPath(`/admin/calendar/new?date=${date}`));
  };

  const days = view === 'month' ? monthGrid(cursor, WEEK_START) : [];
  const weekDays = view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor, WEEK_START), i)) : [];

  const printEvents = useMemo(() => (
    [...events].sort((a, b) => {
      const left = String(a.occurrenceDate || a.startDate || '');
      const right = String(b.occurrenceDate || b.startDate || '');
      return left.localeCompare(right);
    })
  ), [events]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="school-calendar-page">
          <div className="premium-page-header flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="premium-page-title">{title}</h1>
              <p className="premium-page-subtitle">{subtitle}</p>
            </div>
            <div className="school-calendar-no-print flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handlePrint}>
                <Printer size={16} /> Print
              </Button>
              {canManage ? (
                <>
                  <Link to={tenantPath('/admin/calendar/holidays')} className="premium-btn premium-btn-secondary premium-btn-sm">Holidays</Link>
                  <Link to={tenantPath('/admin/calendar/emergencies')} className="premium-btn premium-btn-secondary premium-btn-sm">Emergencies</Link>
                  <Link to={tenantPath('/admin/calendar/new')} className="premium-btn premium-btn-primary premium-btn-sm">Add event</Link>
                </>
              ) : null}
            </div>
          </div>

          {canManage && statsQuery.data ? (
            <div className="school-calendar-stats">
              <div className="school-calendar-stat"><strong>{statsQuery.data.published}</strong><span>Published events</span></div>
              <div className="school-calendar-stat"><strong>{statsQuery.data.holidays}</strong><span>Holidays / breaks</span></div>
              <div className="school-calendar-stat"><strong>{statsQuery.data.emergencies}</strong><span>Emergency closures</span></div>
              <div className="school-calendar-stat"><strong>{statsQuery.data.transportChanges}</strong><span>Transport changes</span></div>
            </div>
          ) : null}

          <div className="school-calendar-toolbar">
            <button type="button" className="school-calendar-icon-btn" onClick={() => setCursor(today)}>Today</button>
            <button type="button" className="school-calendar-icon-btn" onClick={() => shift(-1)} aria-label="Previous">‹</button>
            <button type="button" className="school-calendar-icon-btn" onClick={() => shift(1)} aria-label="Next">›</button>
            <div className="school-calendar-period">{periodLabel}</div>
            <div className="school-calendar-views">
              {CALENDAR_VIEWS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`school-calendar-view-btn${view === item ? ' is-active' : ''}`}
                  onClick={() => setView(item)}
                >
                  {item[0].toUpperCase() + item.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="school-calendar-filters">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search events" aria-label="Search events" />
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Event type">
              <option value="">All types</option>
              {CALENDAR_EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {canManage ? (
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
                <option value="">All statuses</option>
                {Object.entries(CALENDAR_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            ) : null}
            {audience === 'parent' && children.length > 1 ? (
              <select value={childId} onChange={(e) => setChildId(e.target.value)} aria-label="Child">
                <option value="all">All children</option>
                {children.map((child) => (
                  <option key={resolveParentStudentId(child)} value={resolveParentStudentId(child)}>
                    {child.student?.fullName || child.studentName || 'Child'}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="school-calendar-legend" aria-label="Calendar legend">
            {Object.entries(CALENDAR_CATEGORY_LABELS).slice(0, 8).map(([key, label]) => {
              const color = CALENDAR_EVENT_TYPES.find((item) => item.category === key)?.color || '#64748b';
              return <span key={key}><span className="school-calendar-dot" style={{ background: color }} />{label}</span>;
            })}
          </div>

          {feedQuery.isPending ? <LoadingState message="Loading calendar…" /> : null}
          {feedQuery.error ? <p className="text-sm text-rose-600">{feedQuery.error.message || 'Could not load calendar.'}</p> : null}

          {view === 'month' && !feedQuery.isPending ? (
            <div className="school-calendar-month">
              <div className="school-calendar-dows" aria-hidden>
                {WEEKDAY_LABELS.slice(WEEK_START).concat(WEEKDAY_LABELS.slice(0, WEEK_START)).map((label) => (
                  <div key={label} className="school-calendar-dow">{label}</div>
                ))}
              </div>
              <div className="school-calendar-grid" role="grid" aria-label="Month calendar">
                {days.map((day) => {
                  const dayEvents = eventsOnDay(events, day);
                  const preview = dayEvents.slice(0, 1);
                  const extra = Math.max(0, dayEvents.length - preview.length);
                  const inMonth = day.slice(0, 7) === cursor.slice(0, 7);
                  return (
                    <div
                      key={day}
                      role="gridcell"
                      tabIndex={0}
                      className={`school-calendar-cell${inMonth ? '' : ' is-muted'}${day === today ? ' is-today' : ''}${dayEvents.length ? ' has-events' : ''}`}
                      onClick={() => (canManage ? openCreate(day) : dayEvents[0] && setSelected(dayEvents[0]))}
                      onKeyDown={(e) => { if (e.key === 'Enter') canManage ? openCreate(day) : dayEvents[0] && setSelected(dayEvents[0]); }}
                    >
                      <div className="school-calendar-cell__head">
                        <span className="school-calendar-daynum">{Number(day.slice(8))}</span>
                        {dayEvents.length > 0 ? (
                          <div className="school-calendar-cell__meta">
                            <span className="school-calendar-cell__dots" aria-hidden>
                              {dayEvents.slice(0, 3).map((event) => (
                                <span
                                  key={event.occurrenceId || event.id}
                                  className="school-calendar-cell__dot"
                                  style={{ background: getCalendarEventType(event.eventType).color }}
                                />
                              ))}
                            </span>
                            <span className="school-calendar-cell__count" title={`${dayEvents.length} event${dayEvents.length === 1 ? '' : 's'}`}>
                              {dayEvents.length}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {preview[0] ? (
                        <EventChip event={preview[0]} onOpen={setSelected} />
                      ) : null}

                      {extra > 0 ? (
                        <button
                          type="button"
                          className="school-calendar-more"
                          onClick={(e) => { e.stopPropagation(); setView('day'); setCursor(day); }}
                        >
                          +{extra} more
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {view === 'week' && !feedQuery.isPending ? (
            <div className="school-calendar-grid is-week">
              {weekDays.map((day) => (
                <div key={day} className="school-calendar-dow">{formatDateLabel(day, { weekday: 'short', year: false })}</div>
              ))}
              {weekDays.map((day) => (
                <div key={`${day}-cell`} className={`school-calendar-cell${day === today ? ' is-today' : ''}`}>
                  <span className="school-calendar-daynum">{Number(day.slice(8))}</span>
                  {eventsOnDay(events, day).map((event) => (
                    <EventChip key={event.occurrenceId || event.id} event={event} onOpen={setSelected} />
                  ))}
                </div>
              ))}
            </div>
          ) : null}

          {(view === 'day' || view === 'agenda' || view === 'list') && !feedQuery.isPending ? (
            <EventList
              events={view === 'day' ? eventsOnDay(events, cursor) : events}
              emptyLabel={view === 'day' ? 'No events on this day.' : 'No events in this period.'}
              onOpen={setSelected}
              childLookup={children}
            />
          ) : null}

          {view === 'year' && !feedQuery.isPending ? (
            <div className="school-calendar-year">
              {Array.from({ length: 12 }, (_, month) => {
                const key = `${cursor.slice(0, 4)}-${String(month + 1).padStart(2, '0')}-01`;
                const cells = monthGrid(key, WEEK_START);
                return (
                  <section key={key} className="school-calendar-mini">
                    <h3>{parseDateKey(key).toLocaleDateString('en-IN', { month: 'long' })}</h3>
                    <div className="school-calendar-mini-grid">
                      {cells.map((day) => (
                        <button
                          key={day}
                          type="button"
                          className={`school-calendar-mini-day${day === today ? ' is-today' : ''}${eventsOnDay(events, day).length ? ' has-event' : ''}`}
                          onClick={() => { setCursor(day); setView('day'); }}
                        >
                          {day.startsWith(key.slice(0, 7)) ? Number(day.slice(8)) : ''}
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : null}

          {selected ? (
            <EventDetail
              event={selected}
              canManage={canManage}
              childrenList={children}
              onClose={() => setSelected(null)}
              onEdit={() => navigate(tenantPath(`/admin/calendar/${selected.id}/edit`))}
              onChanged={() => {
                void queryClient.invalidateQueries({ queryKey: ['calendar-feed'] });
                void queryClient.invalidateQueries({ queryKey: ['calendar-analytics'] });
              }}
            />
          ) : null}

          <section className="school-calendar-print-agenda" aria-hidden="true">
            <h2 className="school-calendar-print-agenda__title">{title}</h2>
            <p className="school-calendar-print-agenda__period">{periodLabel}</p>
            {printEvents.length === 0 ? (
              <p className="school-calendar-print-agenda__empty">No events in this period.</p>
            ) : (
              <ul className="school-calendar-print-agenda__list">
                {printEvents.map((event) => {
                  const type = getCalendarEventType(event.eventType);
                  return (
                    <li key={event.occurrenceId || event.id} className="school-calendar-print-agenda__item">
                      <div className="school-calendar-print-agenda__date">
                        {formatDateLabel(event.occurrenceDate || event.startDate, { weekday: 'short' })}
                      </div>
                      <div>
                        <strong>{event.title}</strong>
                        <p>
                          {CALENDAR_CATEGORY_LABELS[event.eventCategory] || type.label}
                          {' · '}
                          {eventTimeLabel(event)}
                          {event.location ? ` · ${event.location}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </PageTransition>
    </AppLayout>
  );
}

function EventList({ events, emptyLabel, onOpen, childLookup }) {
  if (!events.length) {
    return <div className="school-calendar-card"><p>{emptyLabel}</p></div>;
  }
  return (
    <div className="school-calendar-list">
      {events.map((event) => {
        const type = getCalendarEventType(event.eventType);
        const remaining = daysUntil(event.occurrenceDate || event.startDate);
        const child = (childLookup || []).find((item) => appliesToChild(event, item));
        return (
          <button key={event.occurrenceId || event.id} type="button" className="school-calendar-item" onClick={() => onOpen(event)}>
            <div className="school-calendar-item-date">{formatDateLabel(event.occurrenceDate || event.startDate, { weekday: 'short', year: false })}</div>
            <div>
              <h3>{event.title}</h3>
              <p>
                {CALENDAR_CATEGORY_LABELS[event.eventCategory] || event.eventType}
                {' · '}
                {eventTimeLabel(event)}
                {event.operations?.schoolStatus && event.operations.schoolStatus !== 'open' ? ` · School ${event.operations.schoolStatus}` : ''}
                {child ? ` · ${child.student?.fullName || child.studentName}` : ''}
                {remaining != null ? ` · ${remaining === 0 ? 'Today' : remaining > 0 ? `In ${remaining} day${remaining === 1 ? '' : 's'}` : `${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? '' : 's'} ago`}` : ''}
              </p>
            </div>
            <span className="school-calendar-dot" style={{ background: type.color, marginLeft: 'auto' }} />
          </button>
        );
      })}
    </div>
  );
}

function EventDetail({ event, canManage, childrenList, onClose, onEdit, onChanged }) {
  const type = getCalendarEventType(event.eventType);
  const { user } = useAuth();
  const matchingChild = (childrenList || []).find((item) => appliesToChild(event, item));

  const run = async (action) => {
    if (action === 'publish') await calendarService.publish(event.id, { userId: user.id });
    if (action === 'cancel') {
      if (!window.confirm('Cancel this published event and notify affected users?')) return;
      await calendarService.cancel(event.id, { userId: user.id });
    }
    if (action === 'duplicate') await calendarService.duplicate(event.id, { userId: user.id });
    if (action === 'delete') {
      if (!window.confirm('Archive this event? It can be restored from audit history.')) return;
      await calendarService.remove(event.id, { userId: user.id });
    }
    if (action === 'ack') await calendarService.acknowledge(event.id, user.id);
    onChanged();
    onClose();
  };

  return (
    <div className="school-calendar-drawer" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title">
      <button type="button" aria-label="Close" style={{ flex: 1, background: 'transparent', border: 0 }} onClick={onClose} />
      <aside className="school-calendar-panel">
        <p className="premium-page-subtitle" style={{ marginBottom: 8 }}>{CALENDAR_CATEGORY_LABELS[event.eventCategory]} · {CALENDAR_STATUS_LABELS[event.status]}</p>
        <h2 id="calendar-event-title" className="premium-page-title" style={{ fontSize: '1.5rem' }}>{event.title}</h2>
        <p>{formatDateLabel(event.occurrenceDate || event.startDate, { weekday: 'long' })}{event.occurrenceEndDate && event.occurrenceEndDate !== event.occurrenceDate ? ` – ${formatDateLabel(event.occurrenceEndDate)}` : ''}</p>
        <p>{eventTimeLabel(event)}</p>
        {event.description ? <p style={{ marginTop: 12 }}>{event.description}</p> : null}
        <div className="school-calendar-list" style={{ marginTop: 16 }}>
          <p><strong>School:</strong> {event.operations?.schoolStatus || 'open'}</p>
          <p><strong>Classes:</strong> {event.operations?.classesStatus || 'normal'}</p>
          <p><strong>Transport:</strong> {event.operations?.transportStatus || 'normal'}</p>
          {event.operations?.closeTime ? <p><strong>Closes:</strong> {event.operations.closeTime}</p> : null}
          {event.operations?.busDepartureTime ? <p><strong>Bus departure:</strong> {event.operations.busDepartureTime}</p> : null}
          {event.operations?.reopensOn ? <p><strong>School reopens:</strong> {formatDateLabel(event.operations.reopensOn, { weekday: 'long' })}</p> : null}
          {matchingChild ? <p><strong>Applies to:</strong> {matchingChild.student?.fullName || matchingChild.studentName}</p> : null}
          {event.location ? <p><strong>Location:</strong> {event.location}</p> : null}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 20 }}>
          <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => downloadIcs(event)}>Add to calendar (.ics)</button>
          <a className="premium-btn premium-btn-secondary premium-btn-sm" href={googleCalendarUrl(event)} target="_blank" rel="noreferrer">Google Calendar</a>
          {event.notifications?.requireAck || event.acknowledgement?.required ? (
            <button type="button" className="premium-btn premium-btn-primary premium-btn-sm" onClick={() => void run('ack')}>I acknowledge</button>
          ) : null}
          {canManage && (event.source === 'EVENT' || event.source === 'HOLIDAY') ? (
            <>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={onEdit}>Edit</button>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => void run('duplicate')}>Duplicate</button>
              {event.status !== 'published' ? <button type="button" className="premium-btn premium-btn-primary premium-btn-sm" onClick={() => void run('publish')}>Publish</button> : null}
              {event.status === 'published' ? <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => void run('cancel')}>Cancel event</button> : null}
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => void run('delete')}>Archive</button>
            </>
          ) : null}
        </div>
        <p style={{ marginTop: 16, fontSize: 12, color: '#64748b' }}>Color is a hint only — {type.label} is also labelled in text.</p>
      </aside>
    </div>
  );
}

export function AdminSchoolCalendarPage() {
  return (
    <SchoolCalendarPage
      audience="admin"
      title="School Calendar"
      subtitle="Operational timeline for holidays, events, exams, closures and transport"
    />
  );
}

export function TeacherSchoolCalendarPage() {
  return (
    <SchoolCalendarPage
      audience="teacher"
      title="My Calendar"
      subtitle="Assigned classes, meetings, exams, holidays and school events"
    />
  );
}

export function ParentSchoolCalendarPage() {
  const { user } = useAuth();
  if (user?.role === ROLES.STUDENT) {
    return (
      <SchoolCalendarPage
        audience="student"
        title="My Calendar"
        subtitle="Holidays, class events, exams and school activities"
      />
    );
  }
  return (
    <SchoolCalendarPage
      audience="parent"
      title="Family Calendar"
      subtitle="Holidays, class events, exams and transport changes for your children"
    />
  );
}

export function StudentSchoolCalendarPage() {
  return (
    <SchoolCalendarPage
      audience="student"
      title="My Calendar"
      subtitle="Holidays, class events, exams and school activities"
    />
  );
}

export function DriverSchoolCalendarPage() {
  return (
    <SchoolCalendarPage
      audience="driver"
      title="Transport Calendar"
      subtitle="Route operating days, holidays, timing changes and emergency closures"
    />
  );
}
