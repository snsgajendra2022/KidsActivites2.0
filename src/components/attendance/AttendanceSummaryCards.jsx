import { CheckCircle2, UserX, Clock, Sun, ShieldCheck, Percent } from 'lucide-react';

const CARDS = [
  { key: 'present', label: 'Present', icon: CheckCircle2, variant: 'emerald', altKeys: ['presentCount'] },
  { key: 'absent', label: 'Absent', icon: UserX, variant: 'rose', altKeys: ['absentCount'] },
  { key: 'late', label: 'Late', icon: Clock, variant: 'amber', altKeys: ['lateCount'] },
  { key: 'halfDay', label: 'Half Day', icon: Sun, variant: 'sky', altKeys: ['half_day', 'halfDayCount'] },
  { key: 'excused', label: 'Excused', icon: ShieldCheck, variant: 'indigo', altKeys: ['excusedCount'] },
];

function pick(summary, keys) {
  for (const key of keys) {
    if (summary?.[key] !== undefined && summary?.[key] !== null) return summary[key];
  }
  return 0;
}

/**
 * Summary counts + attendance percentage.
 * Accepts session summary or report/history summary shapes.
 */
export default function AttendanceSummaryCards({ summary, className = '' }) {
  if (!summary) return null;

  const percentage = summary.percentage
    ?? summary.averageAttendancePercentage
    ?? null;
  const total = pick(summary, ['total', 'totalDays', 'totalStudents', 'totalAttendanceDays']);

  return (
    <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 ${className}`}>
      {CARDS.map(({ key, label, icon: Icon, variant, altKeys }) => {
        const value = pick(summary, [key, ...altKeys]);
        return (
          <div key={key} className={`admin-stat-card admin-stat-card--${variant}`}>
            <div className="admin-stat-card__icon">
              <Icon size={18} />
            </div>
            <div>
              <p className="admin-stat-card__value">{value}</p>
              <p className="admin-stat-card__label">{label}</p>
            </div>
          </div>
        );
      })}
      <div className="admin-stat-card admin-stat-card--indigo">
        <div className="admin-stat-card__icon">
          <Percent size={18} />
        </div>
        <div>
          <p className="admin-stat-card__value">
            {percentage != null ? `${Number(percentage).toFixed(1)}%` : '—'}
          </p>
          <p className="admin-stat-card__label">
            {total ? `Attendance · ${total} total` : 'Attendance %'}
          </p>
        </div>
      </div>
    </div>
  );
}
