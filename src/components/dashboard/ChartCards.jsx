import { motion } from 'framer-motion';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const tooltipStyle = {
  background: '#fff',
  border: '1px solid #e8ecf4',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(15,23,42,0.1)',
  fontSize: 13,
};

export function ApplicationsChart({ data }) {
  return (
    <div className="premium-card" style={{ height: 280 }}>
      <h3 className="card-title" style={{ marginBottom: 16 }}>Application Trends</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} />
          <Area type="monotone" dataKey="applications" stroke="#4f46e5" strokeWidth={2.5} fill="url(#colorApps)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function FeeChart({ data }) {
  return (
    <div className="premium-card" style={{ height: 280 }}>
      <h3 className="card-title" style={{ marginBottom: 16 }}>Fee Collection</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${(v / 1000).toFixed(0)}K`, 'Collected']} />
          <Bar dataKey="collected" fill="#4f46e5" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WelcomeBanner({ title, subtitle, badge, actions }) {
  return (
    <motion.div
      className="welcome-banner bento-span-12"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {badge && <div className="premium-hero-badge" style={{ marginBottom: 12, background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)' }}>{badge}</div>}
      <h2>{title}</h2>
      <p>{subtitle}</p>
      {actions && <div className="welcome-banner-actions">{actions}</div>}
    </motion.div>
  );
}
