import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function BentoStatCard({ icon: Icon, value, label, change, changeType = 'up', variant = 'indigo', onClick }) {
  return (
    <motion.div
      className={`bento-stat ${variant}`}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {Icon && (
        <div className="bento-stat-icon">
          <Icon size={22} />
        </div>
      )}
      <div className="bento-stat-value">{value}</div>
      <div className="bento-stat-label">{label}</div>
      {change && (
        <div className={`bento-stat-change ${changeType}`}>
          {changeType === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change}
        </div>
      )}
    </motion.div>
  );
}
