import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AppLayout from '../../components/layout/AppLayout.jsx';
import PageTransition from '../../components/ui/PageTransition.jsx';
import LoadingState from '../../components/ui/LoadingState.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useTenantPath } from '../../hooks/useTenantPath.js';
import { usePortalConfig } from '../../context/PortalConfigContext.jsx';
import { calendarService } from '../../services/calendarService.js';
import { CALENDAR_STATUS_LABELS, getCalendarEventType } from '../../constants/calendar.js';
import { formatDateLabel } from '../../utils/calendarDates.js';
import '../../styles/school-calendar.css';

export default function CalendarEventsAdminPage({
  title,
  subtitle,
  category,
  createType,
  createLabel,
}) {
  const { user } = useAuth();
  const { school } = usePortalConfig();
  const { toast } = useToast();
  const { tenantPath } = useTenantPath();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [selected, setSelected] = useState([]);
  const [fromYear, setFromYear] = useState('');
  const [toYear, setToYear] = useState(school?.academicYear || '');

  const query = useQuery({
    queryKey: ['calendar-admin-list', category, status, q],
    queryFn: () => calendarService.list({ category, status, q }),
  });

  const rows = useMemo(() => {
    return (query.data || []).filter((item) => {
      if (category === 'holiday') {
        return item.eventCategory === 'holiday' || item.eventCategory === 'vacation';
      }
      if (category === 'emergency') return item.eventCategory === 'emergency';
      return true;
    });
  }, [query.data, category]);

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['calendar-admin-list'] });
    void queryClient.invalidateQueries({ queryKey: ['calendar-feed'] });
  };

  const bulk = async (action) => {
    if (!selected.length) return;
    if (action === 'delete' && !window.confirm(`Archive ${selected.length} selected item(s)?`)) return;
    if (action === 'publish' && !window.confirm(`Publish ${selected.length} selected item(s)?`)) return;
    for (const id of selected) {
      if (action === 'publish') await calendarService.publish(id, { userId: user.id });
      if (action === 'archive') await calendarService.remove(id, { userId: user.id });
      if (action === 'year') await calendarService.update(id, { academicYear: toYear }, { userId: user.id });
    }
    setSelected([]);
    refresh();
    toast('Updated selected items.', 'success');
  };

  const copyYear = async () => {
    if (!fromYear || !toYear) {
      toast('Enter both academic years.', 'error');
      return;
    }
    if (!window.confirm(`Copy holidays from ${fromYear} to ${toYear} as drafts? Confirm festival dates before publishing.`)) return;
    const created = await calendarService.copyHolidays({ fromYear, toYear, actor: { userId: user.id } });
    refresh();
    toast(`Copied ${created.length} holiday(s) as drafts.`, 'success');
  };

  const exportCsv = () => {
    const header = ['Title', 'Type', 'Start', 'End', 'Status', 'Academic year'];
    const lines = [header.join(','), ...rows.map((row) => [
      `"${String(row.title || '').replace(/"/g, '""')}"`,
      row.eventType,
      row.startDate,
      row.endDate,
      row.status,
      row.academicYear || '',
    ].join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${category}-calendar.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <PageTransition>
        <div className="school-calendar-page">
          <div className="premium-page-header">
            <div>
              <h1 className="premium-page-title">{title}</h1>
              <p className="premium-page-subtitle">{subtitle}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={exportCsv}>Export CSV</button>
              <Link
                to={tenantPath(`/admin/calendar/new?type=${createType}${category === 'holiday' ? '&source=HOLIDAY' : ''}`)}
                className="premium-btn premium-btn-primary premium-btn-sm"
              >
                {createLabel}
              </Link>
            </div>
          </div>

          <div className="school-calendar-filters">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
              <option value="">All statuses</option>
              {Object.entries(CALENDAR_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {category === 'holiday' ? (
            <section className="school-calendar-card">
              <h3>Copy previous academic year</h3>
              <div className="school-calendar-fields">
                <label>From
                  <input value={fromYear} onChange={(e) => setFromYear(e.target.value)} placeholder="2026-27" />
                </label>
                <label>To
                  <input value={toYear} onChange={(e) => setToYear(e.target.value)} placeholder="2027-28" />
                </label>
              </div>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" style={{ marginTop: 12 }} onClick={() => void copyYear()}>
                Copy as drafts
              </button>
              <p style={{ marginTop: 8, fontSize: 13, color: '#64748b' }}>Copied holidays stay unpublished so festival dates can be reviewed.</p>
            </section>
          ) : null}

          {selected.length ? (
            <div className="school-calendar-filters">
              <span>{selected.length} selected</span>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => void bulk('publish')}>Publish</button>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => void bulk('year')}>Assign year {toYear}</button>
              <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => void bulk('archive')}>Archive</button>
            </div>
          ) : null}

          {query.isPending ? <LoadingState message="Loading…" /> : null}
          {!query.isPending && !rows.length ? (
            <div className="school-calendar-card">
              <p>No {title.toLowerCase()} yet.</p>
              <Link to={tenantPath(`/admin/calendar/new?type=${createType}`)} className="premium-btn premium-btn-primary premium-btn-sm" style={{ marginTop: 12 }}>
                {createLabel}
              </Link>
            </div>
          ) : null}

          <div className="school-calendar-list">
            {rows.map((row) => {
              const type = getCalendarEventType(row.eventType);
              return (
                <article key={row.id} className="school-calendar-item">
                  <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} aria-label={`Select ${row.title}`} />
                  <div className="school-calendar-item-date">{formatDateLabel(row.startDate, { weekday: 'short', year: false })}</div>
                  <div style={{ flex: 1 }}>
                    <h3>{row.title}</h3>
                    <p>{type.label} · {CALENDAR_STATUS_LABELS[row.status]} · {row.academicYear || 'No year'}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={() => navigate(tenantPath(`/admin/calendar/${row.id}/edit`))}>Edit</button>
                    <button type="button" className="premium-btn premium-btn-secondary premium-btn-sm" onClick={async () => { await calendarService.duplicate(row.id, { userId: user.id }); refresh(); toast('Duplicated as draft.', 'success'); }}>Duplicate</button>
                    {row.status !== 'published' ? (
                      <button type="button" className="premium-btn premium-btn-primary premium-btn-sm" onClick={async () => { await calendarService.publish(row.id, { userId: user.id }); refresh(); }}>Publish</button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </PageTransition>
    </AppLayout>
  );
}

export function HolidaysPage() {
  return (
    <CalendarEventsAdminPage
      title="Holidays"
      subtitle="Create, copy, publish and export school holidays and breaks"
      category="holiday"
      createType="school_holiday"
      createLabel="Add holiday"
    />
  );
}

export function EmergencyClosuresPage() {
  return (
    <CalendarEventsAdminPage
      title="Emergency closures"
      subtitle="High-priority closures and weather or safety alerts"
      category="emergency"
      createType="emergency_closure"
      createLabel="Add emergency"
    />
  );
}
