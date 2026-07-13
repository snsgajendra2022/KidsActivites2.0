export default function NoticeAnalytics({ analytics, loading }) {
  if (loading) return <div className="notice-analytics notice-analytics--loading">Loading analytics…</div>;
  if (!analytics) return null;

  const readPct = analytics.recipientCount
    ? Math.round((analytics.readCount / analytics.recipientCount) * 100)
    : 0;
  const ackPct = analytics.recipientCount
    ? Math.round((analytics.acknowledgementCount / analytics.recipientCount) * 100)
    : 0;

  return (
    <div className="notice-analytics">
      <div className="notice-analytics__grid">
        <div className="notice-analytics__stat">
          <span className="notice-analytics__value">{analytics.recipientCount}</span>
          <span className="notice-analytics__label">Recipients</span>
        </div>
        <div className="notice-analytics__stat">
          <span className="notice-analytics__value">{readPct}%</span>
          <span className="notice-analytics__label">Read ({analytics.readCount})</span>
        </div>
        <div className="notice-analytics__stat">
          <span className="notice-analytics__value">{ackPct}%</span>
          <span className="notice-analytics__label">Acknowledged ({analytics.acknowledgementCount})</span>
        </div>
        <div className="notice-analytics__stat">
          <span className="notice-analytics__value">{analytics.unreadCount}</span>
          <span className="notice-analytics__label">Unread</span>
        </div>
      </div>
    </div>
  );
}
