import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { loadCalendarFeed, loadCalendarUpcomingLight } from '../../services/calendarFeedService.js';
import { addDays, daysUntil, formatDateLabel, todayKey } from '../../utils/calendarDates.js';
import { CALENDAR_CATEGORY_LABELS } from '../../constants/calendar.js';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import '../../styles/school-calendar.css';

export default function UpcomingEventsWidget({
  role,
  userId,
  classIds = [],
  studentIds = [],
  calendarPath,
  title = 'Upcoming',
  /** Dashboard: calendar events only (faster). Full feed includes exams/homework/notices. */
  light = false,
}) {
  const { tenantPath } = useTenantPath();
  const from = todayKey();
  const query = useQuery({
    queryKey: ['calendar-upcoming', light ? 'light' : 'full', role, userId, from],
    queryFn: () => {
      const args = {
        from,
        to: addDays(from, 45),
        role,
        userId,
        classIds,
        studentIds,
      };
      return light ? loadCalendarUpcomingLight(args) : loadCalendarFeed(args);
    },
    enabled: Boolean(userId || role),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const items = (query.data || [])
    .filter((item) => item.status === 'published' || !item.status)
    .slice(0, 5);

  return (
    <section className="school-calendar-widget" aria-label={title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <h3>{title}</h3>
        {calendarPath ? <Link to={tenantPath(calendarPath)} className="premium-btn premium-btn-secondary premium-btn-sm">Calendar</Link> : null}
      </div>
      {query.isPending ? <p>Loading upcoming events…</p> : null}
      {!query.isPending && !items.length ? <p>No upcoming events.</p> : null}
      {items.map((item) => {
        const remaining = daysUntil(item.occurrenceDate || item.startDate);
        return (
          <div key={item.occurrenceId || item.id} className="school-calendar-widget-row">
            <div>
              <strong>{item.title}</strong>
              <div style={{ color: '#64748b', fontSize: 12 }}>
                {CALENDAR_CATEGORY_LABELS[item.eventCategory] || item.eventType}
                {' · '}
                {formatDateLabel(item.occurrenceDate || item.startDate, { weekday: 'short' })}
              </div>
            </div>
            <span>{remaining == null ? '' : remaining === 0 ? 'Today' : remaining === 1 ? 'Tomorrow' : `${remaining} days`}</span>
          </div>
        );
      })}
    </section>
  );
}
