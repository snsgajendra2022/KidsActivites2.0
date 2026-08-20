import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { loadActiveEmergencyEvents } from '../../services/calendarFeedService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { ROLES } from '../../constants/roles.js';
import { hasPermission, PERMISSIONS } from '../../constants/permissions.js';
import '../../styles/school-calendar.css';

export default function EmergencyCalendarBanner() {
  const { user } = useAuth();
  const { tenantPath } = useTenantPath();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('sb_calendar_emergency_dismissed') || '';
    } catch {
      return '';
    }
  });

  const query = useQuery({
    queryKey: ['calendar-emergency-banner', user?.id, user?.role],
    queryFn: () => loadActiveEmergencyEvents({
      role: user?.role,
      userId: user?.id,
      canManage: hasPermission(user?.role, PERMISSIONS.MANAGE_CALENDAR),
    }),
    enabled: Boolean(user?.id),
    staleTime: 60_000,
  });

  const event = (query.data || []).find((item) => item.id !== dismissed) || null;
  if (!event) return null;

  const calendarPath = calendarPathForRole(user?.role);

  return (
    <div className="school-calendar-banner" role="status">
      <div>
        <strong>School closed today — {event.title}</strong>
        <p style={{ margin: '0.25rem 0 0', fontSize: 13 }}>
          {event.description || 'This is an emergency or weather closure. Check calendar for transport and class impact.'}
        </p>
        <Link to={tenantPath(calendarPath)} style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
          Open calendar
        </Link>
      </div>
      <button
        type="button"
        onClick={() => {
          try { sessionStorage.setItem('sb_calendar_emergency_dismissed', event.id); } catch { /* ignore */ }
          setDismissed(event.id);
        }}
      >
        Dismiss
      </button>
    </div>
  );
}

function calendarPathForRole(role) {
  if (role === ROLES.TEACHER) return '/teacher/calendar';
  if (role === ROLES.PARENT || role === ROLES.STUDENT) return '/parent/calendar';
  if (role === ROLES.DRIVER) return '/driver/calendar';
  return '/admin/calendar';
}
