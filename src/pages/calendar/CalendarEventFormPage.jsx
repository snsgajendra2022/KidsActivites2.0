import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { calendarService } from '../../services/calendarService.js';
import { listClasses } from '../../services/classManagementService.js';
import { transportRouteService } from '../../services/schoolModules/index.js';
import {
  ATTENDANCE_STATUS_OPTIONS,
  CALENDAR_AUDIENCE_TYPE,
  CALENDAR_EVENT_TYPES,
  CALENDAR_PRIORITY,
  CALENDAR_RECURRENCE,
  CALENDAR_SOURCE,
  REMINDER_OPTIONS,
  SCHOOL_STATUS_OPTIONS,
  TRANSPORT_STATUS_OPTIONS,
  emptyCalendarEvent,
  getCalendarEventType,
} from '../../constants/calendar.js';
import { ROLES } from '../../constants/roles.js';
import { hasPermission, PERMISSIONS } from '../../constants/permissions.js';
import '../../styles/school-calendar.css';

const ROLE_OPTIONS = [
  { value: ROLES.PARENT, label: 'Parents' },
  { value: ROLES.STUDENT, label: 'Students' },
  { value: ROLES.TEACHER, label: 'Teachers' },
  { value: ROLES.DRIVER, label: 'Drivers' },
];

function toggleValue(list, value) {
  const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  return next;
}

export default function CalendarEventFormPage() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { school } = usePortalConfig();
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const navigate = useNavigate();
  const canManage = hasPermission(user?.role, PERMISSIONS.MANAGE_CALENDAR);
  const canPublish = hasPermission(user?.role, PERMISSIONS.PUBLISH_CALENDAR);
  const [form, setForm] = useState(() => emptyCalendarEvent({
    eventType: searchParams.get('type') || 'school_event',
    startDate: searchParams.get('date') || '',
    endDate: searchParams.get('date') || '',
    academicYear: school?.academicYear || '',
    timezone: school?.timezone || 'Asia/Kolkata',
    source: searchParams.get('source') === 'HOLIDAY' ? CALENDAR_SOURCE.HOLIDAY : CALENDAR_SOURCE.EVENT,
  }));
  const [saving, setSaving] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  const existingQuery = useQuery({
    queryKey: ['calendar-event', eventId],
    queryFn: () => calendarService.get(eventId),
    enabled: Boolean(eventId),
  });
  const classesQuery = useQuery({
    queryKey: ['calendar-form-classes'],
    queryFn: () => listClasses({ status: 'active' }),
  });
  const routesQuery = useQuery({
    queryKey: ['calendar-form-routes'],
    queryFn: () => transportRouteService.list(),
  });
  const allEventsQuery = useQuery({
    queryKey: ['calendar-conflict-source'],
    queryFn: () => calendarService.list(),
  });

  useEffect(() => {
    if (!existingQuery.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate edit form
    setForm(existingQuery.data);
  }, [existingQuery.data]);

  const classes = Array.isArray(classesQuery.data) ? classesQuery.data : (classesQuery.data?.items || []);
  const routes = Array.isArray(routesQuery.data) ? routesQuery.data : (routesQuery.data?.items || []);

  const patch = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const patchOps = (key, value) => setForm((prev) => ({ ...prev, operations: { ...prev.operations, [key]: value } }));
  const patchNotes = (key, value) => setForm((prev) => ({ ...prev, notifications: { ...prev.notifications, [key]: value } }));
  const patchAudience = (key, value) => setForm((prev) => ({ ...prev, audience: { ...prev.audience, [key]: value } }));

  const showHalfDay = form.eventType === 'half_day' || form.eventType === 'early_dismissal' || form.operations.schoolStatus === 'half_day';
  const showLateOpen = form.eventType === 'late_opening' || form.operations.schoolStatus === 'late_opening';
  const showTransportScope = form.operations.transportStatus === 'cancelled' || form.operations.transportStatus === 'updated';

  const previewConflicts = useMemo(() => {
    const others = (allEventsQuery.data || []).filter((item) => String(item.id) !== String(form.id));
    return calendarService.conflicts(form, others);
  }, [form, allEventsQuery.data]);

  if (!canManage) {
    return (
      <AppLayout>
        <p>You do not have permission to manage calendar events.</p>
      </AppLayout>
    );
  }

  const save = async (status) => {
    if (!form.title.trim()) {
      toast('Title is required.', 'error');
      return;
    }
    if (!form.startDate) {
      toast('Start date is required.', 'error');
      return;
    }
    setConflicts(previewConflicts);
    if (previewConflicts.length && status === 'published' && !window.confirm(`${previewConflicts[0].message}\n\nPublish anyway?`)) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        status,
        endDate: form.endDate || form.startDate,
        isAllDay: form.isAllDay,
      };
      const saved = eventId
        ? await calendarService.update(eventId, payload, { userId: user.id })
        : await calendarService.create(payload, { userId: user.id });
      if (status === 'published' && saved.status !== 'published') {
        await calendarService.publish(saved.id, { userId: user.id });
      }
      toast(status === 'published' ? 'Event published.' : 'Event saved as draft.', 'success');
      navigate(tenantPath('/admin/calendar'));
    } catch (err) {
      toast(err.message || 'Could not save event.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="school-calendar-page">
          <div className="premium-page-header">
            <div>
              <h1 className="premium-page-title">{eventId ? 'Edit calendar event' : 'Add calendar event'}</h1>
              <p className="premium-page-subtitle">Configure audience, school operations, and notifications from one record.</p>
            </div>
            <Link to={tenantPath('/admin/calendar')} className="premium-btn premium-btn-secondary premium-btn-sm">Back</Link>
          </div>

          {existingQuery.isPending && eventId ? <LoadingState message="Loading event…" /> : (
            <form className="school-calendar-form" onSubmit={(e) => { e.preventDefault(); void save('draft'); }}>
              <section className="school-calendar-card">
                <h3>Basic details</h3>
                <div className="school-calendar-fields">
                  <label className="span-2">Title
                    <input value={form.title} onChange={(e) => patch('title', e.target.value)} required />
                  </label>
                  <label>Type
                    <select
                      value={form.eventType}
                      onChange={(e) => {
                        const value = e.target.value;
                        const type = getCalendarEventType(value);
                        setForm((prev) => ({
                          ...prev,
                          eventType: value,
                          eventCategory: type.category,
                          displayColor: type.color,
                          operations: applyTypeDefaults(prev.operations, value),
                        }));
                      }}
                    >
                      {CALENDAR_EVENT_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>Priority
                    <select value={form.priority} onChange={(e) => patch('priority', e.target.value)}>
                      <option value={CALENDAR_PRIORITY.NORMAL}>Normal</option>
                      <option value={CALENDAR_PRIORITY.HIGH}>High</option>
                      <option value={CALENDAR_PRIORITY.EMERGENCY}>Emergency</option>
                    </select>
                  </label>
                  <label className="span-2">Description
                    <textarea rows={3} value={form.description} onChange={(e) => patch('description', e.target.value)} />
                  </label>
                  <label>Start date
                    <input type="date" value={form.startDate} onChange={(e) => patch('startDate', e.target.value)} required />
                  </label>
                  <label>End date
                    <input type="date" value={form.endDate} onChange={(e) => patch('endDate', e.target.value)} />
                  </label>
                  <label>All day
                    <select value={form.isAllDay ? 'yes' : 'no'} onChange={(e) => patch('isAllDay', e.target.value === 'yes')}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                  <label>Location
                    <input value={form.location} onChange={(e) => patch('location', e.target.value)} />
                  </label>
                  {!form.isAllDay ? (
                    <>
                      <label>Start time<input type="time" value={form.startTime} onChange={(e) => patch('startTime', e.target.value)} /></label>
                      <label>End time<input type="time" value={form.endTime} onChange={(e) => patch('endTime', e.target.value)} /></label>
                    </>
                  ) : null}
                  <label>Academic year
                    <input value={form.academicYear} onChange={(e) => patch('academicYear', e.target.value)} placeholder="2026-27" />
                  </label>
                  <label>Meeting URL
                    <input value={form.meetingUrl} onChange={(e) => patch('meetingUrl', e.target.value)} />
                  </label>
                </div>
              </section>

              <section className="school-calendar-card">
                <h3>Audience</h3>
                <div className="school-calendar-fields">
                  <label className="span-2">Who should see this
                    <select value={form.audience.type} onChange={(e) => patchAudience('type', e.target.value)}>
                      <option value={CALENDAR_AUDIENCE_TYPE.EVERYONE}>Everyone</option>
                      <option value={CALENDAR_AUDIENCE_TYPE.ROLES}>Selected roles</option>
                      <option value={CALENDAR_AUDIENCE_TYPE.CLASSES}>Selected classes</option>
                      <option value={CALENDAR_AUDIENCE_TYPE.STUDENTS}>Selected students</option>
                      <option value={CALENDAR_AUDIENCE_TYPE.TEACHERS}>Teachers</option>
                      <option value={CALENDAR_AUDIENCE_TYPE.DRIVERS}>Drivers</option>
                      <option value={CALENDAR_AUDIENCE_TYPE.ROUTES}>Selected routes / buses</option>
                    </select>
                  </label>
                </div>
                {form.audience.type === CALENDAR_AUDIENCE_TYPE.ROLES ? (
                  <div className="school-calendar-legend" style={{ marginTop: 12 }}>
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role.value} style={{ fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={form.audience.roles.includes(role.value)}
                          onChange={() => patchAudience('roles', toggleValue(form.audience.roles, role.value))}
                        /> {role.label}
                      </label>
                    ))}
                  </div>
                ) : null}
                {form.audience.type === CALENDAR_AUDIENCE_TYPE.CLASSES ? (
                  <div className="school-calendar-legend" style={{ marginTop: 12 }}>
                    {classes.map((cls) => {
                      const id = cls.id || cls.classId;
                      const name = cls.name || cls.className || id;
                      return (
                        <label key={id} style={{ fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={form.audience.classIds.map(String).includes(String(id))}
                            onChange={() => patchAudience('classIds', toggleValue(form.audience.classIds.map(String), String(id)))}
                          /> {name}
                        </label>
                      );
                    })}
                  </div>
                ) : null}
                {form.audience.type === CALENDAR_AUDIENCE_TYPE.ROUTES ? (
                  <div className="school-calendar-legend" style={{ marginTop: 12 }}>
                    {routes.map((route) => (
                      <label key={route.id} style={{ fontWeight: 600 }}>
                        <input
                          type="checkbox"
                          checked={form.audience.routeIds.map(String).includes(String(route.id))}
                          onChange={() => patchAudience('routeIds', toggleValue(form.audience.routeIds.map(String), String(route.id)))}
                        /> {route.name || route.id}
                      </label>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="school-calendar-card">
                <h3>School operations</h3>
                <div className="school-calendar-fields">
                  <label>School status
                    <select value={form.operations.schoolStatus} onChange={(e) => patchOps('schoolStatus', e.target.value)}>
                      {SCHOOL_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>Classes
                    <select value={form.operations.classesStatus} onChange={(e) => patchOps('classesStatus', e.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </label>
                  <label>Student attendance
                    <select value={form.operations.studentAttendance} onChange={(e) => patchOps('studentAttendance', e.target.value)}>
                      {ATTENDANCE_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>Teacher attendance
                    <select value={form.operations.teacherAttendance} onChange={(e) => patchOps('teacherAttendance', e.target.value)}>
                      {ATTENDANCE_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>Transport
                    <select value={form.operations.transportStatus} onChange={(e) => patchOps('transportStatus', e.target.value)}>
                      {TRANSPORT_STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  {showTransportScope ? (
                    <label>Transport scope
                      <select value={form.operations.transportScope} onChange={(e) => patchOps('transportScope', e.target.value)}>
                        <option value="all">All routes</option>
                        <option value="selected">Selected routes</option>
                      </select>
                    </label>
                  ) : null}
                  {showHalfDay ? (
                    <>
                      <label>School closes<input type="time" value={form.operations.closeTime} onChange={(e) => patchOps('closeTime', e.target.value)} /></label>
                      <label>Bus departure<input type="time" value={form.operations.busDepartureTime} onChange={(e) => patchOps('busDepartureTime', e.target.value)} /></label>
                    </>
                  ) : null}
                  {showLateOpen ? (
                    <label>School opens<input type="time" value={form.operations.openTime} onChange={(e) => patchOps('openTime', e.target.value)} /></label>
                  ) : null}
                  <label>School reopens
                    <input type="date" value={form.operations.reopensOn} onChange={(e) => patchOps('reopensOn', e.target.value)} />
                  </label>
                  <label className="span-2">Pickup instructions
                    <textarea rows={2} value={form.operations.pickupInstructions} onChange={(e) => patchOps('pickupInstructions', e.target.value)} />
                  </label>
                </div>
              </section>

              <section className="school-calendar-card">
                <h3>Notifications & recurrence</h3>
                <div className="school-calendar-fields">
                  <label>In-app
                    <select value={form.notifications.inApp ? 'yes' : 'no'} onChange={(e) => patchNotes('inApp', e.target.value === 'yes')}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                  <label>Push
                    <select value={form.notifications.push ? 'yes' : 'no'} onChange={(e) => patchNotes('push', e.target.value === 'yes')}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                  <label>Email (queued)
                    <select value={form.notifications.email ? 'yes' : 'no'} onChange={(e) => patchNotes('email', e.target.value === 'yes')}>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </label>
                  <label>Require acknowledgement
                    <select value={form.notifications.requireAck ? 'yes' : 'no'} onChange={(e) => patchNotes('requireAck', e.target.value === 'yes')}>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </label>
                  <label>Reminder
                    <select
                      value={form.notifications.reminders?.[0] || 'immediate'}
                      onChange={(e) => patchNotes('reminders', [e.target.value])}
                    >
                      {REMINDER_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                    </select>
                  </label>
                  <label>Repeat
                    <select value={form.recurrence} onChange={(e) => patch('recurrence', e.target.value)}>
                      <option value={CALENDAR_RECURRENCE.NONE}>Does not repeat</option>
                      <option value={CALENDAR_RECURRENCE.DAILY}>Daily</option>
                      <option value={CALENDAR_RECURRENCE.WEEKDAYS}>Weekdays</option>
                      <option value={CALENDAR_RECURRENCE.WEEKLY}>Weekly</option>
                      <option value={CALENDAR_RECURRENCE.MONTHLY}>Monthly</option>
                      <option value={CALENDAR_RECURRENCE.YEARLY}>Yearly</option>
                    </select>
                  </label>
                  {form.recurrence !== 'none' ? (
                    <label>Repeat until
                      <input type="date" value={form.recurrenceUntil} onChange={(e) => patch('recurrenceUntil', e.target.value)} />
                    </label>
                  ) : null}
                  <label>Publish at
                    <input type="datetime-local" value={form.publishAt} onChange={(e) => patch('publishAt', e.target.value)} />
                  </label>
                </div>
              </section>

              {(conflicts.length || previewConflicts.length) ? (
                <section className="school-calendar-card" style={{ borderColor: '#f59e0b' }}>
                  <h3>Conflict warnings</h3>
                  {(conflicts.length ? conflicts : previewConflicts).map((item) => (
                    <p key={item.code}>{item.message}</p>
                  ))}
                </section>
              ) : null}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button type="submit" className="premium-btn premium-btn-secondary" disabled={saving}>Save draft</button>
                {canPublish ? (
                  <button type="button" className="premium-btn premium-btn-primary" disabled={saving} onClick={() => void save('published')}>
                    {form.priority === 'emergency' ? 'Publish emergency alert' : 'Publish'}
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </div>
      </PageTransition>
    </AppLayout>
  );
}

function applyTypeDefaults(operations, eventType) {
  const next = { ...operations };
  if (['school_holiday', 'public_holiday', 'festival', 'vacation', 'summer_break', 'winter_break', 'emergency_closure', 'weather_closure'].includes(eventType)) {
    next.schoolStatus = next.schoolStatus === 'open' ? 'closed' : next.schoolStatus;
    next.classesStatus = 'cancelled';
    next.studentAttendance = 'holiday';
    next.transportStatus = next.transportStatus === 'normal' ? 'cancelled' : next.transportStatus;
  }
  if (eventType === 'teacher_training') {
    next.studentAttendance = 'holiday';
    next.teacherAttendance = 'required';
  }
  if (eventType === 'half_day') next.schoolStatus = 'half_day';
  if (eventType === 'late_opening') next.schoolStatus = 'late_opening';
  return next;
}
